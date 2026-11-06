import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import type { ContaModerada } from '../../services/moderacao'
import DialogoSuspensao from './DialogoSuspensao.vue'

const SUSPENSA: ContaModerada = {
  usuarioId: 'a2',
  suspensa: true,
  suspensaEm: '2026-10-11T14:32:00Z',
  reativadaEm: null,
}

function servicoFalso() {
  return { suspenderConta: vi.fn(), reativarConta: vi.fn() }
}

function montar(servico = servicoFalso(), acao: 'suspender' | 'reativar' = 'suspender') {
  const wrapper = mount(DialogoSuspensao, {
    props: { acao, usuarioId: 'a2', nome: 'Sérgio Valadares', servico },
    attachTo: document.body,
  })
  return { wrapper, servico, tela: new DOMWrapper(document.body) }
}

function confirmar(tela: DOMWrapper<Element>) {
  return tela.get('[data-confirmar]')
}

describe('DialogoSuspensao', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('copy do design, foco no motivo e confirmar desabilitado sem motivo', async () => {
    const { tela } = montar()
    await flushPromises()

    expect(tela.text()).toContain('Suspender a conta de Sérgio Valadares?')
    expect(tela.text()).toContain('Sérgio deixa de conseguir entrar no Lê Ai')
    expect(tela.text()).toContain('Motivo da suspensão')
    expect(tela.text()).toContain('Fica no registro de auditoria. Sérgio não vê este texto.')
    expect(tela.text()).toContain('0 de 500')
    expect(document.activeElement?.tagName).toBe('TEXTAREA')
    expect(confirmar(tela).attributes('disabled')).toBeDefined()

    await tela.get('textarea').setValue('   ')
    expect(confirmar(tela).attributes('disabled')).toBeDefined()
  })

  it('acima de 500 caracteres o contador e o helper avisam e o confirmar fica desabilitado', async () => {
    const { tela } = montar()
    await tela.get('textarea').setValue('😀'.repeat(501))

    expect(tela.text()).toContain('501 de 500')
    expect(tela.text()).toContain('Use até 500 caracteres.')
    expect(confirmar(tela).attributes('disabled')).toBeDefined()

    await tela.get('textarea').setValue('😀'.repeat(500))
    expect(confirmar(tela).attributes('disabled')).toBeUndefined()
  })

  it('suspende com o motivo aparado e avisa quem abriu', async () => {
    const { wrapper, servico, tela } = montar()
    servico.suspenderConta.mockResolvedValue(SUSPENSA)
    await tela.get('textarea').setValue('  Ataques pessoais repetidos.  ')

    await confirmar(tela).trigger('click')
    await flushPromises()

    expect(servico.suspenderConta).toHaveBeenCalledWith('a2', 'Ataques pessoais repetidos.', expect.any(String))
    expect(wrapper.emitted('concluida')?.[0]).toEqual([SUSPENSA])
  })

  it('espera: Suspendendo conta e, depois de 3 s, o aviso de serviço iniciando', async () => {
    vi.useFakeTimers()
    const { servico, tela } = montar()
    let resolver: (conta: ContaModerada) => void = () => {}
    servico.suspenderConta.mockReturnValue(new Promise((ok) => (resolver = ok)))
    await tela.get('textarea').setValue('Spam')

    await confirmar(tela).trigger('click')
    expect(tela.text()).toContain('Suspendendo conta')
    expect(tela.text()).not.toContain('O serviço está iniciando')

    await vi.advanceTimersByTimeAsync(3_000)
    expect(tela.text()).toContain('O serviço está iniciando. Isso pode levar alguns segundos.')

    resolver(SUSPENSA)
    await flushPromises()
  })

  it('timeout: banner de não confirmada, motivo mantido e o reenvio com a mesma chave', async () => {
    const { wrapper, servico, tela } = montar()
    servico.suspenderConta
      .mockRejectedValueOnce(new ApiError('A ação não foi confirmada a tempo.', 504, 'TEMPO_ESGOTADO'))
      .mockResolvedValueOnce(SUSPENSA)
    await tela.get('textarea').setValue('Spam')

    await confirmar(tela).trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('A suspensão não foi confirmada a tempo. A conta continua ativa.')
    expect((tela.get('textarea').element as HTMLTextAreaElement).value).toBe('Spam')
    expect(wrapper.emitted('concluida')).toBeUndefined()

    await confirmar(tela).trigger('click')
    await flushPromises()

    const [primeira, segunda] = servico.suspenderConta.mock.calls
    expect(segunda![2]).toBe(primeira![2])
    expect(wrapper.emitted('concluida')).toHaveLength(1)
  })

  it('timeout do próprio cliente também é não confirmada', async () => {
    const { servico, tela } = montar()
    servico.suspenderConta.mockRejectedValue(
      new ApiError('O servidor demorou para responder.', 0, 'TEMPO_LIMITE_EXCEDIDO'),
    )
    await tela.get('textarea').setValue('Spam')
    await confirmar(tela).trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('A suspensão não foi confirmada a tempo.')
  })

  it('serviço indisponível mostra a mensagem do servidor e deixa tentar de novo', async () => {
    const { servico, tela } = montar()
    servico.suspenderConta.mockRejectedValue(
      new ApiError('Não foi possível falar com o serviço de contas. Nada foi alterado.', 503, 'SERVICO_INDISPONIVEL'),
    )
    await tela.get('textarea').setValue('Spam')
    await confirmar(tela).trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('Não foi possível falar com o serviço de contas. Nada foi alterado.')
    expect(confirmar(tela).attributes('disabled')).toBeUndefined()
  })

  it('Cancelar fecha sem chamar o servidor', async () => {
    const { wrapper, servico, tela } = montar()
    await tela.get('textarea').setValue('Spam')

    await tela.findAll('button').find((b) => b.text() === 'Cancelar')!.trigger('click')

    expect(wrapper.emitted('fechar')).toHaveLength(1)
    expect(servico.suspenderConta).not.toHaveBeenCalled()
  })

  it('reativação: título, label, botão e falha próprios', async () => {
    const { servico, tela } = montar(servicoFalso(), 'reativar')
    servico.reativarConta.mockRejectedValue(new ApiError('tempo', 504, 'TEMPO_ESGOTADO'))

    expect(tela.text()).toContain('Reativar a conta de Sérgio Valadares?')
    expect(tela.text()).toContain('Motivo da reativação')
    expect(confirmar(tela).text()).toBe('Reativar conta')

    await tela.get('textarea').setValue('Revisto')
    await confirmar(tela).trigger('click')
    await flushPromises()

    expect(servico.reativarConta).toHaveBeenCalledWith('a2', 'Revisto', expect.any(String))
    expect(tela.text()).toContain('A reativação não foi confirmada a tempo. A conta continua suspensa.')
  })
})
