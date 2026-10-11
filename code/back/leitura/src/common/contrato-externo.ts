import { ServicoIndisponivel } from './erros-de-negocio';
import { ehFalhaDeContratoExterno } from './pg-erros';

/**
 * VIEW de outro serviço inacessível (GRANT faltando, VIEW ainda não criada) é
 * indisponibilidade de dependência: 503, nunca um 500 cru.
 */
export async function comContratoExterno<T>(
  operacao: () => Promise<T>,
): Promise<T> {
  try {
    return await operacao();
  } catch (erro) {
    if (ehFalhaDeContratoExterno(erro)) {
      throw new ServicoIndisponivel();
    }
    throw erro;
  }
}
