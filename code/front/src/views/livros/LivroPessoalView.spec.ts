import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService, type LivroPessoalDetalhe } from '../../services/acervo'
import { ApiError } from '../../services/api'
import { leituraService } from '../../services/leitura'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/acervo', () => ({
  acervoService: { obterLivroPessoal: vi.fn(), excluirLivroPessoal: vi.fn() },
}))

vi.mock('../../services/leitura', () => ({
  leituraService: {
    obterMinhaAvaliacao: vi.fn(),
    salvarNota: vi.fn(),
    excluirNota: vi.fn(),
  },
}))

const servico = vi.mocked(acervoService)
const leitura = vi.mocked(leituraService)

const DO_DONO: LivroPessoalDetalhe = {
  id: 'l1',
  tipo: 'pessoal',
  donoId: 'u1',
  titulo: 'Cartas de um sertanejo',
  autor: 'Marina Albuquerque',
  paginas: 184,
  sinopse: 'Reunião de cartas trocadas entre 1978 e 1984.',
  capaUrl: null,
  modoConsulta: false,
  notaDoDono: null,
  resenhaDoDono: null,
  dono: { nome: 'Marina Albuquerque', avatarUrl: null },
}

const EM_CONSULTA: LivroPessoalDetalhe = {
  ...DO_DONO,
  modoConsulta: true,
  dono: { nome: 'Rafaela Siqueira', avatarUrl: null },
  notaDoDono: { valor: 4.5 },
  resenhaDoDono: {
    id: 'r1',
    autorId: 'u2',
    autorNome: 'Rafaela Siqueira',
    autorAvatarUrl: null,
    texto: 'Comprei numa feira e li em duas noites.',
    spoiler: false,
    criadoEm: '2026-09-12T12:00:00Z',
    atualizadoEm: '2026-09-12T12:00:00Z',
  },
}

function botao(texto: string) {
  return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)
}

