import { enviarCapa, validarCapa, type OpcoesDeEnvio } from './capa'
import type { Avatar } from './perfil'

/**
 * Avatar do perfil (RF-SOC-01, RNF-SEC-20). Mesmo caminho da capa de livro pessoal: o navegador
 * valida pelos bytes, envia **direto ao Cloudinary** pelo preset unsigned `leai_avatares`, e o
 * `identidade` só recebe a URL e o `publicId`, sem nunca baixar a imagem. As regras de formato,
 * tamanho e dimensões são as de `validarCapa`; o preset limita de novo no upload.
 */
export const validarAvatar = validarCapa

export class FalhaNoEnvioDoAvatar extends Error {
  constructor() {
    super('Não foi possível enviar a foto. Tente de novo.')
    this.name = 'FalhaNoEnvioDoAvatar'
  }
}

/**
 * `.../image/upload/v1790275088/avatares/k7utfksh0rem2pvjravn.png` tem o `publicId`
 * `avatares/k7utfksh0rem2pvjravn`. O servidor faz a mesma extração e recusa se não bater, então
 * derivar daqui é equivalente a ler o `public_id` da resposta do Cloudinary.
 */
export function publicIdDaUrl(url: string): string | null {
  const encontrado = /\/image\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i.exec(new URL(url).pathname)
  return encontrado ? decodeURIComponent(encontrado[1]!) : null
}

export async function enviarAvatar(
  arquivo: Blob,
  aoProgredir: (fracao: number) => void = () => {},
  opcoes: OpcoesDeEnvio = {},
): Promise<Avatar> {
  const uploadPreset = opcoes.uploadPreset ?? import.meta.env.VITE_CLOUDINARY_AVATAR_PRESET ?? ''
  if (!uploadPreset) {
    throw new FalhaNoEnvioDoAvatar()
  }
  let url: string
  try {
    url = await enviarCapa(arquivo, aoProgredir, { ...opcoes, uploadPreset })
  } catch {
    throw new FalhaNoEnvioDoAvatar()
  }
  const publicId = publicIdDaUrl(url)
  if (!publicId) {
    throw new FalhaNoEnvioDoAvatar()
  }
  return { url, publicId }
}

/**
 * Miniatura quadrada pela transformação por URL do Cloudinary: o original pode ter até 1024 px,
 * e o perfil mostra no máximo 120. `lado` em pixels de CSS; o dobro cobre tela de alta densidade.
 */
export function miniaturaDoAvatar(url: string, lado: number): string {
  return url.replace('/image/upload/', `/image/upload/c_fill,g_face,w_${lado * 2},h_${lado * 2}/`)
}
