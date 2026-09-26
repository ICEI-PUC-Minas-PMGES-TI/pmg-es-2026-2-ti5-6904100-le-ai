import { FonteIndisponivel } from './fonte-metadados';

/**
 * Cliente HTTP para as fontes externas (RNF-SEC-38, RNF-SEC-39, RNF-ERR-08).
 *
 * Quatro proteções, todas exigidas por requisito:
 *
 * 1. **Allowlist de host por igualdade exata.** A URL é construída pelo servidor
 *    a partir do ISBN; a allowlist é a segunda barreira, para o caso de alguém
 *    montar uma URL a partir de dado externo no futuro. `endsWith` aceitaria
 *    `openlibrary.org.invasor.com`.
 * 2. **Timeout.** Sem ele, uma fonte lenta segura a conexão indefinidamente.
 * 3. **Limite de tamanho da resposta**, lido em streaming e abortado ao estourar.
 *    Sem isso, uma resposta gigante derruba o serviço por memória.
 * 4. **Redirect só dentro da allowlist**, seguido à mão (`redirect: 'manual'`).
 *    Seguir redirecionamento às cegas é o caminho clássico de escapar da
 *    allowlist: o host permitido responde 302 para um destino interno. Mas
 *    recusar todo redirect quebra a fonte primária — `openlibrary.org/isbn/{isbn}.json`
 *    **sempre** responde 302 para `/books/{olid}.json`. RNF-SEC-39 proíbe o
 *    redirect *fora* da allowlist; cada salto é revalidado como a URL original,
 *    com teto de saltos e o mesmo timeout para a cadeia inteira.
 */
const MAX_REDIRECTS = 3;
export interface ConfiguracaoHttpExterno {
  hostsPermitidos: string[];
  timeoutMs: number;
  limiteRespostaBytes: number;
  userAgent: string;
  fetch?: typeof globalThis.fetch;
}

export class HttpExterno {
  constructor(private readonly configuracao: ConfiguracaoHttpExterno) {}

  hostPermitido(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return this.configuracao.hostsPermitidos.some(
      (permitido) => permitido.trim().toLowerCase() === host,
    );
  }

  /**
   * `null` quando a fonte respondeu 404 — ausência é resposta válida.
   * Lança `FonteIndisponivel` quando não deu para saber.
   */
  async buscarJson(fonte: string, url: URL): Promise<unknown | null> {
    if (url.protocol !== 'https:' || !this.hostPermitido(url)) {
      throw new FonteIndisponivel(fonte, 'destino fora da allowlist');
    }

    const executar = this.configuracao.fetch ?? globalThis.fetch;
    const controle = new AbortController();
    const expira = setTimeout(
      () => controle.abort(),
      this.configuracao.timeoutMs,
    );

    try {
      let alvo = url;
      let resposta: Response;
      for (let saltos = 0; ; saltos += 1) {
        resposta = await executar(alvo.toString(), {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': this.configuracao.userAgent,
          },
          redirect: 'manual',
          signal: controle.signal,
        });
        if (resposta.status < 300 || resposta.status >= 400) {
          break;
        }

        const destino = this.destinoDoRedirect(alvo, resposta);
        if (!destino || saltos >= MAX_REDIRECTS) {
          throw new FonteIndisponivel(fonte, 'redirecionamento recusado');
        }
        alvo = destino;
      }

      if (resposta.status === 404) {
        return null;
      }
      if (!resposta.ok) {
        throw new FonteIndisponivel(fonte, `resposta ${resposta.status}`);
      }

      const texto = await this.lerComLimite(fonte, resposta);
      try {
        return JSON.parse(texto);
      } catch {
        throw new FonteIndisponivel(fonte, 'resposta não é JSON válido');
      }
    } catch (erro) {
      if (erro instanceof FonteIndisponivel) {
        throw erro;
      }
      if (controle.signal.aborted) {
        throw new FonteIndisponivel(fonte, 'tempo esgotado');
      }
      throw new FonteIndisponivel(fonte, 'falha de rede');
    } finally {
      clearTimeout(expira);
    }
  }

  /**
   * Destino do redirect, só se ele passaria pelas mesmas regras da URL original:
   * https e host da allowlist por igualdade exata. Caminho relativo resolve
   * contra a URL atual. Qualquer outra coisa é `null`, e o chamador recusa.
   */
  private destinoDoRedirect(atual: URL, resposta: Response): URL | null {
    const location = resposta.headers.get('location');
    if (!location) {
      return null;
    }
    let destino: URL;
    try {
      destino = new URL(location, atual);
    } catch {
      return null;
    }
    if (destino.protocol !== 'https:' || !this.hostPermitido(destino)) {
      return null;
    }
    if (destino.username || destino.password || destino.port) {
      return null;
    }
    return destino;
  }

  /**
   * Lê o corpo em pedaços e aborta ao passar do limite, em vez de chamar
   * `resposta.text()` e só depois medir — nesse ponto a resposta inteira já
   * estaria na memória, e o limite não teria protegido nada.
   */
  private async lerComLimite(
    fonte: string,
    resposta: Response,
  ): Promise<string> {
    const limite = this.configuracao.limiteRespostaBytes;

    const declarado = Number(resposta.headers.get('content-length') ?? '0');
    if (declarado > limite) {
      throw new FonteIndisponivel(fonte, 'resposta acima do limite');
    }

    const corpo = resposta.body;
    if (!corpo) {
      return resposta.text();
    }

    const leitor = corpo.getReader();
    const decodificador = new TextDecoder();
    let total = 0;
    let texto = '';

    for (;;) {
      const { done, value } = await leitor.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > limite) {
        await leitor.cancel();
        throw new FonteIndisponivel(fonte, 'resposta acima do limite');
      }
      texto += decodificador.decode(value, { stream: true });
    }

    return texto + decodificador.decode();
  }
}
