import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import * as schema from '../../src/db/schema';
import {
  FonteIndisponivel,
  type FonteDeMetadados,
  type MetadadosLivro,
} from '../../src/livros/importacao/dominio/fonte-metadados';
import { ImportacaoConsumer } from '../../src/livros/importacao/importacao.consumer';
import { AmqpPublisherService } from '../../src/messaging/amqp-publisher.service';
import { MessageValidator } from '../../src/messaging/message-validator';
import { OutboxDispatcherService } from '../../src/messaging/outbox-dispatcher.service';
import { criarApp, novoUsuario, tokenDe } from './app';
import { BrokerEmMemoria } from './broker-em-memoria';
import { ConsumidorSemEspera } from './consumidor-sem-espera';
import { contar, limpar, prepararBanco } from './banco';
import { isbn } from './massa';

const FILA = 'leai.acervo.importacao';

function metadados(isbn13: string, mudancas: Partial<MetadadosLivro> = {}) {
  return {
    isbn13,
    titulo: 'Torto Arado',
    autores: [{ nome: 'Itamar Vieira Junior', olAuthorKey: 'OL7654321A' }],
    editora: 'Todavia Ltda.',
    anoPublicacao: 2019,
    paginas: 264,
    capaUrl: 'https://covers.openlibrary.org/b/id/9-L.jpg',
    olEditionKey: `OL${isbn13.slice(-6)}M`,
    olWorkKey: 'OL1W',
    ...mudancas,
  } satisfies MetadadosLivro;
}

/**
 * Caminho assíncrono inteiro contra Postgres real: `POST /livros/oficial` grava
 * a outbox, o dispatcher real monta o envelope, o publisher real publica, o
 * consumidor genérico real valida e grava o recibo, e `ImportacaoConsumer`
 * converge o livro com o mesmo `tx`. Só o broker e as fontes externas são
 * simulados.
 */
