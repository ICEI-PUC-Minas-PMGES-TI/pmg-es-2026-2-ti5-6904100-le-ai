import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { esquecerMinhaPrivacidade } from '../../listas/useMinhaPrivacidade'
import { acervoService, type LivroPessoalDetalhe } from '../../services/acervo'
import { leituraService } from '../../services/leitura'
import { listasService, type ItemDeLista, type Lista } from '../../services/listas'
import { perfilService } from '../../services/perfil'
import { montarNaRota } from '../../testes/montarNaRota'

/**
 * Terceiro abre o livro pessoal pela lista do dono, com sucesso (L-28, E6-02; RF-LST-06, RN-15):
 * o link da lista leva `via=lista` e a lista como referência ao `acervo`, e a página abre em modo
 * consulta, sem nenhuma ação do dono nem de estante (RN-15.3).
 */

vi.mock('../../services/listas', async (original) => ({
  ...(await original<typeof import('../../services/listas')>()),
  listasService: { obter: vi.fn(), listarItens: vi.fn(), mover: vi.fn(), remover: vi.fn(), editar: vi.fn(), excluir: vi.fn() },
}))

vi.mock('../../services/perfil', async (original) => ({
  ...(await original<typeof import('../../services/perfil')>()),
  perfilService: { obterMeuPerfil: vi.fn(), obterPerfil: vi.fn() },
}))

vi.mock('../../services/acervo', () => ({
  acervoService: { obterLivroPessoal: vi.fn(), excluirLivroPessoal: vi.fn() },
}))

vi.mock('../../services/leitura', () => ({
  leituraService: {
    consultarItemEstante: vi.fn(),
    consultarConclusoes: vi.fn(),
    consultarFavorito: vi.fn(),
    detalharLeitura: vi.fn(),
    obterMinhaAvaliacao: vi.fn(),
    reagir: vi.fn(),
    removerReacao: vi.fn(),
    listarFrases: vi.fn(),
  },
}))

const listas = vi.mocked(listasService)
const perfis = vi.mocked(perfilService)
const acervo = vi.mocked(acervoService)
const leituras = vi.mocked(leituraService)

const RAFAEL = { id: 'u2', username: 'rafaokamoto', nomeExibicao: 'Rafael Okamoto', avatarUrl: null }

const LISTA: Lista = {
  id: 'l1',
  dono: RAFAEL,
  titulo: 'Diários de viagem',
  descricao: null,
  quantidadeLivros: 1,
  pertenceAoSolicitante: false,
  criadaEm: '2026-03-01T12:00:00Z',
  atualizadaEm: '2026-09-12T12:00:00Z',
}

const ITEM: ItemDeLista = {
  id: 'i1',
  listaId: 'l1',
  posicao: 1,
  adicionadoEm: '2026-09-01T12:00:00Z',
  livro: {
    id: 'lp-9',
    tipo: 'PESSOAL',
    titulo: 'Cartas de um sertanejo',
    autor: 'Rafael Okamoto',
    capaUrl: null,
    link: { livroId: 'lp-9', via: 'lista', referenciaId: 'l1' },
  },
}

const EM_CONSULTA: LivroPessoalDetalhe = {
  id: 'lp-9',
  tipo: 'pessoal',
  donoId: 'u2',
  titulo: 'Cartas de um sertanejo',
  autor: 'Rafael Okamoto',
  paginas: 184,
  sinopse: 'Reunião de cartas trocadas entre 1978 e 1984.',
  capaUrl: null,
  modoConsulta: true,
  notaDoDono: { valor: 4 },
  resenhaDoDono: null,
  dono: { nome: 'Rafael Okamoto', avatarUrl: null },
  assuntos: [],
}

function botao(texto: string): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)
}

describe('livro pessoal aberto pela lista de outro leitor', () => {
  beforeEach(() => {
    localStorage.clear()
    esquecerMinhaPrivacidade()
    perfis.obterMeuPerfil.mockReset().mockResolvedValue({ privacidade: 'publico' } as never)
    perfis.obterPerfil.mockReset()
    listas.obter.mockReset().mockResolvedValue(LISTA)
    listas.listarItens.mockReset().mockResolvedValue({ itens: [ITEM], proximoCursor: null, temMais: false })
    acervo.obterLivroPessoal.mockReset().mockResolvedValue(EM_CONSULTA)
    leituras.consultarItemEstante.mockReset()
    leituras.consultarConclusoes.mockReset()
    leituras.consultarFavorito.mockReset()
    leituras.obterMinhaAvaliacao.mockReset()
    leituras.listarFrases.mockReset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('o toque na linha abre a página em modo consulta, com via=lista, sem ações do dono nem de estante', async () => {
    const { router, wrapper } = await montarNaRota('/leitores/rafaokamoto/listas/l1')
    await flushPromises()

    document.body.querySelector<HTMLAnchorElement>('[aria-label^="Livros de"] li a')!.click()
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/livros/pessoal/lp-9')
    expect(router.currentRoute.value.query).toEqual({ via: 'lista', referenciaId: 'l1' })
    // A via e a referência vão ao `acervo`, que revalida a lista a cada pedido (RN-15.6).
    expect(acervo.obterLivroPessoal).toHaveBeenCalledWith('lp-9', { via: 'lista', referenciaId: 'l1' })

    // Abriu com sucesso, em modo consulta.
    expect(wrapper.text()).toContain('Cartas de um sertanejo')
    expect(wrapper.text()).toContain('Livro pessoal de Rafael Okamoto')
    expect(wrapper.text()).toContain('Reunião de cartas trocadas entre 1978 e 1984.')
    expect(wrapper.text()).toContain('Nota de Rafael')
    expect(wrapper.text()).not.toContain('Este livro não está mais disponível')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    // Nenhuma ação do dono: ausentes, não desabilitadas (RN-15.3).
    for (const texto of ['Editar', 'Excluir', 'Adicionar à lista']) {
      expect(botao(texto)).toBeUndefined()
    }
    expect(document.body.querySelector('button[aria-label="Ações do livro"]')).toBeNull()
    expect(wrapper.text()).not.toContain('Sua avaliação')

    // Nem de estante: o terceiro não põe livro pessoal alheio na estante (RN-15.3, RNF-SEC-07).
    expect(botao('Adicionar à estante')).toBeUndefined()
    expect(botao('Alterar status')).toBeUndefined()
    expect(leituras.consultarItemEstante).not.toHaveBeenCalled()
    expect(leituras.consultarConclusoes).not.toHaveBeenCalled()
    expect(leituras.obterMinhaAvaliacao).not.toHaveBeenCalled()

    // Aberto pela lista, a aba Perfil continua ativa.
    const barra = wrapper.findAll('nav[aria-label="Navegação principal"]')[1]!
    const perfil = barra.findAll('a').find((a) => a.text().includes('Perfil'))!
    expect(perfil.get('span').classes()).toContain('text-musgo')
  })
})
