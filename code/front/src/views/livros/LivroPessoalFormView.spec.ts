import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService, type LivroPessoalDetalhe } from '../../services/acervo'
import { ApiError } from '../../services/api'
import { enviarCapa, validarCapa } from '../../services/capa'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/acervo', () => ({
  acervoService: {
    criarLivroPessoal: vi.fn(),
    atualizarLivroPessoal: vi.fn(),
    excluirLivroPessoal: vi.fn(),
    obterLivroPessoal: vi.fn(),
    listarAssuntos: vi.fn(),
  },
}))
vi.mock('../../services/capa', () => ({ validarCapa: vi.fn(), enviarCapa: vi.fn() }))

const servico = vi.mocked(acervoService)

const LIVRO: LivroPessoalDetalhe = {
  id: 'l1',
  tipo: 'pessoal',
  donoId: 'u1',
  titulo: 'Cartas de um sertanejo',
  autor: 'Marina Albuquerque',
  paginas: 184,
  sinopse: 'Reunião de cartas.',
  capaUrl: 'https://res.cloudinary.com/leai/image/upload/v1/capas/a.jpg',
  modoConsulta: false,
  notaDoDono: null,
  resenhaDoDono: null,
  dono: { nome: 'Marina Albuquerque', avatarUrl: null },
  assuntos: [],
}

// Ids fora da ordem dos nomes, para provar que o corpo vai com os ids ordenados.
const ASSUNTOS = [
  { id: 'c-historia', nome: 'História' },
  { id: 'a-memorias', nome: 'Memórias' },
  { id: 'b-romance-historico', nome: 'Romance histórico' },
]

type Wrapper = Awaited<ReturnType<typeof montarNaRota>>['wrapper']

async function preencher(wrapper: Wrapper, valores = { titulo: 'Cartas de um sertanejo', autor: 'Marina Albuquerque', paginas: '184' }) {
  await wrapper.get('#campo-titulo').setValue(valores.titulo)
  await wrapper.get('#campo-autor').setValue(valores.autor)
  await wrapper.get('#campo-paginas').setValue(valores.paginas)
}

function noDialogo(seletor: string, texto: string): HTMLElement {
  const dialogo = document.body.querySelector('[role="dialog"]')!
  return [...dialogo.querySelectorAll<HTMLElement>(seletor)].find((el) => el.textContent?.trim() === texto)!
}

/** Abre o seletor pelo campo, marca os nomes e conclui. */
async function escolherAssuntos(wrapper: Wrapper, nomes: string[]) {
  const abrir = wrapper.find('[data-gatilho]').exists() ? wrapper.get('[data-gatilho]') : wrapper.get('[data-alterar]')
  await abrir.trigger('click')
  await flushPromises()
  for (const nome of nomes) {
    noDialogo('[role="checkbox"]', nome).click()
  }
  await flushPromises()
  noDialogo('button', 'Concluir').click()
  await flushPromises()
}

function escolherArquivo(wrapper: Wrapper) {
  const entrada = wrapper.get('input[type="file"]')
  const arquivo = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'capa.jpg', { type: 'image/jpeg' })
  Object.defineProperty(entrada.element, 'files', { value: [arquivo], configurable: true })
  return entrada.trigger('change')
}

