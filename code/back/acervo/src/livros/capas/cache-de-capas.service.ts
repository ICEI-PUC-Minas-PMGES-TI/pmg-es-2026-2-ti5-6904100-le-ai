import { Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Tx } from '../../db/tipos';
import type { HttpExterno } from '../importacao/dominio/http-externo';
import type { PoliticaDeResiliencia } from '../importacao/dominio/politica-resiliencia';
import type { EnvioDeCapa } from './envio-de-capa';
import { validarImagem } from './validacao-de-imagem';

/** Desfecho de `cachear`, para o log, o backfill e os testes. */
export type DesfechoDoCache =
  | { tipo: 'cacheada'; bytes: number }
  | { tipo: 'ja_tinha' }
  | { tipo: 'ignorada' }
  | { tipo: 'ausente' }
  | { tipo: 'recusada'; motivo: string };

type Linhas<T> = { rows: T[] };

/**
 * Cache da capa oficial no Cloudinary (RF-ACV-17, RN-14).
 *
 * Baixa a capa externa pelo servidor, com a instância de `HttpExterno` das
 * capas (allowlist com sufixo, timeout e limite próprios, SEC-39), valida a
 * imagem (SEC-20), envia ao Cloudinary e grava a cópia própria.
 *
 * - Livro pessoal ou inexistente é ignorado (RN-14.7), e livro que já tem cópia
 *   não baixa de novo (RN-14.3).
 * - A gravação é condicional (`capa_url_propria IS NULL`), sem trava: dois
 *   eventos do mesmo livro ao mesmo tempo terminam no mesmo asset, porque o
 *   `public_id` é fixo e o upload não sobrescreve. Não toca `atualizado_em`,
 *   que é o relógio da sinopse.
 * - Ausente e recusada são respostas: o livro segue com a capa externa
 *   (RN-14.5) e o evento é confirmado. Só a indisponibilidade lança, e o runtime
 *   tenta de novo e depois manda à DLQ; o backfill recupera o que ficou lá.
 * - Sem retentativa aninhada: as políticas têm só o circuit breaker, uma para
 *   o download e outra para o upload, e quem tenta de novo é o runtime.
 */
export class CacheDeCapas {
  private readonly logger = new Logger(CacheDeCapas.name);

  constructor(
    private readonly http: HttpExterno,
    private readonly envio: EnvioDeCapa,
    private readonly resilienciaDoDownload: PoliticaDeResiliencia,
    private readonly resilienciaDoEnvio: PoliticaDeResiliencia,
  ) {}

  async cachear(tx: Tx, livroId: string): Promise<DesfechoDoCache> {
    const { rows } = (await tx.execute(sql`
      SELECT tipo, capa_url_externa, capa_url_propria
        FROM acervo.livro WHERE id = ${livroId}
    `)) as unknown as Linhas<{
      tipo: string;
      capa_url_externa: string | null;
      capa_url_propria: string | null;
    }>;
    const livro = rows[0];
    if (!livro || livro.tipo !== 'oficial') return { tipo: 'ignorada' };
    if (livro.capa_url_propria) return { tipo: 'ja_tinha' };
    if (!livro.capa_url_externa) return { tipo: 'ausente' };

    let origem: URL;
    try {
      origem = new URL(livro.capa_url_externa);
    } catch {
      return this.recusar(livroId, 'URL externa inválida');
    }
    // Sem isto, a OpenLibrary devolve um GIF genérico de 1 pixel para id
    // inexistente; com ele, responde 404.
    if (origem.hostname === 'covers.openlibrary.org') {
      origem.searchParams.set('default', 'false');
    }

    const download = await this.resilienciaDoDownload.executar('capas', () =>
      this.http.baixarImagem('capas', origem),
    );
    if (download.tipo === 'ausente') {
      this.logger.warn(`Capa do livro ${livroId} ausente na origem`);
      return { tipo: 'ausente' };
    }
    if (download.tipo === 'recusada') {
      return this.recusar(livroId, download.motivo);
    }

    const imagem = validarImagem(download.bytes);
    if (!imagem.valida) {
      return this.recusar(livroId, imagem.motivo);
    }

    const envio = await this.resilienciaDoEnvio.executar('cloudinary', () =>
      this.envio.enviar(livroId, download.bytes, imagem.formato),
    );
    if (envio.tipo === 'recusada') {
      return this.recusar(livroId, envio.motivo);
    }

    await tx.execute(sql`
      UPDATE acervo.livro
         SET capa_url_propria = ${envio.url}, capa_asset_id = ${envio.assetId}
       WHERE id = ${livroId} AND capa_url_propria IS NULL
    `);
    this.logger.log(
      `Capa do livro ${livroId} cacheada (${download.bytes.byteLength} bytes)`,
    );
    return { tipo: 'cacheada', bytes: download.bytes.byteLength };
  }

  private recusar(livroId: string, motivo: string): DesfechoDoCache {
    this.logger.warn(
      `Capa do livro ${livroId} recusada (${motivo}); segue a capa externa`,
    );
    return { tipo: 'recusada', motivo };
  }
}
