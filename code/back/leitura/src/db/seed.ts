import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const SEED_LEITURA = {
  usuarios: {
    dono: '5eed0000-0000-4000-8000-000000000001',
    seguidor: '5eed0000-0000-4000-8000-000000000002',
  },
  livros: {
    memoriasPostumas: '5eed0000-0000-4000-8000-00000000b001',
    domCasmurro: '5eed0000-0000-4000-8000-00000000b002',
    tortoArado: '5eed0000-0000-4000-8000-00000000b003',
    cadernoDeViagem: '5eed0000-0000-4000-8000-00000000a001',
    apostilaDeCalculo: '5eed0000-0000-4000-8000-00000000a002',
  },
  estantes: {
    queroLer: '5eed0000-0000-4000-8000-00000000c001',
    lendo: '5eed0000-0000-4000-8000-00000000c002',
    lido: '5eed0000-0000-4000-8000-00000000c003',
    relendo: '5eed0000-0000-4000-8000-00000000c004',
    abandonado: '5eed0000-0000-4000-8000-00000000c005',
    releituraIncompleta: '5eed0000-0000-4000-8000-00000000c006',
  },
  leituras: {
    lendo: '5eed0000-0000-4000-8000-00000000d001',
    lido: '5eed0000-0000-4000-8000-00000000d002',
    relendoConcluida: '5eed0000-0000-4000-8000-00000000d003',
    relendoEmAndamento: '5eed0000-0000-4000-8000-00000000d004',
    abandonada: '5eed0000-0000-4000-8000-00000000d005',
    incompletaConcluida: '5eed0000-0000-4000-8000-00000000d006',
    incompletaReleitura: '5eed0000-0000-4000-8000-00000000d007',
  },
} as const;

const FUSO_SEED = 'America/Sao_Paulo';

type StatusEstanteSeed =
  'quero_ler' | 'lendo' | 'lido' | 'relendo' | 'abandonado';

interface EstanteSeed {
  id: string;
  usuarioId: string;
  livroId: string;
  status: StatusEstanteSeed;
  vezesLido: number;
  adicionadoEm: string;
}

interface LeituraSeed {
  id: string;
  estanteId: string;
  usuarioId: string;
  livroId: string;
  status: 'lendo' | 'lido' | 'abandonado';
  releitura: boolean;
  incompleta: boolean;
  dataInicio: string;
  dataFim: string | null;
  paginaAtual: number;
}

const { usuarios, livros, estantes, leituras } = SEED_LEITURA;

const ESTANTES: EstanteSeed[] = [
  {
    id: estantes.queroLer,
    usuarioId: usuarios.dono,
    livroId: livros.cadernoDeViagem,
    status: 'quero_ler',
    vezesLido: 0,
    adicionadoEm: '2026-08-01T12:00:00Z',
  },
  {
    id: estantes.lendo,
    usuarioId: usuarios.dono,
    livroId: livros.tortoArado,
    status: 'lendo',
    vezesLido: 0,
    adicionadoEm: '2026-08-02T12:00:00Z',
  },
  {
    id: estantes.lido,
    usuarioId: usuarios.dono,
    livroId: livros.memoriasPostumas,
    status: 'lido',
    vezesLido: 1,
    adicionadoEm: '2026-08-03T12:00:00Z',
  },
  {
    id: estantes.relendo,
    usuarioId: usuarios.dono,
    livroId: livros.domCasmurro,
    status: 'relendo',
    vezesLido: 1,
    adicionadoEm: '2026-08-04T12:00:00Z',
  },
  {
    id: estantes.abandonado,
    usuarioId: usuarios.dono,
    livroId: livros.apostilaDeCalculo,
    status: 'abandonado',
    vezesLido: 0,
    adicionadoEm: '2026-08-05T12:00:00Z',
  },
  {
    id: estantes.releituraIncompleta,
    usuarioId: usuarios.seguidor,
    livroId: livros.memoriasPostumas,
    status: 'lido',
    vezesLido: 1,
    adicionadoEm: '2026-08-06T12:00:00Z',
  },
];

