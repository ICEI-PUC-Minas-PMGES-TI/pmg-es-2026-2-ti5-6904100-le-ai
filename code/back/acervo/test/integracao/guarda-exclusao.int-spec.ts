import type { Pool } from 'pg';
import { prepararBanco } from './banco';

/**
 * Guarda da exclusão de conta (F-CONTA-2, RN-23.5): toda tabela do schema
 * `acervo` tem destino declarado quando chega `conta.excluida`. Uma migration
 * que cria tabela nova reprova aqui até alguém decidir o que acontece com os
 * dados da conta nela. A matriz de remoção fica no arquivo da feature.
 */

/** O consumidor (`src/conta/conta-excluida.consumer.ts`) apaga ou recalcula. */
const TRATADAS: Record<string, string> = {
  livro: 'livros pessoais do dono (dono_id)',
  nota_leitor_projecao: 'notas do leitor (usuario_id)',
  nota_livro_agregada: 'recalculada nos livros em que ele votou',
  importacao_livro: 'importações que ele pediu (solicitante_id)',
};

/** Saem pelo ON DELETE CASCADE de outra tabela (filha → mãe). */
const POR_CASCATA: Record<string, string> = {
  livro_autor: 'livro',
  livro_assunto: 'livro',
};

/** O consumidor anonimiza em vez de apagar. */
const ANONIMIZADAS = ['idempotencia_acervo', 'outbox_acervo'];

/**
 * Sem dado de usuário: a exclusão não toca. Atenção a `autor_id`: aqui é
 * autor de livro, não leitor.
 */
const ISENTAS: Record<string, string> = {
  autor: 'catálogo',
  autor_chave_unificada: 'catálogo: chaves OpenLibrary unificadas num autor',
  assunto: 'catálogo',
  editora: 'catálogo',
  serie: 'catálogo',
  sinonimo_editora: 'catálogo',
  mapa_assunto_externo: 'catálogo',
  ingestao_execucao: 'execuções da carga OpenLibrary',
  mensagem_processada: 'recibo de consumo: só id e tipo do evento',
  __drizzle_migrations: 'histórico de migrations',
};

const SCHEMA = 'acervo';

describe('guarda da exclusão de conta (integração)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = await prepararBanco();
  });
  afterAll(async () => {
    await pool.end();
  });

  it('toda tabela do schema tem destino na exclusão, e só um', async () => {
    const { rows } = await pool.query<{ tablename: string }>(
      'SELECT tablename FROM pg_tables WHERE schemaname = $1',
      [SCHEMA],
    );
    const existentes = rows.map((r) => r.tablename).sort();
    const declaradas = [
      ...Object.keys(TRATADAS),
      ...Object.keys(POR_CASCATA),
      ...ANONIMIZADAS,
      ...Object.keys(ISENTAS),
    ];

    const semDestino = existentes.filter((t) => !declaradas.includes(t));
    expect({
      semDestino,
      oQueFazer:
        'trate a tabela no ContaExcluidaConsumer ou declare aqui como cascata, anonimizada ou isenta com o motivo',
    }).toEqual({ semDestino: [], oQueFazer: expect.any(String) });
    expect(declaradas.filter((t) => !existentes.includes(t))).toEqual([]);
    expect(new Set(declaradas).size).toBe(declaradas.length);
  });

  it('cada cascata declarada existe no banco com ON DELETE CASCADE', async () => {
    const { rows } = await pool.query<{ filha: string; mae: string }>(
      `SELECT f.relname AS filha, m.relname AS mae
         FROM pg_constraint c
         JOIN pg_class f ON f.oid = c.conrelid
         JOIN pg_class m ON m.oid = c.confrelid
        WHERE c.contype = 'f' AND c.confdeltype = 'c'
          AND c.connamespace = $1::regnamespace`,
      [SCHEMA],
    );
    const cascatas = new Set(rows.map((r) => `${r.filha}->${r.mae}`));
    for (const [filha, mae] of Object.entries(POR_CASCATA)) {
      expect(
        cascatas.has(`${filha}->${mae}`)
          ? filha
          : `${filha} sem CASCADE para ${mae}`,
      ).toBe(filha);
    }
  });
});
