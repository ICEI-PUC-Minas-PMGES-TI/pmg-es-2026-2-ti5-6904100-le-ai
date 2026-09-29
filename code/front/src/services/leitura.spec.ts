import { describe, expect, it, vi } from 'vitest'

import { ApiError } from './api'
import { consultaDaEstante, createLeituraService } from './leitura'

function resposta(status: number, corpo?: unknown): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function servico(fetchMock: typeof fetch) {
  return createLeituraService({
    baseUrl: 'https://leitura.example.com',
    fetch: fetchMock,
    getToken: () => 'jwt',
    esperasDeRetentativaMs: [0, 0],
  })
}

const PAGINA_VAZIA = {
  itens: [],
  paginacao: { page: 1, limite: 20, totalItens: 0, totalPaginas: 0 },
  totaisPorStatus: { QUERO_LER: 0, LENDO: 0, LIDO: 0, RELENDO: 0, ABANDONADO: 0 },
}

describe('consultaDaEstante', () => {
  it('sem filtro não monta query', () => {
    expect(consultaDaEstante()).toBe('')
    expect(consultaDaEstante({})).toBe('')
  })

  it('leva só os filtros presentes, com status em maiúsculas', () => {
    expect(consultaDaEstante({ status: 'RELENDO', ordenacao: 'progresso_desc', page: 2, limite: 50 })).toBe(
      '?status=RELENDO&ordenacao=progresso_desc&page=2&limite=50',
    )
    expect(consultaDaEstante({ ordenacao: 'autor_asc' })).toBe('?ordenacao=autor_asc')
  })
})

