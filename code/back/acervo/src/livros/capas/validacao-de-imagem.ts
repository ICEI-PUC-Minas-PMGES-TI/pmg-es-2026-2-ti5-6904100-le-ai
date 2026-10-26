import { imageSize } from 'image-size';

/** Lado mínimo e máximo da capa, em pixels (RNF-SEC-20). */
export const LADO_MINIMO_PX = 50;
export const LADO_MAXIMO_PX = 5000;

export type FormatoDeCapa = 'jpg' | 'png' | 'webp';

export type ResultadoDaValidacao =
  | { valida: true; formato: FormatoDeCapa; largura: number; altura: number }
  | { valida: false; motivo: string };

/**
 * Validação da capa baixada antes do upload (RNF-SEC-20, RN-14): o tipo pelos
 * bytes, nunca pelo `Content-Type` nem pela extensão, e as dimensões.
 *
 * - **Início e fim do arquivo.** Os magic bytes dizem o formato (só JPEG, PNG ou
 *   WebP), e o fim confirma que o arquivo chegou inteiro: `FFD9` no JPEG, o
 *   chunk `IEND` no PNG e o tamanho declarado no cabeçalho RIFF do WebP. O
 *   `image-size` lê só o cabeçalho e aceitaria um arquivo truncado.
 * - **Dimensões** de 50 a 5000 px por lado, lidas pelo `image-size`, que
 *   precisa concordar com o formato dos magic bytes.
 */
export function validarImagem(bytes: Uint8Array): ResultadoDaValidacao {
  const formato = formatoPeloConteudo(bytes);
  if (!formato) {
    return { valida: false, motivo: 'formato não aceito' };
  }
  if (!terminaInteiro(bytes, formato)) {
    return { valida: false, motivo: 'arquivo truncado' };
  }

  let dimensoes: { width?: number; height?: number; type?: string };
  try {
    dimensoes = imageSize(bytes);
  } catch {
    return { valida: false, motivo: 'dimensões ilegíveis' };
  }
  const tipo = dimensoes.type === 'jpeg' ? 'jpg' : dimensoes.type;
  if (tipo !== formato) {
    return { valida: false, motivo: 'formato divergente' };
  }

  const { width: largura, height: altura } = dimensoes;
  if (
    !largura ||
    !altura ||
    largura < LADO_MINIMO_PX ||
    altura < LADO_MINIMO_PX ||
    largura > LADO_MAXIMO_PX ||
    altura > LADO_MAXIMO_PX
  ) {
    return { valida: false, motivo: 'dimensões fora do limite' };
  }
  return { valida: true, formato, largura, altura };
}

function comeca(bytes: Uint8Array, assinatura: number[], desde = 0): boolean {
  return assinatura.every((byte, i) => bytes[desde + i] === byte);
}

const ASCII = (texto: string) => [...texto].map((c) => c.charCodeAt(0));

function formatoPeloConteudo(bytes: Uint8Array): FormatoDeCapa | null {
  if (comeca(bytes, [0xff, 0xd8, 0xff])) return 'jpg';
  if (comeca(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }
  if (comeca(bytes, ASCII('RIFF')) && comeca(bytes, ASCII('WEBP'), 8)) {
    return 'webp';
  }
  return null;
}

function terminaInteiro(bytes: Uint8Array, formato: FormatoDeCapa): boolean {
  const n = bytes.byteLength;
  switch (formato) {
    case 'jpg':
      return n >= 4 && bytes[n - 2] === 0xff && bytes[n - 1] === 0xd9;
    case 'png':
      // O último chunk: tamanho 0, `IEND` e o CRC de 4 bytes.
      return n >= 12 && comeca(bytes, ASCII('IEND'), n - 8);
    case 'webp': {
      if (n < 12) return false;
      const tamanho =
        bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
      return tamanho + 8 === n;
    }
  }
}
