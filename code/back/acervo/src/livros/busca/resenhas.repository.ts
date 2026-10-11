import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import { ResenhaResumoDto } from '../pessoal/dto/livro-pessoal.dto';
import { codificarCursor, PosicaoDaResenha } from './cursor-de-resenhas';

export interface PaginaDeResenhas {
  itens: ResenhaResumoDto[];
  proximoCursor: string | null;
}

interface LinhaDeResenha {
  id: string;
  autorId: string;
  autorNome: string;
  autorAvatarUrl: string | null;
  texto: string | null;
  spoiler: boolean | null;
  criadoEm: Date;
  atualizadoEm: Date;
  curtidas: string | number;
  descurtidas: string | number;
  minhaReacao: string | null;
  posicao: string;
}

/**
 * Resenhas de um livro oficial para a página (RF-ACV-04), com o filtro de RN-08
 * **no servidor**: só aparece a resenha de autor com perfil público, ou de perfil
 * privado que o leitor segue com seguimento aceito. A resenha do próprio leitor
 * fica de fora: a lista é de "outros leitores".
 *
 * Cada resenha traz as contagens de reações e a reação de quem está vendo
 * (F-AVA-2, RF-AVA-08), pela `v_reacao_resenha_v1`.
 *
 * Tudo vem das VIEWs de contrato de `leitura` e `identidade`, nunca de tabela
 * crua. A `v_perfil_referencia_v1` já omite conta suspensa e em exclusão, então
 * o `JOIN` com ela também tira essas resenhas. Falha de acesso às VIEWs sobe
 * como está: quem decide entre `resenhas: null` e 503 é o service.
 */
@Injectable()
export class ResenhasRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async pagina(criterios: {
    livroId: string;
    leitorId: string;
    limit: number;
    depoisDe?: PosicaoDaResenha;
  }): Promise<PaginaDeResenhas> {
    const { livroId, leitorId, limit, depoisDe } = criterios;
    const { rows } = await this.db.execute<Record<string, unknown>>(sql`
      SELECT
        r.resenha_id AS id,
        r.usuario_id AS "autorId",
        p.nome_exibicao AS "autorNome",
        p.avatar_url AS "autorAvatarUrl",
        r.texto,
        r.spoiler,
        r.criado_em AS "criadoEm",
        r.atualizado_em AS "atualizadoEm",
        r.curtidas,
        r.descurtidas,
        rr.tipo AS "minhaReacao",
        to_char(r.criado_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS posicao
      FROM leitura.v_resenha_publicacao_v1 r
      JOIN identidade.v_perfil_referencia_v1 p ON p.id = r.usuario_id
      LEFT JOIN leitura.v_reacao_resenha_v1 rr
        ON rr.resenha_id = r.resenha_id AND rr.usuario_id = ${leitorId}
      WHERE r.livro_id = ${livroId}
        AND r.usuario_id <> ${leitorId}
        AND (
          p.privacidade = 'publico'
          OR EXISTS (
            SELECT 1 FROM identidade.v_seguimento_aceito_v1 s
             WHERE s.seguidor_id = ${leitorId} AND s.seguido_id = r.usuario_id
          )
        )
        ${
          depoisDe
            ? sql`AND (r.criado_em, r.resenha_id) < (${depoisDe.criadoEm}::timestamptz, ${depoisDe.id}::uuid)`
            : sql``
        }
      ORDER BY r.criado_em DESC, r.resenha_id DESC
      LIMIT ${limit + 1}
    `);

    const linhas = rows as unknown as LinhaDeResenha[];
    const temMais = linhas.length > limit;
    const pagina = temMais ? linhas.slice(0, limit) : linhas;
    const ultima = pagina.at(-1);
    return {
      itens: pagina.map((linha) => ({
        id: linha.id,
        autorId: linha.autorId,
        autorNome: linha.autorNome,
        autorAvatarUrl: linha.autorAvatarUrl ?? null,
        texto: linha.texto ?? '',
        spoiler: linha.spoiler ?? false,
        criadoEm: new Date(linha.criadoEm).toISOString(),
        atualizadoEm: new Date(linha.atualizadoEm).toISOString(),
        curtidas: Number(linha.curtidas ?? 0),
        descurtidas: Number(linha.descurtidas ?? 0),
        minhaReacao: reacaoConhecida(linha.minhaReacao),
      })),
      proximoCursor:
        temMais && ultima
          ? codificarCursor({ criadoEm: ultima.posicao, id: ultima.id })
          : null,
    };
  }
}

/** Só os dois tipos do contrato; qualquer outro valor vindo da VIEW vira ausência de reação. */
export function reacaoConhecida(
  tipo: string | null | undefined,
): 'curtida' | 'descurtida' | null {
  return tipo === 'curtida' || tipo === 'descurtida' ? tipo : null;
}
