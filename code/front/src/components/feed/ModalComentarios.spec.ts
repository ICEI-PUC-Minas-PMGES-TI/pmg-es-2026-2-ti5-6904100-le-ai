import { DOMWrapper, RouterLinkStub, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import { perfilService, type Perfil } from '../../services/perfil'
import { socialService, type Atividade, type Comentario, type ListaRespostas } from '../../services/social'
import ModalComentarios from './ModalComentarios.vue'

vi.mock('../../services/social', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/social')>()),
  socialService: {
    listarComentariosRaiz: vi.fn(),
    listarRespostas: vi.fn(),
    comentar: vi.fn(),
    editarComentario: vi.fn(),
    excluirComentario: vi.fn(),
  },
}))

vi.mock('../../services/perfil', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/perfil')>()),
  perfilService: { obterMeuPerfil: vi.fn() },
}))

const social = vi.mocked(socialService)
const perfil = vi.mocked(perfilService)

const AUTOR_ATIVIDADE = { id: 'u1', username: 'rafaokamoto', nomeExibicao: 'Rafael Okamoto', avatarUrl: null }
const DANDARA = { id: 'u2', username: 'dandaralp', nomeExibicao: 'Dandara Lopes', avatarUrl: null }
const RAFAEL = { id: 'u1', username: 'rafaokamoto', nomeExibicao: 'Rafael Okamoto', avatarUrl: null }
const JULIA = { id: 'u3', username: 'juwences', nomeExibicao: 'Júlia Wenceslau', avatarUrl: null }

function atividade(sobrescreve: Partial<Atividade> = {}): Atividade {
  return {
    id: 'a1',
    tipo: 'RESENHA_PUBLICADA',
    autor: AUTOR_ATIVIDADE,
    livro: { id: 'l1', tipo: 'OFICIAL', titulo: 'Os Sertões', autor: 'Euclides da Cunha', capaUrl: null },
    resenha: { id: 'r1', texto: 'texto', spoiler: false, nota: null },
    criadoEm: new Date().toISOString(),
    totalCurtidas: 0,
    totalComentarios: 3,
    curtidaPeloSolicitante: false,
    ...sobrescreve,
  }
}

function comentario(sobrescreve: Partial<Comentario> = {}): Comentario {
  return {
    id: 'c1',
    atividadeId: 'a1',
    comentarioRaizId: null,
    comentarioRespondidoId: null,
    usuarioRespondido: null,
    autor: DANDARA,
    texto: 'Reli esse ano e travei na segunda parte.',
    mencoes: [],
    nivel: 'RAIZ',
    totalRespostas: 0,
    pertenceAoSolicitante: false,
    editado: false,
    criadoEm: new Date(Date.now() - 60 * 60_000).toISOString(),
    atualizadoEm: null,
    ...sobrescreve,
  }
}

function pagina(items: Comentario[]) {
  return { items, page: 0, size: 20, totalElements: items.length, totalPages: 1 }
}

function meuPerfil(): Perfil {
  return {
    id: 'me',
    username: 'marinableu',
    displayName: 'Marina Beltrão',
    avatarUrl: null,
    privacidade: 'publico',
    conteudoRestrito: false,
    relacao: 'proprio',
    biografia: null,
    contadores: { seguidores: 0, seguidos: 0 },
  }
}

/**
 * `SobreposicaoModal` renderiza via `<Teleport to="body">`: o `wrapper` de `@vue/test-utils` só
 * enxerga a árvore do componente raiz, então as buscas usam um `DOMWrapper` de `document.body`
 * (com `attachTo`), que tem a mesma API (`get`/`find`/`findAll`/`text`).
 */
