import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { esquecerMinhaPrivacidade } from '../../listas/useMinhaPrivacidade'
import { ApiError } from '../../services/api'
import { listasService, type Lista } from '../../services/listas'
import { perfilService } from '../../services/perfil'
import FormularioDeLista from './FormularioDeLista.vue'

vi.mock('../../services/listas', async (original) => ({
  ...(await original<typeof import('../../services/listas')>()),
  listasService: { criar: vi.fn(), editar: vi.fn(), excluir: vi.fn() },
}))
vi.mock('../../services/perfil', async (original) => ({
  ...(await original<typeof import('../../services/perfil')>()),
  perfilService: { obterMeuPerfil: vi.fn() },
}))

const listas = vi.mocked(listasService)

const LISTA: Lista = {
  id: 'l1',
  dono: { id: 'u1', username: 'marinableu', nomeExibicao: 'Marina Beltrão', avatarUrl: null },
  titulo: 'Contos que eu indico',
  descricao: 'Em ordem de por onde começar.',
  quantidadeLivros: 7,
  pertenceAoSolicitante: true,
  criadaEm: '2026-03-01T12:00:00Z',
  atualizadaEm: '2026-09-12T12:00:00Z',
}

function montar(props: Record<string, unknown> = {}) {
  return mount(FormularioDeLista, { props: { aberto: true, ...props }, attachTo: document.body })
}

function campo(seletor: string): HTMLInputElement {
  return document.body.querySelector(seletor) as HTMLInputElement
}

async function digitar(seletor: string, valor: string): Promise<void> {
  const elemento = campo(seletor)
  elemento.value = valor
  elemento.dispatchEvent(new Event('input'))
  await flushPromises()
}

function botao(texto: string): HTMLButtonElement {
  return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)!
}

describe('FormularioDeLista', () => {
  beforeEach(() => {
    esquecerMinhaPrivacidade()
    vi.mocked(perfilService).obterMeuPerfil.mockReset().mockResolvedValue({ privacidade: 'privado' } as never)
    listas.criar.mockReset()
    listas.editar.mockReset()
    listas.excluir.mockReset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('criação: botão desabilitado até haver título, faixa da privacidade e contadores', async () => {
    montar()
    await flushPromises()

    expect(botao('Criar lista').disabled).toBe(true)
    expect(document.body.textContent).toContain('Seu perfil é privado: só quem você aceitou como seguidor vê esta lista.')
    expect(document.body.textContent).toContain('0/80')
    expect(document.body.textContent).toContain('0/300')

    await digitar('input', 'Poesia para começar')
    expect(document.body.textContent).toContain('19/80')
    expect(botao('Criar lista').disabled).toBe(false)
  })

  it('título acima de 80 caracteres mostra o erro no campo e bloqueia o envio', async () => {
    montar()
    await digitar('input', 'a'.repeat(84))

    expect(document.body.textContent).toContain('84/80')
    expect(document.body.textContent).toContain('Use até 80 caracteres no título.')
    expect(botao('Criar lista').disabled).toBe(true)
  })

  it('a partir de um livro: cria com o livroId e emite a lista', async () => {
    listas.criar.mockResolvedValue(LISTA)
    const wrapper = montar({ livro: { id: 'b1', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null, pessoal: false } })
    await digitar('input', '  Romances do sertão ')

    expect(document.body.textContent).toContain('Este livro entra na lista')
    botao('Criar lista com este livro').click()
    await flushPromises()

    expect(listas.criar).toHaveBeenCalledWith({ titulo: 'Romances do sertão', descricao: null, livroId: 'b1' }, expect.any(String))
    expect(wrapper.emitted('criada')?.[0]).toEqual([LISTA])
  })

  it('falha do servidor mantém o que foi digitado e o reenvio repete a chave', async () => {
    listas.criar.mockRejectedValueOnce(new ApiError('Falha.', 503, 'SERVICO_INDISPONIVEL')).mockResolvedValueOnce(LISTA)
    montar()
    await digitar('input', 'Poesia')

    botao('Criar lista').click()
    await flushPromises()
    expect(document.body.textContent).toContain('Não foi possível criar a lista. Verifique sua conexão e tente de novo.')
    expect(campo('input').value).toBe('Poesia')

    botao('Criar lista').click()
    await flushPromises()
    const [primeira, segunda] = listas.criar.mock.calls
    expect(segunda[1]).toBe(primeira[1])
  })

  it('edição: envia só o que mudou e fica desabilitada sem mudança', async () => {
    listas.editar.mockResolvedValue({ ...LISTA, titulo: 'Contos para quem acha que não gosta de conto' })
    const wrapper = montar({ lista: LISTA })
    await flushPromises()

    expect(botao('Salvar alterações').disabled).toBe(true)
    await digitar('input', 'Contos para quem acha que não gosta de conto')
    botao('Salvar alterações').click()
    await flushPromises()

    expect(listas.editar).toHaveBeenCalledWith('l1', { titulo: 'Contos para quem acha que não gosta de conto' }, expect.any(String))
    expect(wrapper.emitted('salva')).toHaveLength(1)
  })

  it('excluir troca o conteúdo pela confirmação; Cancelar volta com as mudanças', async () => {
    listas.excluir.mockResolvedValue(undefined)
    const wrapper = montar({ lista: LISTA })
    await digitar('input', 'Título em edição')

    botao('Excluir lista').click()
    await flushPromises()
    expect(document.body.textContent).toContain('Excluir a lista Contos que eu indico?')
    expect(document.body.textContent).toContain('A lista e a ordem dos 7 livros saem do seu perfil.')

    botao('Cancelar').click()
    await flushPromises()
    expect(campo('input').value).toBe('Título em edição')

    botao('Excluir lista').click()
    await flushPromises()
    ;[...document.body.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Excluir lista').at(-1)!.click()
    await flushPromises()
    expect(listas.excluir).toHaveBeenCalledWith('l1', expect.any(String))
    expect(wrapper.emitted('excluida')).toHaveLength(1)
  })
})
