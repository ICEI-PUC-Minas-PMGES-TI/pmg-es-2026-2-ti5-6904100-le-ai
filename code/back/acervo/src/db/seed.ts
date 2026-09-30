import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { normalizarEditora, normalizarNomeAutor } from '../common/normalizacao';

/**
 * Massa reproduzível de `acervo` para RNF-TST-08.
 *
 * O README do Período 1 divide o seed: F-PERFIL traz perfis público/privado e
 * relações, F-EST traz os estados de leitura, e as features de acervo trazem
 * livro oficial e pessoal. Este arquivo é a parte de F-ACV-CADASTRO, e grava
 * **somente** no schema `acervo` — atividade de feed e seguimento são de
 * `social` e `identidade`, e quem os semeia são as features donas.
 *
 * Por isso os ids são fixos e públicos (`SEED_ACERVO`): o seed de F-FEED cria a
 * atividade `atividadeValida` apontando para `livroPessoalNoFeed` do `dono`, e o
 * de F-PERFIL cria o seguimento `seguidor → dono`. A referência forjada
 * (`atividadeForjada`) não existe em lugar nenhum, de propósito.
 *
 * Idempotente: rodar duas vezes não duplica nada. Os livros oficiais completos
 * vêm da amostra de F-ACV-INGESTAO (`code/scripts/ingestao/amostra/`); os três
 * daqui existem para que `acervo` tenha massa sem depender do script Python.
 * Eles têm editora e assunto para a busca e o filtro de F-ACV-BUSCA
 * funcionarem só com o seed. Os assuntos são do conjunto curado
 * (`code/scripts/ingestao/dados/assuntos.csv`), pelo slug: num banco já
 * carregado, o seed reaproveita o assunto existente em vez de criar outro.
 *
 * Uso: `npm run db:seed` (lê DATABASE_URL do ambiente). Recusa produção.
 */
export const SEED_ACERVO = {
  dono: '5eed0000-0000-4000-8000-000000000001',
  seguidor: '5eed0000-0000-4000-8000-000000000002',
  naoSeguidor: '5eed0000-0000-4000-8000-000000000003',
  livroPessoalNoFeed: '5eed0000-0000-4000-8000-00000000a001',
  livroPessoalPrivado: '5eed0000-0000-4000-8000-00000000a002',
  livroPessoalExcluido: '5eed0000-0000-4000-8000-00000000a003',
  atividadeValida: '5eed0000-0000-4000-8000-00000000f001',
  atividadeForjada: '5eed0000-0000-4000-8000-00000000f0ff',
  livrosOficiais: [
    '5eed0000-0000-4000-8000-00000000b001',
    '5eed0000-0000-4000-8000-00000000b002',
    '5eed0000-0000-4000-8000-00000000b003',
  ],
} as const;

const OFICIAIS = [
  {
    id: SEED_ACERVO.livrosOficiais[0],
    isbn13: '9788535914849',
    titulo: 'Memórias Póstumas de Brás Cubas',
    paginas: 288,
    ano: 2014,
    autor: { nome: 'Machado de Assis', chave: 'OL10000003A' },
    editora: 'Companhia das Letras',
    assuntos: ['romance'],
    capa: 'https://covers.openlibrary.org/b/id/10520483-L.jpg',
  },
  {
    id: SEED_ACERVO.livrosOficiais[1],
    isbn13: '9788535902778',
    titulo: 'Dom Casmurro',
    paginas: 256,
    ano: 1997,
    autor: { nome: 'Machado de Assis', chave: 'OL10000003A' },
    editora: 'Companhia das Letras',
    assuntos: ['romance'],
    capa: 'https://covers.openlibrary.org/b/id/8231856-L.jpg',
  },
  {
    id: SEED_ACERVO.livrosOficiais[2],
    isbn13: '9788556520050',
    titulo: 'Torto Arado',
    paginas: 264,
    ano: 2019,
    autor: { nome: 'Itamar Vieira Junior', chave: null },
    editora: 'Todavia',
    assuntos: ['romance', 'ficcao-literaria'],
    capa: 'https://covers.openlibrary.org/b/id/10909258-L.jpg',
  },
];