function montar(props: { atividade: Atividade; aberto: boolean }) {
  const wrapper = mount(ModalComentarios, {
    props,
    attachTo: document.body,
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
  const tela = new DOMWrapper(document.body)
  return { wrapper, tela }
}

describe('ModalComentarios', () => {
  beforeEach(() => {
    social.listarComentariosRaiz.mockReset()
    social.listarRespostas.mockReset()
    social.comentar.mockReset()
    perfil.obterMeuPerfil.mockReset()
    perfil.obterMeuPerfil.mockResolvedValue(meuPerfil())
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('carrega e lista os comentários-raiz ao abrir', async () => {
    social.listarComentariosRaiz.mockResolvedValue(pagina([comentario(), comentario({ id: 'c2', autor: { ...DANDARA, nomeExibicao: 'Nadia Sampaio', username: 'nadiasampaio' } })]))

    const { tela } = montar({ atividade: atividade(), aberto: true })
    await flushPromises()

    expect(social.listarComentariosRaiz).toHaveBeenCalledWith('a1', 0)
    expect(tela.text()).toContain('Reli esse ano e travei na segunda parte.')
    expect(tela.text()).toContain('Nadia Sampaio')
  })

  it('cabeçalho mostra a contagem de comentários da atividade, ou "Nenhum comentário" quando zero', async () => {
    social.listarComentariosRaiz.mockResolvedValue(pagina([]))

    const { tela: comComentarios } = montar({ atividade: atividade({ totalComentarios: 3 }), aberto: true })
    await flushPromises()
    expect(comComentarios.text()).toContain('3 comentários')

    const { tela: semComentarios } = montar({ atividade: atividade({ totalComentarios: 0 }), aberto: true })
    await flushPromises()
    expect(semComentarios.text()).toContain('Nenhum comentário')
  })

  it('resumo da atividade mostra autor, verbo e livro sem ser um link', async () => {
    social.listarComentariosRaiz.mockResolvedValue(pagina([]))

    const { tela } = montar({ atividade: atividade(), aberto: true })
    await flushPromises()

    expect(tela.text()).toContain('Rafael Okamoto publicou uma resenha')
    expect(tela.text()).toContain('Os Sertões, de Euclides da Cunha')
    expect(tela.find('a').exists()).toBe(false)
  })

  it('estado vazio: ícone e texto, sem botão', async () => {
    social.listarComentariosRaiz.mockResolvedValue(pagina([]))

    const { tela } = montar({ atividade: atividade({ totalComentarios: 0 }), aberto: true })
    await flushPromises()

    expect(tela.text()).toContain('Seja o primeiro a comentar esta atividade.')
  })

  it('erro ao carregar mostra o banner e "Tentar de novo" recarrega', async () => {
    social.listarComentariosRaiz.mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce(pagina([comentario()]))

    const { tela } = montar({ atividade: atividade(), aberto: true })
    await flushPromises()

    expect(tela.text()).toContain('Não foi possível carregar os comentários. Verifique sua conexão e tente de novo.')

    await tela.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('Reli esse ano e travei na segunda parte.')
  })

  it('"Ver N respostas" expande e alterna para "Ocultar respostas"', async () => {
    const raiz = comentario({ totalRespostas: 2 })
    social.listarComentariosRaiz.mockResolvedValue(pagina([raiz]))
    const respostas: Comentario[] = [
      comentario({ id: 'r1', nivel: 'RESPOSTA', comentarioRaizId: 'c1', autor: RAFAEL, texto: 'Vale a pena.' }),
    ]
    social.listarRespostas.mockResolvedValue({ itens: respostas, proximoCursor: null, temMais: false } satisfies ListaRespostas)

    const { tela } = montar({ atividade: atividade(), aberto: true })
    await flushPromises()

    const alternador = tela.get('[aria-expanded="false"]')
    expect(alternador.text()).toBe('Ver 2 respostas')
    await alternador.trigger('click')
    await flushPromises()

    expect(social.listarRespostas).toHaveBeenCalledWith('c1')
    expect(tela.text()).toContain('Vale a pena.')
    expect(tela.get('[aria-expanded="true"]').text()).toBe('Ocultar respostas')

    await tela.get('[aria-expanded="true"]').trigger('click')
    expect(tela.text()).not.toContain('Vale a pena.')
  })

  it('responder a uma resposta pré-preenche @username e a nova resposta entra no mesmo recuo, sob a mesma raiz', async () => {
    const raiz = comentario({ totalRespostas: 1 })
    social.listarComentariosRaiz.mockResolvedValue(pagina([raiz]))
    const respostaExistente = comentario({
      id: 'r1',
      nivel: 'RESPOSTA',
      comentarioRaizId: 'c1',
      autor: RAFAEL,
      texto: 'Vale a pena insistir.',
    })
    social.listarRespostas.mockResolvedValue({ itens: [respostaExistente], proximoCursor: null, temMais: false })

    const { tela } = montar({ atividade: atividade(), aberto: true })
    await flushPromises()
    await tela.get('[aria-expanded="false"]').trigger('click')
    await flushPromises()

    // Responder à resposta existente (de Rafael), não à raiz.
    const botoesResponder = tela.findAll('button').filter((b) => b.text() === 'Responder')
    await botoesResponder[1]!.trigger('click')
    await flushPromises()

    expect(tela.get('textarea').element.value).toBe('@rafaokamoto ')
    expect(tela.text()).toContain('Respondendo a Rafael')

    const novaResposta = comentario({
      id: 'r2',
      nivel: 'RESPOSTA',
      comentarioRaizId: 'c1',
      comentarioRespondidoId: 'r1',
      usuarioRespondido: RAFAEL,
      autor: JULIA,
      texto: '@rafaokamoto foi exatamente o que aconteceu comigo',
    })
    social.comentar.mockResolvedValue(novaResposta)

    await tela.get('button[aria-label="Enviar comentário"]').trigger('click')
    await flushPromises()

    expect(social.comentar).toHaveBeenCalledWith(
      'a1',
      { texto: '@rafaokamoto ', comentarioRespondidoId: 'r1' },
      expect.any(String),
    )
    expect(tela.text()).toContain('@rafaokamoto foi exatamente o que aconteceu comigo')
    expect(tela.get('[aria-expanded="true"]').text()).toBe('Ocultar respostas')
    expect(tela.get('textarea').element.value).toBe('')
    expect(tela.text()).not.toContain('Respondendo a Rafael')
  })

  it('enquanto carrega, a contagem do cabeçalho fica oculta (comentarios.md §4.7)', async () => {
    social.listarComentariosRaiz.mockReturnValue(new Promise(() => {}))

    const { tela } = montar({ atividade: atividade({ totalComentarios: 3 }), aberto: true })
    await flushPromises()

    expect(tela.text()).toContain('Comentários')
    expect(tela.text()).not.toContain('3 comentários')
  })

  it('a barra "Respondendo a" é anunciada a leitores de tela', async () => {
    social.listarComentariosRaiz.mockResolvedValue(pagina([comentario()]))

    const { tela } = montar({ atividade: atividade(), aberto: true })
    await flushPromises()
    await tela.findAll('button').find((b) => b.text() === 'Responder')!.trigger('click')
    await flushPromises()

    expect(tela.get('[role="status"]').text()).toContain('Respondendo a')
  })

  it('cancelar a resposta limpa o campo e a barra de contexto', async () => {
    social.listarComentariosRaiz.mockResolvedValue(pagina([comentario()]))

    const { tela } = montar({ atividade: atividade(), aberto: true })
    await flushPromises()

    await tela.findAll('button').find((b) => b.text() === 'Responder')!.trigger('click')
    await flushPromises()
    expect(tela.get('textarea').element.value).toBe('@dandaralp ')

    await tela.get('button[aria-label="Cancelar resposta"]').trigger('click')

    expect(tela.get('textarea').element.value).toBe('')
    expect(tela.text()).not.toContain('Respondendo a')
  })

  it('envio bem-sucedido de um comentário-raiz insere na lista sem recarregar tudo e emite comentario-criado', async () => {
    social.listarComentariosRaiz.mockResolvedValue(pagina([]))
    const { wrapper, tela } = montar({ atividade: atividade({ totalComentarios: 0 }), aberto: true })
    await flushPromises()

    await tela.get('textarea').setValue('Um comentário novo')
    const novo = comentario({ id: 'novo', texto: 'Um comentário novo' })
    social.comentar.mockResolvedValue(novo)

    await tela.get('button[aria-label="Enviar comentário"]').trigger('click')
    await flushPromises()

    expect(social.listarComentariosRaiz).toHaveBeenCalledTimes(1)
    expect(tela.text()).toContain('Um comentário novo')
    expect(wrapper.emitted('comentario-criado')).toHaveLength(1)
  })

  it('erro 429 ao enviar mostra o banner de limite, mantém o texto e desabilita o campo', async () => {
    social.listarComentariosRaiz.mockResolvedValue(pagina([]))
    const { tela } = montar({ atividade: atividade(), aberto: true })
    await flushPromises()

    await tela.get('textarea').setValue('Comentando demais')
    social.comentar.mockRejectedValue(new ApiError('Limite excedido', 429, 'RATE_LIMIT'))

    await tela.get('button[aria-label="Enviar comentário"]').trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('Muitos comentários seguidos. Espere alguns minutos para comentar de novo.')
    expect(tela.get('textarea').element.value).toBe('Comentando demais')
    expect(tela.get('textarea').attributes('disabled')).toBeDefined()
  })

  it('erro genérico ao enviar mostra a mensagem da API', async () => {
    social.listarComentariosRaiz.mockResolvedValue(pagina([]))
    const { tela } = montar({ atividade: atividade(), aberto: true })
    await flushPromises()

    await tela.get('textarea').setValue('Comentário')
    social.comentar.mockRejectedValue(new ApiError('Não foi possível comentar. Tente novamente.', 500, 'ERRO'))

    await tela.get('button[aria-label="Enviar comentário"]').trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('Não foi possível comentar. Tente novamente.')
  })

  it('fecha ao clicar no X e emite fechar', async () => {
    social.listarComentariosRaiz.mockResolvedValue(pagina([]))
    const { wrapper, tela } = montar({ atividade: atividade(), aberto: true })
    await flushPromises()

    await tela.get('button[aria-label="Fechar comentários"]').trigger('click')
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })

  describe('comentário próprio (F-SOCIAL-2)', () => {
    const MARINA = { id: 'me', username: 'marinableu', nomeExibicao: 'Marina Beltrão', avatarUrl: null }
    const TEXTO = 'Comecei semana passada, por indicação da @nadiasampaio.'

    function meu(sobrescreve: Partial<Comentario> = {}): Comentario {
      return comentario({ id: 'm1', autor: MARINA, texto: TEXTO, pertenceAoSolicitante: true, ...sobrescreve })
    }

    function botao(tela: DOMWrapper<Element>, rotulo: string) {
      return tela.findAll('button').find((b) => b.text() === rotulo)!
    }

    async function escolherNoMenu(tela: DOMWrapper<Element>, acao: 'Editar' | 'Excluir') {
      await tela.get('button[aria-label="Ações do seu comentário"]').trigger('click')
      await tela.findAll('[role="menuitem"]').find((b) => b.text() === acao)!.trigger('click')
      await flushPromises()
    }

    beforeEach(() => {
      social.editarComentario.mockReset()
      social.excluirComentario.mockReset()
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('menção resolvida vira link para o perfil; username inexistente continua texto', async () => {
      social.listarComentariosRaiz.mockResolvedValue(
        pagina([
          meu({
            texto: 'Indicação da @nadiasampaio e da @helenaprof.',
            mencoes: [{ posicao: 13, comprimento: 13, usuarioId: 'u9', username: 'nadiasampaio' }],
          }),
        ]),
      )
      const { wrapper, tela } = montar({ atividade: atividade(), aberto: true })
      await flushPromises()

      const links = wrapper.findAllComponents(RouterLinkStub)
      expect(links).toHaveLength(1)
      expect(links[0]!.props('to')).toEqual({ name: 'perfil-de-outro', params: { username: 'nadiasampaio' } })
      expect(links[0]!.text()).toBe('@nadiasampaio')
      expect(tela.text()).toContain('Indicação da @nadiasampaio e da @helenaprof.')
    })

    it('texto com HTML é exibido como texto, nunca interpretado', async () => {
      social.listarComentariosRaiz.mockResolvedValue(pagina([meu({ texto: '<img src=x onerror=alert(1)>' })]))
      const { tela } = montar({ atividade: atividade(), aberto: true })
      await flushPromises()

      expect(tela.find('img[src="x"]').exists()).toBe(false)
      expect(tela.text()).toContain('<img src=x onerror=alert(1)>')
    })

    it('comentário de outra pessoa não oferece editar nem excluir', async () => {
      social.listarComentariosRaiz.mockResolvedValue(pagina([comentario()]))
      const { tela } = montar({ atividade: atividade(), aberto: true })
      await flushPromises()

      expect(tela.find('button[aria-label="Ações do seu comentário"]').exists()).toBe(false)
    })

    it('editar leva o texto ao campo, só troca a lista depois do servidor e marca editado', async () => {
      social.listarComentariosRaiz.mockResolvedValue(pagina([meu()]))
      const { tela } = montar({ atividade: atividade(), aberto: true })
      await flushPromises()

      await escolherNoMenu(tela, 'Editar')
      expect(tela.text()).toContain('Editando comentário')
      expect(tela.get('textarea').element.value).toBe(TEXTO)
      expect(botao(tela, 'Salvar').attributes('disabled')).toBeDefined()

      const novoTexto = `${TEXTO} Obrigada!`
      await tela.get('textarea').setValue(novoTexto)
      let confirmar!: (c: Comentario) => void
      social.editarComentario.mockReturnValue(new Promise((resolve) => (confirmar = resolve)))
      await botao(tela, 'Salvar').trigger('click')
      await flushPromises()

      expect(social.editarComentario).toHaveBeenCalledWith('m1', novoTexto, expect.any(String))
      expect(tela.findAll('p').some((p) => p.text() === novoTexto)).toBe(false)

      confirmar(meu({ texto: novoTexto, editado: true }))
      await flushPromises()

      expect(tela.findAll('p').some((p) => p.text() === novoTexto)).toBe(true)
      expect(tela.text()).toContain('· editado')
      expect(tela.text()).not.toContain('Editando comentário')
      expect(tela.get('textarea').element.value).toBe('')
    })

    it('limite de menções ao salvar mostra o alerta e preserva o texto no campo', async () => {
      social.listarComentariosRaiz.mockResolvedValue(pagina([meu()]))
      const { tela } = montar({ atividade: atividade(), aberto: true })
      await flushPromises()

      await escolherNoMenu(tela, 'Editar')
      await tela.get('textarea').setValue(`${TEXTO} @ana @bia`)
      social.editarComentario.mockRejectedValue(new ApiError('Muitas menções', 429, 'MUITAS_REQUISICOES'))
      await botao(tela, 'Salvar').trigger('click')
      await flushPromises()

      expect(tela.text()).toContain('Muitas menções seguidas. Espere alguns minutos para salvar de novo.')
      expect(tela.get('textarea').element.value).toBe(`${TEXTO} @ana @bia`)
    })

    it('excluir raiz com resposta confirma citando quem respondeu, remove as duas e informa a contagem', async () => {
      social.listarComentariosRaiz.mockResolvedValue(pagina([meu({ totalRespostas: 1 })]))
      social.listarRespostas.mockResolvedValue({
        itens: [comentario({ id: 'r1', nivel: 'RESPOSTA', comentarioRaizId: 'm1', autor: RAFAEL, texto: 'A Terra engata depois.' })],
        proximoCursor: null,
        temMais: false,
      })
      const { wrapper, tela } = montar({ atividade: atividade(), aberto: true })
      await flushPromises()
      await botao(tela, 'Ver 1 resposta').trigger('click')
      await flushPromises()

      await escolherNoMenu(tela, 'Excluir')
      expect(tela.text()).toContain('Excluir comentário?')
      expect(tela.text()).toContain('Seu comentário e a resposta de Rafael Okamoto serão apagados. Não dá para desfazer.')

      social.excluirComentario.mockResolvedValue(undefined)
      await botao(tela, 'Excluir comentário').trigger('click')
      await flushPromises()

      expect(social.excluirComentario).toHaveBeenCalledWith('m1', expect.any(String))
      expect(tela.text()).not.toContain(TEXTO)
      expect(tela.text()).not.toContain('A Terra engata depois.')
      expect(wrapper.emitted('comentarios-excluidos')).toEqual([[2]])
    })

    it('falha ao excluir mantém o comentário e mostra o erro na confirmação', async () => {
      social.listarComentariosRaiz.mockResolvedValue(pagina([meu()]))
      const { wrapper, tela } = montar({ atividade: atividade(), aberto: true })
      await flushPromises()

      await escolherNoMenu(tela, 'Excluir')
      social.excluirComentario.mockRejectedValue(new ApiError('Indisponível', 503, 'SERVICO_INDISPONIVEL'))
      await botao(tela, 'Excluir comentário').trigger('click')
      await flushPromises()

      expect(tela.text()).toContain('Não foi possível excluir o comentário. Ele continua publicado. Tente de novo.')
      expect(tela.text()).toContain(TEXTO)
      expect(wrapper.emitted('comentarios-excluidos')).toBeUndefined()
    })
  })
})
