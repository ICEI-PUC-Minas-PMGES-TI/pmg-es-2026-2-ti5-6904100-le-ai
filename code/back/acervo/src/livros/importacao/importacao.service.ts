import { Injectable } from '@nestjs/common';
import {
  AcessoNegado,
  ErroDeValidacao,
  EstadoInvalido,
  LivroJaCadastrado,
  NaoEncontrado,
} from '../../common/erros-de-negocio';
import { OPERACOES } from '../../common/idempotencia/idempotencia.constantes';
import { IdempotenciaService } from '../../common/idempotencia/idempotencia.service';
import { normalizarIsbn13 } from '../../common/isbn';
import {
  LIVRO_IMPORTACAO_SOLICITADA,
  chaveDeNegocioDaImportacao,
  DadosImportacaoSolicitada,
} from '../outbox/eventos';
import { OutboxRepository } from '../outbox/outbox.repository';
import {
  ImportacaoAceitaDto,
  ImportacaoDto,
  LivroImportadoResumoDto,
} from './dto/importacao.dto';
import {
  ImportacaoRegistro,
  ImportacaoRepository,
} from './importacao.repository';

@Injectable()
export class ImportacaoService {
  constructor(
    private readonly repositorio: ImportacaoRepository,
    private readonly outbox: OutboxRepository,
    private readonly idempotencia: IdempotenciaService,
  ) {}

  /**
   * `POST /livros/oficial` (RF-ACV-05, RF-ACV-06, RF-ACV-07).
   *
   * Responde `202` sem aguardar o broker nem as fontes externas: a chamada
   * externa pode levar segundos e pode falhar, e prender a requisição do leitor
   * nela tornaria o cadastro refém da disponibilidade da OpenLibrary
   * (§10.1: "a indisponibilidade das fontes externas não deve impedir o uso do
   * restante do aplicativo").
   */
  async solicitar(solicitanteId: string, chave: string, isbnBruto: string) {
    // SEC-38: formato + dígito verificador, e jamais uma URL.
    const isbn13 = normalizarIsbn13(isbnBruto);
    if (!isbn13) {
      throw new ErroDeValidacao([
        { campo: 'isbn', mensagem: 'Informe um ISBN-13 válido.' },
      ]);
    }

    return this.idempotencia.executar<ImportacaoAceitaDto>(
      {
        subjectRef: solicitanteId,
        operacao: OPERACOES.SOLICITAR_IMPORTACAO,
        chave,
        // O ISBN normalizado, não o bruto: `978-85-...` e `97885...` são o mesmo
        // pedido e precisam gerar o mesmo hash.
        payload: { isbn13 },
      },
      async (tx) => {
        // RF-ACV-07: ISBN já na base oficial bloqueia o cadastro e o cliente
        // redireciona para a página do livro existente — daí o `livroId` no corpo.
        const existente = await this.repositorio.buscarLivroOficialPorIsbn(
          tx,
          isbn13,
        );
        if (existente) {
          // O resumo leva a tela a mostrar QUAL livro já existe (§4.5), não só o id.
          const resumo = await this.repositorio.resumoDoLivro(existente, tx);
          throw new LivroJaCadastrado(existente, resumo ?? undefined);
        }

        const solicitacao = await this.repositorio.criar(
          tx,
          solicitanteId,
          isbn13,
        );
        await this.gravarEvento(tx, solicitacao);

        return {
          status: 202,
          corpo: { importacaoId: solicitacao.id, status: 'pendente' as const },
        };
      },
    );
  }

  /** Só o solicitante consulta a própria importação. */
  async obter(id: string, solicitanteId: string): Promise<ImportacaoDto> {
    const encontrada = await this.repositorio.buscarPorId(id);
    if (!encontrada) {
      throw new NaoEncontrado();
    }
    if (encontrada.solicitanteId !== solicitanteId) {
      throw new AcessoNegado();
    }
    const livro =
      encontrada.estado === 'concluida' && encontrada.livroId
        ? await this.repositorio.resumoDoLivro(encontrada.livroId)
        : null;
    return this.montar(encontrada, livro);
  }

  /**
   * `POST /livros/importacoes/{id}/reprocessar`.
   *
   * Só sai de `falha_transitoria`, e só pelo solicitante. `nao_encontrado` não
   * se reprocessa: as fontes responderam, e a resposta foi que o ISBN não
   * existe — o caminho dali é o cadastro pessoal (RF-ACV-06), não insistir.
   */
  async reprocessar(id: string, solicitanteId: string, chave: string) {
    return this.idempotencia.executar<ImportacaoAceitaDto>(
      {
        subjectRef: solicitanteId,
        operacao: OPERACOES.REPROCESSAR_IMPORTACAO,
        chave,
        payload: { importacaoId: id },
      },
      async (tx) => {
        // As checagens ficam dentro do efeito, depois da leitura do recibo: o
        // reenvio de um reprocessamento aceito precisa devolver o mesmo `202`,
        // e não um `409` por a importação já ter voltado a `pendente`.
        const atual = await this.repositorio.buscarPorId(id);
        if (!atual) {
          throw new NaoEncontrado();
        }
        if (atual.solicitanteId !== solicitanteId) {
          throw new AcessoNegado();
        }
        if (atual.estado !== 'falha_transitoria') {
          throw new EstadoInvalido(
            'Só é possível reprocessar uma solicitação que falhou por indisponibilidade.',
          );
        }

        const reaberta = await this.repositorio.reabrir(tx, id, solicitanteId);
        if (!reaberta) {
          // Outra requisição mudou o estado entre a leitura e o UPDATE.
          throw new EstadoInvalido(
            'Só é possível reprocessar uma solicitação que falhou por indisponibilidade.',
          );
        }

        // Mantém o mesmo `importacaoId` e o mesmo ISBN normalizado; o que muda é
        // o `event_id` da nova linha de outbox.
        await this.gravarEvento(tx, reaberta);

        return {
          status: 202,
          corpo: { importacaoId: reaberta.id, status: 'pendente' as const },
        };
      },
    );
  }

  private async gravarEvento(
    tx: Parameters<OutboxRepository['inserir']>[0],
    solicitacao: ImportacaoRegistro,
  ) {
    const dados: DadosImportacaoSolicitada = {
      importacaoId: solicitacao.id,
      solicitanteId: solicitacao.solicitanteId,
      isbn13: solicitacao.isbn13,
    };

    await this.outbox.inserir(tx, {
      tipo: LIVRO_IMPORTACAO_SOLICITADA.tipo,
      versao: LIVRO_IMPORTACAO_SOLICITADA.versao,
      chaveNegocio: chaveDeNegocioDaImportacao(solicitacao.id),
      payload: dados,
    });
  }

  private montar(
    registro: ImportacaoRegistro,
    livro: LivroImportadoResumoDto | null = null,
  ): ImportacaoDto {
    return {
      importacaoId: registro.id,
      isbn: registro.isbn13,
      status: registro.estado,
      // O CHECK do banco já garante isto, mas repetir aqui deixa o contrato
      // explícito para quem lê a resposta.
      livroId: registro.estado === 'concluida' ? registro.livroId : null,
      livro: registro.estado === 'concluida' ? livro : null,
      permiteCadastroPessoal: registro.estado === 'nao_encontrado',
      criadoEm: registro.criadoEm.toISOString(),
      atualizadoEm: registro.atualizadoEm.toISOString(),
    };
  }
}
