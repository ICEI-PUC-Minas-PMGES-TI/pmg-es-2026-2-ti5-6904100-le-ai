import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EstadoDeLeitura } from '../../estante/acoesDisponiveis'
import {
  CONFIRMACAO_ABANDONAR_LEITURA,
  CONFIRMACAO_ABANDONAR_RELEITURA,
  CONFIRMACAO_REMOVER,
  TEXTOS_DE_ACAO,
} from '../../estante/textos'
import { ApiError } from '../../services/api'
import { leitura } from '../../testes/estante'
import AcoesLeitura from './AcoesLeitura.vue'

const servico = vi.hoisted(() => ({
  adicionarEstante: vi.fn(),
  removerEstante: vi.fn(),
  iniciarLeitura: vi.fn(),
  iniciarReleitura: vi.fn(),
  finalizarLeitura: vi.fn(),
  abandonarLeitura: vi.fn(),
  retomarLeitura: vi.fn(),
}))

vi.mock('../../services/leitura', async (original) => ({
  ...(await original<typeof import('../../services/leitura')>()),
  leituraService: servico,
}))

const LIVRO = { livroId: 'livro-1', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null }

let wrapper: VueWrapper | null = null

function montar(estado: EstadoDeLeitura) {
  wrapper = mount(AcoesLeitura, { props: { aberta: true, livro: LIVRO, estado }, attachTo: document.body })
  return wrapper
}

function rotulosDasAcoes(): string[] {
  return [...document.body.querySelectorAll('[role="dialog"] ul button')].map((botao) => botao.textContent!.trim())
}

function botao(texto: string): HTMLButtonElement {
  const alvo = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === texto)
  if (!alvo) throw new Error(`Botão "${texto}" não encontrado`)
  return alvo
}

async function clicar(texto: string): Promise<void> {
  botao(texto).click()
  await flushPromises()
}

function dialogo(): string {
  return document.body.querySelector('[role="dialog"]')!.textContent!
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 8, 10))
  servico.adicionarEstante.mockResolvedValue({ livroId: 'livro-1', status: 'QUERO_LER' })
  servico.removerEstante.mockResolvedValue(undefined)
  servico.iniciarLeitura.mockResolvedValue(leitura({ paginaAtual: 0 }))
  servico.iniciarReleitura.mockResolvedValue(leitura({ status: 'RELENDO', releitura: true }))
  servico.finalizarLeitura.mockResolvedValue(leitura({ status: 'LIDO', vezesLido: 2 }))
  servico.abandonarLeitura.mockResolvedValue(leitura({ status: 'ABANDONADO', retomavel: true }))
  servico.retomarLeitura.mockResolvedValue(leitura())
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.useRealTimers()
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

