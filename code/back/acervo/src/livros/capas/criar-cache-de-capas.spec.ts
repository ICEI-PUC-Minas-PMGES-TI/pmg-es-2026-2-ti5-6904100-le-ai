import { CacheDeCapas } from './cache-de-capas.service';
import {
  criarCacheDeCapas,
  type ConfiguracaoDoCache,
} from './criar-cache-de-capas';

const CONFIGURACAO: ConfiguracaoDoCache = {
  CLOUDINARY_CLOUD_NAME: 'leai',
  CLOUDINARY_API_KEY: 'chave',
  CLOUDINARY_API_SECRET: 'segredo',
  CLOUDINARY_PASTA_CAPAS_OFICIAIS: 'capas-oficiais-teste',
  CAPA_HOSTS_PERMITIDOS: 'res.cloudinary.com',
  CAPAS_DOWNLOAD_HOSTS: 'covers.openlibrary.org,.us.archive.org',
  CAPAS_DOWNLOAD_TIMEOUT_MS: 1000,
  CAPAS_DOWNLOAD_LIMITE_BYTES: 5_242_880,
  FONTES_USER_AGENT: 'LeAi/teste',
};

describe('criarCacheDeCapas', () => {
  it('sem chave ou segredo do Cloudinary não há cache', () => {
    const fetch = jest.fn();
    for (const faltando of [
      { CLOUDINARY_API_KEY: undefined },
      { CLOUDINARY_API_SECRET: undefined },
      { CLOUDINARY_API_KEY: '' },
      { CLOUDINARY_API_SECRET: '' },
      { CLOUDINARY_API_KEY: undefined, CLOUDINARY_API_SECRET: undefined },
    ]) {
      expect(
        criarCacheDeCapas(
          { ...CONFIGURACAO, ...faltando },
          { fetch: fetch as unknown as typeof globalThis.fetch },
        ),
      ).toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('com chave e segredo monta o cache', () => {
    expect(criarCacheDeCapas(CONFIGURACAO)).toBeInstanceOf(CacheDeCapas);
  });
});
