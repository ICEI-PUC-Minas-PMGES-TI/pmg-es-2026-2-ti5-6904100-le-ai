import { Injectable } from '@nestjs/common';
import { urlOuNulo } from '../avaliacoes/regras';
import {
  AcessoNegado,
  NaoEncontrado,
  ServicoIndisponivel,
} from '../common/erros-de-negocio';
import { ehFalhaDeContratoExterno } from '../common/pg-erros';
import {
  LIMITE_PADRAO,
  PaginaResenhasPerfilDto,
  ResenhaDoPerfilDto,
} from './dto/resenhas-do-perfil.dto';
import { LinhaDeResenhaDoPerfil, PerfisRepository } from './perfis.repository';

/**
 * Resenhas de um perfil (composição de RF-SOC-02 por F-AVA), sob RN-08: o próprio usuário e
 * perfis públicos veem; perfil privado exige seguimento aceito. A checagem é no servidor.
 */
@Injectable()
export class PerfisService {
  constructor(private readonly repositorio: PerfisRepository) {}

  async resenhas(
    solicitanteId: string,
    perfilId: string,
    page = 1,
    limite = LIMITE_PADRAO,
  ): Promise<PaginaResenhasPerfilDto> {
    try {
      const perfil = await this.repositorio.perfil(perfilId);
      // Inexistente, suspensa ou em exclusão: a VIEW não traz a linha, e o perfil some.
      if (!perfil) {
        throw new NaoEncontrado();
      }

      const proprio = perfil.id === solicitanteId;
      const liberado =
        proprio ||
        perfil.privacidade === 'publico' ||
        (await this.repositorio.segue(solicitanteId, perfil.id));
      if (!liberado) {
        throw new AcessoNegado(
          'Este perfil é privado. Siga para ver as resenhas.',
        );
      }

      // RN-15: terceiros só chegam ao livro pessoal pelo feed ou pela lista do dono.
      const { linhas, total } = await this.repositorio.pagina(
        perfil.id,
        proprio,
        page,
        limite,
        solicitanteId,
      );
      return {
        itens: linhas.map(paraResenhaDoPerfil),
        paginacao: {
          page,
          limite,
          totalItens: total,
          totalPaginas: Math.ceil(total / limite),
        },
      };
    } catch (erro) {
      if (ehFalhaDeContratoExterno(erro)) {
        throw new ServicoIndisponivel();
      }
      throw erro;
    }
  }
}

function paraResenhaDoPerfil(
  linha: LinhaDeResenhaDoPerfil,
): ResenhaDoPerfilDto {
  return {
    id: linha.id,
    usuarioId: linha.usuarioId,
    livroId: linha.livroId,
    texto: linha.texto,
    spoiler: linha.spoiler,
    criadoEm: linha.criadoEm.toISOString(),
    atualizadoEm: linha.atualizadoEm.toISOString(),
    livro: {
      id: linha.livroId,
      tipo: linha.livroTipo === 'pessoal' ? 'pessoal' : 'oficial',
      titulo: linha.livroTitulo,
      autor: linha.livroAutor,
      capaUrl: urlOuNulo(linha.livroCapa),
    },
    nota: linha.nota === null ? null : Number(linha.nota),
    curtidas: Number(linha.curtidas),
    descurtidas: Number(linha.descurtidas),
    minhaReacao:
      linha.minhaReacao === 'curtida' || linha.minhaReacao === 'descurtida'
        ? linha.minhaReacao
        : null,
  };
}
