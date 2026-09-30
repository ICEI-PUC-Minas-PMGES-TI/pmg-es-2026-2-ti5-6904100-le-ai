import { FonteIndisponivel } from './fonte-metadados';

/**
 * Retentativa com backoff e circuit breaker por fonte (RNF-ERR-08).
 *
 * Os intervalos são `1/5/15 s`, os mesmos que P0-MSG fixou para o retry de
 * mensagem — não faz sentido o serviço ter duas políticas de espera diferentes
 * para a mesma classe de problema.
 *
 * O circuit breaker existe porque insistir numa fonte fora do ar custa o timeout
 * inteiro em cada tentativa: com o breaker aberto, a chamada falha na hora e a
 * importação vai para `falha_transitoria` rapidamente, em vez de segurar um
 * worker por dezenas de segundos.
 *
 * Relógio e espera são injetáveis para o teste não depender de timer real.
 */
export const ESPERAS_PADRAO_MS = [1_000, 5_000, 15_000];

export interface OpcoesDeResiliencia {
  esperasMs?: number[];
  /** Falhas consecutivas que abrem o circuito. */
  falhasParaAbrir?: number;
  /** Quanto o circuito fica aberto antes de deixar passar uma tentativa. */
  aberturaMs?: number;
  agora?: () => number;
  esperar?: (ms: number) => Promise<void>;
}

export class PoliticaDeResiliencia {
  private readonly esperasMs: number[];
  private readonly falhasParaAbrir: number;
  private readonly aberturaMs: number;
  private readonly agora: () => number;
  private readonly esperar: (ms: number) => Promise<void>;

  private falhasConsecutivas = 0;
  private abertoAte = 0;

  constructor(opcoes: OpcoesDeResiliencia = {}) {
    this.esperasMs = opcoes.esperasMs ?? ESPERAS_PADRAO_MS;
    this.falhasParaAbrir = opcoes.falhasParaAbrir ?? 3;
    this.aberturaMs = opcoes.aberturaMs ?? 30_000;
    this.agora = opcoes.agora ?? (() => Date.now());
    this.esperar =
      opcoes.esperar ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  get circuitoAberto(): boolean {
    return this.agora() < this.abertoAte;
  }

  /**
   * Executa com retentativa. **Só `FonteIndisponivel` é retentado**: uma fonte
   * que respondeu "não conheço este ISBN" não vai mudar de ideia na segunda
   * tentativa, e insistir só atrasaria a oferta de cadastro pessoal.
   */
  async executar<T>(fonte: string, operacao: () => Promise<T>): Promise<T> {
    if (this.circuitoAberto) {
      throw new FonteIndisponivel(fonte, 'circuito aberto');
    }

    let ultimoErro: unknown;

    for (
      let tentativa = 0;
      tentativa <= this.esperasMs.length;
      tentativa += 1
    ) {
      try {
        const resultado = await operacao();
        this.registrarSucesso();
        return resultado;
      } catch (erro) {
        if (!(erro instanceof FonteIndisponivel)) {
          throw erro;
        }
        ultimoErro = erro;
        if (tentativa < this.esperasMs.length) {
          await this.esperar(this.esperasMs[tentativa]);
        }
      }
    }

    this.registrarFalha();
    throw ultimoErro;
  }

  private registrarSucesso(): void {
    this.falhasConsecutivas = 0;
    this.abertoAte = 0;
  }

  private registrarFalha(): void {
    this.falhasConsecutivas += 1;
    if (this.falhasConsecutivas >= this.falhasParaAbrir) {
      this.abertoAte = this.agora() + this.aberturaMs;
      this.falhasConsecutivas = 0;
    }
  }
}