/** Nomes do conjunto curado, pelo slug. */
const ASSUNTOS: Record<string, string> = {
  romance: 'Romance',
  'ficcao-literaria': 'Ficção literária',
};

const PESSOAIS = [
  {
    id: SEED_ACERVO.livroPessoalNoFeed,
    titulo: 'Caderno de viagem da vó Lúcia',
    autor: 'Lúcia Andrade',
    paginas: 96,
    sinopse: 'Relatos de uma viagem de trem pelo interior de Minas, em 1968.',
    ativo: true,
  },
  {
    id: SEED_ACERVO.livroPessoalPrivado,
    titulo: 'Apostila de cálculo I',
    autor: 'Prof. Renato Souza',
    paginas: 140,
    sinopse: null,
    ativo: true,
  },
  {
    id: SEED_ACERVO.livroPessoalExcluido,
    titulo: 'Rascunho de romance',
    autor: 'Ana Leitora',
    paginas: 60,
    sinopse: null,
    ativo: false,
  },
];

export async function semear(db: NodePgDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [slug, nome] of Object.entries(ASSUNTOS)) {
      await tx.execute(sql`
        INSERT INTO acervo.assunto (nome, slug) VALUES (${nome}, ${slug})
        ON CONFLICT (slug) DO NOTHING
      `);
    }

    for (const livro of OFICIAIS) {
      const editora = normalizarEditora(livro.editora);
      await tx.execute(sql`
        INSERT INTO acervo.editora (nome, nome_normalizado)
        VALUES (${livro.editora}, ${editora})
        ON CONFLICT (nome_normalizado) DO NOTHING
      `);
      await tx.execute(sql`
        INSERT INTO acervo.livro (id, isbn13, titulo, paginas, ano_publicacao, capa_url_externa, tipo, editora_id)
        VALUES (${livro.id}, ${livro.isbn13}, ${livro.titulo}, ${livro.paginas},
                ${livro.ano}, ${livro.capa}, 'oficial',
                (SELECT id FROM acervo.editora WHERE nome_normalizado = ${editora}))
        ON CONFLICT DO NOTHING
      `);
      for (const slug of livro.assuntos) {
        await tx.execute(sql`
          INSERT INTO acervo.livro_assunto (livro_id, assunto_id)
          SELECT ${livro.id}, id FROM acervo.assunto WHERE slug = ${slug}
          ON CONFLICT DO NOTHING
        `);
      }

      const normalizado = normalizarNomeAutor(livro.autor.nome);
      if (livro.autor.chave) {
        await tx.execute(sql`
          INSERT INTO acervo.autor (nome, nome_normalizado, ol_author_key)
          VALUES (${livro.autor.nome}, ${normalizado}, ${livro.autor.chave})
          ON CONFLICT (ol_author_key) WHERE ol_author_key IS NOT NULL DO NOTHING
        `);
      } else {
        await tx.execute(sql`
          INSERT INTO acervo.autor (nome, nome_normalizado)
          VALUES (${livro.autor.nome}, ${normalizado})
          ON CONFLICT (nome_normalizado) WHERE ol_author_key IS NULL DO NOTHING
        `);
      }
      await tx.execute(sql`
        INSERT INTO acervo.livro_autor (livro_id, autor_id)
        SELECT ${livro.id}, id FROM acervo.autor
         WHERE nome_normalizado = ${normalizado}
         ORDER BY ol_author_key NULLS LAST
         LIMIT 1
        ON CONFLICT DO NOTHING
      `);
    }

    for (const livro of PESSOAIS) {
      // Livro pessoal: sem ISBN, com dono e autor informado, e `sinopse_status`
      // coerente com a sinopse, como exige `livro_oficial_pessoal_ck`.
      await tx.execute(sql`
        INSERT INTO acervo.livro (
          id, titulo, autor_informado, paginas, sinopse, sinopse_status,
          tipo, dono_id, ativo
        ) VALUES (
          ${livro.id}, ${livro.titulo}, ${livro.autor}, ${livro.paginas},
          ${livro.sinopse}, ${livro.sinopse ? 'disponivel' : 'ausente'},
          'pessoal', ${SEED_ACERVO.dono}, ${livro.ativo}
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
    console.log('Seed de acervo aplicado (RNF-TST-08).');
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
