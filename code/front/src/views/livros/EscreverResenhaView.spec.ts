import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService } from '../../services/acervo'
import { ApiError } from '../../services/api'
import { leituraService, type Resenha } from '../../services/leitura'
import { livroOficial } from '../../testes/massaDoLivro'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/acervo', () => ({
  acervoService: {
    obterLivroOficial: vi.fn(),
    obterLivroPessoal: vi.fn(),
    listarResenhasDoLivro: vi.fn(),
    listarAssuntos: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../../services/leitura', () => ({
  leituraService: {
    obterMinhaAvaliacao: vi.fn(),
    salvarNota: vi.fn(),
    excluirNota: vi.fn(),
    salvarResenha: vi.fn(),
    excluirResenha: vi.fn(),
  },
}))

const acervo = vi.mocked(acervoService)
const leitura = vi.mocked(leituraService)

function resenha(texto: string, spoiler = false): Resenha {
  return {
    id: 'r1',
    usuarioId: 'u1',
    livroId: 'livro-1',
    texto,
    spoiler,
    criadoEm: '2026-08-22T12:00:00Z',
    atualizadoEm: '2026-08-22T12:00:00Z',
  }
}

/** O cabeçalho vai por `Teleport` para o `body`. */
function botao(rotulo: string): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === rotulo)
}

