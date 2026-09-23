import { describe, expect, it, vi } from 'vitest'

import { enviarCapa, formatoDaImagem, LIMITE_DA_CAPA_EM_BYTES, validarCapa } from './capa'

const JPG = [0xff, 0xd8, 0xff, 0xe0]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const WEBP = [...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)))

function arquivo(cabecalho: number[], tamanho = 1024): Blob {
  const bytes = new Uint8Array(Math.max(tamanho, cabecalho.length))
  bytes.set(cabecalho)
  return new Blob([bytes])
}

const medida = (largura: number, altura: number) => vi.fn().mockResolvedValue({ largura, altura })

describe('formatoDaImagem', () => {
  it('reconhece JPG, PNG e WEBP pelos bytes, não pelo nome', () => {
    expect(formatoDaImagem(new Uint8Array(JPG))).toBe('jpg')
    expect(formatoDaImagem(new Uint8Array(PNG))).toBe('png')
    expect(formatoDaImagem(new Uint8Array(WEBP))).toBe('webp')
    expect(formatoDaImagem(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull()
  })
})

describe('validarCapa (RNF-SEC-20)', () => {
  it('aceita imagem válida', async () => {
    await expect(validarCapa(arquivo(PNG), medida(600, 800))).resolves.toBeNull()
  })

  it('recusa formato pelo conteúdo antes de medir', async () => {
    const medir = medida(600, 800)
    await expect(validarCapa(arquivo([0x4d, 0x5a]), medir)).resolves.toBe('Formato não aceito. Use JPG, PNG ou WEBP.')
    expect(medir).not.toHaveBeenCalled()
  })

  it('recusa acima de 5 MB nomeando o tamanho com vírgula', async () => {
    const grande = arquivo(JPG, Math.round(8.2 * 1024 * 1024))
    expect(grande.size).toBeGreaterThan(LIMITE_DA_CAPA_EM_BYTES)
    await expect(validarCapa(grande, medida(600, 800))).resolves.toBe('Essa imagem tem 8,2 MB. O limite é 5 MB.')
  })

  it.each([
    [80, 800],
    [600, 6001],
  ])('recusa dimensão fora de 100 a 6000 (%i x %i)', async (largura, altura) => {
    await expect(validarCapa(arquivo(WEBP), medida(largura, altura))).resolves.toBe(
      'A imagem precisa ter entre 100 e 6000 pixels de lado.',
    )
  })

  it('assinatura de imagem que não decodifica vira formato não aceito', async () => {
    await expect(validarCapa(arquivo(JPG), vi.fn().mockRejectedValue(new Error('decode')))).resolves.toBe(
      'Formato não aceito. Use JPG, PNG ou WEBP.',
    )
  })
})

/** XHR falso só com o que `enviarCapa` usa. */
class XhrFalso {
  static ultimo: XhrFalso
  metodo = ''
  url = ''
  timeout = 0
  status = 0
  responseText = ''
  corpo: FormData | null = null
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null
  onabort: (() => void) | null = null
  constructor() {
    XhrFalso.ultimo = this
  }
  open(metodo: string, url: string) {
    this.metodo = metodo
    this.url = url
  }
  send(corpo: FormData) {
    this.corpo = corpo
  }
  responder(status: number, corpo: unknown) {
    this.status = status
    this.responseText = JSON.stringify(corpo)
    this.onload?.()
  }
}

const criarRequisicao = () => new XhrFalso() as unknown as XMLHttpRequest

describe('enviarCapa', () => {
  it('sobe unsigned ao Cloudinary com o preset e devolve a secure_url', async () => {
    const progresso = vi.fn()
    const envio = enviarCapa(arquivo(PNG), progresso, { cloudName: 'leai', uploadPreset: 'leai_capas', criarRequisicao })
    const xhr = XhrFalso.ultimo

    expect(xhr.metodo).toBe('POST')
    expect(xhr.url).toBe('https://api.cloudinary.com/v1_1/leai/image/upload')
    expect(xhr.corpo?.get('upload_preset')).toBe('leai_capas')
    expect(xhr.corpo?.get('file')).toBeInstanceOf(Blob)

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent)
    expect(progresso).toHaveBeenCalledWith(0.5)

    const url = 'https://res.cloudinary.com/leai/image/upload/v1/capas/abc.png'
    xhr.responder(200, { secure_url: url })
    await expect(envio).resolves.toBe(url)
  })

  it.each([
    ['status diferente de 200', 400, { error: { message: 'Upload preset not found' } }],
    ['URL fora do Cloudinary', 200, { secure_url: 'https://exemplo.com/capa.png' }],
  ])('falha em %s', async (_caso, status, corpo) => {
    const envio = enviarCapa(arquivo(PNG), undefined, { cloudName: 'leai', uploadPreset: 'p', criarRequisicao })
    XhrFalso.ultimo.responder(status, corpo)
    await expect(envio).rejects.toThrow('Não foi possível enviar a capa. Tente de novo.')
  })

  it('falha sem preset configurado, sem tocar a rede', async () => {
    const criar = vi.fn(criarRequisicao)
    await expect(enviarCapa(arquivo(PNG), undefined, { cloudName: 'leai', uploadPreset: '', criarRequisicao: criar })).rejects.toThrow()
    expect(criar).not.toHaveBeenCalled()
  })
})
