import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  vLivroReferencia,
  vPerfilReferencia,
  vSeguimentoAceito,
} from '../db/contratos-externos';
import { DRIZZLE, type DrizzleDB } from '../db/drizzle.module';
import type { Tx } from '../db/tipos';
import {
  LivroNaoEncontrado,
  LivroPessoalDeTerceiro,
  ServicoIndisponivel,
} from '../common/erros-de-negocio';
import { ehFalhaDeContratoExterno } from '../common/pg-erros';
import type {
  LivroSnapshot,
  UsuarioSnapshot,
} from '../leituras/dominio/eventos';

/**
 * Onde a consulta roda: dentro da transação da escrita (para o snapshot do
 * evento ver o mesmo instante do fato) ou no pool, em leitura avulsa.
 */
export type Executor = DrizzleDB | Tx;

export type TipoLivro = LivroSnapshot['tipo'];

export interface LivroReferencia {
  id: string;
  tipo: TipoLivro;
  /** Só em livro pessoal. */
  donoId: string | null;
  paginas: number;
  /** Livro pessoal excluído continua na VIEW, inativo. */
  ativo: boolean;
  /** `livro` dos eventos de F-EST. */
  snapshot: LivroSnapshot;
}

export type Privacidade = 'publico' | 'privado';

export interface PerfilReferencia {
  privacidade: Privacidade;
  /** `usuario` dos eventos de F-EST. */
  snapshot: UsuarioSnapshot;
}

/**
 * Leitura das VIEWs de contrato de `acervo` e `identidade` (arquitetura §4.2).
 *
 * É o único ponto de `leitura` que toca outro schema. Concentrar aqui mantém a
 * tradução coluna → modelo e o tratamento de falha de contrato num lugar só:
 * GRANT faltando ou VIEW ainda não criada é indisponibilidade de dependência,
 * não erro do cliente, e vira 503 em vez de 500 cru (RNF-ERR-01).
 */
@Injectable()
export class ReferenciasExternas {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async buscarLivro(
    livroId: string,
    executor: Executor = this.db,
  ): Promise<LivroReferencia | null> {
    const [linha] = await this.consultar(() =>
      executor
        .select()
        .from(vLivroReferencia)
        .where(eq(vLivroReferencia.livroId, livroId))
        .limit(1),
    );
    if (!linha) {
      return null;
    }

    const id = linha.livroId as string;
    const tipo = linha.tipo as TipoLivro;
    return {
      id,
      tipo,
      donoId: linha.donoId,
      paginas: linha.paginas as number,
      ativo: linha.ativo as boolean,
      snapshot: {
        id,
        tipo,
        titulo: linha.titulo as string,
        autor: linha.autorExibicao as string,
        capaUrl: linha.capaResolvida,
      },
    };
  }

  /**
   * Livro que o solicitante pode pôr na estante ou ler (SEC-07, RN-15).
   *
   * Inexistente e inativo respondem igual; livro pessoal de outro dono é
   * recusado mesmo que exista, inclusive em Quero ler.
   */
  async buscarLivroAcessivel(
    livroId: string,
    solicitanteId: string,
    executor: Executor = this.db,
  ): Promise<LivroReferencia> {
    const livro = await this.buscarLivro(livroId, executor);
    if (!livro?.ativo) {
      throw new LivroNaoEncontrado();
    }
    if (livro.tipo === 'pessoal' && livro.donoId !== solicitanteId) {
      throw new LivroPessoalDeTerceiro();
    }
    return livro;
  }

  /**
   * Perfil público de um usuário. `null` quando não existe **ou** está suspenso
   * ou em exclusão pendente — a VIEW já omite esses casos, e o chamador os
   * trata como inexistentes (RN-08, SEC-03).
   */
  async buscarPerfil(
    usuarioId: string,
    executor: Executor = this.db,
  ): Promise<PerfilReferencia | null> {
    const [linha] = await this.consultar(() =>
      executor
        .select()
        .from(vPerfilReferencia)
        .where(eq(vPerfilReferencia.id, usuarioId))
        .limit(1),
    );
    if (!linha) {
      return null;
    }

    return {
      privacidade: linha.privacidade as Privacidade,
      snapshot: {
        id: linha.id as string,
        username: linha.username as string,
        displayName: linha.nomeExibicao as string,
        avatarUrl: linha.avatarUrl,
      },
    };
  }

  /** Seguimento aceito `seguidor → seguido` (RN-08). Pendentes não contam. */
  async existeSeguimentoAceito(
    seguidorId: string,
    seguidoId: string,
    executor: Executor = this.db,
  ): Promise<boolean> {
    const linhas = await this.consultar(() =>
      executor
        .select({ seguidorId: vSeguimentoAceito.seguidorId })
        .from(vSeguimentoAceito)
        .where(
          and(
            eq(vSeguimentoAceito.seguidorId, seguidorId),
            eq(vSeguimentoAceito.seguidoId, seguidoId),
          ),
        )
        .limit(1),
    );
    return linhas.length > 0;
  }

  private async consultar<T>(consulta: () => Promise<T>): Promise<T> {
    try {
      return await consulta();
    } catch (erro) {
      if (ehFalhaDeContratoExterno(erro)) {
        throw new ServicoIndisponivel();
      }
      throw erro;
    }
  }
}