describe('createLeituraService', () => {
  it('lista a própria estante com filtro e token', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, PAGINA_VAZIA))

    await expect(servico(fetchMock).listarEstante({ status: 'LENDO', page: 1 })).resolves.toEqual(PAGINA_VAZIA)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/estante?status=LENDO&page=1')
    expect((init?.headers as Headers).get('Authorization')).toBe('Bearer jwt')
  })

  it('consulta um livro da própria estante pelo id codificado', async () => {
    const item = {
      livroId: 'l 1',
      livro: { titulo: 'Torto Arado', autor: null, capaUrl: null },
      status: 'ABANDONADO',
      vezesLido: 0,
      leituraEmAndamentoId: null,
      ultimaLeituraId: 'lei-1',
      retomavel: true,
      paginaAtual: null,
      totalPaginas: null,
      percentualConcluido: null,
      adicionadoEm: '2026-09-01T12:00:00Z',
    }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, item))

    await expect(servico(fetchMock).consultarItemEstante('l 1')).resolves.toEqual(item)
    expect(fetchMock.mock.calls[0]![0]).toBe('https://leitura.example.com/estante/l%201')
  })

  it('livro fora da estante (404) vira null e outras falhas propagam', async () => {
    const naoEncontrado = { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Este livro não está na sua estante.' }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(resposta(404, naoEncontrado))
    await expect(servico(fetchMock).consultarItemEstante('l1')).resolves.toBeNull()

    const proibido = vi.fn<typeof fetch>().mockResolvedValue(resposta(403, { codigo: 'PROIBIDO', mensagem: 'Não.' }))
    await expect(servico(proibido).consultarItemEstante('l1')).rejects.toBeInstanceOf(ApiError)
  })

  it('lista a estante de um perfil pelo id codificado', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, PAGINA_VAZIA))

    await servico(fetchMock).listarEstantePerfil('u 1', { ordenacao: 'titulo_asc' })

    expect(fetchMock.mock.calls[0]![0]).toBe('https://leitura.example.com/perfis/u%201/estante?ordenacao=titulo_asc')
  })

  it('adiciona à estante só com o livroId e a chave da intenção', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(201, { livroId: 'l1', status: 'QUERO_LER' }))

    await servico(fetchMock).adicionarEstante('l1', 'chave-a')

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/estante')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ livroId: 'l1' })
    expect((init?.headers as Headers).get('Idempotency-Key')).toBe('chave-a')
  })

  it('remove com chave e aceita 204 sem corpo', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))

    await expect(servico(fetchMock).removerEstante('l1', 'chave-r')).resolves.toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/estante/l1')
    expect(init?.method).toBe('DELETE')
    expect((init?.headers as Headers).get('Idempotency-Key')).toBe('chave-r')
  })

  it('inicia leitura e releitura em rotas distintas, sem data quando ausente', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(201, { id: 'lt1' }))
    const leitura = servico(fetchMock)

    await leitura.iniciarLeitura({ livroId: 'l1', dataInicio: '2026-09-01' }, 'k1')
    await leitura.iniciarReleitura({ livroId: 'l1' }, 'k2')

    expect(fetchMock.mock.calls[0]![0]).toBe('https://leitura.example.com/leituras')
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({ livroId: 'l1', dataInicio: '2026-09-01' })
    expect(fetchMock.mock.calls[1]![0]).toBe('https://leitura.example.com/releituras')
    expect(JSON.parse(fetchMock.mock.calls[1]![1]!.body as string)).toEqual({ livroId: 'l1' })
  })

  it('finaliza com fuso do dispositivo e data de fim', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, { id: 'lt1', status: 'LIDO' }))

    await servico(fetchMock).finalizarLeitura('lt1', { dataFim: '2026-09-20', fusoHorarioDispositivo: 'America/Sao_Paulo' }, 'k')

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/leituras/lt1/finalizar')
    expect(JSON.parse(init?.body as string)).toEqual({ dataFim: '2026-09-20', fusoHorarioDispositivo: 'America/Sao_Paulo' })
    expect((init?.headers as Headers).get('Idempotency-Key')).toBe('k')
  })

  it('abandona e retoma sem corpo, cada uma com sua chave', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(200, { id: 'lt1' }))
    const leitura = servico(fetchMock)

    await leitura.abandonarLeitura('lt1', 'k-ab')
    await leitura.retomarLeitura('lt1', 'k-re')

    const [urlAb, initAb] = fetchMock.mock.calls[0]!
    const [urlRe, initRe] = fetchMock.mock.calls[1]!
    expect(urlAb).toBe('https://leitura.example.com/leituras/lt1/abandonar')
    expect(initAb?.body).toBeUndefined()
    expect((initAb?.headers as Headers).get('Idempotency-Key')).toBe('k-ab')
    expect(urlRe).toBe('https://leitura.example.com/leituras/lt1/retomar')
    expect((initRe?.headers as Headers).get('Idempotency-Key')).toBe('k-re')
  })

  it('consulta detalhe e conclusões por GET, sem chave', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(200, { livroId: 'l1', vezesLido: 2 }))
    const leitura = servico(fetchMock)

    await leitura.detalharLeitura('lt1')
    await expect(leitura.consultarConclusoes('l1')).resolves.toEqual({ livroId: 'l1', vezesLido: 2 })

    expect(fetchMock.mock.calls[0]![0]).toBe('https://leitura.example.com/leituras/lt1')
    expect(fetchMock.mock.calls[1]![0]).toBe('https://leitura.example.com/livros/l1/conclusoes')
    expect((fetchMock.mock.calls[1]![1]!.headers as Headers).has('Idempotency-Key')).toBe(false)
  })

  it('409 de transição inválida chega como ApiError com código e status', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(resposta(409, { codigo: 'TRANSICAO_INVALIDA', mensagem: 'Leitura não está em andamento.' }))

    const erro = await servico(fetchMock).retomarLeitura('lt1', 'k').catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ApiError)
    expect(erro).toMatchObject({ status: 409, code: 'TRANSICAO_INVALIDA', message: 'Leitura não está em andamento.' })
  })
})

const NOTA = { livroId: 'l1', valor: 4.5, criadoEm: '2026-09-12T12:00:00Z', atualizadoEm: '2026-09-12T12:00:00Z' }

