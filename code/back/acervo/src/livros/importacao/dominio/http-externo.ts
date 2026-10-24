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
 *
 * A URL inicial passa pelas mesmas regras de um salto: https, host da
 * allowlist, sem credencial e sem porta explícita.
 *
 * `baixarImagem` (F-ACV-NOTA, cache de capas) usa uma instância própria, com
 * `permitirSufixo`: as capas da OpenLibrary terminam em `iaNNNNNN.us.archive.org`,
 * que muda a cada pedido. Só nessa instância uma entrada que começa com ponto
 * (`.us.archive.org`) aceita subdomínios; as outras entradas continuam por
 * igualdade exata, e as fontes de metadados não ligam a opção.
 */
const MAX_REDIRECTS = 3;
export interface ConfiguracaoHttpExterno {
  hostsPermitidos: string[];
  timeoutMs: number;
  limiteRespostaBytes: number;
  userAgent: string;
  fetch?: typeof globalThis.fetch;
  /** Entrada `.dominio` aceita subdomínios. Desligado por padrão. */
  permitirSufixo?: boolean;
}

/**
 * Desfecho do download de uma imagem. Só a indisponibilidade (timeout, rede,
 * 5xx, 429 e 420) lança `FonteIndisponivel`, para o runtime tentar de novo;
 * ausência e recusa são respostas, e repetir não muda nada.
 */
export type ResultadoDoDownload =
  | { tipo: 'ok'; bytes: Uint8Array; contentType: string | null }
  | { tipo: 'ausente' }
  | { tipo: 'recusada'; motivo: string };

/** 429 e o 420 que algumas CDNs usam para limite de taxa: passa com o tempo. */
const STATUS_DE_LIMITE = new Set([420, 429]);

export class HttpExterno {
  constructor(private readonly configuracao: ConfiguracaoHttpExterno) {}

  hostPermitido(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return this.configuracao.hostsPermitidos.some((entrada) => {
      const permitido = entrada.trim().toLowerCase();
      if (this.configuracao.permitirSufixo && permitido.startsWith('.')) {
        return host.endsWith(permitido) && host.length > permitido.length;
      }
      return permitido === host;
    });
  }

  /** https, host da allowlist, sem credencial e sem porta explícita. */
  private urlPermitida(url: URL): boolean {
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      this.hostPermitido(url)
    );
  }

  /**
   * `null` quando a fonte respondeu 404 — ausência é resposta válida.
   * Lança `FonteIndisponivel` quando não deu para saber.
   */
  async buscarJson(fonte: string, url: URL): Promise<unknown | null> {
    if (!this.urlPermitida(url)) {
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
   * Baixa uma imagem com as mesmas proteções de `buscarJson` e devolve o
   * desfecho discriminado. Fora da allowlist, redirecionamento recusado, corpo
   * acima do limite e 4xx que não seja 404, 410 ou limite de taxa são
   * `recusada`; 404 e 410 são `ausente`.
   */
  async baixarImagem(fonte: string, url: URL): Promise<ResultadoDoDownload> {
    if (!this.urlPermitida(url)) {
      return { tipo: 'recusada', motivo: 'destino fora da allowlist' };
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
            Accept: 'image/*',
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
          return { tipo: 'recusada', motivo: 'redirecionamento recusado' };
        }
        alvo = destino;
      }

      if (resposta.status === 404 || resposta.status === 410) {
        return { tipo: 'ausente' };
      }
      if (STATUS_DE_LIMITE.has(resposta.status) || resposta.status >= 500) {
        throw new FonteIndisponivel(fonte, `resposta ${resposta.status}`);
      }
      if (!resposta.ok) {
        return { tipo: 'recusada', motivo: `resposta ${resposta.status}` };
      }

      const bytes = await this.lerBytesComLimite(resposta);
      if (!bytes) {
        return { tipo: 'recusada', motivo: 'resposta acima do limite' };
      }
      return {
        tipo: 'ok',
        bytes,
        contentType: resposta.headers.get('content-type'),
      };
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
    return this.urlPermitida(destino) ? destino : null;
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

  /** Como `lerComLimite`, em bytes; `null` quando passa do limite. */
  private async lerBytesComLimite(
    resposta: Response,
  ): Promise<Uint8Array | null> {
    const limite = this.configuracao.limiteRespostaBytes;
    const declarado = Number(resposta.headers.get('content-length') ?? '0');
    if (declarado > limite) {
      return null;
    }

    const corpo = resposta.body;
    if (!corpo) {
      const bytes = new Uint8Array(await resposta.arrayBuffer());
      return bytes.byteLength > limite ? null : bytes;
    }

    const leitor = corpo.getReader();
    const pedacos: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > limite) {
        await leitor.cancel();
        return null;
      }
      pedacos.push(value);
    }
    const bytes = new Uint8Array(total);
    let posicao = 0;
    for (const pedaco of pedacos) {
      bytes.set(pedaco, posicao);
      posicao += pedaco.byteLength;
    }
    return bytes;
  }
}