describe('AcoesLeitura', () => {
  it.each<[string, EstadoDeLeitura, string[]]>([
    ['fora da estante', { status: null }, ['Adicionar como Quero ler', 'Iniciar leitura']],
    ['Quero ler', { status: 'QUERO_LER' }, ['Iniciar leitura', 'Remover da estante']],
    ['Lendo', { status: 'LENDO', leitura: leitura() }, ['Registrar progresso', 'Finalizar leitura', 'Abandonar leitura']],
    ['Relendo', { status: 'RELENDO', leitura: leitura({ status: 'RELENDO', releitura: true }) }, ['Registrar progresso', 'Finalizar releitura', 'Abandonar releitura']],
    ['Lido', { status: 'LIDO' }, ['Iniciar releitura']],
    ['Abandonado', { status: 'ABANDONADO', leitura: leitura({ status: 'ABANDONADO', retomavel: true, paginaAtual: 210, totalPaginas: 552 }) }, ['Retomar leitura']],
  ])('%s mostra só as ações de RN-04', async (_nome, estado, esperadas) => {
    montar(estado)
    await flushPromises()
    expect(rotulosDasAcoes()).toEqual(esperadas)
  })

  it('Abandonado mostra onde parou e para onde volta', async () => {
    montar({ status: 'ABANDONADO', leitura: leitura({ status: 'ABANDONADO', retomavel: true, paginaAtual: 210, totalPaginas: 552 }) })
    await flushPromises()
    expect(dialogo()).toContain('Parou na página 210 de 552')
    expect(dialogo()).toContain('Você volta para a página 210, onde parou.')
  })

  it('abandonar a primeira leitura confirma com a página de parada antes de chamar o servidor', async () => {
    const tela = montar({ status: 'LENDO', leitura: leitura() })
    await flushPromises()
    await clicar('Abandonar leitura')

    expect(dialogo()).toContain(CONFIRMACAO_ABANDONAR_LEITURA.titulo)
    expect(dialogo()).toContain(CONFIRMACAO_ABANDONAR_LEITURA.texto(148))
    expect(servico.abandonarLeitura).not.toHaveBeenCalled()

    await clicar('Abandonar leitura')
    expect(servico.abandonarLeitura).toHaveBeenCalledWith('lei-1', expect.any(String))
    expect(tela.emitted('atualizado')![0]![0]).toMatchObject({ status: 'ABANDONADO' })
  })

  it('abandonar releitura usa a copy da releitura, nunca a da primeira leitura', async () => {
    montar({ status: 'RELENDO', leitura: leitura({ status: 'RELENDO', releitura: true }) })
    await flushPromises()
    await clicar('Abandonar releitura')

    expect(dialogo()).toContain(CONFIRMACAO_ABANDONAR_RELEITURA.titulo)
    expect(dialogo()).toContain(CONFIRMACAO_ABANDONAR_RELEITURA.texto)
    expect(dialogo()).not.toContain(CONFIRMACAO_ABANDONAR_LEITURA.titulo)
  })

  it('remover da estante exige confirmação e cancelar não chama o servidor', async () => {
    const tela = montar({ status: 'QUERO_LER' })
    await flushPromises()
    await clicar('Remover da estante')

    expect(dialogo()).toContain(CONFIRMACAO_REMOVER.texto)
    expect(servico.removerEstante).not.toHaveBeenCalled()
    await clicar('Cancelar')
    expect(servico.removerEstante).not.toHaveBeenCalled()
    expect(rotulosDasAcoes()).toEqual(['Iniciar leitura', 'Remover da estante'])

    await clicar('Remover da estante')
    await clicar('Remover da estante')
    expect(servico.removerEstante).toHaveBeenCalledWith('livro-1', expect.any(String))
    expect(tela.emitted('atualizado')![0]![0]).toEqual({ status: null, leitura: null })
  })

  it('iniciar leitura abre a data de hoje, editável, e manda a data escolhida', async () => {
    const tela = montar({ status: 'QUERO_LER' })
    await flushPromises()
    await clicar('Iniciar leitura')

    const campo = document.body.querySelector<HTMLInputElement>('input[type="date"]')!
    expect(campo.value).toBe('2026-09-08')
    expect(dialogo()).toContain(TEXTOS_DE_ACAO.ajudaDataInicio)
    campo.value = '2026-09-01'
    campo.dispatchEvent(new Event('input'))
    await flushPromises()
    await clicar('Iniciar leitura')

    expect(servico.iniciarLeitura).toHaveBeenCalledWith({ livroId: 'livro-1', dataInicio: '2026-09-01' }, expect.any(String))
    expect(tela.emitted('atualizado')![0]![0]).toMatchObject({ status: 'LENDO' })
    expect(tela.emitted('fechar')).toHaveLength(1)
  })

  it('recusa data no futuro sem chamar o servidor', async () => {
    montar({ status: 'QUERO_LER' })
    await flushPromises()
    await clicar('Iniciar leitura')
    const campo = document.body.querySelector<HTMLInputElement>('input[type="date"]')!
    campo.value = '2026-09-09'
    campo.dispatchEvent(new Event('input'))
    await flushPromises()
    await clicar('Iniciar leitura')

    expect(servico.iniciarLeitura).not.toHaveBeenCalled()
    expect(dialogo()).toContain('Escolha uma data até hoje.')
  })

  it('finalizar manda data de fim e o fuso do dispositivo, e avisa a próxima conclusão', async () => {
    montar({ status: 'LENDO', leitura: leitura({ vezesLido: 1 }) })
    await flushPromises()
    await clicar('Finalizar leitura')

    expect(dialogo()).toContain('Esta será sua 2ª conclusão deste livro.')
    await clicar('Finalizar leitura')
    expect(servico.finalizarLeitura).toHaveBeenCalledWith(
      'lei-1',
      { dataFim: '2026-09-08', fusoHorarioDispositivo: Intl.DateTimeFormat().resolvedOptions().timeZone },
      expect.any(String),
    )
  })

  it('falha de rede mostra o erro de salvar, e tentar de novo reaproveita a chave', async () => {
    servico.iniciarLeitura.mockRejectedValueOnce(new ApiError('sem rede', 0, 'SERVICO_INDISPONIVEL'))
    const tela = montar({ status: 'QUERO_LER' })
    await flushPromises()
    await clicar('Iniciar leitura')
    await clicar('Iniciar leitura')

    expect(dialogo()).toContain(TEXTOS_DE_ACAO.erroAoSalvar)
    expect(botao('Iniciar leitura').disabled).toBe(false)
    expect(tela.emitted('atualizado')).toBeUndefined()

    await clicar('Iniciar leitura')
    const chaves = servico.iniciarLeitura.mock.calls.map((chamada) => chamada[1])
    expect(chaves).toHaveLength(2)
    expect(chaves[0]).toBe(chaves[1])
    expect(tela.emitted('atualizado')).toHaveLength(1)
  })

  it('ação direta que falha mostra o banner de erro na lista', async () => {
    servico.adicionarEstante.mockRejectedValueOnce(new ApiError('demorou', 0, 'TEMPO_LIMITE_EXCEDIDO'))
    montar({ status: null })
    await flushPromises()
    await clicar('Adicionar como Quero ler')

    expect(document.body.querySelector('[role="alert"]')!.textContent).toContain(TEXTOS_DE_ACAO.erroAoSalvar)
  })

  it('salvando trava o formulário e troca o rótulo, sem spinner', async () => {
    servico.iniciarLeitura.mockReturnValueOnce(new Promise(() => {}))
    montar({ status: 'QUERO_LER' })
    await flushPromises()
    await clicar('Iniciar leitura')
    await clicar('Iniciar leitura')

    expect(botao('Salvando').disabled).toBe(true)
    expect(document.body.querySelector<HTMLInputElement>('input[type="date"]')!.disabled).toBe(true)
  })

  it('registrar progresso é entregue a quem hospeda o painel', async () => {
    const tela = montar({ status: 'LENDO', leitura: leitura() })
    await flushPromises()
    await clicar('Registrar progresso')
    expect(tela.emitted('registrarProgresso')).toHaveLength(1)
  })
})
