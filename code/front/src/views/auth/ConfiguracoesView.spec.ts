import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { reagirAoFimDaSessao } from '../../router'
import { authService } from '../../services/auth'
import { perfilService } from '../../services/perfil'
import { encerrarSessao } from '../../session'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/auth', async (original) => {
  const real = await original<typeof import('../../services/auth')>()
  return { ...real, authService: { ...real.authService, sair: vi.fn(), buscarUsuarioAtual: vi.fn() } }
})

vi.mock('../../services/perfil', async (original) => {
  const real = await original<typeof import('../../services/perfil')>()
  return {
    ...real,
    perfilService: { ...real.perfilService, obterMeuPerfil: vi.fn(), definirOptOutRecomendacao: vi.fn() },
  }
})

describe('ConfiguracoesView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(authService.sair).mockReset()
    vi.mocked(authService.buscarUsuarioAtual)
      .mockReset()
      .mockResolvedValue({ id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão', email: 'marina.beltrao@gmail.com' })
    vi.mocked(authService.sair).mockImplementation(async () => {
      encerrarSessao()
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mostra nome, username e o e-mail de GET /me, as duas linhas e a política', async () => {
    const { wrapper } = await montarNaRota('/perfil/configuracoes')
    await flushPromises()

    expect(wrapper.text()).toContain('Marina Beltrão')
    expect(wrapper.text()).toContain('@marinableu')
    expect(wrapper.text()).toContain('marina.beltrao@gmail.com')
    expect(wrapper.text()).toContain('Alterar senha')
    expect(wrapper.text()).toContain('Dados que coletamos')
    expect(wrapper.text()).toContain('Lê Ai · versão 1.0.0')
  })

  // L-19 (E6-02): a entrada de F-CONTA-2, nas duas navegações (celular e web).
  it('a linha Excluir conta, no celular e na web, leva à tela de exclusão empilhada sobre Configurações', async () => {
    const { router, wrapper } = await montarNaRota('/perfil/configuracoes')
    await flushPromises()

    const [celular, web] = wrapper.findAll('nav[aria-label="Configurações"]')
    for (const nav of [celular!, web!]) {
      const linha = nav.findAll('a').find((a) => a.text() === 'Excluir conta')!
      expect(linha.attributes('href')).toBe('/perfil/configuracoes/excluir-conta')
    }
    // Sem `rubi` na linha: a ação destrutiva é o botão lá dentro (excluir-conta.md §4).
    expect(celular!.findAll('a').find((a) => a.text() === 'Excluir conta')!.classes()).not.toContain('text-rubi')
    // A ordem das linhas do celular: a exclusão vem depois da política, no grupo de dados.
    expect(celular!.findAll('a').map((a) => a.text())).toEqual(['Alterar senha', 'Política de privacidade', 'Excluir conta'])

    await web!.findAll('a').find((a) => a.text() === 'Excluir conta')!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('excluir-conta')
    expect(wrapper.text()).toContain('Excluir sua conta')
    expect(wrapper.text()).toContain('Você pode pedir a exclusão agora e mudar de ideia em até 30 dias.')
  })

  it('só o administrador tem a linha Moderação, no celular (F-MOD)', async () => {
    const leitor = await montarNaRota('/perfil/configuracoes')
    await flushPromises()
    expect(leitor.wrapper.find('a[href="/moderacao"]').exists()).toBe(false)
    leitor.wrapper.unmount()

    const { wrapper } = await montarNaRota('/perfil/configuracoes', { admin: true })
    await flushPromises()
    const linha = wrapper.get('a[href="/moderacao"]')
    expect(linha.text()).toBe('Moderação')
  })

  it('enquanto GET /me não volta, mostra o skeleton de três barras', async () => {
    vi.mocked(authService.buscarUsuarioAtual).mockReturnValue(new Promise(() => {}))
    const { wrapper } = await montarNaRota('/perfil/configuracoes')

    const skeleton = wrapper.get('[aria-label="Carregando conta"]')
    expect(skeleton.findAll('span')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('@marinableu')
  })

  it('se GET /me falhar, fica com nome e username da sessão, sem e-mail', async () => {
    vi.mocked(authService.buscarUsuarioAtual).mockRejectedValue(new Error('rede'))
    const { wrapper } = await montarNaRota('/perfil/configuracoes')
    await flushPromises()

    expect(wrapper.text()).toContain('Marina Beltrão')
    expect(wrapper.text()).toContain('@marinableu')
    expect(wrapper.text()).not.toContain('@gmail.com')
  })

  it('sair pede confirmação, revoga e vai ao login sem destino', async () => {
    const { router, wrapper } = await montarNaRota('/perfil/configuracoes')
    // Como em produção: o fim da sessão também dispara o redirecionamento com `?destino=`, e a
    // saída voluntária precisa prevalecer sobre ele.
    reagirAoFimDaSessao(router)

    const sair = wrapper.findAll('button').find((botao) => botao.text().includes('Sair da conta'))!
    await sair.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Sair da conta?')
    expect(authService.sair).not.toHaveBeenCalled()

    const confirmar = [...document.body.querySelectorAll('button')].find((botao) => botao.textContent?.trim() === 'Sair')!
    confirmar.click()
    await flushPromises()

    expect(authService.sair).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query).toEqual({})
  })

  describe('Usar minhas leituras em sugestões (F-REC-ALG)', () => {
    function perfil(optOutRecomendacao: boolean) {
      return {
        id: 'u1',
        username: 'marinableu',
        displayName: 'Marina Beltrão',
        avatarUrl: null,
        privacidade: 'publico' as const,
        conteudoRestrito: false,
        relacao: 'proprio' as const,
        biografia: null,
        contadores: { seguidores: 0, seguidos: 0 },
        optOutRecomendacao,
      }
    }

    // A linha do celular vem antes da do painel da web, que fica no DOM escondida por CSS. Antes
    // de ler o perfil ela ainda não é `switch`, por isso a busca é pelo texto.
    const linha = (wrapper: Awaited<ReturnType<typeof montarNaRota>>['wrapper']) =>
      wrapper.findAll('button').find((b) => b.text().startsWith('Usar minhas leituras em sugestões'))!

    beforeEach(() => {
      vi.mocked(perfilService.obterMeuPerfil).mockReset().mockResolvedValue(perfil(false))
      vi.mocked(perfilService.definirOptOutRecomendacao).mockReset()
    })

    it('o switch é a frase positiva: ligado quando optOutRecomendacao é falso', async () => {
      const { wrapper } = await montarNaRota('/perfil/configuracoes')
      await flushPromises()

      expect(linha(wrapper).text()).toContain('Usar minhas leituras em sugestões')
      expect(linha(wrapper).attributes('aria-checked')).toBe('true')
    })

    it('antes de ler o perfil, o switch é um skeleton e o toque não grava', async () => {
      vi.mocked(perfilService.obterMeuPerfil).mockReturnValue(new Promise(() => {}))
      const { wrapper } = await montarNaRota('/perfil/configuracoes')

      await linha(wrapper).trigger('click')

      // Estado desconhecido: não afirma ligado nem desligado (configuracoes.md §4.5).
      expect(linha(wrapper).attributes('role')).toBeUndefined()
      expect(linha(wrapper).attributes('aria-checked')).toBeUndefined()
      expect(linha(wrapper).attributes('aria-disabled')).toBe('true')
      expect(perfilService.definirOptOutRecomendacao).not.toHaveBeenCalled()
    })

    it('para o leitor de tela, o nome é só o rótulo; descrição e erro são a dica, em região educada', async () => {
      vi.mocked(perfilService.definirOptOutRecomendacao).mockRejectedValueOnce(new TypeError('offline'))
      const { wrapper } = await montarNaRota('/perfil/configuracoes')
      await flushPromises()

      const botao = linha(wrapper)
      expect(botao.attributes('role')).toBe('switch')
      const rotulo = wrapper.get(`[id="${botao.attributes('aria-labelledby')}"]`)
      expect(rotulo.text()).toBe('Usar minhas leituras em sugestões')
      const [idDescricao, idErro] = botao.attributes('aria-describedby')!.split(' ')
      expect(wrapper.get(`[id="${idDescricao}"]`).text()).toContain('Os livros que você lê ajudam a sugerir leituras')

      await botao.trigger('click')
      await flushPromises()

      const erro = wrapper.get(`[id="${idErro}"]`)
      expect(erro.attributes('aria-live')).toBe('polite')
      expect(erro.text()).toBe('Não foi possível salvar. Verifique sua conexão e tente de novo.')
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('desligar grava optOutRecomendacao verdadeiro, sem botão de salvar', async () => {
      vi.mocked(perfilService.definirOptOutRecomendacao).mockResolvedValue(perfil(true))
      const { wrapper } = await montarNaRota('/perfil/configuracoes')
      await flushPromises()

      await linha(wrapper).trigger('click')
      expect(linha(wrapper).attributes('aria-checked')).toBe('false')
      await flushPromises()

      expect(perfilService.definirOptOutRecomendacao).toHaveBeenCalledWith(true, expect.any(String))
      expect(linha(wrapper).attributes('aria-checked')).toBe('false')
      expect(wrapper.text()).not.toContain('Não foi possível salvar')
    })

    it('falha devolve o switch e diz o motivo; tocar de novo repete com a mesma chave', async () => {
      vi.mocked(perfilService.definirOptOutRecomendacao)
        .mockRejectedValueOnce(new TypeError('offline'))
        .mockResolvedValueOnce(perfil(true))
      const { wrapper } = await montarNaRota('/perfil/configuracoes')
      await flushPromises()

      await linha(wrapper).trigger('click')
      await flushPromises()

      expect(linha(wrapper).attributes('aria-checked')).toBe('true')
      expect(linha(wrapper).text()).toContain('Não foi possível salvar. Verifique sua conexão e tente de novo.')

      await linha(wrapper).trigger('click')
      await flushPromises()

      const [primeira, segunda] = vi.mocked(perfilService.definirOptOutRecomendacao).mock.calls
      expect(segunda![1]).toBe(primeira![1])
      expect(linha(wrapper).text()).not.toContain('Não foi possível salvar')
    })

    it('na web, o item Leituras em sugestões abre o painel no lugar da política', async () => {
      const { wrapper } = await montarNaRota('/perfil/configuracoes', { largo: true })
      await flushPromises()

      const item = wrapper.findAll('button').find((b) => b.text() === 'Leituras em sugestões')!
      await item.trigger('click')

      expect(item.attributes('aria-current')).toBe('page')
      expect(wrapper.text()).toContain('Seus livros lidos entram nessa conta.')
      expect(wrapper.text()).not.toContain('Dados que coletamos')
      expect(wrapper.get('a[href="/perfil/editar"]').text()).toBe('Editar perfil')
    })
  })
})
