/**
 * Contrato do evento produzido por F-ACV-CADASTRO.
 *
 * Os valores vêm do catálogo canônico (`docs/mensageria/catalogo.md`) e do
 * schema versionado `livro.importacao_solicitada.v1.schema.json`. Não são
 * escolha desta implementação: schema publicado é imutável, e mudança
 * incompatível cria uma nova versão.
 *
 * A divisão de propriedade com P0-MSG está no arquivo da feature: **esta**
 * feature é dona da transação que grava domínio + outbox e do schema de `data`;
 * P0-MSG é dono do envelope, do dispatcher, do publisher confirm, do recibo, do
 * retry e da DLQ. Por isso `outbox_acervo.payload` guarda **somente** o `data` —
 * o envelope v1 é montado pelo dispatcher, que ainda não existe.
 */

export const LIVRO_IMPORTACAO_SOLICITADA = {
  tipo: 'livro.importacao_solicitada',
  versao: 1,
} as const;

/**
 * `data` do evento. `additionalProperties: false` no schema canônico: exatamente
 * estes três campos, nem mais nem menos. A chave de negócio não se repete aqui.
 */
export interface DadosImportacaoSolicitada {
  importacaoId: string;
  solicitanteId: string;
  isbn13: string;
}

/** `businessKey` do envelope: `importacao:<importacaoId>`. */
export function chaveDeNegocioDaImportacao(importacaoId: string): string {
  return `importacao:${importacaoId}`;
}

/**
 * Evento de F-ACV-BUSCA: a primeira abertura da página de um livro oficial pede
 * a sinopse (RN-19.2). Produtor e consumidor são o próprio `acervo`
 * (`docs/mensageria/catalogo.md`); `data` segue
 * `livro.pagina_aberta.v1.schema.json` e leva só o `livroId`.
 */
export const LIVRO_PAGINA_ABERTA = {
  tipo: 'livro.pagina_aberta',
  versao: 1,
} as const;

export interface DadosPaginaAberta {
  livroId: string;
}

/** `businessKey` do envelope: `livro:<livroId>:sinopse`. */
export function chaveDeNegocioDaSinopse(livroId: string): string {
  return `livro:${livroId}:sinopse`;
}
