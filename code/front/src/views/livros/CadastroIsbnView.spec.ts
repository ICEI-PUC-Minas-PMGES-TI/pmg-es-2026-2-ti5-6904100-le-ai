import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService } from '../../services/acervo'
import { ApiError } from '../../services/api'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/acervo', () => ({
  acervoService: {
    solicitarImportacao: vi.fn(),
    obterImportacao: vi.fn(),
    reprocessarImportacao: vi.fn(),
    // O "Abrir página do livro" leva à página real, que pede o livro ao montar.
    obterLivroOficial: vi.fn().mockReturnValue(new Promise(() => undefined)),
    listarResenhasDoLivro: vi.fn(),
  },
}))

const servico = vi.mocked(acervoService)

const RESUMO = {
  id: 'livro-1',
  titulo: 'Memórias Póstumas de Brás Cubas',
  autores: 'Machado de Assis',
  editora: 'Penguin-Companhia',
  anoPublicacao: 2014,
  paginas: 288,
  capaUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
}

async function digitarEBuscar(wrapper: Awaited<ReturnType<typeof montarNaRota>>['wrapper'], isbn = '978-85-359-1484-9') {
  await wrapper.get('input').setValue(isbn)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('CadastroIsbnView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    servico.solicitarImportacao.mockReset().mockResolvedValue({ tipo: 'aceita', importacaoId: 'imp-1' })
    servico.obterImportacao.mockReset()
    servico.reprocessarImportacao.mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('aterrissagem: título, helper, saída para o pessoal e botão só com 13 dígitos', async () => {
    const { wrapper } = await montarNaRota('/descobrir/adicionar')

    expect(wrapper.get('h1').text()).toBe('Adicionar livro')
    expect(wrapper.find('button[aria-label="Voltar"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Só o ISBN. Links e títulos não funcionam aqui.')
    expect(wrapper.text()).toContain('Não tem o ISBN em mãos?')
    const botao = wrapper.get('button[type="submit"]')
    expect(botao.attributes('disabled')).toBeDefined()

    await wrapper.get('input').setValue('978-85-359-1484-9')
    expect(botao.attributes('disabled')).toBeUndefined()
  })

  it('acompanha a importação no lugar do cartão e leva à página do livro', async () => {
    servico.obterImportacao.mockResolvedValue({
      importacaoId: 'imp-1',
      isbn: '9788535914849',
      status: 'concluida',
      livroId: 'livro-1',
      livro: RESUMO,
      permiteCadastroPessoal: false,
    })
    const { wrapper, router } = await montarNaRota('/descobrir/adicionar')

    await digitarEBuscar(wrapper)
    expect(wrapper.text()).toContain('Procurando em nossas fontes. Isso pode levar alguns segundos.')
    expect(wrapper.get('button[type="submit"]').text()).toBe('Buscando')

    await vi.advanceTimersByTimeAsync(2_000)
    expect(wrapper.text()).toContain('Livro adicionado ao acervo.')
    // O card confirma QUAL livro entrou: capa, título, autor, editora e ano, páginas (§4.4).
    expect(wrapper.text()).toContain('Memórias Póstumas de Brás Cubas')
    expect(wrapper.text()).toContain('Machado de Assis')
    expect(wrapper.text()).toContain('Penguin-Companhia · 2014')
    expect(wrapper.text()).toContain('288 páginas')
    expect(wrapper.get('img').attributes('src')).toBe(RESUMO.capaUrl)
    // Buscar livro continua na tela, como no protótipo.
    expect(wrapper.get('button[type="submit"]').text()).toBe('Buscar livro')

    await wrapper.findAll('button').find((b) => b.text() === 'Abrir página do livro')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/livros/livro-1?origem=descobrir')
  })

  it('ISBN já cadastrado é faixa informativa, sem rubi (RF-ACV-07)', async () => {
    servico.solicitarImportacao.mockResolvedValue({ tipo: 'existente', livroId: 'livro-9', livro: { ...RESUMO, id: 'livro-9' } })
    const { wrapper } = await montarNaRota('/descobrir/adicionar')

    await digitarEBuscar(wrapper)

    expect(wrapper.text()).toContain('Este livro já está no acervo.')
    expect(wrapper.text()).toContain('Memórias Póstumas de Brás Cubas')
    expect(wrapper.find('.bg-rubi-fundo').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('ISBN inválido é erro do campo, sem chamar o servidor', async () => {
    const { wrapper } = await montarNaRota('/descobrir/adicionar')

    await digitarEBuscar(wrapper, '9788535914848')

    expect(wrapper.text()).toContain('Esse ISBN não confere. Verifique os 13 dígitos impressos no livro.')
    expect(wrapper.text()).not.toContain('Só o ISBN.')
    expect(servico.solicitarImportacao).not.toHaveBeenCalled()
  })

  it('não encontrado troca para a tela seguinte, levando o ISBN', async () => {
    servico.obterImportacao.mockResolvedValue({
      importacaoId: 'imp-1',
      isbn: '9788535914849',
      status: 'nao_encontrado',
      livroId: null,
      permiteCadastroPessoal: true,
    })
    const { wrapper, router } = await montarNaRota('/estante/adicionar')

    await digitarEBuscar(wrapper)
    await vi.advanceTimersByTimeAsync(2_000)
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/estante/adicionar/nao-encontrado')
    expect(router.currentRoute.value.query.isbn).toBe('9788535914849')
  })

  it('fonte indisponível não diz que o livro não existe e oferece tentar de novo', async () => {
    servico.obterImportacao
      .mockResolvedValueOnce({ importacaoId: 'imp-1', isbn: '9788535914849', status: 'falha_transitoria', livroId: null, permiteCadastroPessoal: false })
      .mockResolvedValue({ importacaoId: 'imp-1', isbn: '9788535914849', status: 'pendente', livroId: null, permiteCadastroPessoal: false })
    const { wrapper } = await montarNaRota('/descobrir/adicionar')

    await digitarEBuscar(wrapper)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(wrapper.text()).toContain('Não conseguimos consultar nossas fontes agora. Seu pedido foi guardado.')
    expect(wrapper.text()).not.toContain('Não encontramos')
    await wrapper.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(servico.reprocessarImportacao).toHaveBeenCalledWith('imp-1', expect.any(String))
  })

  it('429 mostra a mensagem do servidor em alerta', async () => {
    servico.solicitarImportacao.mockRejectedValue(
      new ApiError('Muitas requisições em pouco tempo. Tente novamente em instantes.', 429, 'MUITAS_REQUISICOES'),
    )
    const { wrapper } = await montarNaRota('/descobrir/adicionar')

    await digitarEBuscar(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toContain('Muitas requisições em pouco tempo.')
    expect(wrapper.find('.bg-ambar-fundo').exists()).toBe(true)
  })

  it('aberto pela estante, mantém Estante ativa no shell', async () => {
    const { wrapper } = await montarNaRota('/estante/adicionar')

    const barra = wrapper.findAll('nav[aria-label="Navegação principal"]')[1]!
    const links = barra.findAll('a')
    expect(links[0]!.get('span').classes()).toContain('text-musgo')
    expect(links[1]!.get('span').classes()).not.toContain('text-musgo')
  })

  it('máscara: digitar com ou sem hífen dá o mesmo valor, e passa de 13 dígitos não entra', async () => {
    const { wrapper } = await montarNaRota('/descobrir/adicionar')
    const campo = wrapper.get('input')

    await campo.setValue('9788535914849')
    expect((campo.element as HTMLInputElement).value).toBe('978-85-359-1484-9')
    await campo.setValue('978 85 359 1484 9 123')
    expect((campo.element as HTMLInputElement).value).toBe('978-85-359-1484-9')
    await campo.setValue('isbn')
    expect((campo.element as HTMLInputElement).value).toBe('')
  })

  it('botão desabilitado é neutro (linha e grafite-suave); buscando mantém o musgo', async () => {
    servico.solicitarImportacao.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await montarNaRota('/descobrir/adicionar')
    const botao = () => wrapper.get('button[type="submit"]')

    expect(botao().classes()).toEqual(expect.arrayContaining(['bg-linha', 'text-grafite-suave']))
    await digitarEBuscar(wrapper)
    expect(botao().classes()).toContain('bg-musgo')
    expect(botao().classes()).not.toContain('opacity-60')
  })

  it('buscar de novo o ISBN que acabou de entrar mostra a faixa de já cadastrado, com chave nova', async () => {
    servico.obterImportacao.mockResolvedValue({
      importacaoId: 'imp-1',
      isbn: '9788535914849',
      status: 'concluida',
      livroId: 'livro-1',
      livro: RESUMO,
      permiteCadastroPessoal: false,
    })
    const { wrapper } = await montarNaRota('/descobrir/adicionar')

    await digitarEBuscar(wrapper)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(wrapper.text()).toContain('Livro adicionado ao acervo.')

    servico.solicitarImportacao.mockResolvedValue({ tipo: 'existente', livroId: 'livro-1', livro: RESUMO })
    await wrapper.findAll('button').find((b) => b.text() === 'Cadastrar outro ISBN')!.trigger('click')
    await digitarEBuscar(wrapper)

    expect(wrapper.text()).toContain('Este livro já está no acervo.')
    const [primeira, segunda] = servico.solicitarImportacao.mock.calls.map((chamada) => chamada[1])
    expect(segunda).not.toBe(primeira)
  })
})