describe('consumo de livro.importacao_solicitada (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let broker: BrokerEmMemoria;
  let dispatcher: OutboxDispatcherService;
  let fontes: jest.Mocked<FonteDeMetadados>[];

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await limpar(pool);
    broker = new BrokerEmMemoria();
    const db = drizzle(pool, { schema });
    const validador = new MessageValidator();
    const consumidor = new ConsumidorSemEspera(broker.conexao, validador, db);
    fontes = [
      { nome: 'openlibrary', buscarPorIsbn: jest.fn().mockResolvedValue(null) },
      {
        nome: 'google-books',
        buscarPorIsbn: jest.fn().mockResolvedValue(null),
      },
    ];
    new ImportacaoConsumer(consumidor, validador, fontes).onModuleInit();
    consumidor.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
    dispatcher = new OutboxDispatcherService(
      db,
      broker.conexao,
      new AmqpPublisherService(broker.conexao, validador),
    );
  });

  async function solicitar(isbn13: string, usuario = novoUsuario()) {
    const resposta = await request(app.getHttpServer())
      .post('/livros/oficial')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .set('Idempotency-Key', randomUUID())
      .send({ isbn: isbn13 });
    expect(resposta.status).toBe(202);
    return (resposta.body as { importacaoId: string }).importacaoId;
  }

  async function publicarEConsumir() {
    await dispatcher.dispatchOnce();
    await broker.entregar(FILA);
  }

  async function importacao(id: string) {
    const { rows } = await pool.query(
      'SELECT estado, livro_id, erro FROM acervo.importacao_livro WHERE id = $1',
      [id],
    );
    return rows[0] as {
      estado: string;
      livro_id: string | null;
      erro: string | null;
    };
  }

  it('conclui a importação: livro, autor e editora normalizados, recibo e ACK', async () => {
    const alvo = isbn('978655692024');
    fontes[0].buscarPorIsbn.mockResolvedValue(metadados(alvo));
    const id = await solicitar(alvo);

    await publicarEConsumir();

    const final = await importacao(id);
    expect(final.estado).toBe('concluida');
    const { rows: livros } = await pool.query(
      `SELECT l.id, l.titulo, l.tipo, e.nome_normalizado AS editora, a.ol_author_key
         FROM acervo.livro l
         LEFT JOIN acervo.editora e ON e.id = l.editora_id
         LEFT JOIN acervo.livro_autor la ON la.livro_id = l.id
         LEFT JOIN acervo.autor a ON a.id = la.autor_id`,
    );
    expect(livros).toEqual([
      {
        id: final.livro_id,
        titulo: 'Torto Arado',
        tipo: 'oficial',
        editora: 'todavia',
        ol_author_key: 'OL7654321A',
      },
    ]);
    expect(
      await contar(pool, 'acervo.mensagem_processada', 'consumidor = $1', [
        'acervo.importacao',
      ]),
    ).toBe(1);
    expect(
      await contar(pool, 'acervo.outbox_acervo', "status = 'publicado'"),
    ).toBe(1);
    expect(broker.acks).toHaveLength(1);
    expect(broker.nacks).toHaveLength(0);

    // E o contrato entre schemas já enxerga o livro novo.
    const { rows: referencia } = await pool.query(
      'SELECT tipo, titulo, autor_exibicao, ativo FROM acervo.v_livro_referencia_v1 WHERE livro_id = $1',
      [final.livro_id],
    );
    expect(referencia).toEqual([
      {
        tipo: 'oficial',
        titulo: 'Torto Arado',
        autor_exibicao: 'Itamar Vieira Junior',
        ativo: true,
      },
    ]);
  });

  it('aplica a tabela de sinônimos de editora (RN-12)', async () => {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO acervo.editora (nome, nome_normalizado)
       VALUES ('Intrínseca', 'intrínseca') RETURNING id`,
    );
    await pool.query(
      `INSERT INTO acervo.sinonimo_editora (forma_externa, editora_id)
       VALUES ('intrinseca', $1)`,
      [rows[0].id],
    );
    const alvo = isbn('978855100123');
    fontes[0].buscarPorIsbn.mockResolvedValue(
      metadados(alvo, { editora: 'Editora Intrinseca' }),
    );

    await solicitar(alvo);
    await publicarEConsumir();

    const { rows: livro } = await pool.query(
      'SELECT editora_id FROM acervo.livro',
    );
    expect(livro).toEqual([{ editora_id: rows[0].id }]);
    expect(await contar(pool, 'acervo.editora')).toBe(1);
  });

  it('autor sem chave da fonte reaproveita o autor existente de mesmo nome', async () => {
    await pool.query(
      `INSERT INTO acervo.autor (nome, nome_normalizado, ol_author_key)
       VALUES ('Itamar Vieira Junior', 'itamar vieira junior', 'OL7654321A')`,
    );
    const alvo = isbn('978655692099');
    fontes[1].buscarPorIsbn.mockResolvedValue(
      metadados(alvo, {
        autores: [{ nome: 'ITAMAR VIEIRA JÚNIOR', olAuthorKey: null }],
        olEditionKey: null,
      }),
    );

    await solicitar(alvo);
    await publicarEConsumir();

    expect(await contar(pool, 'acervo.autor')).toBe(1);
    expect(await contar(pool, 'acervo.livro_autor')).toBe(1);
  });

  describe('biografia do autor (F-ACV-DESCOBERTA)', () => {
    const biografia = async () => {
      const { rows } = await pool.query<{ biografia: string | null }>(
        `SELECT biografia FROM acervo.autor WHERE ol_author_key = 'OL7654321A'`,
      );
      return rows[0]?.biografia;
    };
    const comBiografia = (alvo: string, bio: string) =>
      metadados(alvo, {
        autores: [
          {
            nome: 'Itamar Vieira Junior',
            olAuthorKey: 'OL7654321A',
            biografia: bio,
          },
        ],
      });

    it('autor novo chega com a biografia em texto puro, cortada no teto', async () => {
      const alvo = isbn('978655692100');
      const longa = `Escritor <b>baiano</b>. ${'palavra '.repeat(400)}\n\n[1]: https://exemplo.org`;
      fontes[0].buscarPorIsbn.mockResolvedValue(comBiografia(alvo, longa));

      await solicitar(alvo);
      await publicarEConsumir();

      const texto = await biografia();
      expect(texto?.startsWith('Escritor baiano. palavra')).toBe(true);
      expect(texto).not.toContain('<b>');
      expect(texto).not.toContain('[1]:');
      expect([...(texto ?? '')].length).toBeLessThanOrEqual(2000);
      expect(texto?.endsWith('…')).toBe(true);
    });

    it('autor que já existia sem biografia a recebe; a existente nunca é sobrescrita', async () => {
      await pool.query(
        `INSERT INTO acervo.autor (nome, nome_normalizado, ol_author_key)
         VALUES ('Itamar Vieira Junior', 'itamar vieira junior', 'OL7654321A')`,
      );
      const primeiro = isbn('978655692101');
      fontes[0].buscarPorIsbn.mockResolvedValue(
        comBiografia(primeiro, 'Primeira biografia.'),
      );
      await solicitar(primeiro);
      await publicarEConsumir();
      expect(await biografia()).toBe('Primeira biografia.');

      const segundo = isbn('978655692102');
      fontes[0].buscarPorIsbn.mockResolvedValue(
        comBiografia(segundo, 'Outra biografia.'),
      );
      await solicitar(segundo);
      await publicarEConsumir();
      expect(await biografia()).toBe('Primeira biografia.');
    });

    it('biografia só de marcação vira null, sem violar o CHECK', async () => {
      const alvo = isbn('978655692103');
      fontes[0].buscarPorIsbn.mockResolvedValue(comBiografia(alvo, '<p> </p>'));

      await solicitar(alvo);
      await publicarEConsumir();

      expect(await biografia()).toBeNull();
    });
  });

  it('reentrega do mesmo eventId não repete o efeito', async () => {
    const alvo = isbn('978655692024');
    fontes[0].buscarPorIsbn.mockResolvedValue(metadados(alvo));
    await solicitar(alvo);
    await dispatcher.dispatchOnce();
    const [mensagem] = broker.filas.get(FILA) ?? [];

    await broker.entregar(FILA);
    await broker.reentregar(FILA, mensagem);

    expect(fontes[0].buscarPorIsbn).toHaveBeenCalledTimes(1);
    expect(await contar(pool, 'acervo.livro')).toBe(1);
    expect(await contar(pool, 'acervo.mensagem_processada')).toBe(1);
    expect(broker.acks).toHaveLength(2);
  });

  it('erro inesperado desfaz efeito e recibo juntos e vai para a DLQ', async () => {
    const alvo = isbn('978655692024');
    fontes[0].buscarPorIsbn.mockRejectedValue(new Error('bug no parser'));
    const id = await solicitar(alvo);

    await publicarEConsumir();

    // Tentativa inicial + três retentativas, todas desfeitas.
    expect(fontes[0].buscarPorIsbn).toHaveBeenCalledTimes(4);
    expect(await importacao(id)).toEqual({
      estado: 'pendente',
      livro_id: null,
      erro: null,
    });
    expect(await contar(pool, 'acervo.mensagem_processada')).toBe(0);
    expect(await contar(pool, 'acervo.livro')).toBe(0);
    expect(broker.nacks).toHaveLength(1);
    expect(broker.acks).toHaveLength(0);
  });

  it('nenhuma fonte conhece o ISBN: nao_encontrado confirmado', async () => {
    const id = await solicitar(isbn('978655692024'));

    await publicarEConsumir();

    expect((await importacao(id)).estado).toBe('nao_encontrado');
    expect(broker.acks).toHaveLength(1);
  });

  it('fonte indisponível: falha_transitoria confirmada, e reprocessar reabre', async () => {
    fontes[0].buscarPorIsbn.mockRejectedValue(
      new FonteIndisponivel('openlibrary', 'timeout'),
    );
    fontes[1].buscarPorIsbn.mockRejectedValue(
      new FonteIndisponivel('google-books', '503'),
    );
    const usuario = novoUsuario();
    const alvo = isbn('978655692024');
    const id = await solicitar(alvo, usuario);

    await publicarEConsumir();

    const falha = await importacao(id);
    expect(falha.estado).toBe('falha_transitoria');
    expect(falha.erro).toContain('google-books');
    expect(broker.acks).toHaveLength(1);
    expect(broker.nacks).toHaveLength(0);

    // A fonte voltou; o leitor reprocessa a mesma solicitação.
    fontes[0].buscarPorIsbn.mockResolvedValue(metadados(alvo));
    const reprocessar = await request(app.getHttpServer())
      .post(`/livros/importacoes/${id}/reprocessar`)
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .set('Idempotency-Key', randomUUID());
    expect(reprocessar.status).toBe(202);
    expect((reprocessar.body as { importacaoId: string }).importacaoId).toBe(
      id,
    );

    await publicarEConsumir();

    expect((await importacao(id)).estado).toBe('concluida');
    expect(
      await contar(pool, 'acervo.outbox_acervo', "status = 'publicado'"),
    ).toBe(2);
  });

  it('importações concorrentes do mesmo ISBN convergem para um único livro (RNF-ARQ-05)', async () => {
    const alvo = isbn('978655692024');
    fontes[0].buscarPorIsbn.mockImplementation(async () => {
      // Segura as duas execuções dentro da transação ao mesmo tempo.
      await new Promise((resolve) => setTimeout(resolve, 50));
      return metadados(alvo);
    });
    const primeira = await solicitar(alvo);
    const segunda = await solicitar(alvo);

    // As duas mensagens são entregues em paralelo, como dois consumidores.
    await publicarEConsumir();

    const [a, b] = [await importacao(primeira), await importacao(segunda)];
    expect(a.estado).toBe('concluida');
    expect(b.estado).toBe('concluida');
    expect(a.livro_id).toBe(b.livro_id);
    expect(await contar(pool, 'acervo.livro')).toBe(1);
    expect(broker.nacks).toHaveLength(0);
  });

  it('data fora do schema canônico vai para a DLQ sem abrir transação', async () => {
    const id = await solicitar(isbn('978655692024'));
    await pool.query(
      `UPDATE acervo.outbox_acervo
          SET payload = payload || '{"url": "http://169.254.169.254"}'::jsonb`,
    );

    await publicarEConsumir();

    expect(fontes[0].buscarPorIsbn).not.toHaveBeenCalled();
    expect((await importacao(id)).estado).toBe('pendente');
    expect(await contar(pool, 'acervo.mensagem_processada')).toBe(0);
    expect(broker.nacks).toHaveLength(1);
  });
});
