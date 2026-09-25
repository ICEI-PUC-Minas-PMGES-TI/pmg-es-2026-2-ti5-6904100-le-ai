import { beforeEach, describe, expect, it, vi } from 'vitest'

import { enviarAvatar, FalhaNoEnvioDoAvatar, miniaturaDoAvatar, publicIdDaUrl } from './avatar'
import { enviarCapa } from './capa'

vi.mock('./capa', () => ({ enviarCapa: vi.fn(), validarCapa: vi.fn() }))

const URL_DO_AVATAR = 'https://res.cloudinary.com/leai/image/upload/v1790275088/avatares/k7utfksh0rem2pvjravn.png'

describe('publicIdDaUrl', () => {
  it('tira a versão e a extensão, como o servidor', () => {
    expect(publicIdDaUrl(URL_DO_AVATAR)).toBe('avatares/k7utfksh0rem2pvjravn')
    expect(publicIdDaUrl('https://res.cloudinary.com/leai/image/upload/avatares/b.webp')).toBe('avatares/b')
  })

  it('URL sem caminho de upload não tem publicId', () => {
    expect(publicIdDaUrl('https://res.cloudinary.com/leai/raw/avatares/b')).toBeNull()
  })
})

describe('enviarAvatar', () => {
  beforeEach(() => {
    vi.mocked(enviarCapa).mockReset()
  })

  it('envia pelo preset de avatar e devolve a URL com o publicId', async () => {
    vi.mocked(enviarCapa).mockResolvedValue(URL_DO_AVATAR)
    const arquivo = new Blob([new Uint8Array([0x89])])

    await expect(enviarAvatar(arquivo, undefined, { uploadPreset: 'leai_avatares' })).resolves.toEqual({
      url: URL_DO_AVATAR,
      publicId: 'avatares/k7utfksh0rem2pvjravn',
    })
    expect(enviarCapa).toHaveBeenCalledWith(arquivo, expect.any(Function), { uploadPreset: 'leai_avatares' })
  })

  it('falha do Cloudinary vira a mensagem da foto, não a da capa', async () => {
    vi.mocked(enviarCapa).mockRejectedValue(new Error('capa'))

    await expect(enviarAvatar(new Blob([]), undefined, { uploadPreset: 'p' })).rejects.toThrow(
      'Não foi possível enviar a foto. Tente de novo.',
    )
  })

  it('sem preset configurado não tenta enviar', async () => {
    await expect(enviarAvatar(new Blob([]), undefined, { uploadPreset: '' })).rejects.toBeInstanceOf(
      FalhaNoEnvioDoAvatar,
    )
    expect(enviarCapa).not.toHaveBeenCalled()
  })
})

describe('miniaturaDoAvatar', () => {
  it('pede ao Cloudinary um quadrado com o dobro do lado exibido', () => {
    expect(miniaturaDoAvatar(URL_DO_AVATAR, 96)).toBe(
      'https://res.cloudinary.com/leai/image/upload/c_fill,g_face,w_192,h_192/v1790275088/avatares/k7utfksh0rem2pvjravn.png',
    )
  })
})
