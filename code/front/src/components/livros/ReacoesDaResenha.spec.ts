import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import ReacoesDaResenha from './ReacoesDaResenha.vue'

function servicoFalso() {
  return { reagir: vi.fn(), removerReacao: vi.fn() }
}

beforeEach(() => {
  document.body.innerHTML = '<div id="avisos-flutuantes"></div>'
})

describe('ReacoesDaResenha', () => {
  it('mostra as duas contagens separadas, com singular e zero como contagem real', () => {
    const wrapper = mount(ReacoesDaResenha, {
      props: { resenhaId: 'r1', reacoes: { minhaReacao: null, curtidas: 1, descurtidas: 0 } },
    })

    const [curtir, descurtir] = wrapper.findAll('button')
    expect(curtir.text()).toBe('1 curtida')
    expect(descurtir.text()).toBe('0 descurtidas')
    expect(curtir.attributes('aria-label')).toBe('Curtir resenha, 1 curtida')
    expect(curtir.attributes('aria-pressed')).toBe('false')
  })

  it('a reação de quem olha aparece ativa', () => {
    const wrapper = mount(ReacoesDaResenha, {
      props: { resenhaId: 'r1', reacoes: { minhaReacao: 'descurtida', curtidas: 12, descurtidas: 2 } },
    })

    const [curtir, descurtir] = wrapper.findAll('button')
    expect(curtir.attributes('aria-pressed')).toBe('false')
    expect(descurtir.attributes('aria-pressed')).toBe('true')
    expect(descurtir.text()).toBe('2 descurtidas')
  })

  it('tocar curte na hora e chama o leitura com a via', async () => {
    const servico = servicoFalso()
    servico.reagir.mockResolvedValue({ minhaReacao: 'curtida', curtidas: 13, descurtidas: 2 })
    const via = { via: 'feed' as const, referenciaId: 'atividade-1' }
    const wrapper = mount(ReacoesDaResenha, {
      props: { resenhaId: 'r1', reacoes: { minhaReacao: null, curtidas: 12, descurtidas: 2 }, via, servico },
    })

    await wrapper.findAll('button')[0].trigger('click')

    expect(wrapper.findAll('button')[0].text()).toBe('13 curtidas')
    expect(wrapper.findAll('button')[0].attributes('aria-pressed')).toBe('true')
    await flushPromises()
    expect(servico.reagir).toHaveBeenCalledWith('r1', 'curtida', via, expect.any(String))
  })

  it('falha do servidor volta ao estado anterior e avisa', async () => {
    const servico = servicoFalso()
    servico.reagir.mockRejectedValue(new ApiError('Muitas requisições.', 429, 'MUITAS_REQUISICOES'))
    const wrapper = mount(ReacoesDaResenha, {
      props: { resenhaId: 'r1', reacoes: { minhaReacao: null, curtidas: 12, descurtidas: 2 }, servico },
      attachTo: document.body,
    })

    await wrapper.findAll('button')[1].trigger('click')
    await flushPromises()

    expect(wrapper.findAll('button')[1].text()).toBe('2 descurtidas')
    expect(document.body.textContent).toContain(
      'Não foi possível registrar sua reação. Tente de novo em alguns instantes.',
    )
    wrapper.unmount()
  })

  it('só leitura mostra as contagens sem botão', () => {
    const wrapper = mount(ReacoesDaResenha, {
      props: { resenhaId: 'r1', reacoes: { minhaReacao: null, curtidas: 12, descurtidas: 2 }, somenteLeitura: true },
    })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).toContain('12 curtidas')
    expect(wrapper.text()).toContain('2 descurtidas')
  })
})
