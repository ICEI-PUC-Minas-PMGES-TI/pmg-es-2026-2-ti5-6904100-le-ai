import { formatarMegabytes } from '../livros/formatos'

/**
 * Capa de livro pessoal (RN-14.7, RNF-SEC-20): o dono escolhe a imagem, o navegador valida e
 * envia **direto ao Cloudinary**, e o `acervo` só recebe a URL. O servidor nunca baixa a imagem;
 * ele confere host, caminho e extensão. Tipo real, tamanho e dimensões são conferidos aqui, para
 * a mensagem certa aparecer antes de gastar o upload, e de novo pelo preset do Cloudinary.
 * Mesmas regras de `code/mobile/lib/features/livros/capa.dart`.
 */
export const LIMITE_DA_CAPA_EM_BYTES = 5 * 1024 * 1024
export const LADO_MINIMO_DA_CAPA = 100
export const LADO_MAXIMO_DA_CAPA = 6000

const FORMATO_NAO_ACEITO = 'Formato não aceito. Use JPG, PNG ou WEBP.'

export type FormatoDeImagem = 'jpg' | 'png' | 'webp'

/**
 * Formato pelo conteúdo, não pela extensão nem pelo `type` do arquivo: renomear um `.exe` para
 * `.jpg` não o transforma em imagem.
 */
export function formatoDaImagem(bytes: Uint8Array): FormatoDeImagem | null {
  const comeca = (assinatura: number[], deslocamento = 0) =>
    bytes.length >= deslocamento + assinatura.length &&
    assinatura.every((byte, i) => bytes[deslocamento + i] === byte)
  const ascii = (texto: string) => [...texto].map((letra) => letra.charCodeAt(0))

  if (comeca([0xff, 0xd8, 0xff])) {
    return 'jpg'
  }
  if (comeca([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png'
  }
  if (comeca(ascii('RIFF')) && comeca(ascii('WEBP'), 8)) {
    return 'webp'
  }
  return null
}

export type MedirImagem = (arquivo: Blob) => Promise<{ largura: number; altura: number }>

/** `createImageBitmap` decodifica fora da árvore do DOM e já devolve as dimensões reais. */
const medirComBitmap: MedirImagem = async (arquivo) => {
  const bitmap = await createImageBitmap(arquivo)
  const medidas = { largura: bitmap.width, altura: bitmap.height }
  bitmap.close()
  return medidas
}

/**
 * Mensagem de recusa, ou `null` se a imagem pode subir. A ordem importa: formato e tamanho saem
 * dos bytes, sem decodificar; só a imagem que passou deles é decodificada para medir.
 */
export async function validarCapa(arquivo: Blob, medir: MedirImagem = medirComBitmap): Promise<string | null> {
  const cabecalho = new Uint8Array(await arquivo.slice(0, 16).arrayBuffer())
  if (formatoDaImagem(cabecalho) === null) {
    return FORMATO_NAO_ACEITO
  }
  if (arquivo.size > LIMITE_DA_CAPA_EM_BYTES) {
    return `Essa imagem tem ${formatarMegabytes(arquivo.size)}. O limite é 5 MB.`
  }
  try {
    const { largura, altura } = await medir(arquivo)
    if (Math.min(largura, altura) < LADO_MINIMO_DA_CAPA || Math.max(largura, altura) > LADO_MAXIMO_DA_CAPA) {
      return `A imagem precisa ter entre ${LADO_MINIMO_DA_CAPA} e ${LADO_MAXIMO_DA_CAPA} pixels de lado.`
    }
  } catch {
    // Assinatura de imagem com conteúdo que não decodifica: para quem escolheu, é formato errado.
    return FORMATO_NAO_ACEITO
  }
  return null
}

export class FalhaNoEnvioDaCapa extends Error {
  constructor() {
    super('Não foi possível enviar a capa. Tente de novo.')
    this.name = 'FalhaNoEnvioDaCapa'
  }
}

export interface OpcoesDeEnvio {
  cloudName?: string
  uploadPreset?: string
  timeoutMs?: number
  /** Injetável para o teste não depender de rede. */
  criarRequisicao?: () => XMLHttpRequest
}

/**
 * Upload **unsigned** para o Cloudinary, pelo preset configurado (P-09). Nenhum segredo vive no
 * cliente: o preset é público por natureza, e é ele que limita o que o Cloudinary aceita.
 * `XMLHttpRequest` e não `fetch`, porque só ele informa o progresso do envio.
 *
 * Devolve a `secure_url`, que vai para o `acervo` como `capaUrl`.
 */
export function enviarCapa(
  arquivo: Blob,
  aoProgredir: (fracao: number) => void = () => {},
  opcoes: OpcoesDeEnvio = {},
): Promise<string> {
  const cloudName = opcoes.cloudName ?? import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? ''
  const uploadPreset = opcoes.uploadPreset ?? import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? ''
  if (!cloudName || !uploadPreset) {
    return Promise.reject(new FalhaNoEnvioDaCapa())
  }

  return new Promise((resolve, reject) => {
    const xhr = opcoes.criarRequisicao?.() ?? new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`)
    xhr.timeout = opcoes.timeoutMs ?? 60_000
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable && evento.total > 0) {
        aoProgredir(evento.loaded / evento.total)
      }
    }
    xhr.onload = () => {
      try {
        const url: unknown = JSON.parse(xhr.responseText)?.secure_url
        if (xhr.status === 200 && typeof url === 'string' && url.startsWith('https://res.cloudinary.com/')) {
          aoProgredir(1)
          resolve(url)
          return
        }
      } catch {
        // Corpo que não é JSON cai na mesma recusa abaixo.
      }
      reject(new FalhaNoEnvioDaCapa())
    }
    xhr.onerror = () => reject(new FalhaNoEnvioDaCapa())
    xhr.ontimeout = () => reject(new FalhaNoEnvioDaCapa())
    xhr.onabort = () => reject(new FalhaNoEnvioDaCapa())

    const formulario = new FormData()
    formulario.append('upload_preset', uploadPreset)
    formulario.append('file', arquivo)
    xhr.send(formulario)
  })
}
