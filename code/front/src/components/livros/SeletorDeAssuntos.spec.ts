import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import SeletorDeAssuntos from './SeletorDeAssuntos.vue'

const LISTA = [
  { id: 'fantasia', nome: 'Fantasia' },
  { id: 'ficcao-literaria', nome: 'Ficção literária' },
  { id: 'historia', nome: 'História' },
  { id: 'memorias', nome: 'Memórias' },
  { id: 'romance-historico', nome: 'Romance histórico' },
]

function montar(listarAssuntos = vi.fn().mockResolvedValue(LISTA), escolhidos = [{ id: 'memorias', nome: 'Memórias' }]) {
  const wrapper = mount(SeletorDeAssuntos, {
    props: { aberta: true, escolhidos, servico: { listarAssuntos } },
    attachTo: document.body,
  })
  return { wrapper, listarAssuntos }
}

function dialogo(): HTMLElement {
  return document.body.querySelector<HTMLElement>('[role="dialog"]')!
}

function chips(): HTMLElement[] {
  return [...dialogo().querySelectorAll<HTMLElement>('[role="checkbox"]')]
}

function chip(nome: string): HTMLElement {
  return chips().find((c) => c.textContent?.trim() === nome)!
}

function botao(texto: string): HTMLButtonElement | undefined {
  return [...dialogo().querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)
}

async function buscar(texto: string): Promise<void> {
  const campo = dialogo().querySelector<HTMLInputElement>('input[type="search"]')!
  campo.value = texto
  campo.dispatchEvent(new Event('input'))
  await flushPromises()
}

describe('SeletorDeAssuntos', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('abre com a seleção atual marcada, a contagem e o foco na busca', async () => {
    montar()
    await flushPromises()

    expect(dialogo().getAttribute('aria-label')).toBe('Assuntos')
    expect(dialogo().textContent).toContain('1 escolhido')
    expect(dialogo().textContent).toContain('Os assuntos vêm de uma lista fixa do Lê Ai.')
    expect(chips()).toHaveLength(5)
    expect(chip('Memórias').getAttribute('aria-checked')).toBe('true')
    expect(chip('História').getAttribute('aria-checked')).toBe('false')
    expect(document.activeElement).toBe(dialogo().querySelector('input[type="search"]'))
  })

  it('a busca filtra sem acento, mostra a contagem e não muda os escolhidos', async () => {
    montar()
    await flushPromises()

    await buscar('hist')

    expect(chips().map((c) => c.textContent?.trim())).toEqual(['História', 'Romance histórico'])
    expect(dialogo().textContent).toContain('2 assuntos')
    expect(dialogo().textContent).toContain('1 escolhido')
    const limparBusca = dialogo().querySelector<HTMLButtonElement>('[aria-label="Limpar busca"]')!
    limparBusca.click()
    await flushPromises()
    expect(chips()).toHaveLength(5)
  })

  it('sem resultado aponta a escolha mais próxima e não oferece criar', async () => {
    montar()
    await flushPromises()

    await buscar('realismo mágico')

    expect(chips()).toHaveLength(0)
    expect(dialogo().textContent).toContain('Nenhum assunto com "realismo mágico".')
    expect(dialogo().textContent).toContain('A lista é fixa: escolha o assunto mais próximo, como Ficção literária ou Fantasia.')
    expect(dialogo().textContent).not.toMatch(/criar|adicionar/i)
  })

  it('sem resultado é anunciado na região viva (validação da F-ACV-OPC)', async () => {
    montar()
    await flushPromises()

    await buscar('realismo mágico')

    expect(dialogo().querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('Nenhum assunto com "realismo mágico".')
  })

  it('com a lista carregando, o foco entra no painel e Esc fecha (validação da F-ACV-OPC)', async () => {
    const { wrapper } = montar(vi.fn(() => new Promise<never>(() => {})))
    await flushPromises()

    expect(dialogo().contains(document.activeElement)).toBe(true)
    expect(document.activeElement?.hasAttribute('data-titulo')).toBe(true)
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })

  it('Concluir aplica a seleção em ordem alfabética', async () => {
    const { wrapper } = montar()
    await flushPromises()

    chip('História').click()
    await flushPromises()
    expect(dialogo().textContent).toContain('2 escolhidos')
    expect(chip('História').getAttribute('aria-checked')).toBe('true')
    botao('Concluir')!.click()

    expect(wrapper.emitted('concluir')).toEqual([
      [
        [
          { id: 'historia', nome: 'História' },
          { id: 'memorias', nome: 'Memórias' },
        ],
      ],
    ])
  })

  it('Limpar desmarca tudo e some quando nada está marcado', async () => {
    const { wrapper } = montar()
    await flushPromises()

    botao('Limpar')!.click()
    await flushPromises()

    expect(chips().every((c) => c.getAttribute('aria-checked') === 'false')).toBe(true)
    expect(dialogo().textContent).toContain('Nenhum escolhido')
    expect(botao('Limpar')).toBeUndefined()
    botao('Concluir')!.click()
    expect(wrapper.emitted('concluir')).toEqual([[[]]])
  })

  it('fechar sem Concluir (Esc, scrim) descarta: reabrir volta à seleção do formulário', async () => {
    const { wrapper } = montar()
    await flushPromises()

    chip('Fantasia').click()
    dialogo().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('fechar')).toHaveLength(1)
    expect(wrapper.emitted('concluir')).toBeUndefined()

    await wrapper.setProps({ aberta: false })
    await wrapper.setProps({ aberta: true })
    await flushPromises()
    expect(chip('Fantasia').getAttribute('aria-checked')).toBe('false')
    expect(chip('Memórias').getAttribute('aria-checked')).toBe('true')

    dialogo().parentElement!.click()
    expect(wrapper.emitted('fechar')).toHaveLength(2)
  })

  it('carregando: skeleton anunciado, busca desabilitada, Concluir desabilitado e cold start aos 3 s', async () => {
    vi.useFakeTimers()
    montar(vi.fn().mockReturnValue(new Promise(() => {})))
    await vi.advanceTimersByTimeAsync(0)

    expect(dialogo().querySelector('[role="status"]')?.textContent).toContain('Carregando assuntos')
    expect(dialogo().querySelector('input[type="search"]')!.hasAttribute('disabled')).toBe(true)
    expect(botao('Concluir')!.disabled).toBe(true)
    expect(dialogo().textContent).not.toContain('escolhido')
    expect(dialogo().textContent).not.toContain('O serviço está iniciando.')

    await vi.advanceTimersByTimeAsync(3_000)
    expect(dialogo().textContent).toContain('O serviço está iniciando. Isso pode levar alguns segundos.')
  })

  it('falha: mensagem, foco em Tentar de novo, Fechar no lugar de Concluir; Tentar de novo carrega', async () => {
    const listar = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('Não foi possível acessar o servidor. Tente novamente.', 0, 'SERVICO_INDISPONIVEL'))
      .mockResolvedValueOnce(LISTA)
    const { wrapper } = montar(listar)
    await flushPromises()

    expect(dialogo().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar os assuntos.')
    expect(dialogo().textContent).toContain('Você pode salvar o livro agora e escolher os assuntos depois, em Editar livro.')
    expect(document.activeElement?.textContent?.trim()).toBe('Tentar de novo')
    expect(botao('Concluir')).toBeUndefined()
    botao('Fechar')!.click()
    expect(wrapper.emitted('fechar')).toHaveLength(1)

    botao('Tentar de novo')!.click()
    await flushPromises()
    expect(chips()).toHaveLength(5)
    expect(listar).toHaveBeenCalledTimes(2)
  })
})
