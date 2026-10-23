import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { ApiError } from '../services/api'
import { MOTIVO_EM_BRANCO, MOTIVO_LONGO, useDenunciar, type AlvoDaDenuncia } from './useDenunciar'

const RESENHA: AlvoDaDenuncia = {
  tipo: 'resenha',
  id: 'r1',
  autorNome: 'Letícia Nakamura',
  autorAvatarUrl: null,
  livroTitulo: 'Torto Arado',
  texto: 'Conta tudo.',
}

function montar(alvo: AlvoDaDenuncia = RESENHA) {
  const denunciar = vi.fn()
  const escopo = effectScope()
  const tela = escopo.run(() => useDenunciar(alvo, { servico: { denunciar } }))!
  return { tela, denunciar, escopo }
}

function erroHttp(status: number): ApiError {
  return new ApiError('falhou', status, 'ERRO')
}

describe('useDenunciar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('revisar com o motivo vazio ou só com espaços mostra o erro e não troca de passo', () => {
    const { tela } = montar()

    tela.motivo.value = '   '
    expect(tela.revisar()).toBe(false)
    expect(tela.erroDoMotivo.value).toBe(MOTIVO_EM_BRANCO)
    expect(tela.passo.value).toBe('motivo')
  })

  it('o limite conta code points: 500 emojis passam, 501 mostram o erro de limite', () => {
    const { tela } = montar()

    tela.motivo.value = '😀'.repeat(501)
    expect(tela.caracteres.value).toBe(501)
    expect(tela.excede.value).toBe(true)
    expect(tela.revisar()).toBe(false)
    expect(tela.erroDoMotivo.value).toBe(MOTIVO_LONGO)

    tela.motivo.value = '😀'.repeat(500)
    expect(tela.revisar()).toBe(true)
    expect(tela.passo.value).toBe('confirmar')
  })

  it('envia o motivo aparado, com a via só quando há referência, e volta ok', async () => {
    const { tela, denunciar } = montar({ ...RESENHA, via: 'lista', referenciaId: 'lista-1' })
    denunciar.mockResolvedValue({ id: 'd1', estado: 'pendente', criadoEm: '2026-10-18T12:00:00Z' })
    tela.motivo.value = '  Conta o final.  '
    tela.revisar()

    expect(await tela.enviar()).toBe(true)
    expect(denunciar).toHaveBeenCalledWith(
      { alvoTipo: 'resenha', alvoId: 'r1', motivo: 'Conta o final.', via: 'lista', referenciaId: 'lista-1' },
      expect.any(String),
    )
  })

  it('tentar de novo depois de uma falha repete a mesma chave (RNF-ERR-04)', async () => {
    const { tela, denunciar } = montar()
    denunciar.mockRejectedValueOnce(new TypeError('rede')).mockResolvedValueOnce({})
    tela.motivo.value = 'Spam'
    tela.revisar()

    expect(await tela.enviar()).toBe(false)
    expect(tela.falha.value).toBe('conexao')
    expect(await tela.enviar()).toBe(true)

    expect(denunciar.mock.calls[0]![1]).toBe(denunciar.mock.calls[1]![1])
  })

  it('429 vira a faixa de frequência; 404 vira conteúdo indisponível', async () => {
    const { tela, denunciar } = montar()
    tela.motivo.value = 'Spam'
    tela.revisar()

    denunciar.mockRejectedValueOnce(erroHttp(429))
    await tela.enviar()
    expect(tela.falha.value).toBe('frequencia')
    expect(tela.passo.value).toBe('confirmar')

    denunciar.mockRejectedValueOnce(erroHttp(404))
    await tela.enviar()
    expect(tela.passo.value).toBe('indisponivel')
  })

  it('o aviso de partida a frio aparece depois de três segundos de envio', async () => {
    const { tela, denunciar } = montar()
    let concluir: (valor: unknown) => void = () => {}
    denunciar.mockReturnValue(new Promise((resolve) => (concluir = resolve)))
    tela.motivo.value = 'Spam'
    tela.revisar()

    const envio = tela.enviar()
    expect(tela.enviando.value).toBe(true)
    vi.advanceTimersByTime(2_999)
    expect(tela.coldStart.value).toBe(false)
    vi.advanceTimersByTime(1)
    expect(tela.coldStart.value).toBe(true)

    concluir({})
    await envio
    expect(tela.coldStart.value).toBe(false)
  })

  it('fechar com motivo escrito pergunta antes; vazio fecha direto; enviando não fecha', async () => {
    const { tela, denunciar } = montar()
    expect(tela.pedirFechar()).toBe(true)

    tela.motivo.value = 'Algo'
    expect(tela.pedirFechar()).toBe(false)
    expect(tela.passo.value).toBe('descartar')
    tela.continuarEscrevendo()
    expect(tela.passo.value).toBe('motivo')

    denunciar.mockReturnValue(new Promise(() => {}))
    tela.revisar()
    void tela.enviar()
    expect(tela.pedirFechar()).toBe(false)
    expect(tela.passo.value).toBe('confirmar')
  })
})
