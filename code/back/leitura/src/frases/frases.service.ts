import { Inject, Injectable } from '@nestjs/common';
import { urlOuNulo } from '../avaliacoes/regras';
import { comContratoExterno } from '../common/contrato-externo';
import {
  AcessoNegado,
  EntidadeInvalida,
  LimiteDeFrases,
  NaoEncontrado,
} from '../common/erros-de-negocio';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../common/idempotencia/idempotencia.constantes';
import {
  IdempotenciaService,
  RespostaIdempotente,
} from '../common/idempotencia/idempotencia.service';
import {
  codigoDoPostgres,
  ehErroDaFuncao,
  VIOLACAO_DE_CHECK,
} from '../common/pg-erros';
import { DRIZZLE, DrizzleDB } from '../db/drizzle.module';
import type { Tx } from '../db/tipos';
import {
  type LivroReferencia,
  ReferenciasExternas,
} from '../referencias/referencias-externas.service';
import type { FraseDto, PaginaFrasesDto } from './dto/frase.dto';
import { FrasesRepository, LinhaDeFrase } from './frases.repository';
import { FRASES_POR_LIVRO, validarPagina, validarTextoDaFrase } from './regras';

/**
 * Frases e trechos de um livro (F-AVA-2, RF-AVA-06/07, RN-11): texto de até 500 caracteres,
 * página obrigatória e no máximo 10 por leitor e livro. Não publica evento: frase não vira
 * atividade nem notificação.
 *
 * Livro oficial: todos veem as frases, sob RN-08 por autor. Livro pessoal: só o dono cadastra e
 * vê, porque o modo consulta de RN-15 expõe a terceiros só metadados, capa, nota e resenha.
 * Livro inexistente, inativo ou pessoal de outra pessoa é 404.
 */
@Injectable()
export class FrasesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly repositorio: FrasesRepository,
    private readonly referencias: ReferenciasExternas,
    private readonly idempotencia: IdempotenciaService,
  ) {}

  async listar(
    solicitanteId: string,
    livroId: string,
    page: number,
    limite: number,
  ): Promise<PaginaFrasesDto> {
    return comContratoExterno(async () => {
      await this.exigirLivroAcessivel(this.db, livroId, solicitanteId);
      const [{ linhas, total }, minhasFrases] = await Promise.all([
        this.repositorio.pagina(this.db, livroId, solicitanteId, page, limite),
        this.repositorio.minhas(this.db, livroId, solicitanteId),
      ]);
      return {
        itens: linhas.map((linha) => paraFrase(linha, solicitanteId)),
        paginacao: {
          page,
          limite,
          totalItens: total,
          totalPaginas: Math.ceil(total / limite),
        },
        minhasFrases,
        limitePorLivro: FRASES_POR_LIVRO,
      };
    });
  }

  async cadastrar(
    usuarioId: string,
    livroId: string,
    chave: string,
    entrada: { texto: string; pagina: number },
  ): Promise<RespostaIdempotente<FraseDto>> {
    validarTextoDaFrase(entrada.texto);

    return comContratoExterno(() =>
      this.idempotencia.executar<FraseDto>(
        {
          subjectRef: usuarioId,
          operacao: operacaoNoCaminho(OPERACOES.CADASTRAR_FRASE, livroId),
          chave,
          payload: entrada,
        },
        async (tx) => {
          const livro = await this.exigirLivroAcessivel(tx, livroId, usuarioId);
          validarPagina(entrada.pagina, livro.paginas);
          // Conta suspensa ou em exclusão já sai da VIEW de perfil: sem linha, não guarda.
          const perfil = await this.referencias.buscarPerfil(usuarioId, tx);
          if (!perfil) {
            throw new AcessoNegado();
          }
          if (
            (await this.repositorio.minhas(tx, livroId, usuarioId)) >=
            FRASES_POR_LIVRO
          ) {
            throw new LimiteDeFrases();
          }

          const gravada = await this.comLimitesDoBanco(() =>
            this.repositorio.inserir(
              tx,
              usuarioId,
              livroId,
              entrada.texto,
              entrada.pagina,
            ),
          );
          return {
            status: 201,
            corpo: {
              id: gravada.id,
              livroId,
              texto: entrada.texto,
              pagina: entrada.pagina,
              criadoEm: gravada.criadoEm.toISOString(),
              autor: {
                id: perfil.snapshot.id,
                username: perfil.snapshot.username,
                nome: perfil.snapshot.displayName,
                avatarUrl: urlOuNulo(perfil.snapshot.avatarUrl),
              },
              minha: true,
            },
          };
        },
      ),
    );
  }

  /** Exclui só a própria frase. A de outra pessoa ou a inexistente é 404, sem revelar qual. */
  async excluir(
    usuarioId: string,
    fraseId: string,
    chave: string,
  ): Promise<RespostaIdempotente<null>> {
    return this.idempotencia.executar<null>(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.EXCLUIR_FRASE, fraseId),
        chave,
        payload: {},
      },
      async (tx) => {
        if (!(await this.repositorio.excluir(tx, fraseId, usuarioId))) {
          throw new NaoEncontrado();
        }
        return { status: 204, corpo: null };
      },
    );
  }

  private async exigirLivroAcessivel(
    leitor: DrizzleDB | Tx,
    livroId: string,
    usuarioId: string,
  ): Promise<LivroReferencia> {
    const livro = await this.referencias.buscarLivro(livroId, leitor);
    const acessivel =
      livro !== null &&
      livro.ativo &&
      (livro.tipo === 'oficial' || livro.donoId === usuarioId);
    if (!acessivel) {
      throw new NaoEncontrado();
    }
    return livro;
  }

  /**
   * As duas barreiras do banco viram 422: o trigger `frase_limite_trigger` (a cota de 10, que
   * resolve duas inserções simultâneas com advisory lock) e os CHECKs de texto e página. Os dois
   * levantam 23514; só o `where` do erro separa o trigger.
   */
  private async comLimitesDoBanco<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (erro) {
      if (ehErroDaFuncao(erro, VIOLACAO_DE_CHECK, 'validar_limite_frases')) {
        throw new LimiteDeFrases();
      }
      if (codigoDoPostgres(erro) === VIOLACAO_DE_CHECK) {
        throw new EntidadeInvalida([
          {
            campo: 'texto',
            mensagem: 'O trecho precisa ter de 1 a 500 caracteres.',
          },
        ]);
      }
      throw erro;
    }
  }
}

function paraFrase(linha: LinhaDeFrase, solicitanteId: string): FraseDto {
  return {
    id: linha.id,
    livroId: linha.livroId,
    texto: linha.texto,
    pagina: linha.pagina,
    criadoEm: linha.criadoEm.toISOString(),
    autor: {
      id: linha.usuarioId,
      username: linha.autorUsername,
      nome: linha.autorNome,
      avatarUrl: urlOuNulo(linha.autorAvatarUrl),
    },
    minha: linha.usuarioId === solicitanteId,
  };
}
