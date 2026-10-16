import { HttpStatus, Injectable } from '@nestjs/common';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../../common/idempotencia/idempotencia.constantes';
import {
  IdempotenciaService,
  type RespostaIdempotente,
} from '../../common/idempotencia/idempotencia.service';
import { statusParaApi } from '../../common/status-estante-api';
import {
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  PAGINA_PADRAO,
} from '../../estante/api/dto/estante.dto';
import type { PaginacaoQueryDto } from '../../perfis/dto/resenhas-do-perfil.dto';
import {
  type Executor,
  ReferenciasExternas,
} from '../../referencias/referencias-externas.service';
import type {
  FavoritoDto,
  ItemFavoritoDto,
  PaginaFavoritosDto,
} from '../api/dto/favorito.dto';
import {
  FavoritosRepository,
  type LinhaFavorito,
} from '../infraestrutura/favoritos.repository';

@Injectable()
export class FavoritosService {
  constructor(
    private readonly repositorio: FavoritosRepository,
    private readonly idempotencia: IdempotenciaService,
    private readonly referencias: ReferenciasExternas,
  ) {}

  marcar(
    usuarioId: string,
    livroId: string,
    chave: string,
  ): Promise<RespostaIdempotente<FavoritoDto>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.MARCAR_FAVORITO, livroId),
        chave,
        payload: {},
      },
      async (tx) => {
        await this.referencias.buscarLivroAcessivel(livroId, usuarioId, tx);
        const favoritadoEm = await this.repositorio.marcar(
          tx,
          usuarioId,
          livroId,
        );
        return {
          status: HttpStatus.OK,
          corpo: paraFavorito(livroId, favoritadoEm),
        };
      },
    );
  }

  async consultar(usuarioId: string, livroId: string): Promise<FavoritoDto> {
    return paraFavorito(
      livroId,
      await this.repositorio.favoritadoEm(usuarioId, livroId),
    );
  }

  desmarcar(
    usuarioId: string,
    livroId: string,
    chave: string,
  ): Promise<RespostaIdempotente<undefined>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.DESMARCAR_FAVORITO, livroId),
        chave,
        payload: {},
      },
      async (tx) => {
        await this.repositorio.desmarcar(tx, usuarioId, livroId);
        return { status: HttpStatus.NO_CONTENT, corpo: undefined };
      },
    );
  }

  async listar(
    usuarioId: string,
    consulta: PaginacaoQueryDto,
  ): Promise<PaginaFavoritosDto> {
    const page = consulta.page ?? PAGINA_PADRAO;
    const limite = Math.min(consulta.limite ?? LIMITE_PADRAO, LIMITE_MAXIMO);
    const [linhas, totalItens] = await Promise.all([
      this.repositorio.listar(usuarioId, (page - 1) * limite, limite),
      this.repositorio.contar(usuarioId),
    ]);
    return {
      itens: linhas.map(paraItem),
      paginacao: {
        page,
        limite,
        totalItens,
        totalPaginas: Math.ceil(totalItens / limite),
      },
    };
  }

  contar(usuarioId: string): Promise<number> {
    return this.repositorio.contar(usuarioId);
  }

  favoritadoEm(
    usuarioId: string,
    livroId: string,
    executor?: Executor,
  ): Promise<Date | null> {
    return this.repositorio.favoritadoEm(usuarioId, livroId, executor);
  }
}

function paraFavorito(livroId: string, favoritadoEm: Date | null): FavoritoDto {
  return {
    livroId,
    favorito: favoritadoEm !== null,
    favoritadoEm: favoritadoEm?.toISOString() ?? null,
  };
}

function paraItem(linha: LinhaFavorito): ItemFavoritoDto {
  return {
    livro: {
      id: linha.livroId,
      tipo: linha.tipo,
      titulo: linha.titulo,
      autor: linha.autor,
      capaUrl: linha.capaUrl,
    },
    status: linha.status && statusParaApi(linha.status),
    favoritadoEm: linha.favoritadoEm.toISOString(),
  };
}