describe('createLeituraService', () => {
  it('consulta minha-avaliacao do livro com o token', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, { livroId: 'l1', nota: null, resenha: null }))

    await expect(servico(fetchMock).obterMinhaAvaliacao('l1')).resolves.toEqual({
      livroId: 'l1',
      nota: null,
      resenha: null,
    })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/livros/l1/minha-avaliacao')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer jwt')
  })

  it('salva a nota com PUT, só o valor no corpo e a chave da intenção', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, NOTA))

    await expect(servico(fetchMock).salvarNota('l1', 4.5, 'chave-1')).resolves.toEqual(NOTA)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/livros/l1/nota')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toEqual({ valor: 4.5 })
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('chave-1')
  })

  // Com chave, a escrita é idempotente e o cliente pode retentar o 503 sem duplicar a nota.
  it('retenta o PUT com a mesma chave quando o serviço responde 503', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(resposta(503, { codigo: 'SERVICO_INDISPONIVEL', mensagem: 'x' }))
      .mockResolvedValueOnce(resposta(200, NOTA))

    await servico(fetchMock).salvarNota('l1', 4.5, 'chave-1')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const chaves = fetchMock.mock.calls.map(([, init]) => new Headers(init?.headers).get('Idempotency-Key'))
    expect(chaves).toEqual(['chave-1', 'chave-1'])
  })

  it('remove a nota com DELETE e a chave; o 204 não tem corpo', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))

    await expect(servico(fetchMock).excluirNota('l1', 'chave-2')).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/livros/l1/nota')
    expect(init?.method).toBe('DELETE')
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('chave-2')
  })

  it('lista as resenhas do perfil com page e limite', async () => {
    const pagina = { itens: [], paginacao: { page: 2, limite: 5, totalItens: 6, totalPaginas: 2 } }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, pagina))

    await expect(servico(fetchMock).listarResenhasPerfil('u2', 2, 5)).resolves.toEqual(pagina)

    const [url] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/perfis/u2/resenhas?page=2&limite=5')
  })
})

const RESUMO = { paginaAtual: 172, totalPaginas: 264, percentualConcluido: 65.15, minutosTotais: 260 }
const PROGRESSO = {
  id: 'p2',
  leituraId: 'lt1',
  posicao: 2,
  pagina: 172,
  paginaAnterior: 148,
  paginasLidas: 24,
  minutos: 45,
  registradoEmDispositivo: '2026-09-20T22:10:00-03:00',
  fusoHorarioDispositivo: 'America/Sao_Paulo',
  dataLocal: '2026-09-20',
  criadoEm: '2026-09-21T01:10:02Z',
}

describe('progresso', () => {
  it('registra com POST na leitura, corpo completo e a chave da intenção', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(201, { progresso: PROGRESSO, resumo: RESUMO }))
    const entrada = {
      pagina: 172,
      minutos: 45,
      registradoEmDispositivo: '2026-09-20T22:10:00-03:00',
      fusoHorarioDispositivo: 'America/Sao_Paulo',
    }

    await expect(servico(fetchMock).registrarProgresso('lt 1', entrada, 'k1')).resolves.toEqual({
      progresso: PROGRESSO,
      resumo: RESUMO,
    })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/leituras/lt%201/progresso')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual(entrada)
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('k1')
  })

  it('lista por GET sem chave, com page e limite só quando presentes', async () => {
    const pagina = {
      itens: [PROGRESSO],
      paginacao: { page: 2, limite: 10, totalItens: 11, totalPaginas: 2 },
      resumo: RESUMO,
      somenteLeitura: false,
    }
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(200, pagina))
    const leitura = servico(fetchMock)

    await expect(leitura.listarProgresso('lt1', { page: 2, limite: 10 })).resolves.toEqual(pagina)
    await leitura.listarProgresso('lt1')

    expect(fetchMock.mock.calls[0]![0]).toBe('https://leitura.example.com/leituras/lt1/progresso?page=2&limite=10')
    expect(fetchMock.mock.calls[1]![0]).toBe('https://leitura.example.com/leituras/lt1/progresso')
    expect(new Headers(fetchMock.mock.calls[0]![1]?.headers).has('Idempotency-Key')).toBe(false)
  })

  it('exclui o trecho com DELETE levando o último confirmado no corpo', async () => {
    const resultado = { idsRemovidos: ['p2'], resumo: { ...RESUMO, paginaAtual: 148, percentualConcluido: 56.06 } }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, resultado))

    await expect(
      servico(fetchMock).excluirTrechoProgresso('p2', { ultimoProgressoIdConfirmado: 'p2' }, 'k3'),
    ).resolves.toEqual(resultado)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/progresso/p2')
    expect(init?.method).toBe('DELETE')
    expect(JSON.parse(String(init?.body))).toEqual({ ultimoProgressoIdConfirmado: 'p2' })
    const headers = new Headers(init?.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Idempotency-Key')).toBe('k3')
  })

  it('409 de exclusão concorrente chega como ApiError', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(resposta(409, { codigo: 'PROGRESSO_DESATUALIZADO', mensagem: 'Há registros mais recentes.' }))

    const erro = await servico(fetchMock)
      .excluirTrechoProgresso('p1', { ultimoProgressoIdConfirmado: 'p1' }, 'k4')
      .catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ApiError)
    expect(erro).toMatchObject({ status: 409, code: 'PROGRESSO_DESATUALIZADO' })
  })
})
