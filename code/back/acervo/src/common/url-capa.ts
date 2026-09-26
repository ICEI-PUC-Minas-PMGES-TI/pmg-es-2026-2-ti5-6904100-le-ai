import { ErroDeValidacao } from './erros-de-negocio';

/**
 * Validação da URL de capa de livro pessoal (RNF-SEC-20, RNF-SEC-38).
 *
 * O upload vai **direto do cliente para o Cloudinary** (RN-14.7: capa de livro
 * pessoal é enviada pelo dono e não passa pelo cache de capas de RN-14). O que
 * chega aqui é só a URL do asset já criado, e a única coisa que o servidor pode
 * garantir é que ela aponta para o nosso próprio serviço de imagens.
 *
 * **O servidor nunca faz fetch desta URL.** Ela é persistida e devolvida, nada
 * mais. É por isso que não há risco de SSRF aqui — e é por isso que ninguém
 * deve acrescentar depois uma checagem de dimensões que baixe a imagem: isso
 * transformaria um campo de texto em um leitor de URL do usuário, que é
 * exatamente o que RNF-SEC-38/39 proíbem. Tipo real, tamanho e dimensões são
 * validados pelo upload preset do Cloudinary (P-09) e pelo cliente.
 */

export interface CapaValidada {
  /** Vai para `livro.capa_url_propria`. */
  url: string;
  /**
   * Vai para `livro.capa_asset_id`. O CHECK `livro_capa_propria_asset_ck` exige
   * que os dois estejam preenchidos ou os dois nulos.
   */
  assetId: string;
}

const EXTENSOES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
const TAMANHO_MAXIMO_DA_URL = 2048;

export interface ConfiguracaoDeCapa {
  hostsPermitidos: string[];
  cloudName: string;
}

function recusar(): never {
  throw new ErroDeValidacao([
    {
      campo: 'capaUrl',
      mensagem: 'Informe uma URL de capa válida enviada ao serviço de imagens.',
    },
  ]);
}

export function validarUrlDeCapa(
  bruta: string,
  configuracao: ConfiguracaoDeCapa,
): CapaValidada {
  if (typeof bruta !== 'string' || bruta.length > TAMANHO_MAXIMO_DA_URL) {
    recusar();
  }

  let url: URL;
  try {
    url = new URL(bruta);
  } catch {
    recusar();
  }

  if (url.protocol !== 'https:') {
    recusar();
  }
  // Credencial embutida e porta explícita não aparecem em URL legítima do
  // Cloudinary e são os disfarces clássicos de uma URL forjada.
  if (url.username || url.password || url.port || url.hash) {
    recusar();
  }

  // Igualdade exata, nunca `endsWith`: `res.cloudinary.com.invasor.com`
  // terminaria com o host permitido e passaria por uma checagem de sufixo.
  const host = url.hostname.toLowerCase();
  if (
    !configuracao.hostsPermitidos.some(
      (permitido) => permitido.toLowerCase() === host,
    )
  ) {
    recusar();
  }

  const prefixo = `/${configuracao.cloudName}/image/upload/`;
  if (!url.pathname.startsWith(prefixo)) {
    recusar();
  }

  const resto = url.pathname.slice(prefixo.length);
  const extensao = resto.split('.').pop()?.toLowerCase();
  if (!extensao || !EXTENSOES_PERMITIDAS.includes(extensao)) {
    recusar();
  }

  const assetId = extrairPublicId(resto);
  if (!assetId) {
    recusar();
  }

  return { url: url.toString(), assetId };
}

/**
 * `public_id` do asset: o caminho depois de `/upload/`, sem o segmento de
 * versão (`v1699999999/`) e sem a extensão. Transformações (`w_400,c_fill/`)
 * ficam de fora porque não identificam o asset.
 */
function extrairPublicId(caminho: string): string | null {
  const segmentos = caminho.split('/').filter(Boolean);

  const inicio = segmentos.findIndex((segmento) => /^v[0-9]+$/.test(segmento));
  const relevantes = inicio >= 0 ? segmentos.slice(inicio + 1) : segmentos;
  if (!relevantes.length) {
    return null;
  }

  const completo = relevantes.join('/');
  const semExtensao = completo.replace(/\.[^./]+$/, '');
  return semExtensao || null;
}
