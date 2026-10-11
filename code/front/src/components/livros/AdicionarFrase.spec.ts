import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import type { Frase } from '../../services/leitura'
import AdicionarFrase from './AdicionarFrase.vue'

const LIVRO = { id: 'livro-1', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null, paginas: 264 }

function frase(): Frase {
  return {
    id: 'f1',
    livroId: 'livro-1',
    texto: 'A gente aprende a ler o céu.',
    pagina: 74,
    criadoEm: '2026-10-09T12:00:00Z',
    autor: { id: 'u1', username: 'leitora', nome: 'Leitora', avatarUrl: null },
    minha: true,
  }
}

function montar(servico = { criarFrase: vi.fn() }, minhasFrases = 2) {
  const wrapper = mount(AdicionarFrase, {
    props: { aberta: true, livro: LIVRO, minhasFrases, servico },
    attachTo: document.body,
  })
  return { wrapper, servico }
}

async function preencher(trecho: string, pagina: string): Promise<void> {
  const area = document.querySelector('textarea')!
  area.value = trecho
  area.dispatchEvent(new Event('input'))
  const campo = document.querySelector<HTMLInputElement>('[data-campo="pagina"] input')!
  campo.value = pagina
  campo.dispatchEvent(new Event('input'))
  await flushPromises()
}

async function enviar(): Promise<void> {
  document.querySelector('form')!.dispatchEvent(new Event('submit'))
  await flushPromises()
}

const texto = () => document.body.textContent ?? ''

describe('AdicionarFrase', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('abre com a cota, o contador zerado e o helper da página', async () => {
    montar(undefined, 9)
    await flushPromises()

    expect(texto()).toContain('Você guardou 9 de 10 frases deste livro. Esta é a última que cabe.')
    expect(document.querySelector('[data-contador]')!.textContent?.trim()).toBe('0/500')
    expect(texto()).toContain('Entre 1 e 264. É a página em que o trecho está.')
  })

  it('valida ao enviar: campos vazios mostram as duas mensagens e não chamam o servidor', async () => {
    const { servico } = montar()
    await enviar()

    expect(texto()).toContain('Escreva o trecho que você quer guardar.')
    expect(texto()).toContain('Informe a página em que o trecho está.')
    expect(servico.criarFrase).not.toHaveBeenCalled()
  })

  it('o contador conta code points e fica rubi acima de 500, sem cortar o texto', async () => {
    montar()
    await preencher('a'.repeat(534), '146')

    const contador = document.querySelector('[data-contador]')!
    expect(contador.textContent?.trim()).toBe('534/500')
    expect(contador.className).toContain('text-rubi')
    expect(document.querySelector('textarea')!.value).toHaveLength(534)
    await enviar()
    expect(texto()).toContain('Use até 500 caracteres. Tire 34 para salvar.')
  })

  it('página acima do total cita o número do livro', async () => {
    montar()
    await preencher('Trecho.', '300')
    await enviar()

    expect(texto()).toContain('O livro tem 264 páginas. Informe uma página até 264.')
  })

  it('salva e emite a frase; reenviar depois de uma falha usa a mesma chave', async () => {
    const criarFrase = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('Indisponível.', 503, 'SERVICO_INDISPONIVEL'))
      .mockResolvedValueOnce(frase())
    const { wrapper } = montar({ criarFrase })
    await preencher('A gente aprende a ler o céu.', '74')

    await enviar()
    expect(texto()).toContain('Não foi possível salvar a frase. Verifique sua conexão e tente de novo.')
    await enviar()

    expect(criarFrase).toHaveBeenCalledTimes(2)
    expect(criarFrase.mock.calls[0][1]).toEqual({ texto: 'A gente aprende a ler o céu.', pagina: 74 })
    expect(criarFrase.mock.calls[1][2]).toBe(criarFrase.mock.calls[0][2])
    expect(wrapper.emitted('salva')?.[0]).toEqual([frase()])
  })

  it('cota estourada no servidor trava os campos e troca as ações', async () => {
    const criarFrase = vi.fn().mockRejectedValue(new ApiError('Limite.', 422, 'LIMITE_DE_FRASES'))
    const { wrapper } = montar({ criarFrase })
    await preencher('Mais um.', '10')
    await enviar()

    expect(texto()).toContain('Você já guardou 10 frases deste livro. Exclua uma das suas para guardar esta.')
    expect(texto()).toContain('O trecho que você escreveu não será guardado.')
    expect(document.querySelector('textarea')!.disabled).toBe(true)
    const verMinhas = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Ver minhas frases'))!
    verMinhas.click()
    expect(wrapper.emitted('verMinhas')).toHaveLength(1)
  })

  it('Ctrl+Enter no trecho envia', async () => {
    const criarFrase = vi.fn().mockResolvedValue(frase())
    montar({ criarFrase })
    await preencher('Trecho.', '5')

    document.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }))
    await flushPromises()

    expect(criarFrase).toHaveBeenCalledTimes(1)
  })

  it('cancelar com trecho escrito pede o descarte; sem trecho, só fecha', async () => {
    const { wrapper } = montar()
    await preencher('Escrevi algo.', '')
    const cancelar = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancelar')!
    cancelar.click()
    await flushPromises()

    expect(texto()).toContain('Descartar esta frase?')
    expect(wrapper.emitted('fechar')).toBeUndefined()
    const continuar = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Continuar escrevendo')!
    continuar.click()
    await flushPromises()
    expect(document.querySelector('textarea')!.value).toBe('Escrevi algo.')

    await preencher('', '')
    ;[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancelar')!.click()
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })
})
