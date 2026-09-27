import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useMinhaAvaliacao } from '../../livros/useMinhaAvaliacao'
import { ApiError } from '../../services/api'
import type { LeituraService, Nota } from '../../services/leitura'
import PainelDeNota from './PainelDeNota.vue'

function nota(valor: number): Nota {
  return { livroId: 'l1', valor, criadoEm: '2026-09-12T12:00:00Z', atualizadoEm: '2026-09-12T12:00:00Z' }
}

async function montar(notaSalva: number | null, comEscreverResenha = false) {
  const servico = {
    obterMinhaAvaliacao: vi.fn().mockResolvedValue({
      livroId: 'l1',
      nota: notaSalva === null ? null : nota(notaSalva),
      resenha: null,
    }),
    salvarNota: vi.fn<LeituraService['salvarNota']>(async (_livroId, valor) => nota(valor)),
    excluirNota: vi.fn().mockResolvedValue(undefined),
    salvarResenha: vi.fn<LeituraService['salvarResenha']>(async (livroId, texto, spoiler) => ({
      id: 'r1',
      usuarioId: 'u1',
      livroId,
      texto,
      spoiler,
      criadoEm: '2026-09-12T12:00:00Z',
      atualizadoEm: '2026-09-12T12:00:00Z',
    })),
    excluirResenha: vi.fn().mockResolvedValue(undefined),
  } satisfies LeituraService
  const avaliacao = useMinhaAvaliacao({ servico })
  await avaliacao.carregar('l1')
  const wrapper = mount(PainelDeNota, {
    props: {
      aberta: true,
      avaliacao,
      livro: { titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null },
      comEscreverResenha,
    },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, servico, avaliacao }
}

/** O painel vai por `Teleport` para o `body`. */
function texto(): string {
  return document.body.textContent ?? ''
}

function botao(rotulo: string): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === rotulo)
}

async function teclar(tecla: string): Promise<void> {
  document.body.querySelector('[role="slider"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: tecla }))
  await flushPromises()
}

describe('PainelDeNota', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('sem nota: "Sem nota", Salvar desabilitado e sem Remover', async () => {
    await montar(null)

    expect(texto()).toContain('Torto Arado')
    expect(texto()).toContain('Sem nota')
    expect(texto()).toContain('de 0 a 5, com meia estrela')
    expect(botao('Salvar nota')?.disabled).toBe(true)
    expect(botao('Remover nota')).toBeUndefined()
  })

  it('nota zero salva é 0, não "Sem nota" (RN-06)', async () => {
    await montar(0)

    expect(texto()).toContain('Você deu nota 0 a este livro.')
    expect(texto()).not.toContain('Sem nota')
    expect(botao('Remover nota')).toBeDefined()
  })

  it('escolher e salvar grava o valor e fecha o painel', async () => {
    const { wrapper, servico, avaliacao } = await montar(null)

    await teclar('End')
    expect(texto()).toContain('5')
    botao('Salvar nota')!.click()
    await flushPromises()

    expect(servico.salvarNota).toHaveBeenCalledWith('l1', 5, expect.any(String))
    expect(avaliacao.nota.value?.valor).toBe(5)
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })

  it('erro ao salvar: mensagem e painel aberto', async () => {
    const { wrapper, servico } = await montar(2)
    servico.salvarNota.mockRejectedValueOnce(new ApiError('x', 500, 'ERRO_INTERNO'))

    await teclar('ArrowRight')
    botao('Salvar nota')!.click()
    await flushPromises()

    expect(texto()).toContain('Não foi possível salvar sua nota. Verifique sua conexão e tente de novo.')
    expect(wrapper.emitted('fechar')).toBeUndefined()
  })

  it('remover troca o conteúdo pela confirmação; confirmar remove e fecha', async () => {
    const { wrapper, servico } = await montar(3)

    botao('Remover nota')!.click()
    await flushPromises()

    expect(texto()).toContain('Remover sua nota?')
    expect(texto()).toContain('O livro volta a ficar sem nota sua. Sua resenha, se houver, continua publicada.')
    expect(document.body.querySelectorAll('[role="dialog"]')).toHaveLength(1)

    botao('Remover nota')!.click()
    await flushPromises()

    expect(servico.excluirNota).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })

  it('cancelar a confirmação volta ao painel sem remover', async () => {
    const { servico } = await montar(3)

    botao('Remover nota')!.click()
    await flushPromises()
    botao('Cancelar')!.click()
    await flushPromises()

    expect(texto()).toContain('de 0 a 5, com meia estrela')
    expect(servico.excluirNota).not.toHaveBeenCalled()
  })

  it('"Escrever resenha" salva a nota escolhida no caminho e pede o editor', async () => {
    const { wrapper, servico } = await montar(null, true)

    await teclar('End')
    botao('Escrever resenha')!.click()
    await flushPromises()

    expect(servico.salvarNota).toHaveBeenCalledWith('l1', 5, expect.any(String))
    expect(wrapper.emitted('escrever-resenha')).toHaveLength(1)
  })

  it('"Escrever resenha" sem mudar a nota pede o editor direto', async () => {
    const { wrapper, servico } = await montar(3, true)

    botao('Escrever resenha')!.click()
    await flushPromises()

    expect(servico.salvarNota).not.toHaveBeenCalled()
    expect(wrapper.emitted('escrever-resenha')).toHaveLength(1)
  })

  it('"Escrever resenha" com falha ao salvar fica no painel com o erro', async () => {
    const { wrapper, servico } = await montar(null, true)
    servico.salvarNota.mockRejectedValueOnce(new ApiError('x', 500, 'ERRO_INTERNO'))

    await teclar('End')
    botao('Escrever resenha')!.click()
    await flushPromises()

    expect(wrapper.emitted('escrever-resenha')).toBeUndefined()
    expect(texto()).toContain('Não foi possível salvar sua nota. Verifique sua conexão e tente de novo.')
  })
})