describe('EscreverResenhaView', () => {
  beforeEach(() => {
    localStorage.clear()
    acervo.obterLivroOficial.mockReset().mockResolvedValue(livroOficial())
    acervo.listarResenhasDoLivro.mockReset().mockResolvedValue({ itens: [], limit: 10, proximoCursor: null })
    leitura.obterMinhaAvaliacao.mockReset().mockResolvedValue({ livroId: 'livro-1', nota: null, resenha: null })
    leitura.salvarResenha
      .mockReset()
      .mockImplementation(async (_livroId, texto, spoiler) => resenha(texto, spoiler))
    leitura.excluirResenha.mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  async function abrir(caminho = '/livros/livro-1/resenha?origem=descobrir', historico?: 'navegador') {
    const montagem = await montarNaRota(caminho, { historico })
    await flushPromises()
    return montagem
  }

  async function digitar(wrapper: Awaited<ReturnType<typeof abrir>>['wrapper'], texto: string) {
    await wrapper.get('textarea').setValue(texto)
  }

  it('vazio: livro, "Sem nota", contador em zero, Publicar desabilitado e sem barra inferior', async () => {
    const { wrapper } = await abrir()

    expect(wrapper.text()).toContain('Torto Arado')
    expect(wrapper.text()).toContain('Sem nota')
    expect(wrapper.text()).toContain('0 de 5.000 caracteres')
    expect(botao('Publicar')?.disabled).toBe(true)
    expect(wrapper.get('textarea').attributes('placeholder')).toBe(
      'Escreva sobre o livro. O que ficou, o que incomodou, para quem você indicaria.',
    )
    // Abaixo de 768px vale o desenho mobile, que tira a barra inferior do editor.
    expect(wrapper.findAll('nav[aria-label="Navegação principal"]')).toHaveLength(1)
  })

  it('publicar envia texto e spoiler e volta para o livro com replace', async () => {
    const { wrapper, router } = await abrir()
    const substituir = vi.spyOn(router, 'replace')

    await digitar(wrapper, 'Levei três dias.')
    expect(wrapper.text()).toContain('16 de 5.000 caracteres')
    botao('Publicar')!.click()
    await flushPromises()

    expect(leitura.salvarResenha).toHaveBeenCalledWith('livro-1', 'Levei três dias.', false, expect.any(String))
    expect(substituir).toHaveBeenCalledWith({
      name: 'livro-oficial',
      params: { id: 'livro-1' },
      query: { origem: 'descobrir' },
    })
  })

  it('conta caracteres Unicode: emoji de um code point conta 1', async () => {
    const { wrapper } = await abrir()

    await digitar(wrapper, '😀')

    expect(wrapper.text()).toContain('1 de 5.000 caracteres')
  })

  it('acima do limite: aviso com o excedente, texto inteiro e Publicar bloqueado', async () => {
    const { wrapper } = await abrir()
    const texto = 'a'.repeat(5126)

    await digitar(wrapper, texto)

    expect(wrapper.text()).toContain('5.126 de 5.000 caracteres')
    expect(wrapper.text()).toContain('Sua resenha passou do limite em 126 caracteres, contando a formatação. Corte um trecho para publicar.')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(texto)
    expect(botao('Publicar')?.disabled).toBe(true)
  })

  it('spoiler ligado mostra o aviso e vai no corpo', async () => {
    const { wrapper } = await abrir()

    await digitar(wrapper, 'O final surpreende.')
    const toggle = wrapper.findAll('button[aria-pressed]').find((b) => b.text().includes('Contém spoiler'))!
    await toggle.trigger('click')

    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Sua resenha será exibida oculta. Quem quiser ler precisa tocar para revelar.')

    botao('Publicar')!.click()
    await flushPromises()
    expect(leitura.salvarResenha).toHaveBeenCalledWith('livro-1', 'O final surpreende.', true, expect.any(String))
  })

  it('erro ao publicar: banner e o texto continua no editor', async () => {
    leitura.salvarResenha.mockRejectedValue(new ApiError('x', 500, 'ERRO_INTERNO'))
    const { wrapper } = await abrir()

    await digitar(wrapper, 'Não quero perder isto.')
    botao('Publicar')!.click()
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível publicar sua resenha. O texto continua aqui. Tente de novo.')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Não quero perder isto.')
  })

  it('edição: texto existente, Salvar, data e excluir com confirmação', async () => {
    leitura.obterMinhaAvaliacao.mockResolvedValue({
      livroId: 'livro-1',
      nota: null,
      resenha: resenha('Primeira versão.'),
    })
    const { wrapper } = await abrir()

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Primeira versão.')
    expect(botao('Salvar')).toBeDefined()
    expect(wrapper.text()).toContain('Publicada em 22 de agosto de 2026')

    await wrapper.get('button[aria-label="Excluir resenha"]').trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Excluir sua resenha?')
    expect(document.body.textContent).toContain(
      'O texto será apagado e sai da página do livro e do seu perfil. Sua nota continua registrada.',
    )

    botao('Excluir resenha')!.click()
    await flushPromises()
    expect(leitura.excluirResenha).toHaveBeenCalledWith('livro-1', expect.any(String))
  })

  it('sair com texto não salvo pede confirmação e pode continuar escrevendo', async () => {
    const { wrapper, router } = await abrir()

    await digitar(wrapper, 'Rascunho.')
    await router.push('/descobrir')
    await flushPromises()

    expect(document.body.textContent).toContain('Descartar a resenha?')
    expect(router.currentRoute.value.name).toBe('escrever-resenha')

    botao('Continuar escrevendo')!.click()
    await flushPromises()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Rascunho.')
  })

  // Com o `leitura` lento, o que fosse digitado antes seria trocado pela resenha salva.
  it('enquanto a resenha salva carrega, o campo é só leitura e Publicar fica bloqueado', async () => {
    let responder!: (valor: Awaited<ReturnType<typeof leitura.obterMinhaAvaliacao>>) => void
    leitura.obterMinhaAvaliacao.mockReturnValue(new Promise((resolver) => (responder = resolver)))
    const { wrapper } = await abrir()

    expect(wrapper.get('textarea').attributes('readonly')).toBeDefined()
    expect(wrapper.get('textarea').attributes('aria-busy')).toBe('true')
    expect(botao('Publicar')?.disabled).toBe(true)

    responder({ livroId: 'livro-1', nota: null, resenha: resenha('Primeira versão.') })
    await flushPromises()

    expect(wrapper.get('textarea').attributes('readonly')).toBeUndefined()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Primeira versão.')
  })

  it('falha ao carregar a resenha salva: aviso, Tentar de novo e nada de publicar às cegas', async () => {
    leitura.obterMinhaAvaliacao.mockRejectedValueOnce(new ApiError('x', 503, 'SERVICO_INDISPONIVEL'))
    const { wrapper } = await abrir()

    expect(wrapper.text()).toContain('Não foi possível carregar sua resenha.')
    expect(wrapper.get('textarea').attributes('readonly')).toBeDefined()
    expect(botao('Publicar')?.disabled).toBe(true)

    botao('Tentar de novo')!.click()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Não foi possível carregar sua resenha.')
    expect(wrapper.get('textarea').attributes('readonly')).toBeUndefined()
  })

  // Salvar a nota com a resenha desconhecida liberaria o editor vazio para sobrescrevê-la.
  it('com a resenha salva sem carregar, Dar nota fica bloqueado', async () => {
    leitura.obterMinhaAvaliacao.mockRejectedValueOnce(new ApiError('x', 503, 'SERVICO_INDISPONIVEL'))
    await abrir()

    expect(botao('Dar nota')?.disabled).toBe(true)
  })

  // O modal fecha no próprio `Esc` e marca o evento; o editor não pode tratar o mesmo `Esc` como sair.
  it('Esc no diálogo de descarte fecha só o diálogo, sem reabrir nem sair', async () => {
    const { wrapper, router } = await abrir()
    await digitar(wrapper, 'Rascunho.')
    await router.push('/descobrir')
    await flushPromises()
    expect(document.body.textContent).toContain('Descartar a resenha?')

    document.body
      .querySelector('[role="dialog"], [role="alertdialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await flushPromises()

    expect(document.body.textContent).not.toContain('Descartar a resenha?')
    expect(router.currentRoute.value.name).toBe('escrever-resenha')
  })

  it('durante a exclusão o botão do cabeçalho não diz Publicando', async () => {
    leitura.obterMinhaAvaliacao.mockResolvedValue({ livroId: 'livro-1', nota: null, resenha: resenha('Um.') })
    leitura.excluirResenha.mockReturnValue(new Promise(() => undefined))
    const { wrapper } = await abrir()

    await wrapper.get('button[aria-label="Excluir resenha"]').trigger('click')
    await flushPromises()
    botao('Excluir resenha')!.click()
    await flushPromises()

    expect(botao('Publicando')).toBeUndefined()
  })

  // Um `replace` vindo do livro deixaria o livro duas vezes seguidas no histórico.
  it('vindo da página do livro, publicar volta no histórico em vez de empilhar o livro', async () => {
    const { wrapper, router } = await abrir('/livros/livro-1?origem=descobrir', 'navegador')
    await router.push('/livros/livro-1/resenha?origem=descobrir')
    await flushPromises()
    const voltar = vi.spyOn(router, 'back')
    const substituir = vi.spyOn(router, 'replace')

    await digitar(wrapper, 'Levei três dias.')
    botao('Publicar')!.click()
    await flushPromises()

    expect(voltar).toHaveBeenCalled()
    expect(substituir).not.toHaveBeenCalled()
  })

  it('sair sem mudanças não pergunta nada', async () => {
    const { router } = await abrir()

    await router.push('/descobrir')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/descobrir')
  })

  describe('Markdown (F-AVA-2)', () => {
    type Montagem = Awaited<ReturnType<typeof abrir>>['wrapper']

    function campo(wrapper: Montagem): HTMLTextAreaElement {
      return wrapper.get('textarea').element as HTMLTextAreaElement
    }

    async function selecionar(wrapper: Montagem, inicio: number, fim = inicio) {
      campo(wrapper).setSelectionRange(inicio, fim)
      await wrapper.get('textarea').trigger('select')
    }

    function botaoDaBarra(wrapper: Montagem, rotulo: string) {
      return wrapper.get(`[role="toolbar"][aria-label="Formatação"] button[aria-label^="${rotulo}"]`)
    }

    function aba(wrapper: Montagem, rotulo: 'Escrever' | 'Visualizar') {
      return wrapper.findAll('[role="tab"]').find((item) => item.text() === rotulo)!
    }

    it('negrito envolve a seleção, fica ativo e a marcação entra no contador', async () => {
      const { wrapper } = await abrir()
      await digitar(wrapper, 'um livro bom')
      await selecionar(wrapper, 3, 8)

      await botaoDaBarra(wrapper, 'Negrito').trigger('click')
      await flushPromises()

      expect(campo(wrapper).value).toBe('um **livro** bom')
      expect([campo(wrapper).selectionStart, campo(wrapper).selectionEnd]).toEqual([5, 10])
      expect(botaoDaBarra(wrapper, 'Negrito').attributes('aria-pressed')).toBe('true')
      expect(botaoDaBarra(wrapper, 'Itálico').attributes('aria-pressed')).toBe('false')
      expect(wrapper.text()).toContain('16 de 5.000 caracteres')

      // Tocar de novo com o cursor dentro remove o par.
      await botaoDaBarra(wrapper, 'Negrito').trigger('click')
      await flushPromises()
      expect(campo(wrapper).value).toBe('um livro bom')
    })

    it('seis botões em dois grupos, com rótulos e o atalho exposto', async () => {
      const { wrapper } = await abrir()
      const rotulos = wrapper.findAll('[role="toolbar"] button').map((b) => b.attributes('aria-label'))

      expect(rotulos).toEqual([
        'Negrito (Ctrl+B)',
        'Itálico (Ctrl+I)',
        'Tachado',
        'Lista com marcadores',
        'Lista numerada',
        'Citação',
      ])
    })

    it('lista numerada põe o prefixo em sequência nas linhas selecionadas', async () => {
      const { wrapper } = await abrir()
      await digitar(wrapper, 'um\ndois')
      await selecionar(wrapper, 0, 7)

      await botaoDaBarra(wrapper, 'Lista numerada').trigger('click')
      await flushPromises()

      expect(campo(wrapper).value).toBe('1. um\n2. dois')
    })

    it('Enter continua a lista e, no item vazio, sai dela', async () => {
      const { wrapper } = await abrir()
      await digitar(wrapper, '- um')
      await selecionar(wrapper, 4)

      await wrapper.get('textarea').trigger('keydown', { key: 'Enter' })
      await flushPromises()
      expect(campo(wrapper).value).toBe('- um\n- ')

      await wrapper.get('textarea').trigger('keydown', { key: 'Enter' })
      await flushPromises()
      expect(campo(wrapper).value).toBe('- um\n')
    })

    it('Ctrl+B e Ctrl+I aplicam negrito e itálico', async () => {
      const { wrapper } = await abrir()
      await digitar(wrapper, 'forte')
      await selecionar(wrapper, 0, 5)

      await wrapper.get('textarea').trigger('keydown', { key: 'b', ctrlKey: true })
      await flushPromises()
      expect(campo(wrapper).value).toBe('**forte**')

      await wrapper.get('textarea').trigger('keydown', { key: 'i', ctrlKey: true })
      await flushPromises()
      expect(campo(wrapper).value).toBe('***forte***')
    })

    it('Visualizar mostra a resenha formatada, sem barra, e Escrever volta com o texto e o cursor', async () => {
      const { wrapper } = await abrir()
      const texto = '**forte** e *leve* e ~~riscado~~\n\n- item\n\n> citado'
      await digitar(wrapper, texto)
      await selecionar(wrapper, 4)

      await aba(wrapper, 'Visualizar').trigger('click')
      await flushPromises()

      expect(aba(wrapper, 'Visualizar').attributes('aria-selected')).toBe('true')
      expect(wrapper.find('[role="toolbar"]').exists()).toBe(false)
      const previa = wrapper.get('#painel-visualizar')
      expect(previa.html()).toContain('<strong>forte</strong>')
      expect(previa.html()).toContain('<em>leve</em>')
      expect(previa.html()).toContain('<s>riscado</s>')
      expect(previa.find('ul li').text()).toBe('item')
      expect(previa.find('blockquote').text()).toBe('citado')
      // O contador conta o texto cru nos dois modos.
      expect(wrapper.text()).toContain(`${[...texto].length} de 5.000 caracteres`)

      await aba(wrapper, 'Escrever').trigger('click')
      await flushPromises()
      expect(campo(wrapper).value).toBe(texto)
      expect(campo(wrapper).selectionStart).toBe(4)
      expect(wrapper.find('[role="toolbar"]').exists()).toBe(true)
    })

    it('setas trocam de aba', async () => {
      const { wrapper } = await abrir()

      await aba(wrapper, 'Escrever').trigger('keydown', { key: 'ArrowRight' })
      await flushPromises()

      expect(aba(wrapper, 'Visualizar').attributes('aria-selected')).toBe('true')
    })

    it('Visualizar sem texto mostra o vazio, sem botão', async () => {
      const { wrapper } = await abrir()

      await aba(wrapper, 'Visualizar').trigger('click')
      await flushPromises()

      const previa = wrapper.get('#painel-visualizar')
      expect(previa.text()).toBe('Nada para visualizar ainda. Escreva sua resenha para ver como ela vai aparecer.')
      expect(previa.find('button').exists()).toBe(false)
    })

    it('marcação fora do subconjunto aparece literal, com a faixa; o subconjunto não liga a faixa', async () => {
      const { wrapper } = await abrir()
      await digitar(wrapper, 'Entrevista: [leia aqui](https://exemplo.com)\n\n# Título')
      await aba(wrapper, 'Visualizar').trigger('click')
      await flushPromises()

      const previa = wrapper.get('#painel-visualizar')
      expect(previa.text()).toContain('Links, imagens, tabelas, títulos, código e HTML aparecem como você digitou.')
      expect(previa.text()).toContain('[leia aqui](https://exemplo.com)')
      expect(previa.text()).toContain('# Título')
      expect(previa.find('a').exists()).toBe(false)
      expect(previa.find('h1').exists()).toBe(false)

      await aba(wrapper, 'Escrever').trigger('click')
      await digitar(wrapper, '**só o subconjunto**')
      await aba(wrapper, 'Visualizar').trigger('click')
      await flushPromises()
      expect(wrapper.get('#painel-visualizar').text()).not.toContain('Links, imagens')
    })

    it('HTML digitado não entra no DOM da pré-visualização (RNF-SEC-15)', async () => {
      const { wrapper } = await abrir()
      await digitar(wrapper, '<img src=x onerror=alert(1)> <script>alert(1)</script>')
      await aba(wrapper, 'Visualizar').trigger('click')
      await flushPromises()

      const previa = wrapper.get('#painel-visualizar')
      expect(previa.find('img').exists()).toBe(false)
      expect(previa.find('script').exists()).toBe(false)
      expect(previa.text()).toContain('<img src=x onerror=alert(1)>')
    })

    it('enquanto a resenha salva carrega, a barra fica desabilitada', async () => {
      leitura.obterMinhaAvaliacao.mockReturnValue(new Promise(() => {}))
      const { wrapper } = await abrir()

      expect(botaoDaBarra(wrapper, 'Negrito').attributes('disabled')).toBeDefined()
    })
  })
})
