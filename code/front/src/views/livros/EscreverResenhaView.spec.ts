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

  async function abrir(caminho = '/livros/livro-1/resenha?origem=descobrir') {
    const montagem = await montarNaRota(caminho)
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
    expect(wrapper.text()).toContain('Sua resenha passou do limite em 126 caracteres. Corte um trecho para publicar.')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(texto)
    expect(botao('Publicar')?.disabled).toBe(true)
  })

  it('spoiler ligado mostra o aviso e vai no corpo', async () => {
    const { wrapper } = await abrir()

    await digitar(wrapper, 'O final surpreende.')
    const toggle = wrapper.get('button[aria-pressed]')
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

  it('sair sem mudanças não pergunta nada', async () => {
    const { router } = await abrir()

    await router.push('/descobrir')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/descobrir')
  })
})
