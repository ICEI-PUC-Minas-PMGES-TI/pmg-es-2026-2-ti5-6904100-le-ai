import { assinar } from '../../common/cloudinary';
import { validarUrlDeCapa } from '../../common/url-capa';
import { FonteIndisponivel } from '../importacao/dominio/fonte-metadados';
import type { FormatoDeCapa } from './validacao-de-imagem';

/** Upload pelo servidor: mais folgado que o download, que é de 15 s. */
export const TIMEOUT_DO_ENVIO_MS = 20_000;

const TIPOS: Record<FormatoDeCapa, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export interface ConfiguracaoDoEnvio {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** `capas-oficiais` no DES e `capas-oficiais-dev` em dev: o cloud é o mesmo. */
  pasta: string;
  /** Hosts aceitos na URL devolvida (`CAPA_HOSTS_PERMITIDOS`). */
  hostsPermitidos: string[];
  fetch?: typeof globalThis.fetch;
  agora?: () => number;
}

export type ResultadoDoEnvio =
  | { tipo: 'ok'; url: string; assetId: string }
  | { tipo: 'recusada'; motivo: string };

/**
 * Envia a capa oficial ao Cloudinary pela Upload API assinada (RF-ACV-17,
 * RN-14.2). O `public_id` é `<pasta>/<livroId>`: um asset por livro e por
 * ambiente, e `overwrite=false` faz um segundo envio (evento repetido, outro
 * ambiente) devolver o asset que já existe em vez de trocá-lo.
 *
 * A resposta não é confiada por origem: a URL passa por `validarUrlDeCapa`, a
 * mesma regra da capa de livro pessoal, e o `public_id` devolvido precisa ser o
 * pedido.
 *
 * 400 é recusa (o Cloudinary não aceitou a imagem) e vira ACK. Timeout, rede,
 * 5xx, 429 e 420 lançam `FonteIndisponivel`, para o runtime tentar de novo. Os
 * outros 4xx (credencial errada, por exemplo) também lançam: são configuração,
 * e vão para a DLQ com o erro no log em vez de sumirem como recusa.
 */
export class EnvioDeCapa {
  constructor(private readonly configuracao: ConfiguracaoDoEnvio) {}

  async enviar(
    livroId: string,
    bytes: Uint8Array,
    formato: FormatoDeCapa,
  ): Promise<ResultadoDoEnvio> {
    const { cloudName, apiKey, apiSecret, pasta } = this.configuracao;
    const publicId = `${pasta}/${livroId}`;
    const timestamp = Math.floor(
      (this.configuracao.agora ?? Date.now)() / 1000,
    );
    const parametros = {
      allowed_formats: 'jpg,png,webp',
      asset_folder: pasta,
      overwrite: 'false',
      public_id: publicId,
      timestamp,
    };

    const corpo = new FormData();
    for (const [chave, valor] of Object.entries(parametros)) {
      corpo.append(chave, String(valor));
    }
    corpo.append('api_key', apiKey);
    corpo.append('signature', assinar(parametros, apiSecret));
    corpo.append(
      'file',
      // A cópia garante um `ArrayBuffer` comum, que é o que o `Blob` aceita.
      new Blob([new Uint8Array(bytes)], { type: TIPOS[formato] }),
      `${livroId}.${formato}`,
    );

    const executar = this.configuracao.fetch ?? globalThis.fetch;
    let resposta: Response;
    try {
      resposta = await executar(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: corpo,
          signal: AbortSignal.timeout(TIMEOUT_DO_ENVIO_MS),
        },
      );
    } catch (erro) {
      const tempo =
        erro instanceof Error &&
        (erro.name === 'TimeoutError' || erro.name === 'AbortError');
      throw new FonteIndisponivel(
        'cloudinary',
        tempo ? 'tempo esgotado' : 'falha de rede',
      );
    }

    if (resposta.status === 400) {
      return { tipo: 'recusada', motivo: 'Cloudinary recusou a imagem' };
    }
    if (!resposta.ok) {
      throw new FonteIndisponivel('cloudinary', `resposta ${resposta.status}`);
    }

    let dados: { secure_url?: unknown; public_id?: unknown };
    try {
      dados = (await resposta.json()) as typeof dados;
    } catch {
      return { tipo: 'recusada', motivo: 'resposta do Cloudinary ilegível' };
    }
    try {
      const capa = validarUrlDeCapa(String(dados.secure_url ?? ''), {
        hostsPermitidos: this.configuracao.hostsPermitidos,
        cloudName,
      });
      if (capa.assetId !== publicId || dados.public_id !== publicId) {
        return { tipo: 'recusada', motivo: 'asset diferente do pedido' };
      }
      return { tipo: 'ok', url: capa.url, assetId: capa.assetId };
    } catch {
      return { tipo: 'recusada', motivo: 'URL de resposta inválida' };
    }
  }
}