describe('LivroPessoalView', () => {
  beforeEach(() => {
    localStorage.clear()
    servico.obterLivroPessoal.mockReset().mockResolvedValue(DO_DONO)
    servico.excluirLivroPessoal.mockReset().mockResolvedValue(undefined)
    leitura.obterMinhaAvaliacao.mockReset().mockResolvedValue({ livroId: 'l1', nota: null, resenha: null })
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('dono: hero, etiqueta, ficha sem ISBN, "Sua avaliação" e ações de editar e excluir', async () => {
    const { wrapper } = await montarNaRota('/livros/pessoal/l1')
    await flushPromises()

    expect(servico.obterLivroPessoal).toHaveBeenCalledWith('l1', undefined)
    expect(wrapper.get('h1').text()).toBe('')
    expect(wrapper.text()).toContain('Cartas de um sertanejo')
    expect(wrapper.text()).toContain('Livro pessoal')
    expect(wrapper.text()).toContain('184 páginas')
    expect(wrapper.text()).not.toContain('ISBN')
    // F-AVA: o dono avalia o próprio livro pessoal pelo bloco (RN-03), carregado do `leitura`.
    expect(leitura.obterMinhaAvaliacao).toHaveBeenCalledWith('l1')
    expect(wrapper.text()).toContain('Sua avaliação')
    expect(wrapper.find('button[aria-label="Sem nota. Dar nota"]').exists()).toBe(true)
    expect(botao('Editar')).toBeDefined()
    expect(botao('Excluir')).toBeDefined()
    expect(document.body.querySelector('button[aria-label="Ações do livro"]')).not.toBeNull()
  })

  it('terceiro pelo feed: modo consulta sem nenhuma ação do dono, com nota e resenha dela', async () => {
    servico.obterLivroPessoal.mockResolvedValue(EM_CONSULTA)
    const { wrapper } = await montarNaRota('/livros/pessoal/l1?via=feed&referenciaId=atv-1')
    await flushPromises()

    expect(servico.obterLivroPessoal).toHaveBeenCalledWith('l1', { via: 'feed', referenciaId: 'atv-1' })
    expect(wrapper.text()).toContain('Livro pessoal de Rafaela Siqueira')
    expect(wrapper.text()).toContain('Nota de Rafaela')
    expect(wrapper.text()).toContain('Resenha de Rafaela')
    expect(wrapper.find('[aria-label="4,5 de 5"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('12 de setembro de 2026')
    // Ausência, não botão desabilitado (RN-15.3).
    expect(botao('Editar')).toBeUndefined()
    expect(botao('Excluir')).toBeUndefined()
    expect(document.body.querySelector('button[aria-label="Ações do livro"]')).toBeNull()
    expect(wrapper.text()).not.toContain('Você ainda não avaliou')
    // Em livro pessoal só o dono avalia (RN-03): o terceiro nem consulta o `leitura`.
    expect(wrapper.text()).not.toContain('Sua avaliação')
    expect(leitura.obterMinhaAvaliacao).not.toHaveBeenCalled()
    // Aberto pelo feed, o Feed fica ativo no shell.
    const barra = wrapper.findAll('nav[aria-label="Navegação principal"]')[1]!
    expect(barra.findAll('a')[2]!.get('span').classes()).toContain('text-musgo')
  })

  it('terceiro: resenha do dono com spoiler fica fora do DOM até a ação', async () => {
    servico.obterLivroPessoal.mockResolvedValue({
      ...EM_CONSULTA,
      resenhaDoDono: { ...EM_CONSULTA.resenhaDoDono!, spoiler: true },
    })
    const { wrapper } = await montarNaRota('/livros/pessoal/l1?via=feed&referenciaId=atv-1')
    await flushPromises()

    expect(wrapper.text()).toContain('Esta resenha contém spoiler')
    expect(wrapper.html()).not.toContain('Comprei numa feira e li em duas noites.')

    await wrapper.findAll('button').find((b) => b.text() === 'Mostrar mesmo assim')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Comprei numa feira e li em duas noites.')
    expect(document.activeElement?.textContent).toContain('Comprei numa feira e li em duas noites.')
  })

  // O nome vinha só dentro da resenha; sem ela, a página ficava sem dizer de quem era o livro.
  it('terceiro vê a atribuição mesmo sem nota e sem resenha, e as seções somem', async () => {
    servico.obterLivroPessoal.mockResolvedValue({ ...EM_CONSULTA, notaDoDono: null, resenhaDoDono: null })
    const { wrapper } = await montarNaRota('/livros/pessoal/l1?via=feed&referenciaId=atv-1')
    await flushPromises()

    expect(wrapper.text()).toContain('Livro pessoal de Rafaela Siqueira')
    expect(wrapper.text()).not.toContain('Nota de')
    expect(wrapper.text()).not.toContain('Resenha de')
    expect(wrapper.text()).not.toContain('Você ainda não avaliou')
  })

  it.each([403, 404])('%i cai no mesmo estado, sem confirmar que o livro existe', async (status) => {
    servico.obterLivroPessoal.mockRejectedValue(new ApiError('x', status, 'ACESSO_NEGADO'))
    const { wrapper, router } = await montarNaRota('/livros/pessoal/l1?via=feed&referenciaId=forjada')
    await flushPromises()

    expect(wrapper.text()).toContain('Este livro não está mais disponível')
    expect(wrapper.text()).toContain('Ele pode ter sido excluído por quem o cadastrou.')
    botao('Voltar ao feed')!.click()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/feed')
  })

  it('indisponibilidade do serviço é banner com tentar de novo, não "livro excluído"', async () => {
    servico.obterLivroPessoal
      .mockRejectedValueOnce(new ApiError('Serviço temporariamente indisponível.', 503, 'SERVICO_INDISPONIVEL'))
      .mockResolvedValueOnce(DO_DONO)
    const { wrapper } = await montarNaRota('/livros/pessoal/l1')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Serviço temporariamente indisponível.')
    expect(wrapper.text()).not.toContain('não está mais disponível')
    botao('Tentar de novo')!.click()
    await flushPromises()
    expect(wrapper.text()).toContain('Cartas de um sertanejo')
  })

  it('menu do mobile leva a editar; Excluir confirma em dialog e volta à estante', async () => {
    const { router } = await montarNaRota('/livros/pessoal/l1')
    await flushPromises()

    ;(document.body.querySelector('button[aria-label="Ações do livro"]') as HTMLButtonElement).click()
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Editar livro')
    botao('Editar livro')!.click()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/livros/pessoal/l1/editar')

    await router.push('/livros/pessoal/l1')
    await flushPromises()
    botao('Excluir')!.click()
    await flushPromises()
    const dialogo = document.body.querySelector('[role="dialog"]')!
    expect(dialogo.textContent).toContain('Cartas de um sertanejo sai da sua estante')
    ;[...dialogo.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Excluir livro')!.click()
    await flushPromises()

    expect(servico.excluirLivroPessoal).toHaveBeenCalledWith('l1', expect.any(String))
    expect(router.currentRoute.value.path).toBe('/estante')
  })

  it('Esc fecha a confirmação sem excluir', async () => {
    await montarNaRota('/livros/pessoal/l1')
    await flushPromises()

    botao('Excluir')!.click()
    await flushPromises()
    document.body.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(servico.excluirLivroPessoal).not.toHaveBeenCalled()
  })
})