const LEITURAS: LeituraSeed[] = [
  {
    id: leituras.lendo,
    estanteId: estantes.lendo,
    usuarioId: usuarios.dono,
    livroId: livros.tortoArado,
    status: 'lendo',
    releitura: false,
    incompleta: false,
    dataInicio: '2026-09-01',
    dataFim: null,
    paginaAtual: 120,
  },
  {
    id: leituras.lido,
    estanteId: estantes.lido,
    usuarioId: usuarios.dono,
    livroId: livros.memoriasPostumas,
    status: 'lido',
    releitura: false,
    incompleta: false,
    dataInicio: '2026-08-03',
    dataFim: '2026-08-20',
    paginaAtual: 288,
  },
  {
    id: leituras.relendoConcluida,
    estanteId: estantes.relendo,
    usuarioId: usuarios.dono,
    livroId: livros.domCasmurro,
    status: 'lido',
    releitura: false,
    incompleta: false,
    dataInicio: '2026-08-04',
    dataFim: '2026-08-18',
    paginaAtual: 256,
  },
  {
    id: leituras.relendoEmAndamento,
    estanteId: estantes.relendo,
    usuarioId: usuarios.dono,
    livroId: livros.domCasmurro,
    status: 'lendo',
    releitura: true,
    incompleta: false,
    dataInicio: '2026-09-10',
    dataFim: null,
    paginaAtual: 40,
  },
  {
    id: leituras.abandonada,
    estanteId: estantes.abandonado,
    usuarioId: usuarios.dono,
    livroId: livros.apostilaDeCalculo,
    status: 'abandonado',
    releitura: false,
    incompleta: false,
    dataInicio: '2026-08-05',
    dataFim: null,
    paginaAtual: 35,
  },
  {
    id: leituras.incompletaConcluida,
    estanteId: estantes.releituraIncompleta,
    usuarioId: usuarios.seguidor,
    livroId: livros.memoriasPostumas,
    status: 'lido',
    releitura: false,
    incompleta: false,
    dataInicio: '2026-08-06',
    dataFim: '2026-08-25',
    paginaAtual: 288,
  },
  {
    id: leituras.incompletaReleitura,
    estanteId: estantes.releituraIncompleta,
    usuarioId: usuarios.seguidor,
    livroId: livros.memoriasPostumas,
    status: 'lido',
    releitura: true,
    incompleta: true,
    dataInicio: '2026-09-01',
    dataFim: null,
    paginaAtual: 90,
  },
];

function instanteDaFinalizacao(dataFim: string): string {
  return `${dataFim}T18:00:00-03:00`;
}

export async function semear(db: NodePgDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    for (const e of ESTANTES) {
      await tx.execute(sql`
        INSERT INTO leitura.estante (id, usuario_id, livro_id, status, vezes_lido, adicionado_em)
        VALUES (${e.id}, ${e.usuarioId}, ${e.livroId}, ${e.status},
                ${e.vezesLido}, ${e.adicionadoEm})
        ON CONFLICT DO NOTHING
      `);
    }

    for (const l of LEITURAS) {
      const finalizadaEm = l.dataFim && instanteDaFinalizacao(l.dataFim);
      const ultimaAtividadeEm =
        l.status === 'lendo'
          ? sql`now()`
          : sql`${finalizadaEm ?? `${l.dataInicio}T18:00:00-03:00`}::timestamptz`;
      await tx.execute(sql`
        INSERT INTO leitura.leitura (
          id, estante_id, usuario_id, livro_id, status, releitura, incompleta,
          data_inicio, data_fim, finalizada_em, finalizacao_fuso_horario,
          finalizacao_data_local, pagina_atual, ultima_atividade_em
        ) VALUES (
          ${l.id}, ${l.estanteId}, ${l.usuarioId}, ${l.livroId}, ${l.status},
          ${l.releitura}, ${l.incompleta}, ${l.dataInicio}, ${l.dataFim},
          ${finalizadaEm}, ${l.dataFim && FUSO_SEED}, ${l.dataFim},
          ${l.paginaAtual}, ${ultimaAtividadeEm}
        )
        ON CONFLICT DO NOTHING
      `);
    }
  });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed recusado em produção.');
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida.');
  }
  const needsSsl = /sslmode=require|neon\.tech|\.render\.com/i.test(
    connectionString,
  );
  const pool = new Pool({ connectionString, ssl: needsSsl });
  try {
    await semear(drizzle(pool));
    console.log('Seed de leitura aplicado (RNF-TST-08).');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((erro) => {
    console.error('Falha no seed:', erro);
    process.exit(1);
  });
}
