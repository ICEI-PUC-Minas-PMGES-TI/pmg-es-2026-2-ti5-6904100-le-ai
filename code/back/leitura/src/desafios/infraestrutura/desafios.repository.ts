import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import type { DrizzleDB } from '../../db/drizzle.module';
import {
  atualizacaoProgresso,
  contribuicaoDesafio,
  desafio,
  janelaDesafio,
  leitura,
  pausaDesafio,
} from '../../db/schema';
import type { Tx } from '../../db/tipos';
import type { Unidade } from '../dominio/desafio';
import type { Periodicidade, Periodo } from '../dominio/janelas';

type Executor = DrizzleDB | Tx;

/** A configuração vigente de um desafio, que cada janela copia (RN-20.7). */
export interface ConfiguracaoDesafio {
  unidade: Unidade;
  janela: Periodicidade;
  valorAlvo: number;
  fusoHorario: string;
}

export interface DesafioRegistro extends ConfiguracaoDesafio {
  id: string;
  usuarioId: string;
  pausado: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DesafioParaMaterializar extends ConfiguracaoDesafio {
  id: string;
  criadoEm: Date;
  /** Fim da janela mais recente já materializada; `null` sem nenhuma. */
  ultimoFim: string | null;
}

/**
 * Janelas que uma recomposição alcança: todas (backfill) ou as não encerradas,
 * as tocadas pela materialização da mesma chamada e as que contêm alguma das
 * datas locais dos fatos que mudaram.
 */
export type EscopoRecomposicao =
  'todas' | { datas: readonly string[]; janelaIds: readonly string[] };

export interface JanelaCorrente {
  desafioId: string;
  inicio: string;
  fim: string;
  acumulado: number;
  cumprida: boolean;
}

const COLUNAS_DESAFIO = {
  id: desafio.id,
  usuarioId: desafio.usuarioId,
  unidade: desafio.unidade,
  janela: desafio.janela,
  valorAlvo: desafio.valorAlvo,
  fusoHorario: desafio.fusoHorario,
  pausado: desafio.pausado,
  criadoEm: desafio.criadoEm,
  atualizadoEm: desafio.atualizadoEm,
};

/**
 * Desafios (F-DSF), só do schema `leitura`: a consulta histórica de RN-20.2
 * lê `atualizacao_progresso` e `leitura` do próprio serviço, sem VIEW. Todo
 * acesso filtra pelo dono (SEC-02); o progresso chega ao usuário pela leitura.
 */
@Injectable()
export class DesafiosRepository {
  /**
   * Serializa o recálculo do mesmo leitor até o fim da transação: consumidor,
   * exclusão de trecho e escritas da API não se sobrescrevem.
   */
  async travar(tx: Tx, usuarioId: string): Promise<void> {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`desafios:${usuarioId}`}))`,
    );
  }

  async inserir(
    tx: Tx,
    usuarioId: string,
    configuracao: ConfiguracaoDesafio,
    agora: Date,
  ): Promise<DesafioRegistro> {
    const [linha] = await tx
      .insert(desafio)
      .values({
        usuarioId,
        ...configuracao,
        criadoEm: agora,
        atualizadoEm: agora,
      })
      .returning(COLUNAS_DESAFIO);
    return linha as DesafioRegistro;
  }

  /** Desafio do usuário, travado para a escrita; de outro usuário é `null`. */
  async bloquearDoUsuario(
    tx: Tx,
    id: string,
    usuarioId: string,
  ): Promise<DesafioRegistro | null> {
    const [linha] = await tx
      .select(COLUNAS_DESAFIO)
      .from(desafio)
      .where(and(eq(desafio.id, id), eq(desafio.usuarioId, usuarioId)))
      .for('update');
    return (linha as DesafioRegistro | undefined) ?? null;
  }

  async atualizar(
    tx: Tx,
    id: string,
    campos: Partial<ConfiguracaoDesafio> & { pausado?: boolean },
    agora: Date,
  ): Promise<DesafioRegistro> {
    const [linha] = await tx
      .update(desafio)
      .set({ ...campos, atualizadoEm: agora })
      .where(eq(desafio.id, id))
      .returning(COLUNAS_DESAFIO);
    return linha as DesafioRegistro;
  }

  /** Apaga o desafio; o CASCADE leva janelas, contribuições e pausas. */
  async excluir(tx: Tx, id: string, usuarioId: string): Promise<boolean> {
    const linhas = await tx
      .delete(desafio)
      .where(and(eq(desafio.id, id), eq(desafio.usuarioId, usuarioId)))
      .returning({ id: desafio.id });
    return linhas.length > 0;
  }

  async abrirPausa(tx: Tx, desafioId: string, agora: Date): Promise<void> {
    await tx.insert(pausaDesafio).values({ desafioId, inicioEm: agora });
  }

  /**
   * Fecha a pausa aberta. O fim precisa ser posterior ao início (CHECK
   * `pausa_desafio_periodo_ck`): pausar e retomar no mesmo milissegundo ganha
   * um milissegundo.
   */
  async fecharPausa(tx: Tx, desafioId: string, agora: Date): Promise<void> {
    await tx
      .update(pausaDesafio)
      .set({
        fimEm: sql`greatest(${agora}::timestamptz, ${pausaDesafio.inicioEm} + interval '1 millisecond')`,
      })
      .where(
        and(eq(pausaDesafio.desafioId, desafioId), isNull(pausaDesafio.fimEm)),
      );
  }

  /** Desafios do leitor com o fim da última janela, para materializar. */
  async paraMaterializar(
    executor: Executor,
    usuarioId: string,
  ): Promise<DesafioParaMaterializar[]> {
    const linhas = await executor
      .select({
        id: desafio.id,
        unidade: desafio.unidade,
        janela: desafio.janela,
        valorAlvo: desafio.valorAlvo,
        fusoHorario: desafio.fusoHorario,
        criadoEm: desafio.criadoEm,
        ultimoFim: sql<string | null>`max(${janelaDesafio.fim})`,
      })
      .from(desafio)
      .leftJoin(janelaDesafio, eq(janelaDesafio.desafioId, desafio.id))
      .where(eq(desafio.usuarioId, usuarioId))
      .groupBy(desafio.id);
    return linhas as DesafioParaMaterializar[];
  }

  /**
   * Cria as janelas com o snapshot da configuração (RN-20.7). Uma janela que já
   * existe com o mesmo período fica como está. Devolve os ids das criadas.
   */
  async criarJanelas(
    tx: Tx,
    desafioId: string,
    configuracao: ConfiguracaoDesafio,
    periodos: readonly Periodo[],
  ): Promise<string[]> {
    if (periodos.length === 0) return [];
    const criadas = await tx
      .insert(janelaDesafio)
      .values(
        periodos.map((periodo) => ({
          desafioId,
          inicio: periodo.inicio,
          fim: periodo.fim,
          unidade: configuracao.unidade,
          periodicidade: configuracao.janela,
          valorAlvo: configuracao.valorAlvo,
          fusoHorario: configuracao.fusoHorario,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: janelaDesafio.id });
    return criadas.map((janela) => janela.id);
  }

  /**
   * Marca como encerradas as janelas que terminaram antes de `hoje`. Devolve os
   * ids das encerradas.
   */
  async encerrarDecorridas(
    tx: Tx,
    desafioId: string,
    hojeLocal: string,
    agora: Date,
  ): Promise<string[]> {
    const encerradas = await tx
      .update(janelaDesafio)
      .set({ encerradaEm: agora })
      .where(
        and(
          eq(janelaDesafio.desafioId, desafioId),
          isNull(janelaDesafio.encerradaEm),
          lt(janelaDesafio.fim, hojeLocal),
        ),
      )
      .returning({ id: janelaDesafio.id });
    return encerradas.map((janela) => janela.id);
  }

  /**
   * Descarta as janelas ainda não terminadas (a corrente), antes de a edição
   * criar a nova com a configuração nova (RN-20.7). As encerradas ficam.
   */
  async descartarNaoTerminadas(
    tx: Tx,
    desafioId: string,
    hojeLocal: string,
  ): Promise<void> {
    await tx
      .delete(janelaDesafio)
      .where(
        and(
          eq(janelaDesafio.desafioId, desafioId),
          sql`${janelaDesafio.fim} >= ${hojeLocal}`,
        ),
      );
  }

  /**
   * Recompõe as contribuições e o acumulado das janelas do leitor no `escopo` a
   * partir dos fatos atuais — nunca soma o `data` de uma mensagem. Assim a
   * entrega repetida ou fora de ordem, a captura offline tardia (RN-20.10) e a
   * exclusão de progresso convergem para o mesmo estado.
   *
   * - Só progresso registrado, finalização e exclusão de trecho mudam os
   *   fatos, e cada um sabe a data local que alcança: uma janela encerrada
   *   fora dessas datas já está em dia e não é refeita, e o custo não cresce
   *   com o histórico.
   * - Fato entra na janela pela própria data local: `data_local` do progresso
   *   (captura no dispositivo) e `finalizacao_data_local` da leitura (dia da
   *   ação de finalizar, nunca a `data_fim` editável — RN-20.3).
   * - A unidade é a do snapshot da janela, não a vigente do desafio (RN-20.7).
   * - Fato cuja ocorrência cai num intervalo de pausa `[inicio, fim)` não conta
   *   para aquele desafio, chegue quando chegar (RN-20.6). A ocorrência é
   *   `registrado_em_dispositivo` no progresso e `finalizada_em` na leitura.
   * - Minutos zerados (não informados, ou sessão com menos de um minuto) não
   *   geram contribuição: o CHECK exige valor positivo e não somariam nada.
   * - Livro conta só com `finalizada_em` preenchido: releitura incompleta e
   *   leitura abandonada não o têm (RN-04); livros pessoais contam (RN-20.4).
   */
  async recomporContribuicoes(
    tx: Tx,
    usuarioId: string,
    agora: Date,
    escopo: EscopoRecomposicao,
  ): Promise<void> {
    let noEscopo: (janelaId: SQL) => SQL = () => sql`true`;
    if (escopo !== 'todas') {
      const ids = await this.janelasNoEscopo(tx, usuarioId, escopo);
      if (ids.length === 0) return;
      noEscopo = (janelaId) => sql`${janelaId} IN ${ids}`;
    }
    await tx.execute(sql`
      DELETE FROM ${contribuicaoDesafio} c
       USING ${janelaDesafio} j, ${desafio} d
       WHERE c.janela_id = j.id AND j.desafio_id = d.id
         AND d.usuario_id = ${usuarioId}
         AND ${noEscopo(sql.raw('j.id'))}
    `);
    await tx.execute(sql`
      INSERT INTO ${contribuicaoDesafio}
        (janela_id, origem_tipo, origem_id, valor, ocorrido_em, data_local)
      SELECT j.id, 'progresso', p.id,
             CASE j.unidade WHEN 'paginas' THEN p.paginas_lidas ELSE p.minutos END,
             p.registrado_em_dispositivo, p.data_local
        FROM ${janelaDesafio} j
        JOIN ${desafio} d ON d.id = j.desafio_id
        JOIN ${leitura} l ON l.usuario_id = d.usuario_id
        JOIN ${atualizacaoProgresso} p ON p.leitura_id = l.id
       WHERE d.usuario_id = ${usuarioId}
         AND ${noEscopo(sql.raw('j.id'))}
         AND j.unidade IN ('paginas', 'minutos')
         AND (j.unidade = 'paginas' OR p.minutos > 0)
         AND p.data_local BETWEEN j.inicio AND j.fim
         AND NOT EXISTS (
               SELECT 1 FROM ${pausaDesafio} pa
                WHERE pa.desafio_id = d.id
                  AND p.registrado_em_dispositivo >= pa.inicio_em
                  AND (pa.fim_em IS NULL OR p.registrado_em_dispositivo < pa.fim_em))
      UNION ALL
      SELECT j.id, 'leitura_finalizada', l.id, 1,
             l.finalizada_em, l.finalizacao_data_local
        FROM ${janelaDesafio} j
        JOIN ${desafio} d ON d.id = j.desafio_id
        JOIN ${leitura} l ON l.usuario_id = d.usuario_id
       WHERE d.usuario_id = ${usuarioId}
         AND ${noEscopo(sql.raw('j.id'))}
         AND j.unidade = 'livros'
         AND l.finalizada_em IS NOT NULL
         AND l.finalizacao_data_local BETWEEN j.inicio AND j.fim
         AND NOT EXISTS (
               SELECT 1 FROM ${pausaDesafio} pa
                WHERE pa.desafio_id = d.id
                  AND l.finalizada_em >= pa.inicio_em
                  AND (pa.fim_em IS NULL OR l.finalizada_em < pa.fim_em))
    `);
    // `cumprida` e `acumulado` mudam juntos: o CHECK os amarra (RN-20.8).
    await tx.execute(sql`
      UPDATE ${janelaDesafio} j
         SET acumulado = t.total,
             cumprida = t.total >= j.valor_alvo,
             recalculada_em = ${agora}
        FROM (
          SELECT j2.id, COALESCE(sum(c.valor), 0)::int AS total
            FROM ${janelaDesafio} j2
            JOIN ${desafio} d ON d.id = j2.desafio_id
            LEFT JOIN ${contribuicaoDesafio} c ON c.janela_id = j2.id
           WHERE d.usuario_id = ${usuarioId}
             AND ${noEscopo(sql.raw('j2.id'))}
           GROUP BY j2.id
        ) t
       WHERE j.id = t.id
    `);
  }

  private async janelasNoEscopo(
    tx: Tx,
    usuarioId: string,
    escopo: Exclude<EscopoRecomposicao, 'todas'>,
  ): Promise<string[]> {
    const linhas = await tx
      .select({ id: janelaDesafio.id })
      .from(janelaDesafio)
      .innerJoin(desafio, eq(desafio.id, janelaDesafio.desafioId))
      .where(
        and(
          eq(desafio.usuarioId, usuarioId),
          or(
            isNull(janelaDesafio.encerradaEm),
            escopo.janelaIds.length > 0
              ? inArray(janelaDesafio.id, [...escopo.janelaIds])
              : undefined,
            ...escopo.datas.map((data) =>
              and(
                lte(janelaDesafio.inicio, data),
                gte(janelaDesafio.fim, data),
              ),
            ),
          ),
        ),
      );
    return linhas.map((linha) => linha.id);
  }

  /**
   * Página da listagem, na ordem do protótipo: ativos antes dos pausados,
   * janela mais curta primeiro e, dentro da janela, o mais novo primeiro.
   */
  async listarPagina(
    executor: Executor,
    usuarioId: string,
    deslocamento: number,
    limite: number,
  ): Promise<{ linhas: DesafioRegistro[]; totalItens: number }> {
    const [linhas, [{ total }]] = await Promise.all([
      executor
        .select(COLUNAS_DESAFIO)
        .from(desafio)
        .where(eq(desafio.usuarioId, usuarioId))
        .orderBy(
          asc(desafio.pausado),
          sql`CASE ${desafio.janela} WHEN 'diaria' THEN 0 WHEN 'semanal' THEN 1 WHEN 'mensal' THEN 2 ELSE 3 END`,
          desc(desafio.criadoEm),
          asc(desafio.id),
        )
        .limit(limite)
        .offset(deslocamento),
      executor
        .select({ total: sql<number>`count(*)::int` })
        .from(desafio)
        .where(eq(desafio.usuarioId, usuarioId)),
    ]);
    return { linhas: linhas as DesafioRegistro[], totalItens: total };
  }

  /**
   * Janela corrente de cada desafio: a de fim mais recente, já que a
   * materialização vai sempre até a janela que contém hoje.
   */
  async janelasCorrentes(
    executor: Executor,
    desafioIds: readonly string[],
  ): Promise<Map<string, JanelaCorrente>> {
    if (desafioIds.length === 0) return new Map();
    const linhas = await executor
      .selectDistinctOn([janelaDesafio.desafioId], {
        desafioId: janelaDesafio.desafioId,
        inicio: janelaDesafio.inicio,
        fim: janelaDesafio.fim,
        acumulado: janelaDesafio.acumulado,
        cumprida: janelaDesafio.cumprida,
      })
      .from(janelaDesafio)
      .where(inArray(janelaDesafio.desafioId, [...desafioIds]))
      .orderBy(janelaDesafio.desafioId, desc(janelaDesafio.fim));
    return new Map(linhas.map((linha) => [linha.desafioId, linha]));
  }

  /** Início da pausa aberta de cada desafio pausado ("Pausado desde"). */
  async pausasAbertas(
    executor: Executor,
    desafioIds: readonly string[],
  ): Promise<Map<string, Date>> {
    if (desafioIds.length === 0) return new Map();
    const linhas = await executor
      .select({
        desafioId: pausaDesafio.desafioId,
        inicioEm: pausaDesafio.inicioEm,
      })
      .from(pausaDesafio)
      .where(
        and(
          inArray(pausaDesafio.desafioId, [...desafioIds]),
          isNull(pausaDesafio.fimEm),
        ),
      );
    return new Map(linhas.map((linha) => [linha.desafioId, linha.inicioEm]));
  }

  /** Para o backfill: todo leitor com ao menos um desafio. */
  async usuariosComDesafio(executor: Executor): Promise<string[]> {
    const linhas = await executor
      .selectDistinct({ usuarioId: desafio.usuarioId })
      .from(desafio);
    return linhas.map((linha) => linha.usuarioId);
  }
}
