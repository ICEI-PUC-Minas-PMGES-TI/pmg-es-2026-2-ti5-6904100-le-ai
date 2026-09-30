import {
  FonteDeMetadados,
  FonteIndisponivel,
  MetadadosLivro,
} from './fonte-metadados';

/**
 * Consumidor de domínio de `livro.importacao_solicitada`.
 *
 * Não conhece broker, mensagem nem envelope, e recebe só o `data` do evento: o
 * acionador é `ImportacaoConsumer`, registrado no runtime AMQP de P0-MSG, que
 * instancia esta classe por mensagem com um repositório preso ao `tx` do recibo.
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
    // O que as fontes já disseram sobre este ISBN, somado na ordem delas.
    let acumulado: MetadadosLivro | null = null;

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

      // É o mesmo ISBN, então uma fonte completa a outra: a OpenLibrary costuma
      // ter a capa e não ter o total de páginas, e o Google Books o contrário.
      acumulado = acumulado ? completar(acumulado, metadados) : metadados;

      // Dado externo validado antes de persistir (RNF-SEC-33). Sem total de
      // páginas não há progresso por página, e o CHECK `livro_paginas_positivas_ck`
      // recusaria a linha; sem capa, o CHECK de livro oficial também recusa. RN-12
      // manda descartar nos dois casos — e descarte aqui é `nao_encontrado`, não
      // erro: o leitor pode cadastrar o livro como pessoal.
      if (!this.utilizavel(acumulado)) {
        continue;
      }

      const livroId =
        await this.repositorio.criarOuObterLivroOficial(acumulado);
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
      // Capa em https: é a URL que o cliente vai carregar, e o CHECK de livro
      // oficial exige capa externa (RN-12, RN-14.1).
      /^https:\/\/[^\s]+$/.test(metadados.capaUrl ?? '')
    );
  }
}

/**
 * Preenche o que falta em `base` com o que `extra` sabe. `base` vem da fonte
 * anterior na ordem e prevalece em tudo o que já tem, inclusive nas chaves da
 * OpenLibrary que RN-12 usa para deduplicar autor.
 */
function completar(
  base: MetadadosLivro,
  extra: MetadadosLivro,
): MetadadosLivro {
  return {
    ...base,
    titulo: base.titulo?.trim() ? base.titulo : extra.titulo,
    autores: base.autores.length > 0 ? base.autores : extra.autores,
    editora: base.editora ?? extra.editora,
    anoPublicacao: base.anoPublicacao ?? extra.anoPublicacao,
    paginas:
      typeof base.paginas === 'number' && base.paginas > 0
        ? base.paginas
        : extra.paginas,
    capaUrl: base.capaUrl ?? extra.capaUrl,
  };
}
