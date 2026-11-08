import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { routes } from '../../router'
import { ApiError } from '../../services/api'
import type { DenunciaPendente, ModeracaoService } from '../../services/moderacao'
import { denunciaDeComentario, denunciaDeResenha, registro } from '../../testes/massaDeModeracao'
import PainelModeracaoView from './PainelModeracaoView.vue'

function pagina<T>(itens: T[], proximoCursor: string | null = null) {
  return { itens, proximoCursor, temMais: proximoCursor !== null }
}

function servicoFalso(fila: DenunciaPendente[]) {
  return {
    listarDenuncias: vi.fn().mockResolvedValue(pagina(fila)),
    arquivar: vi.fn(),
    remover: vi.fn(),
    listarRegistros: vi.fn().mockResolvedValue(pagina([registro('r1')])),
    suspenderConta: vi.fn(),
    reativarConta: vi.fn(),
  } satisfies Pick<
    ModeracaoService,
    'listarDenuncias' | 'arquivar' | 'remover' | 'listarRegistros' | 'suspenderConta' | 'reativarConta'
  >
}

async function montar(servico: ReturnType<typeof servicoFalso>) {
  document.body.innerHTML = '<div id="avisos-flutuantes"></div>'
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/moderacao')
  const wrapper = mount(PainelModeracaoView, {
    props: { servico },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, tela: new DOMWrapper(document.body) }
}

function botao(tela: DOMWrapper<Element>, texto: string) {
  return tela.findAll('button').find((b) => b.text().trim() === texto)
}

describe('PainelModeracaoView', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')))
    vi.stubEnv('VITE_LEITURA_BASE_URL', 'http://leitura.teste')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    document.body.innerHTML = ''
  })

  it('fila da mais antiga com a primeira selecionada e o detalhe completo', async () => {
    const servico = servicoFalso([denunciaDeResenha('d1'), denunciaDeComentario('d2')])
    const { tela } = await montar(servico)

    expect(tela.text()).toContain('Da mais antiga para a mais recente')
    expect(tela.text()).toContain('Letícia Nakamura · Torto Arado')
    expect(tela.text()).toContain('Denúncia de resenha')
    expect(tela.text()).toContain('Recebida em 27 de setembro de 2026, às 21:08, de @otaviobrandao')
    expect(tela.get('em').text()).toBe('não consegui parar')
    expect(tela.find('a[href="/livros/l1"]').exists()).toBe(true)
    expect(botao(tela, 'Arquivar como improcedente')).toBeDefined()
    expect(botao(tela, 'Remover resenha')).toBeDefined()
  })

  it('comentário com respostas mostra a faixa e não oferece Ver no feed sem acesso', async () => {
    const { tela } = await montar(servicoFalso([denunciaDeComentario('d2')]))

    expect(tela.text()).toContain('Este comentário tem 2 respostas. Remover o comentário remove as respostas também.')
    expect(tela.text()).not.toContain('Ver no feed')
    expect(tela.text()).toContain('Remover comentário')
  })

  it('arquivar tira da fila, seleciona a próxima e avisa', async () => {
    const servico = servicoFalso([denunciaDeResenha('d1'), denunciaDeComentario('d2')])
    servico.arquivar.mockResolvedValue({ denunciasFechadas: ['d1'] })
    const { tela } = await montar(servico)

    await botao(tela, 'Arquivar como improcedente')!.trigger('click')
    await flushPromises()

    expect(servico.arquivar).toHaveBeenCalledWith('d1', expect.any(String))
    expect(tela.text()).not.toContain('Letícia Nakamura · Torto Arado')
    expect(tela.text()).toContain('Denúncia de comentário')
    expect(tela.text()).toContain('Denúncia arquivada como improcedente. A resenha continua publicada.')
  })

  it('remover pede confirmação; 504 deixa a denúncia com o banner e o reenvio usa a mesma chave', async () => {
    const servico = servicoFalso([denunciaDeResenha('d1')])
    servico.remover
      .mockRejectedValueOnce(new ApiError('tempo', 504, 'TEMPO_ESGOTADO'))
      .mockResolvedValueOnce({ denunciasFechadas: ['d1'] })
    const { tela } = await montar(servico)

    await botao(tela, 'Remover resenha')!.trigger('click')
    await flushPromises()
    expect(tela.text()).toContain('Remover a resenha de Letícia Nakamura?')
    const confirmar = tela.findAll('[role="dialog"] button').find((b) => b.text() === 'Remover resenha')!
    await confirmar.trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('A remoção não foi confirmada a tempo. A denúncia continua pendente.')
    expect(botao(tela, 'Arquivar como improcedente')).toBeUndefined()

    await botao(tela, 'Remover resenha')!.trigger('click')
    await flushPromises()
    await tela.findAll('[role="dialog"] button').find((b) => b.text() === 'Remover resenha')!.trigger('click')
    await flushPromises()

    expect(servico.remover.mock.calls[0]![1]).toBe(servico.remover.mock.calls[1]![1])
    expect(tela.text()).toContain('Resenha removida. A denúncia saiu da fila.')
    expect(tela.text()).toContain('Nenhuma denúncia pendente')
  })

  it('conteúdo já excluído pelo autor: faixa neutra e só Arquivar denúncia', async () => {
    const { tela } = await montar(servicoFalso([denunciaDeResenha('d1', { conteudo: null })]))

    expect(tela.text()).toContain('Quem escreveu excluiu esta resenha depois da denúncia. Não há o que remover.')
    expect(botao(tela, 'Arquivar denúncia')).toBeDefined()
    expect(botao(tela, 'Remover resenha')).toBeUndefined()
  })

  it('409 de conteúdo já excluído no remover troca para o estado de arquivar', async () => {
    const servico = servicoFalso([denunciaDeResenha('d1')])
    servico.remover.mockRejectedValue(new ApiError('sumiu', 409, 'CONTEUDO_JA_EXCLUIDO'))
    const { tela } = await montar(servico)

    await botao(tela, 'Remover resenha')!.trigger('click')
    await flushPromises()
    await tela.findAll('[role="dialog"] button').find((b) => b.text() === 'Remover resenha')!.trigger('click')
    await flushPromises()

    expect(botao(tela, 'Arquivar denúncia')).toBeDefined()
    expect(botao(tela, 'Remover resenha')).toBeUndefined()
  })

  it('fila vazia e erro ao carregar', async () => {
    const vazia = await montar(servicoFalso([]))
    expect(vazia.tela.text()).toContain('Nenhuma denúncia pendente')
    vazia.wrapper.unmount()

    const servico = servicoFalso([])
    servico.listarDenuncias.mockRejectedValueOnce(new TypeError('rede'))
    const { tela } = await montar(servico)
    expect(tela.text()).toContain('Não foi possível carregar as denúncias.')
    await botao(tela, 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(tela.text()).toContain('Nenhuma denúncia pendente')
  })

  it('aba de auditoria lista as ações, sem motivo nem texto', async () => {
    const servico = servicoFalso([denunciaDeResenha('d1')])
    const { tela } = await montar(servico)

    await tela.findAll('[role="tab"]')[1]!.trigger('click')
    await flushPromises()

    expect(servico.listarRegistros).toHaveBeenCalled()
    expect(tela.text()).toContain('29/09/2026 10:12')
    expect(tela.text()).toContain('Administrador')
    expect(tela.text()).toContain('Removeu comentário')
    expect(tela.text()).toContain('Comentário de @tiagomoreira na atividade de @rafaokamoto')
  })

  it('recarregado depois de um timeout sem a resenha na VIEW: banner e Remover para concluir', async () => {
    const servico = servicoFalso([denunciaDeResenha('d1', { conteudo: null, remocaoNaoConfirmada: true })])
    servico.remover.mockResolvedValue({ denunciasFechadas: ['d1'] })
    const { tela } = await montar(servico)

    expect(tela.text()).toContain('A remoção não foi confirmada a tempo.')
    expect(tela.text()).toContain('A resenha já não aparece para os leitores.')
    expect(tela.text()).not.toContain('Quem escreveu excluiu esta resenha')
    expect(botao(tela, 'Arquivar denúncia')).toBeUndefined()

    await botao(tela, 'Remover resenha')!.trigger('click')
    await flushPromises()
    await tela.findAll('[role="dialog"] button').find((b) => b.text() === 'Remover resenha')!.trigger('click')
    await flushPromises()

    expect(servico.remover).toHaveBeenCalledWith('d1', expect.any(String))
    expect(tela.text()).toContain('Resenha removida. A denúncia saiu da fila.')
  })

  it('resolver a página carregada traz a seguinte em vez do vazio', async () => {
    const servico = servicoFalso([])
    servico.listarDenuncias
      .mockResolvedValueOnce(pagina([denunciaDeResenha('d1')], 'c1'))
      .mockResolvedValueOnce(pagina([denunciaDeComentario('d2')]))
    servico.arquivar.mockResolvedValue({ denunciasFechadas: ['d1'] })
    const { tela } = await montar(servico)

    await botao(tela, 'Arquivar como improcedente')!.trigger('click')
    await flushPromises()

    expect(servico.listarDenuncias).toHaveBeenLastCalledWith('c1')
    expect(tela.text()).not.toContain('Nenhuma denúncia pendente')
    expect(tela.text()).toContain('Denúncia de comentário')
  })

  it('o registro volta a consultar depois de uma ação', async () => {
    const servico = servicoFalso([denunciaDeResenha('d1'), denunciaDeComentario('d2')])
    servico.arquivar.mockResolvedValue({ denunciasFechadas: ['d1'] })
    const { tela } = await montar(servico)
    const abas = () => tela.findAll('[role="tab"]')

    await abas()[1]!.trigger('click')
    await flushPromises()
    await abas()[0]!.trigger('click')
    await flushPromises()
    await abas()[1]!.trigger('click')
    await flushPromises()
    expect(servico.listarRegistros).toHaveBeenCalledTimes(1)

    await abas()[0]!.trigger('click')
    await flushPromises()
    await botao(tela, 'Arquivar como improcedente')!.trigger('click')
    await flushPromises()
    await abas()[1]!.trigger('click')
    await flushPromises()

    expect(servico.listarRegistros).toHaveBeenCalledTimes(2)
  })

  it('acorda o leitura ao abrir', async () => {
    await montar(servicoFalso([]))

    expect(vi.mocked(fetch)).toHaveBeenCalledWith('http://leitura.teste/health')
  })
  // ------------------------------------------------------------------ F-MOD-OPC

  it('DotsThree da conta do autor no detalhe; sem ele quando a conta foi excluída', async () => {
    const { tela } = await montar(servicoFalso([denunciaDeComentario('d2'), denunciaDeResenha('d1', { autor: null })]))

    expect(tela.find('[aria-label="Ações sobre a conta de Sérgio Valadares"]').exists()).toBe(true)

    await tela.findAll('li button')[1]!.trigger('click')
    await flushPromises()
    expect(tela.find('[aria-label^="Ações sobre a conta"]').exists()).toBe(false)
  })

  it('suspender pelo DotsThree: confirma, mostra a etiqueta, a faixa, o conteúdo oculto e o toast', async () => {
    const servico = servicoFalso([denunciaDeComentario('d2', {
      atividade: { id: 'at1', tipo: 'resenha_publicada', autorNome: 'Rafael', livroTitulo: 'Os Sertões', visivelParaAdmin: true },
    })])
    servico.suspenderConta.mockResolvedValue({
      usuarioId: 'a2', suspensa: true, suspensaEm: '2026-10-11T14:32:00', reativadaEm: null,
    })
    const { tela } = await montar(servico)
    expect(tela.text()).toContain('Ver no feed')

    await tela.get('[aria-label="Ações sobre a conta de Sérgio Valadares"]').trigger('click')
    await flushPromises()
    await botao(tela, 'Suspender conta do autor')!.trigger('click')
    await flushPromises()
    expect(tela.text()).toContain('Suspender a conta de Sérgio Valadares?')

    await tela.get('textarea').setValue('Ataques pessoais repetidos.')
    await tela.get('[data-confirmar]').trigger('click')
    await flushPromises()

    expect(servico.suspenderConta).toHaveBeenCalledWith('a2', 'Ataques pessoais repetidos.', expect.any(String))
    expect(tela.text()).not.toContain('Suspender a conta de Sérgio Valadares?')
    expect(tela.text()).toContain('Conta suspensa')
    expect(tela.text()).toContain(
      'A conta de Sérgio Valadares está suspensa desde 11 de outubro de 2026, às 14:32. A denúncia continua pendente: decida sobre o comentário como de costume.',
    )
    expect(tela.text()).toContain('O comentário está oculto para os leitores enquanto a conta estiver suspensa.')
    expect(tela.text()).not.toContain('Ver no feed')
    expect(tela.text()).toContain('Conta de Sérgio Valadares suspensa. O perfil e o conteúdo ficaram ocultos para os leitores.')
    // Suspender não resolve a denúncia.
    expect(botao(tela, 'Remover comentário')).toBeDefined()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Ações sobre a conta de Sérgio Valadares')
    // O toast traz o ícone do design (validação, 06/11/2026).
    expect(tela.find('#avisos-flutuantes [role="status"] svg').exists()).toBe(true)
  })

  it('Cancelar no dialog da conta devolve o foco ao DotsThree', async () => {
    const { tela } = await montar(servicoFalso([denunciaDeComentario('d2')]))

    await tela.get('[aria-label="Ações sobre a conta de Sérgio Valadares"]').trigger('click')
    await flushPromises()
    await botao(tela, 'Suspender conta do autor')!.trigger('click')
    await flushPromises()
    await botao(tela, 'Cancelar')!.trigger('click')
    await flushPromises()

    expect(tela.text()).not.toContain('Suspender a conta de Sérgio Valadares?')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Ações sobre a conta de Sérgio Valadares')
  })

  it('autor já suspenso: o DotsThree oferece reativar', async () => {
    const suspensa = denunciaDeComentario('d2')
    suspensa.autor = { ...suspensa.autor!, suspensa: true, suspensaEm: '2026-10-11T14:32:00' }
    const servico = servicoFalso([suspensa])
    servico.reativarConta.mockResolvedValue({ usuarioId: 'a2', suspensa: false, suspensaEm: null, reativadaEm: '2026-10-12T10:00:00' })
    const { tela } = await montar(servico)

    await tela.get('[aria-label="Ações sobre a conta de Sérgio Valadares"]').trigger('click')
    await flushPromises()
    expect(botao(tela, 'Suspender conta do autor')).toBeUndefined()
    await botao(tela, 'Reativar conta do autor')!.trigger('click')
    await flushPromises()
    await tela.get('textarea').setValue('Revisto')
    await tela.get('[data-confirmar]').trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('Conta de Sérgio Valadares reativada.')
    expect(tela.text()).not.toContain('está suspensa desde')
  })

  it('registro: linhas de conta com o motivo; Reativar conta só na suspensão vigente', async () => {
    const servico = servicoFalso([])
    servico.listarRegistros.mockResolvedValue(pagina([
      registro('r3', { acao: 'suspender_conta', alvoTipo: 'usuario', alvoAutor: null, atividadeAutor: null, livroTitulo: null,
        comDenuncia: false, alvoId: 'a2', alvoConta: 'svaladares', motivo: 'Ataques repetidos.', suspensaoVigente: true }),
      registro('r2', { acao: 'reativar_conta', alvoTipo: 'usuario', alvoAutor: null, atividadeAutor: null, livroTitulo: null,
        comDenuncia: false, alvoId: 'a9', alvoConta: 'tiagomoreira', motivo: 'Revisto.', suspensaoVigente: false }),
      registro('r1', { acao: 'suspender_conta', alvoTipo: 'usuario', alvoAutor: null, atividadeAutor: null, livroTitulo: null,
        comDenuncia: false, alvoId: 'a9', alvoConta: 'tiagomoreira', motivo: 'Antigo.', suspensaoVigente: false }),
      registro('r0'),
    ]))
    servico.reativarConta.mockResolvedValue({ usuarioId: 'a2', suspensa: false, suspensaEm: null, reativadaEm: '2026-10-12T10:00:00' })
    const { tela } = await montar(servico)

    await tela.findAll('[role="tab"]')[1]!.trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('Motivos de denúncia e conteúdo removido não ficam no registro.')
    expect(tela.text()).toContain('Suspendeu a conta')
    expect(tela.text()).toContain('Reativou a conta')
    expect(tela.text()).toContain('Conta de @svaladares')
    expect(tela.find('a[aria-label="Abrir a conta de @svaladares"]').attributes('href')).toBe('/leitores/svaladares')
    expect(tela.text()).toContain('Motivo: Ataques repetidos.')
    expect(tela.findAll('button').filter((b) => b.text() === 'Reativar conta')).toHaveLength(1)

    await botao(tela, 'Reativar conta')!.trigger('click')
    await flushPromises()
    expect(tela.text()).toContain('Reativar a conta de @svaladares?')
    await tela.get('textarea').setValue('Denúncia já arquivada, revisto.')
    await tela.get('[data-confirmar]').trigger('click')
    await flushPromises()

    expect(servico.reativarConta).toHaveBeenCalledWith('a2', 'Denúncia já arquivada, revisto.', expect.any(String))
    expect(servico.listarRegistros).toHaveBeenCalledTimes(2)
  })
})
