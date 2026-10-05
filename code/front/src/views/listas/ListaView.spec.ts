import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { esquecerMinhaPrivacidade } from '../../listas/useMinhaPrivacidade'
import { ApiError } from '../../services/api'
import { listasService, type ItemDeLista, type Lista } from '../../services/listas'
import { perfilService } from '../../services/perfil'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/listas', async (original) => ({
  ...(await original<typeof import('../../services/listas')>()),
  listasService: {
    obter: vi.fn(),
    listarItens: vi.fn(),
    mover: vi.fn(),
    remover: vi.fn(),
    editar: vi.fn(),
    excluir: vi.fn(),
  },
}))

vi.mock('../../services/perfil', async (original) => ({
  ...(await original<typeof import('../../services/perfil')>()),
  perfilService: { obterMeuPerfil: vi.fn(), obterPerfil: vi.fn() },
}))

const listas = vi.mocked(listasService)
const perfis = vi.mocked(perfilService)

const MARINA = { id: 'u1', username: 'marinableu', nomeExibicao: 'Marina Beltrão', avatarUrl: null }
const RAFAEL = { id: 'u2', username: 'rafaokamoto', nomeExibicao: 'Rafael Okamoto', avatarUrl: null }

function lista(extras: Partial<Lista> = {}): Lista {
  return {
    id: 'l1',
    dono: MARINA,
    titulo: 'Contos que eu indico',
    descricao: 'Em ordem de por onde começar.',
    quantidadeLivros: 3,
    pertenceAoSolicitante: true,
    criadaEm: '2026-03-01T12:00:00Z',
    atualizadaEm: '2026-09-12T12:00:00Z',
    ...extras,
  }
}

function item(id: string, titulo: string, posicao: number, tipo: 'OFICIAL' | 'PESSOAL' = 'OFICIAL'): ItemDeLista {
  return {
    id,
    listaId: 'l1',
    posicao,
    adicionadoEm: '2026-09-01T12:00:00Z',
    livro: {
      id: `livro-${id}`,
      tipo,
      titulo,
      autor: 'Autora',
      capaUrl: null,
      link: { livroId: `livro-${id}`, via: tipo === 'PESSOAL' ? 'lista' : 'catalogo', referenciaId: tipo === 'PESSOAL' ? 'l1' : null },
    },
  }
}

const TRES = [item('i1', 'Olhos d’Água', 1), item('i2', 'Laços de Família', 2), item('i3', 'Sagarana', 3)]

function titulos(): string[] {
  return [...document.body.querySelectorAll('[aria-label^="Livros de"] li .line-clamp-2')].map((elemento) => elemento.textContent?.trim() ?? '')
}

function botaoPorRotulo(rotulo: string, indice = 0): HTMLButtonElement {
  return [...document.body.querySelectorAll<HTMLButtonElement>(`button[aria-label="${rotulo}"]`)][indice]
}

