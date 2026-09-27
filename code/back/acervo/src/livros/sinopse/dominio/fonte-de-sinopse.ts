import { FonteIndisponivel } from '../../importacao/dominio/fonte-metadados';
import { textoPuro } from '../../../common/texto-puro';

/**
 * Porta das fontes de sinopse (RN-19.3): OpenLibrary, depois Google Books.
 *
 * A mesma distinção da importação atravessa este módulo: **ausência não é
 * falha**. `null` é a fonte dizendo "não tenho sinopse para este livro";
 * `FonteIndisponivel` é a fonte não respondendo. Só as duas respondendo sem
 * texto levam a `ausente`, que é terminal.
 */
export interface LivroParaSinopse {
  id: string;
  isbn13: string;
  olWorkKey: string | null;
  olEditionKey: string | null;
}

export interface FonteDeSinopse {
  readonly nome: string;
  /** Texto cru da fonte, ou `null` quando ela responde sem sinopse. */
  buscar(livro: LivroParaSinopse): Promise<string | null>;
}

export type DesfechoDaSinopse =
  | { status: 'disponivel'; texto: string }
  | { status: 'ausente' }
  | { status: 'falha_transitoria' };

/**
 * Consulta as fontes em ordem e para no primeiro texto que sobra depois de
 * limpo (RN-19.6). Uma fonte fora do ar não impede a seguinte de responder, mas
 * impede concluir `ausente`: ela poderia ter a sinopse.
 */
export async function obterSinopse(
  fontes: FonteDeSinopse[],
  livro: LivroParaSinopse,
): Promise<DesfechoDaSinopse> {
  let algumaIndisponivel = false;
  for (const fonte of fontes) {
    try {
      const bruto = await fonte.buscar(livro);
      const texto = bruto ? textoPuro(bruto) : null;
      if (texto) {
        return { status: 'disponivel', texto };
      }
    } catch (erro) {
      if (!(erro instanceof FonteIndisponivel)) {
        throw erro;
      }
      algumaIndisponivel = true;
    }
  }
  return algumaIndisponivel
    ? { status: 'falha_transitoria' }
    : { status: 'ausente' };
}

/** A OpenLibrary manda `description` como texto ou como `{ type, value }`. */
export function descricaoDaOpenLibrary(bruto: unknown): string | null {
  if (typeof bruto === 'string') {
    return bruto;
  }
  if (bruto && typeof bruto === 'object') {
    const valor = (bruto as { value?: unknown }).value;
    return typeof valor === 'string' ? valor : null;
  }
  return null;
}
