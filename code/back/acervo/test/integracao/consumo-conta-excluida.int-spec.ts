import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../../src/db/schema';
import { ContaExcluidaConsumer } from '../../src/conta/conta-excluida.consumer';
import type { RemocaoDeAsset } from '../../src/conta/remocao-de-asset';
import { MessageValidator } from '../../src/messaging/message-validator';
import { EXCHANGES } from '../../src/messaging/messaging.constants';
import { BrokerEmMemoria } from './broker-em-memoria';
import { ConsumidorSemEspera } from './consumidor-sem-espera';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivroOficial, isbn } from './massa';

const FILA = 'leai.acervo.conta';

/**
 * `conta.excluida` (F-CONTA-2) contra Postgres real: o consumidor genérico real
 * valida o envelope e grava o recibo, e `ContaExcluidaConsumer` remove do
 * `acervo` o que é da conta, sem tocar no que é de outra pessoa.
 */
describe('consumo de conta.excluida (integração)', () => {
  let pool: Pool;
  let broker: BrokerEmMemoria;
  let remocao: { apagar: jest.Mock };

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
    remocao = { apagar: jest.fn().mockResolvedValue(true) };
    new ContaExcluidaConsumer(
      consumidor,
      validador,
      remocao as unknown as RemocaoDeAsset,
    ).onModuleInit();
    consumidor.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  /** Publica como o identidade publica: exchange dele, chave = tipo. */
  function publicar(data: Record<string, unknown>, eventId = randomUUID()) {
    const envelope = {
      eventId,
      type: 'conta.excluida',
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: randomUUID(),
      businessKey: `conta:${String(data.usuarioId)}`,
      data,
    };
    broker.canal.publish(
      EXCHANGES.identidade,
      'conta.excluida',
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

  async function livroPessoal(dono: string, capa?: string): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO acervo.livro (titulo, paginas, tipo, dono_id, autor_informado,
                                 sinopse_status, capa_url_propria, capa_asset_id)
       VALUES ('Diário', 100, 'pessoal', $1, 'Ana', 'ausente', $2, $3)
       RETURNING id`,
      [
        dono,
        capa
          ? `https://res.cloudinary.com/leai/image/upload/v1/${capa}.jpg`
          : null,
        capa ?? null,
      ],
    );
    return rows[0].id;
  }

  async function votar(usuario: string, livro: string, valor: number) {
    await pool.query(
      `INSERT INTO acervo.nota_leitor_projecao (usuario_id, livro_id, valor)
       VALUES ($1, $2, $3)`,
      [usuario, livro, valor],
    );
  }

  async function recibo(sujeito: string) {
    await pool.query(
      `INSERT INTO acervo.idempotencia_acervo
         (subject_ref, operacao, chave, payload_hash, status_http, resposta, replay_ate)
       VALUES ($1, 'criarLivroPessoal', $2, 'sha256:x', 201, '{}'::jsonb, now() + interval '1 day')`,
      [sujeito, randomUUID()],
    );
  }

  async function evento(status: 'pendente' | 'publicado', citado: string) {
    await pool.query(
      `INSERT INTO acervo.outbox_acervo
         (tipo, versao, chave_negocio, correlation_id, payload, status, publicado_em)
       VALUES ('livro.importacao_solicitada', 1, $1, $2, $3::jsonb, $4,
               CASE WHEN $4 = 'publicado' THEN now() END)`,
      [
        `importacao:${randomUUID()}`,
        randomUUID(),
        JSON.stringify({ solicitanteId: citado }),
        status,
      ],
    );
  }

  it('remove o que é da conta e preserva o de outra pessoa', async () => {
    const excluida = randomUUID();
    const outra = randomUUID();
    await livroPessoal(excluida, 'capas/da-excluida');
    const livroDaOutra = await livroPessoal(outra, 'capas/da-outra');
    const oficial = await inserirLivroOficial(
      pool,
      isbn('978300000001'),
      'Torto arado',
    );
    await votar(excluida, oficial, 5);
    await votar(outra, oficial, 3);
    await pool.query(
      `INSERT INTO acervo.nota_livro_agregada (livro_id, media, quantidade)
       VALUES ($1, 4, 2)`,
      [oficial],
    );
    await pool.query(
      `INSERT INTO acervo.importacao_livro (solicitante_id, isbn13) VALUES ($1, $2), ($3, $2)`,
      [excluida, isbn('978300000002'), outra],
    );
    await recibo(excluida);
    await recibo(outra);
    await evento('pendente', excluida);
    await evento('publicado', excluida);
    await evento('pendente', outra);

    publicar({ usuarioId: excluida });
    await broker.entregar(FILA);

    expect(broker.acks).toHaveLength(1);
    expect(remocao.apagar).toHaveBeenCalledWith('capas/da-excluida');
    expect(remocao.apagar).not.toHaveBeenCalledWith('capas/da-outra');
    expect(await contar(pool, 'acervo.livro', 'dono_id = $1', [excluida])).toBe(
      0,
    );
    expect(await contar(pool, 'acervo.livro', 'id = $1', [livroDaOutra])).toBe(
      1,
    );
    expect(await contar(pool, 'acervo.livro', 'id = $1', [oficial])).toBe(1);

    expect(
      await contar(pool, 'acervo.nota_leitor_projecao', 'usuario_id = $1', [
        excluida,
      ]),
    ).toBe(0);
    const { rows: agregado } = await pool.query(
      'SELECT media::float AS media, quantidade FROM acervo.nota_livro_agregada WHERE livro_id = $1',
      [oficial],
    );
    expect(agregado).toEqual([{ media: 3, quantidade: 1 }]);

    expect(
      await contar(pool, 'acervo.importacao_livro', 'solicitante_id = $1', [
        excluida,
      ]),
    ).toBe(0);
    expect(
      await contar(pool, 'acervo.importacao_livro', 'solicitante_id = $1', [
        outra,
      ]),
    ).toBe(1);

    expect(
      await contar(pool, 'acervo.idempotencia_acervo', 'subject_ref = $1', [
        excluida,
      ]),
    ).toBe(0);
    expect(
      await contar(
        pool,
        'acervo.idempotencia_acervo',
        'anonimizado_em IS NOT NULL',
      ),
    ).toBe(1);
    expect(
      await contar(pool, 'acervo.idempotencia_acervo', 'subject_ref = $1', [
        outra,
      ]),
    ).toBe(1);

    expect(
      await contar(pool, 'acervo.outbox_acervo', 'payload::text LIKE $1', [
        `%${excluida}%`,
      ]),
    ).toBe(0);
    expect(
      await contar(pool, 'acervo.outbox_acervo', 'anonimizado_em IS NOT NULL'),
    ).toBe(1);
    expect(
      await contar(pool, 'acervo.outbox_acervo', 'payload::text LIKE $1', [
        `%${outra}%`,
      ]),
    ).toBe(1);
  });

  it('livro sem nenhuma nota restante fica sem agregado', async () => {
    const excluida = randomUUID();
    const oficial = await inserirLivroOficial(
      pool,
      isbn('978300000003'),
      'Livro',
    );
    await votar(excluida, oficial, 4);
    await pool.query(
      `INSERT INTO acervo.nota_livro_agregada (livro_id, media, quantidade)
       VALUES ($1, 4, 1)`,
      [oficial],
    );

    publicar({ usuarioId: excluida });
    await broker.entregar(FILA);

    expect(
      await contar(pool, 'acervo.nota_livro_agregada', 'livro_id = $1', [
        oficial,
      ]),
    ).toBe(0);
  });

  it('reentrega do mesmo eventId não repete efeito', async () => {
    const excluida = randomUUID();
    await livroPessoal(excluida, 'capas/x');
    publicar({ usuarioId: excluida });
    const [mensagem] = broker.filas.get(FILA) ?? [];

    await broker.entregar(FILA);
    await broker.reentregar(FILA, mensagem);

    expect(remocao.apagar).toHaveBeenCalledTimes(1);
    expect(
      await contar(pool, 'acervo.mensagem_processada', 'consumidor = $1', [
        'acervo.conta',
      ]),
    ).toBe(1);
    expect(broker.acks).toHaveLength(2);
  });

  it('data fora do schema vai para a DLQ sem apagar nada', async () => {
    const excluida = randomUUID();
    await livroPessoal(excluida);

    publicar({ usuarioId: excluida, email: 'vazou@exemplo.com' });
    await broker.entregar(FILA);

    expect(broker.nacks).toHaveLength(1);
    expect(await contar(pool, 'acervo.livro', 'dono_id = $1', [excluida])).toBe(
      1,
    );
  });
});
