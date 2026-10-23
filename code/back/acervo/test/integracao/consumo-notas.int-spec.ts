import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../../src/db/schema';
import { NotaDosLeitoresConsumer } from '../../src/livros/notas/nota-dos-leitores.consumer';
import { NotaDosLeitoresRepository } from '../../src/livros/notas/nota-dos-leitores.repository';
import { MessageValidator } from '../../src/messaging/message-validator';
import { EXCHANGES } from '../../src/messaging/messaging.constants';
import { BrokerEmMemoria } from './broker-em-memoria';
import { ConsumidorSemEspera } from './consumidor-sem-espera';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivroOficial, inserirLivroPessoal, isbn } from './massa';

const FILA = 'leai.acervo.notas';

/**
 * `nota.alterada` (F-ACV-NOTA) contra Postgres real: o consumidor genérico real
 * valida o envelope e grava o recibo, e `NotaDosLeitoresConsumer` leva a
 * projeção ao estado atual de `v_nota_publicacao_v1` (tabela no fixture),
 * ignorando o valor do evento.
 */
describe('consumo de nota.alterada (integração)', () => {
  let pool: Pool;
  let broker: BrokerEmMemoria;
  let sequencia = 0;
  const novoIsbn = () => isbn(`978400${String(++sequencia).padStart(6, '0')}`);

  beforeAll(async () => {
    pool = await prepararBanco();
  });
  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await limpar(pool);
    broker = new BrokerEmMemoria();
    const db = drizzle(pool, { schema });
    const validador = new MessageValidator();
    const consumidor = new ConsumidorSemEspera(broker.conexao, validador, db);
    new NotaDosLeitoresConsumer(
      consumidor,
      validador,
      new NotaDosLeitoresRepository(),
    ).onModuleInit();
    consumidor.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  /** Publica como o leitura publica: exchange dele, chave = tipo. */
  function publicar(data: Record<string, unknown>, eventId = randomUUID()) {
    const envelope = {
      eventId,
      type: 'nota.alterada',
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: randomUUID(),
      businessKey: `nota:${String(data.usuarioId)}:${String(data.livroId)}`,
      data,
    };
    broker.canal.publish(
      EXCHANGES.leitura,
      'nota.alterada',
      Buffer.from(JSON.stringify(envelope), 'utf8'),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: envelope.eventId,
        correlationId: envelope.correlationId,
        type: envelope.type,
        headers: {
          'x-event-version': 1,
          'x-business-key': envelope.businessKey,
        },
      },
      () => undefined,
    );
  }

  const evento = (
    usuarioId: string,
    livroId: string,
    operacao: 'criada' | 'atualizada' | 'excluida',
    nota: number | null,
  ) => ({ usuarioId, livroId, operacao, nota });

  /** Estado da nota no `leitura`, como a VIEW o mostra. */
  async function notaNoLeitura(
    usuario: string,
    livro: string,
    valor: number | null,
  ) {
    await pool.query(
      'DELETE FROM leitura.v_nota_publicacao_v1 WHERE usuario_id = $1 AND livro_id = $2',
      [usuario, livro],
    );
    if (valor !== null) {
      await pool.query(
        'INSERT INTO leitura.v_nota_publicacao_v1 VALUES ($1, $2, $3)',
        [usuario, livro, valor],
      );
    }
  }

  async function projecao(livro: string) {
    const { rows } = await pool.query<{ usuario_id: string; valor: number }>(
      `SELECT usuario_id, valor::float AS valor
         FROM acervo.nota_leitor_projecao WHERE livro_id = $1
        ORDER BY usuario_id`,
      [livro],
    );
    return rows;
  }

  async function agregado(livro: string) {
    const { rows } = await pool.query<{ media: number; quantidade: number }>(
      `SELECT media::float AS media, quantidade
         FROM acervo.nota_livro_agregada WHERE livro_id = $1`,
      [livro],
    );
    return rows[0] ?? null;
  }

  it('criada, atualizada e excluída convergem para a VIEW, com o agregado junto', async () => {
    const livro = await inserirLivroOficial(pool, novoIsbn());
    const ana = randomUUID();
    const bia = randomUUID();

    await notaNoLeitura(ana, livro, 4);
    publicar(evento(ana, livro, 'criada', 4));
    await notaNoLeitura(bia, livro, 3);
    publicar(evento(bia, livro, 'criada', 3));
    await broker.entregar(FILA);
    expect(await agregado(livro)).toEqual({ media: 3.5, quantidade: 2 });

    await notaNoLeitura(ana, livro, 4.5);
    publicar(evento(ana, livro, 'atualizada', 4.5));
    await broker.entregar(FILA);
    expect(await projecao(livro)).toEqual(
      [
        { usuario_id: ana, valor: 4.5 },
        { usuario_id: bia, valor: 3 },
      ].sort((a, b) => a.usuario_id.localeCompare(b.usuario_id)),
    );
    expect(await agregado(livro)).toEqual({ media: 3.75, quantidade: 2 });

    await notaNoLeitura(ana, livro, null);
    publicar(evento(ana, livro, 'excluida', null));
    await notaNoLeitura(bia, livro, null);
    publicar(evento(bia, livro, 'excluida', null));
    await broker.entregar(FILA);
    expect(await projecao(livro)).toEqual([]);
    expect(await agregado(livro)).toBeNull();
    expect(broker.acks).toHaveLength(5);
  });

  it('entrega duplicada do mesmo eventId não repete efeito', async () => {
    const livro = await inserirLivroOficial(pool, novoIsbn());
    const ana = randomUUID();
    await notaNoLeitura(ana, livro, 5);
    publicar(evento(ana, livro, 'criada', 5));
    const [mensagem] = broker.filas.get(FILA) ?? [];

    await broker.entregar(FILA);
    await broker.reentregar(FILA, mensagem);

    expect(await projecao(livro)).toEqual([{ usuario_id: ana, valor: 5 }]);
    expect(
      await contar(pool, 'acervo.mensagem_processada', 'consumidor = $1', [
        'acervo.notas',
      ]),
    ).toBe(1);
    expect(broker.acks).toHaveLength(2);
  });

  it('fora de ordem: o evento velho que chega por último não desfaz o estado atual', async () => {
    const livro = await inserirLivroOficial(pool, novoIsbn());
    const ana = randomUUID();
    // No leitura, a nota foi criada (2) e depois editada (4).
    await notaNoLeitura(ana, livro, 4);
    publicar(evento(ana, livro, 'atualizada', 4));
    publicar(evento(ana, livro, 'criada', 2));
    await broker.entregar(FILA);
    expect(await projecao(livro)).toEqual([{ usuario_id: ana, valor: 4 }]);

    // Excluída depois: a criação que chega atrasada não ressuscita a nota.
    await notaNoLeitura(ana, livro, null);
    publicar(evento(ana, livro, 'excluida', null));
    publicar(evento(ana, livro, 'criada', 2));
    await broker.entregar(FILA);
    expect(await projecao(livro)).toEqual([]);
    expect(await agregado(livro)).toBeNull();
  });

  it('livro pessoal ou inexistente é confirmado sem efeito (RN-06.5)', async () => {
    const dono = randomUUID();
    const pessoal = await inserirLivroPessoal(pool, dono, 'Diário');
    const inexistente = randomUUID();
    await notaNoLeitura(dono, pessoal, 5);
    await notaNoLeitura(dono, inexistente, 5);

    publicar(evento(dono, pessoal, 'criada', 5));
    publicar(evento(dono, inexistente, 'criada', 5));
    await broker.entregar(FILA);

    expect(broker.acks).toHaveLength(2);
    expect(await contar(pool, 'acervo.nota_leitor_projecao')).toBe(0);
    expect(await contar(pool, 'acervo.nota_livro_agregada')).toBe(0);
  });

  it('data fora do schema vai para a DLQ sem gravar nada', async () => {
    const livro = await inserirLivroOficial(pool, novoIsbn());
    const ana = randomUUID();
    await notaNoLeitura(ana, livro, 4);

    publicar({ ...evento(ana, livro, 'criada', 4), email: 'vazou@x.com' });
    publicar(evento(ana, livro, 'criada', 4.3));
    await broker.entregar(FILA);

    expect(broker.nacks).toHaveLength(2);
    expect(broker.acks).toHaveLength(0);
    expect(await contar(pool, 'acervo.nota_leitor_projecao')).toBe(0);
  });
});
