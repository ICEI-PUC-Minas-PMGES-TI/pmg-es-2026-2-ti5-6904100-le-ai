import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Apaga capas de livro pessoal no Cloudinary na exclusão definitiva da conta
 * (F-CONTA-2, RN-23.7), pela Upload API `destroy` com assinatura SHA-1
 * (`public_id` e `timestamp` mais o segredo).
 *
 * Nunca lança: o asset sem referência não pode impedir a remoção dos dados.
 * Credencial ausente, falha de rede ou resposta inesperada vão para o log com o
 * `publicId`, que não identifica o leitor, para limpeza manual.
 */
@Injectable()
export class RemocaoDeAsset {
  private readonly logger = new Logger(RemocaoDeAsset.name);
  private readonly cloudName: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;

  constructor(config: ConfigService) {
    this.cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME') ?? 'leai';
    this.apiKey = config.get<string>('CLOUDINARY_API_KEY') || undefined;
    this.apiSecret = config.get<string>('CLOUDINARY_API_SECRET') || undefined;
  }

  /** `true` se o Cloudinary removeu ou o asset já não existia. */
  async apagar(publicId: string): Promise<boolean> {
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn(
        `Asset ${publicId} não removido: credencial do Cloudinary ausente`,
      );
      return false;
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const assinatura = createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${this.apiSecret}`)
      .digest('hex');
    const corpo = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: this.apiKey,
      signature: assinatura,
    });
    try {
      const resposta = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
        { method: 'POST', body: corpo, signal: AbortSignal.timeout(10_000) },
      );
      const texto = await resposta.text();
      // "ok" removeu; "not found" já não existia. Os dois cumprem o RN-23.7.
      const removido =
        resposta.ok && (texto.includes('"ok"') || texto.includes('not found'));
      if (!removido) {
        this.logger.warn(
          `Asset ${publicId} não removido: Cloudinary respondeu ${resposta.status}`,
        );
      }
      return removido;
    } catch {
      this.logger.warn(
        `Asset ${publicId} não removido: falha de rede com o Cloudinary`,
      );
      return false;
    }
  }
}