describe('LivroPessoalFormView', () => {
  beforeEach(() => {
    localStorage.clear()
    servico.criarLivroPessoal.mockReset().mockResolvedValue(LIVRO)
    servico.atualizarLivroPessoal.mockReset().mockResolvedValue(LIVRO)
    servico.excluirLivroPessoal.mockReset().mockResolvedValue(undefined)
    servico.obterLivroPessoal.mockReset().mockResolvedValue(LIVRO)
    servico.listarAssuntos.mockReset().mockResolvedValue(ASSUNTOS)
    vi.mocked(validarCapa).mockReset().mockResolvedValue(null)
    vi.mocked(enviarCapa).mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('criação: sem campo de ISBN, salvar só com os três obrigatórios, e abre o livro criado', async () => {
    const { wrapper, router } = await montarNaRota('/descobrir/adicionar/pessoal')

    expect(wrapper.get('h1').text()).toBe('Cadastrar livro')
    expect(wrapper.text()).not.toContain('ISBN')
    expect(wrapper.text()).toContain('Opcional. JPG, PNG ou WEBP, até 5 MB.')
    const salvar = wrapper.get('button[type="submit"]')
    expect(salvar.text()).toBe('Salvar livro')
    expect(salvar.attributes('disabled')).toBeDefined()

    await preencher(wrapper)
    expect(salvar.attributes('disabled')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(servico.criarLivroPessoal).toHaveBeenCalledWith(
      { titulo: 'Cartas de um sertanejo', autor: 'Marina Albuquerque', paginas: 184, sinopse: null, capaUrl: null, assuntos: [] },
      expect.any(String),
    )
    expect(router.currentRoute.value.path).toBe('/livros/pessoal/l1')
  })

  it('reenviar o mesmo formulário depois de falha de rede reaproveita a chave; mudar o conteúdo gera outra', async () => {
    servico.criarLivroPessoal.mockRejectedValue(new ApiError('Não foi possível acessar o servidor. Tente novamente.', 0, 'SERVICO_INDISPONIVEL'))
    const { wrapper } = await montarNaRota('/descobrir/adicionar/pessoal')
    await preencher(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível acessar o servidor.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await wrapper.get('#campo-paginas').setValue('185')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const chaves = servico.criarLivroPessoal.mock.calls.map((chamada) => chamada[1])
    expect(chaves[0]).toBe(chaves[1])
    expect(chaves[2]).not.toBe(chaves[0])
  })

  it('campo esvaziado mostra o erro no campo, sem banner', async () => {
    const { wrapper } = await montarNaRota('/descobrir/adicionar/pessoal')
    await preencher(wrapper)

    await wrapper.get('#campo-autor').setValue('')

    expect(wrapper.text()).toContain('Informe quem escreveu.')
    expect(wrapper.get('#campo-autor').attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('400 do servidor volta para cada campo', async () => {
    servico.criarLivroPessoal.mockRejectedValue(
      new ApiError('Dados inválidos.', 400, 'REQUISICAO_INVALIDA', 'c1', {
        campos: [{ campo: 'titulo', mensagem: 'O título pode ter até 500 caracteres.' }],
      }),
    )
    const { wrapper } = await montarNaRota('/descobrir/adicionar/pessoal')
    await preencher(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('O título pode ter até 500 caracteres.')
  })

  it('capa recusada mostra o motivo na área e não apaga o que foi digitado', async () => {
    vi.mocked(validarCapa).mockResolvedValue('Essa imagem tem 8,2 MB. O limite é 5 MB.')
    const { wrapper } = await montarNaRota('/descobrir/adicionar/pessoal')
    await preencher(wrapper)

    await escolherArquivo(wrapper)
    await flushPromises()

    expect(wrapper.text()).toContain('Essa imagem tem 8,2 MB. O limite é 5 MB.')
    expect(enviarCapa).not.toHaveBeenCalled()
    expect((wrapper.get('#campo-titulo').element as HTMLInputElement).value).toBe('Cartas de um sertanejo')
  })

  it('capa enviada ao Cloudinary vai como capaUrl; enquanto sobe, os campos seguem editáveis e salvar espera', async () => {
    let terminar: (url: string) => void = () => {}
    vi.mocked(enviarCapa).mockReturnValue(new Promise((resolve) => (terminar = resolve)))
    const { wrapper } = await montarNaRota('/descobrir/adicionar/pessoal')
    await preencher(wrapper)

    await escolherArquivo(wrapper)
    await flushPromises()
    expect(wrapper.text()).toContain('Enviando capa')
    expect(wrapper.get('#campo-titulo').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    terminar('https://res.cloudinary.com/leai/image/upload/v1/capas/nova.jpg')
    await flushPromises()
    expect(wrapper.text()).toContain('Trocar capa')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(servico.criarLivroPessoal.mock.calls[0]![0].capaUrl).toBe('https://res.cloudinary.com/leai/image/upload/v1/capas/nova.jpg')
  })

  it('falha no envio da capa usa a copy do prompt', async () => {
    vi.mocked(enviarCapa).mockRejectedValue(new Error('rede'))
    const { wrapper } = await montarNaRota('/descobrir/adicionar/pessoal')

    await escolherArquivo(wrapper)
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível enviar a capa. Tente de novo.')
  })

  it('salvando por mais de três segundos mostra a linha de cold start', async () => {
    vi.useFakeTimers()
    servico.criarLivroPessoal.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await montarNaRota('/descobrir/adicionar/pessoal')
    await preencher(wrapper)

    await wrapper.get('form').trigger('submit')
    await vi.advanceTimersByTimeAsync(3_000)

    expect(wrapper.get('button[type="submit"]').text()).toBe('Salvando')
    expect(wrapper.text()).toContain('O serviço está iniciando. Isso pode levar alguns segundos.')
  })

  it('edição: carrega, salva os cinco campos e exclui com confirmação nomeando o livro', async () => {
    const { wrapper, router } = await montarNaRota('/livros/pessoal/l1/editar')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Editar livro')
    expect((wrapper.get('#campo-titulo').element as HTMLInputElement).value).toBe('Cartas de um sertanejo')
    expect(wrapper.get('button[type="submit"]').text()).toBe('Salvar alterações')

    await wrapper.findAll('button').find((b) => b.text() === 'Excluir livro')!.trigger('click')
    await flushPromises()
    const dialogo = document.body.querySelector('[role="dialog"]')!
    expect(dialogo.textContent).toContain('Excluir este livro?')
    expect(dialogo.textContent).toContain('Cartas de um sertanejo sai da sua estante')
    expect(document.activeElement?.textContent?.trim()).toBe('Cancelar')

    const confirmar = [...dialogo.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Excluir livro')!
    confirmar.click()
    await flushPromises()

    expect(servico.excluirLivroPessoal).toHaveBeenCalledWith('l1', expect.any(String))
    expect(router.currentRoute.value.path).toBe('/estante')
  })

  describe('assuntos (F-ACV-OPC)', () => {
    it('o campo fica entre Páginas e Sinopse, e o corpo leva os ids ordenados', async () => {
      const { wrapper } = await montarNaRota('/descobrir/adicionar/pessoal')
      const ordem = wrapper.findAll('label, [role="group"] > span').map((el) => el.text())
      expect(ordem.indexOf('Assuntos')).toBe(ordem.indexOf('Número de páginas') + 1)
      expect(ordem.indexOf('Sinopse')).toBe(ordem.indexOf('Assuntos') + 1)
      await preencher(wrapper)

      await escolherAssuntos(wrapper, ['História', 'Memórias'])
      expect(wrapper.findAll('[role="group"] li').map((li) => li.text())).toEqual(['História', 'Memórias'])
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(servico.criarLivroPessoal.mock.calls[0]![0].assuntos).toEqual(['a-memorias', 'c-historia'])
    })

    it('a chave muda quando os assuntos mudam e se repete com a mesma escolha', async () => {
      servico.criarLivroPessoal.mockRejectedValue(new ApiError('Não foi possível acessar o servidor. Tente novamente.', 0, 'SERVICO_INDISPONIVEL'))
      const { wrapper } = await montarNaRota('/descobrir/adicionar/pessoal')
      await preencher(wrapper)

      await wrapper.get('form').trigger('submit')
      await flushPromises()
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      await escolherAssuntos(wrapper, ['Memórias'])
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      const chaves = servico.criarLivroPessoal.mock.calls.map((chamada) => chamada[1])
      expect(chaves[1]).toBe(chaves[0])
      expect(chaves[2]).not.toBe(chaves[0])
    })

    it('400 em assuntos vai para o campo, sem banner, com o foco em Alterar assuntos', async () => {
      const mensagem = 'Um dos assuntos escolhidos não está mais na lista do Lê Ai. Revise e salve de novo.'
      servico.criarLivroPessoal.mockRejectedValue(
        new ApiError('Dados inválidos.', 400, 'REQUISICAO_INVALIDA', 'c1', { campos: [{ campo: 'assuntos', mensagem }] }),
      )
      const { wrapper } = await montarNaRota('/descobrir/adicionar/pessoal')
      await preencher(wrapper)
      await escolherAssuntos(wrapper, ['História'])

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain(mensagem)
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.findAll('[role="group"] li').map((li) => li.text())).toEqual(['História'])
      expect(document.activeElement).toBe(wrapper.get('[data-alterar]').element)
    })

    it('lista indisponível por timeout: o seletor mostra a falha e o livro ainda salva sem assuntos', async () => {
      vi.useFakeTimers()
      servico.listarAssuntos.mockImplementation(
        () =>
          new Promise((_, rejeitar) =>
            setTimeout(() => rejeitar(new ApiError('O servidor demorou para responder.', 0, 'TIMEOUT')), 90_000),
          ),
      )
      const { wrapper, router } = await montarNaRota('/descobrir/adicionar/pessoal')
      await preencher(wrapper)

      await wrapper.get('[data-gatilho]').trigger('click')
      await vi.advanceTimersByTimeAsync(3_000)
      expect(document.body.querySelector('[role="dialog"]')!.textContent).toContain('O serviço está iniciando.')
      await vi.advanceTimersByTimeAsync(90_000)
      expect(document.body.querySelector('[role="dialog"]')!.textContent).toContain('Não foi possível carregar os assuntos.')
      noDialogo('button', 'Fechar').click()
      await vi.advanceTimersByTimeAsync(0)
      expect((wrapper.get('#campo-titulo').element as HTMLInputElement).value).toBe('Cartas de um sertanejo')

      expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
      await wrapper.get('form').trigger('submit')
      await vi.advanceTimersByTimeAsync(0)

      expect(servico.criarLivroPessoal).toHaveBeenCalledTimes(1)
      expect(servico.criarLivroPessoal.mock.calls[0]![0].assuntos).toEqual([])
      expect(router.currentRoute.value.path).toBe('/livros/pessoal/l1')
    })

    it('edição: chega preenchido pelo detalhe, e esvaziar manda o array vazio', async () => {
      servico.obterLivroPessoal.mockResolvedValue({ ...LIVRO, assuntos: [ASSUNTOS[0]!, ASSUNTOS[1]!] })
      const { wrapper } = await montarNaRota('/livros/pessoal/l1/editar')
      await flushPromises()

      expect(wrapper.findAll('[role="group"] li').map((li) => li.text())).toEqual(['História', 'Memórias'])
      expect(servico.listarAssuntos).not.toHaveBeenCalled()
      await wrapper.get('[data-remover="c-historia"]').trigger('click')
      await wrapper.get('[data-remover="a-memorias"]').trigger('click')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(servico.atualizarLivroPessoal).toHaveBeenCalledWith('l1', expect.objectContaining({ assuntos: [] }), expect.any(String))
    })
  })

  it('edição de livro alheio ou excluído cai no indisponível', async () => {
    servico.obterLivroPessoal.mockRejectedValue(new ApiError('Não encontrado.', 404, 'RECURSO_NAO_ENCONTRADO'))
    const { wrapper } = await montarNaRota('/livros/pessoal/l1/editar')
    await flushPromises()

    expect(wrapper.text()).toContain('Este livro não está mais disponível')
    expect(wrapper.find('form').exists()).toBe(false)
  })
})
