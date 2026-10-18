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
  } satisfies Pick<ModeracaoService, 'listarDenuncias' | 'arquivar' | 'remover' | 'listarRegistros'>
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
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('acorda o leitura ao abrir', async () => {
    await montar(servicoFalso([]))

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(expect.stringMatching(/\/health$/))
  })
})
