import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import { leituraService, type Progresso, type ProgressoComResumo } from '../../services/leitura'
import RegistrarProgresso from './RegistrarProgresso.vue'

vi.mock('../../services/leitura', () => ({
  leituraService: { registrarProgresso: vi.fn(), editarUltimoProgresso: vi.fn(), excluirTrechoProgresso: vi.fn() },
}))

const servico = vi.mocked(leituraService)

const LEITURA = { leituraId: 'lei-1', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', paginaAtual: 148, totalPaginas: 264 }

const ULTIMO: Progresso = {
  id: 'p-2',
  leituraId: 'lei-1',
  posicao: 2,
  pagina: 148,
  paginaAnterior: 120,
  paginasLidas: 28,
  minutos: 75,
  registradoEmDispositivo: '2026-09-08T21:14:00-03:00',
  fusoHorarioDispositivo: 'America/Sao_Paulo',
  dataLocal: '2026-09-08',
  criadoEm: '2026-09-09T00:14:00Z',
}

function resultado(pagina: number, minutos: number): ProgressoComResumo {
  return {
    progresso: { ...ULTIMO, id: 'p-3', posicao: 3, pagina, paginaAnterior: 148, paginasLidas: pagina - 148, minutos },
    resumo: { paginaAtual: pagina, totalPaginas: 264, percentualConcluido: 65, minutosTotais: 260 },
  }
}

function montar(props: Record<string, unknown> = {}) {
  return mount(RegistrarProgresso, { props: { aberta: true, leitura: LEITURA, ...props }, attachTo: document.body })
}

function campo(nome: string): HTMLInputElement {
  return document.querySelector<HTMLInputElement>(`[data-campo="${nome}"] input`)!
}

async function digitar(nome: string, valor: string): Promise<void> {
  const alvo = campo(nome)
  alvo.value = valor
  alvo.dispatchEvent(new Event('input'))
  await flushPromises()
}

async function enviar(): Promise<void> {
  document.querySelector('form')!.dispatchEvent(new Event('submit'))
  await flushPromises()
}

function texto(): string {
  return document.body.textContent ?? ''
}

describe('RegistrarProgresso', () => {
  beforeEach(() => {
    servico.registrarProgresso.mockReset()
    servico.editarUltimoProgresso.mockReset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('abre com a página atual, helpers visíveis, foco na página e sem derivado', async () => {
    montar()
    await flushPromises()

    expect(texto()).toContain('Registrar progresso')
    expect(texto()).toContain('Página 148 de 264')
    expect(texto()).toContain('Entre 149 e 264. Informe onde você parou, não quantas páginas leu.')
    expect(document.activeElement).toBe(campo('pagina'))
    expect(document.querySelector('[data-derivado]')).toBeNull()
  })

  it('mostra as páginas lidas enquanto digita e some quando a página é inválida', async () => {
    montar()
    await digitar('pagina', '172')
    expect(document.querySelector('[data-derivado]')!.textContent).toContain('Você leu 24 páginas')

    await digitar('pagina', '140')
    expect(document.querySelector('[data-derivado]')).toBeNull()

    await digitar('pagina', '300')
    expect(document.querySelector('[data-derivado]')).toBeNull()
  })

  it.each([
    ['140', 'Você já está na página 148. Informe uma página maior.'],
    ['148', 'Você já está na página 148. Informe uma página maior.'],
    ['300', 'O livro tem 264 páginas. Informe uma página até 264.'],
  ])('página %s mostra o erro no campo sem chamar o servidor', async (pagina, mensagem) => {
    montar()
    await digitar('pagina', pagina)
    await digitar('minutos', '30')
    await enviar()

    expect(campo('pagina').getAttribute('aria-invalid')).toBe('true')
    expect(texto()).toContain(mensagem)
    expect(texto()).toContain('Entre 149 e 264.')
    expect(servico.registrarProgresso).not.toHaveBeenCalled()
  })

  it.each([
    ['12', '1', 'Informe até 12 horas de leitura por registro.'],
    ['1,5', '', 'Informe o tempo em horas e minutos inteiros.'],
  ])('tempo %sh %smin é recusado no cliente', async (horas, minutos, mensagem) => {
    montar()
    await digitar('pagina', '172')
    await digitar('horas', horas)
    await digitar('minutos', minutos)
    await enviar()

    expect(document.querySelector('[data-erro="tempo"]')!.textContent).toContain(mensagem)
    expect(campo('pagina').getAttribute('aria-invalid')).toBeNull()
    expect(servico.registrarProgresso).not.toHaveBeenCalled()
  })

  it('registra com página e minutos somados e emite salvo com o resumo', async () => {
    servico.registrarProgresso.mockResolvedValue(resultado(172, 45))
    const wrapper = montar()
    await digitar('pagina', '172')
    await digitar('horas', '0')
    await digitar('minutos', '45')
    await enviar()

    expect(servico.registrarProgresso).toHaveBeenCalledWith(
      'lei-1',
      expect.objectContaining({ pagina: 172, minutos: 45 }),
      expect.any(String),
    )
    expect(wrapper.emitted('salvo')).toEqual([[resultado(172, 45)]])
  })

  it('registra sem minutos quando o tempo fica vazio', async () => {
    servico.registrarProgresso.mockResolvedValue(resultado(172, 0))
    montar()
    await digitar('pagina', '172')
    await enviar()

    const entrada = servico.registrarProgresso.mock.calls[0][1]
    expect(entrada.pagina).toBe(172)
    expect(entrada).not.toHaveProperty('minutos')
    expect(document.querySelector('[data-erro="tempo"]')).toBeNull()
  })

  it('aceita tempo zero informado', async () => {
    servico.registrarProgresso.mockResolvedValue(resultado(172, 0))
    montar()
    await digitar('pagina', '172')
    await digitar('horas', '0')
    await digitar('minutos', '0')
    await enviar()

    expect(servico.registrarProgresso).toHaveBeenCalledWith('lei-1', expect.objectContaining({ pagina: 172, minutos: 0 }), expect.any(String))
  })

  it('desabilita os campos e troca o botão para Salvando enquanto envia', async () => {
    let concluir: (valor: ProgressoComResumo) => void = () => {}
    servico.registrarProgresso.mockReturnValue(new Promise((resolver) => (concluir = resolver)))
    const wrapper = montar()
    await digitar('pagina', '172')
    await digitar('horas', '1')
    await enviar()

    const botao = document.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(botao.textContent?.trim()).toBe('Salvando')
    expect(botao.disabled).toBe(true)
    expect(campo('pagina').disabled).toBe(true)
    expect(campo('horas').disabled).toBe(true)
    expect(campo('minutos').disabled).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    document.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('fechar')).toBeUndefined()

    concluir(resultado(172, 60))
    await flushPromises()
    expect(botao.textContent?.trim()).toBe('Salvar')
  })

  it('422 do servidor aparece no campo correspondente', async () => {
    servico.registrarProgresso.mockRejectedValue(
      new ApiError('dados inválidos', 422, 'VALIDACAO', undefined, {
        campos: [{ campo: 'pagina', mensagem: 'Você já está na página 160. Informe uma página maior.' }],
      }),
    )
    montar()
    await digitar('pagina', '155')
    await digitar('minutos', '20')
    await enviar()

    expect(campo('pagina').getAttribute('aria-invalid')).toBe('true')
    expect(texto()).toContain('Você já está na página 160. Informe uma página maior.')
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })

  it('409 mostra que a lista mudou e falha de rede mantém os campos para reenviar', async () => {
    servico.registrarProgresso.mockRejectedValueOnce(new ApiError('conflito', 409, 'CONFLITO'))
    montar()
    await digitar('pagina', '172')
    await digitar('minutos', '20')
    await enviar()
    expect(document.querySelector('[role="alert"]')!.textContent).toContain(
      'Suas atualizações mudaram em outro lugar.',
    )

    servico.registrarProgresso.mockRejectedValueOnce(new ApiError('indisponível', 503, 'INDISPONIVEL'))
    await enviar()
    expect(document.querySelector('[role="alert"]')!.textContent).toContain(
      'Não foi possível salvar. Verifique sua conexão e tente de novo.',
    )
    expect(campo('pagina').value).toBe('172')
    expect(campo('pagina').disabled).toBe(false)
  })

  it('edição do último vem preenchida, valida contra a página anterior e chama editarUltimo', async () => {
    servico.editarUltimoProgresso.mockResolvedValue(resultado(150, 80))
    const wrapper = montar({ modo: 'editar', progresso: ULTIMO })
    await flushPromises()

    expect(texto()).toContain('Editar progresso')
    expect(texto()).toContain('Entre 121 e 264. O registro anterior é da página 120.')
    expect(campo('pagina').value).toBe('148')
    expect(campo('horas').value).toBe('1')
    expect(campo('minutos').value).toBe('15')
    expect(document.querySelector('[data-derivado]')!.textContent).toContain('Você leu 28 páginas')
    expect(document.querySelector('button[type="submit"]')!.textContent?.trim()).toBe('Salvar alterações')

    await digitar('pagina', '150')
    await digitar('minutos', '20')
    await enviar()

    expect(servico.editarUltimoProgresso).toHaveBeenCalledWith('p-2', { pagina: 150, minutos: 80 }, expect.any(String))
    expect(servico.registrarProgresso).not.toHaveBeenCalled()
    expect(wrapper.emitted('salvo')).toHaveLength(1)
  })

  it('Cancelar emite fechar', async () => {
    const wrapper = montar()
    const cancelar = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancelar')!
    cancelar.click()
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })
})
