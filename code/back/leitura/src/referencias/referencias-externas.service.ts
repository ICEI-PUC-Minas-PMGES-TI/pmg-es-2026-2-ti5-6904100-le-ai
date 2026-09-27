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

export type Executor = DrizzleDB | Tx;

export type TipoLivro = LivroSnapshot['tipo'];

export interface LivroReferencia {
  id: string;
  tipo: TipoLivro;
  donoId: string | null;
  paginas: number;
  ativo: boolean;
  snapshot: LivroSnapshot;
}

export type Privacidade = 'publico' | 'privado';

export interface PerfilReferencia {
  privacidade: Privacidade;
  snapshot: UsuarioSnapshot;
}

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
