import {
  FonteDeMetadados,
  FonteIndisponivel,
  MetadadosLivro,
} from './fonte-metadados';

/**
 * Consumidor de domínio de `livro.importacao_solicitada`.
 *
 * **Esta classe não tem acionador nesta entrega, de propósito.** O runtime AMQP
 * — conexão, dispatcher, envelope, recibo, retry e DLQ — é de P0-MSG e ainda não
 * existe. Quando existir, o consumidor genérico chama `processar()` e nada aqui
 * precisa mudar: por isso ela não conhece broker, mensagem nem envelope, e
 * recebe só o `data` do evento.
 *
 * Enquanto isso, a importação fica em `pendente`, que é o estado correto: a
 * solicitação foi aceita e ninguém a processou ainda.
 *
 * A convergência por ISBN-13 é o que sustenta RNF-ARQ-05: duas solicitações
 * concorrentes do mesmo ISBN, de usuários diferentes, terminam as duas
 * `concluida` apontando para o **mesmo** livro. Quem garante isso é o upsert do
 * repositório sobre a unicidade de ISBN-13, não um lock.
 */

export type ResultadoDoProcessamento =
  | { estado: 'concluida'; livroId: string }
  | { estado: 'nao_encontrado' }
  | { estado: 'falha_transitoria'; erro: string };

export interface RepositorioDeConvergencia {
  /**
   * Cria o livro oficial ou devolve o id do que já existe com este ISBN-13.
   * Nunca lança por violação de unicidade: é o upsert que faz duas execuções
   * convergirem em vez de uma delas ir para a DLQ.
   */
  criarOuObterLivroOficial(metadados: MetadadosLivro): Promise<string>;
  concluir(importacaoId: string, livroId: string): Promise<void>;
  marcarNaoEncontrado(importacaoId: string): Promise<void>;
  marcarFalhaTransitoria(importacaoId: string, erro: string): Promise<void>;
}

export interface DadosDaSolicitacao {
  importacaoId: string;
  solicitanteId: string;
  isbn13: string;
}

export class ProcessadorImportacao {
  constructor(
    /** Ordem fixa: OpenLibrary primeiro, Google Books só se a primeira não souber. */
    private readonly fontes: FonteDeMetadados[],
    private readonly repositorio: RepositorioDeConvergencia,
  ) {}

  async processar(
    dados: DadosDaSolicitacao,
  ): Promise<ResultadoDoProcessamento> {
    let alguemFalhou = false;
    let ultimaFalha = '';

    for (const fonte of this.fontes) {
      let metadados: MetadadosLivro | null;
      try {
        metadados = await fonte.buscarPorIsbn(dados.isbn13);
      } catch (erro) {
        // Fonte indisponível não encerra a busca: a secundária ainda pode
        // conhecer o ISBN. O que ela faz é impedir o `nao_encontrado`, porque
        // não dá para afirmar ausência sem ter perguntado a todas.
        if (!(erro instanceof FonteIndisponivel)) {
          throw erro;
        }
        alguemFalhou = true;
        ultimaFalha = erro.message;
        continue;
      }

      if (!metadados) {
        continue;
      }

      // Dado externo validado antes de persistir (RNF-SEC-33). Sem total de
      // páginas não há progresso por página, e o CHECK `livro_paginas_positivas_ck`
      // recusaria a linha; sem capa, o CHECK de livro oficial também recusa. RN-12
      // manda descartar nos dois casos — e descarte aqui é `nao_encontrado`, não
      // erro: o leitor pode cadastrar o livro como pessoal.
      if (!this.utilizavel(metadados)) {
        continue;
      }

      const livroId =
        await this.repositorio.criarOuObterLivroOficial(metadados);
      await this.repositorio.concluir(dados.importacaoId, livroId);
      return { estado: 'concluida', livroId };
    }

    if (alguemFalhou) {
      // Só depois de esgotar a política de retentativa de cada fonte. Enquanto
      // havia retentativa pela frente, a solicitação permaneceu `pendente`.
      await this.repositorio.marcarFalhaTransitoria(
        dados.importacaoId,
        ultimaFalha,
      );
      return { estado: 'falha_transitoria', erro: ultimaFalha };
    }

    // Todas as fontes responderam, e nenhuma conhece o ISBN. É a única situação
    // que habilita o cadastro pessoal (RF-ACV-06).
    await this.repositorio.marcarNaoEncontrado(dados.importacaoId);
    return { estado: 'nao_encontrado' };
  }

  private utilizavel(metadados: MetadadosLivro): boolean {
    return (
      Boolean(metadados.titulo?.trim()) &&
      typeof metadados.paginas === 'number' &&
      metadados.paginas > 0 &&
      Boolean(metadados.capaUrl)
    );
  }
}