describe('ListaView', () => {
  beforeEach(() => {
    esquecerMinhaPrivacidade()
    perfis.obterMeuPerfil.mockReset().mockResolvedValue({ privacidade: 'publico' } as never)
    perfis.obterPerfil.mockReset()
    listas.obter.mockReset().mockResolvedValue(lista())
    listas.listarItens.mockReset().mockResolvedValue({ itens: TRES, proximoCursor: null, temMais: false })
    listas.mover.mockReset()
    listas.remover.mockReset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('dono: título, visibilidade, contagem e as linhas na ordem', async () => {
    const { wrapper } = await montarNaRota('/perfil/listas/l1')
    await flushPromises()

    expect(wrapper.text()).toContain('Contos que eu indico')
    expect(wrapper.text()).toContain('Seu perfil é público: qualquer leitor pode ver esta lista.')
    expect(wrapper.text()).toContain('3 livros · atualizada em 12 de setembro de 2026')
    expect(titulos()).toEqual(['Olhos d’Água', 'Laços de Família', 'Sagarana'])
    // Dono carrega a lista inteira, em segmentos de 50.
    expect(listas.listarItens).toHaveBeenCalledWith('l1', null, 50)
  })

  it('mover para baixo troca com o vizinho e envia a posição visível', async () => {
    listas.mover.mockResolvedValue(item('i1', 'Olhos d’Água', 2))
    await montarNaRota('/perfil/listas/l1')
    await flushPromises()

    botaoPorRotulo('Mover para baixo', 0).click()
    await flushPromises()

    expect(listas.mover).toHaveBeenCalledWith('l1', 'i1', 2, expect.any(String))
    expect(titulos()).toEqual(['Laços de Família', 'Olhos d’Água', 'Sagarana'])
    // Primeira linha não sobe, última não desce.
    expect(botaoPorRotulo('Mover para cima', 0).disabled).toBe(true)
    expect(botaoPorRotulo('Mover para baixo', 2).disabled).toBe(true)
  })

  it('falha ao mover: volta à ordem anterior e oferece repetir com a mesma chave', async () => {
    listas.mover.mockRejectedValueOnce(new ApiError('Falha.', 503, 'SERVICO_INDISPONIVEL'))
    const { wrapper } = await montarNaRota('/perfil/listas/l1')
    await flushPromises()

    botaoPorRotulo('Mover para cima', 2).click()
    await flushPromises()

    expect(titulos()).toEqual(['Olhos d’Água', 'Laços de Família', 'Sagarana'])
    expect(document.body.textContent).toContain('Não foi possível salvar a nova ordem. A lista voltou como estava.')

    listas.mover.mockResolvedValueOnce(item('i3', 'Sagarana', 2))
    ;[...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Tentar de novo')!.click()
    await flushPromises()

    const [primeira, segunda] = listas.mover.mock.calls
    expect(segunda).toEqual(primeira)
    expect(titulos()).toEqual(['Olhos d’Água', 'Sagarana', 'Laços de Família'])
    expect(wrapper.text()).not.toContain('A lista voltou como estava')
  })

  it('remover tira a linha, renumera e atualiza a contagem, sem confirmação', async () => {
    listas.remover.mockResolvedValue(undefined)
    const { wrapper } = await montarNaRota('/perfil/listas/l1')
    await flushPromises()

    botaoPorRotulo('Remover da lista', 1).click()
    await flushPromises()

    expect(listas.remover).toHaveBeenCalledWith('l1', 'livro-i2', expect.any(String))
    expect(wrapper.text()).toContain('2 livros · atualizada')
    expect([...document.body.querySelectorAll('[aria-label^="Livros de"] li .font-mono')].map((n) => n.textContent?.trim())).toEqual(['1', '2'])
  })

  it('outro leitor: só leitura, linha de dono, e livro pessoal abre com via=lista', async () => {
    listas.obter.mockResolvedValue(lista({ dono: RAFAEL, pertenceAoSolicitante: false }))
    listas.listarItens.mockResolvedValue({
      itens: [item('i1', 'Raízes do Brasil', 1), item('i2', 'Crônicas de Mariana', 2, 'PESSOAL')],
      proximoCursor: null,
      temMais: false,
    })
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto/listas/l1')
    await flushPromises()

    expect(wrapper.text()).toContain('Lista de Rafael Okamoto')
    expect(wrapper.text()).not.toContain('Editar lista')
    expect(botaoPorRotulo('Remover da lista')).toBeUndefined()
    const links = [...document.body.querySelectorAll<HTMLAnchorElement>('[aria-label^="Livros de"] li a')].map((a) => a.getAttribute('href'))
    expect(links).toEqual(['/livros/livro-i1?origem=perfil', '/livros/pessoal/livro-i2?via=lista&referenciaId=l1'])
    // O retorno da web nomeia o dono.
    expect(wrapper.text()).toContain('Listas de Rafael')
  })

  it('dono abre o próprio livro pessoal sem via (o acervo libera o dono)', async () => {
    listas.listarItens.mockResolvedValue({ itens: [item('i1', 'Contos da Rua Direita', 1, 'PESSOAL')], proximoCursor: null, temMais: false })
    await montarNaRota('/perfil/listas/l1')
    await flushPromises()

    expect(document.body.querySelector('[aria-label^="Livros de"] li a')!.getAttribute('href')).toBe('/livros/pessoal/livro-i1')
    expect(document.body.textContent).toContain('Pessoal')
  })

  it('403: bloco de perfil privado com o nome, sem título nem livros da lista', async () => {
    listas.obter.mockRejectedValue(new ApiError('Este perfil é privado.', 403, 'ACESSO_NEGADO'))
    perfis.obterPerfil.mockResolvedValue({ displayName: 'Beatriz Nogueira' } as never)
    const { wrapper } = await montarNaRota('/leitores/bia.nogueira/listas/l1')
    await flushPromises()

    expect(wrapper.text()).toContain('Esta lista é de um perfil privado')
    expect(wrapper.text()).toContain('Só quem Beatriz aceita como seguidor vê as listas.')
    expect(wrapper.text()).toContain('Ver perfil de Beatriz')
    expect(wrapper.text()).not.toContain('Contos que eu indico')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(listas.listarItens).not.toHaveBeenCalled()
  })

  it('404: lista não encontrada, sem banner de erro', async () => {
    listas.obter.mockRejectedValue(new ApiError('Não encontrada.', 404, 'RECURSO_NAO_ENCONTRADO'))
    const { wrapper } = await montarNaRota('/perfil/listas/l1')
    await flushPromises()

    expect(wrapper.text()).toContain('Lista não encontrada')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('falha de rede (API simulada fora do ar): banner com Tentar de novo', async () => {
    listas.obter.mockRejectedValueOnce(new ApiError('Tempo esgotado.', 0, 'TEMPO_ESGOTADO'))
    const { wrapper } = await montarNaRota('/perfil/listas/l1')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar esta lista.')
    ;[...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Tentar de novo')!.click()
    await flushPromises()
    expect(wrapper.text()).toContain('Contos que eu indico')
  })

  it('lista vazia do dono aponta para o Descobrir', async () => {
    listas.obter.mockResolvedValue(lista({ quantidadeLivros: 0 }))
    listas.listarItens.mockResolvedValue({ itens: [], proximoCursor: null, temMais: false })
    const { wrapper } = await montarNaRota('/perfil/listas/l1')
    await flushPromises()

    expect(wrapper.text()).toContain('Esta lista ainda está vazia')
    expect(wrapper.find('a[href="/descobrir"]').exists()).toBe(true)
  })
})
