import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import { montarNaRota } from '../../testes/montarNaRota'

describe('IsbnNaoEncontradoView', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mensagem específica com o ISBN, sem cara de erro, e oferta do pessoal', async () => {
    const { wrapper, router } = await montarNaRota('/descobrir/adicionar/nao-encontrado?isbn=9788535914849')

    expect(wrapper.get('h1').text()).toBe('Adicionar livro')
    expect(wrapper.text()).toContain('Não encontramos este livro')
    expect(wrapper.text()).toContain('nenhuma conhece o ISBN 9788535914849.')
    expect(wrapper.text()).toContain('Cadastrar como livro pessoal?')
    expect(wrapper.text()).not.toMatch(/erro/i)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    await wrapper.findAll('button').find((b) => b.text() === 'Cadastrar livro pessoal')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/descobrir/adicionar/pessoal')
  })

  it('Conferir o ISBN volta com o valor digitado, pronto para correção', async () => {
    const { wrapper, router } = await montarNaRota(
      '/estante/adicionar/nao-encontrado?isbn=9788535914849&digitado=978-85-359-1484-9',
    )

    await wrapper.findAll('button').find((b) => b.text() === 'Conferir o ISBN')!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/estante/adicionar')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('978-85-359-1484-9')
  })

  it('sem ISBN em mãos, o layout não quebra', async () => {
    const { wrapper } = await montarNaRota('/descobrir/adicionar/nao-encontrado')

    expect(wrapper.text()).toContain('Procuramos em todas as nossas fontes e nenhuma conhece esse ISBN.')
    expect(wrapper.text()).toContain('Cadastrar livro pessoal')
  })
})
