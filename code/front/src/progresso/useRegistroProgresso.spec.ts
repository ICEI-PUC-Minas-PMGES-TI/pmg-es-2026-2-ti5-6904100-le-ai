import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import type { Progresso, ResumoProgresso } from '../services/leitura'
import { TEXTOS_DO_REGISTRO } from './textos'
import { useRegistroProgresso } from './useRegistroProgresso'

const resumo: ResumoProgresso = { paginaAtual: 172, totalPaginas: 264, percentualConcluido: 65.15, minutosTotais: 260 }

const progresso: Progresso = {
  id: 'p1',
  leituraId: 'lei-1',
  posicao: 1,
  pagina: 172,
  paginaAnterior: 148,
  paginasLidas: 24,
  minutos: 45,
  registradoEmDispositivo: '2026-09-08T10:00:00.000Z',
  fusoHorarioDispositivo: 'America/Sao_Paulo',
  dataLocal: '2026-09-08',
  criadoEm: '2026-09-08T10:00:00.000Z',
}

function servicoFalso() {
  return {
    registrarProgresso: vi.fn().mockResolvedValue({ progresso, resumo }),
    excluirTrechoProgresso: vi.fn().mockResolvedValue({ idsRemovidos: ['p1'], resumo }),
  }
}

const falhaDeRede = () => new ApiError('Sem conexão.', 0, 'NETWORK_ERROR')

describe('useRegistroProgresso', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('registra com o instante e o fuso do aparelho e guarda o resultado', async () => {
    const servico = servicoFalso()
    const registro = useRegistroProgresso(servico)

    const resultado = await registro.registrar('lei-1', { pagina: 172, minutos: 45 })

    expect(resultado).toEqual({ progresso, resumo })
    expect(registro.ultimoResultado.value).toEqual({ progresso, resumo })
    const [leituraId, entrada, chave] = servico.registrarProgresso.mock.calls[0]
    expect(leituraId).toBe('lei-1')
    expect(entrada).toEqual({
      pagina: 172,
      minutos: 45,
      registradoEmDispositivo: '2026-09-08T10:00:00.000Z',
      fusoHorarioDispositivo: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    expect(chave).toEqual(expect.any(String))
  })

  it('reenvia a mesma intenção com a mesma chave e o mesmo instante', async () => {
    const servico = servicoFalso()
    servico.registrarProgresso.mockRejectedValueOnce(falhaDeRede())
    const registro = useRegistroProgresso(servico)

    await registro.registrar('lei-1', { pagina: 172, minutos: 45 })
    expect(registro.erro.value).toBe(TEXTOS_DO_REGISTRO.erroEnvio)
    vi.setSystemTime(new Date('2026-09-08T10:05:00.000Z'))
    await registro.registrar('lei-1', { pagina: 172, minutos: 45 })

    const [primeira, segunda] = servico.registrarProgresso.mock.calls
    expect(segunda[2]).toBe(primeira[2])
    expect(segunda[1]).toEqual(primeira[1])
    expect(registro.erro.value).toBeNull()
  })

  it('usa chave e instante novos quando a intenção muda', async () => {
    const servico = servicoFalso()
    servico.registrarProgresso.mockRejectedValueOnce(falhaDeRede())
    const registro = useRegistroProgresso(servico)

    await registro.registrar('lei-1', { pagina: 172, minutos: 45 })
    vi.setSystemTime(new Date('2026-09-08T10:05:00.000Z'))
    await registro.registrar('lei-1', { pagina: 180, minutos: 45 })

    const [primeira, segunda] = servico.registrarProgresso.mock.calls
    expect(segunda[2]).not.toBe(primeira[2])
    expect(segunda[1].registradoEmDispositivo).toBe('2026-09-08T10:05:00.000Z')
  })

  it('usa chave nova depois de um sucesso, mesmo com o mesmo corpo', async () => {
    const servico = servicoFalso()
    const registro = useRegistroProgresso(servico)

    await registro.registrar('lei-1', { pagina: 172, minutos: 45 })
    await registro.registrar('lei-1', { pagina: 172, minutos: 45 })

    const [primeira, segunda] = servico.registrarProgresso.mock.calls
    expect(segunda[2]).not.toBe(primeira[2])
  })

  it('leva o 422 da página para o erro do campo e encerra a intenção', async () => {
    const servico = servicoFalso()
    servico.registrarProgresso.mockRejectedValueOnce(
      new ApiError('Dados inválidos.', 422, 'VALIDACAO', undefined, {
        campos: [{ campo: 'pagina', mensagem: 'Você já está na página 148. Informe uma página maior.' }],
      }),
    )
    const registro = useRegistroProgresso(servico)

    expect(await registro.registrar('lei-1', { pagina: 140, minutos: 45 })).toBeNull()
    expect(registro.erroDoCampo.value).toEqual({ pagina: 'Você já está na página 148. Informe uma página maior.' })
    expect(registro.erro.value).toBeNull()

    await registro.registrar('lei-1', { pagina: 140, minutos: 45 })
    const [primeira, segunda] = servico.registrarProgresso.mock.calls
    expect(segunda[2]).not.toBe(primeira[2])
  })

  it('mostra a mensagem do servidor no 422 sem campo', async () => {
    const servico = servicoFalso()
    servico.registrarProgresso.mockRejectedValueOnce(new ApiError('A leitura foi encerrada.', 422, 'LEITURA_ENCERRADA'))
    const registro = useRegistroProgresso(servico)

    await registro.registrar('lei-1', { pagina: 172, minutos: 45 })

    expect(registro.erro.value).toBe('A leitura foi encerrada.')
    expect(registro.erroDoCampo.value).toEqual({})
  })

  it('pede recarga da lista no 409', async () => {
    const servico = servicoFalso()
    servico.excluirTrechoProgresso.mockRejectedValueOnce(new ApiError('Conflito.', 409, 'CONFLITO'))
    const registro = useRegistroProgresso(servico)

    expect(await registro.excluirTrecho('p2', 'p4')).toBeNull()

    expect(registro.erro.value).toBe(TEXTOS_DO_REGISTRO.erroListaDesatualizada)
    expect(registro.precisaRecarregar.value).toBe(true)
    expect(servico.excluirTrechoProgresso).toHaveBeenCalledWith('p2', { ultimoProgressoIdConfirmado: 'p4' }, expect.any(String))
  })

  it('trata timeout e 5xx como erro ao salvar e guarda a chave', async () => {
    const servico = servicoFalso()
    servico.registrarProgresso
      .mockRejectedValueOnce(new ApiError('Tempo esgotado.', 0, 'TIMEOUT'))
      .mockRejectedValueOnce(new ApiError('Erro interno.', 500, 'INTERNO'))
    const registro = useRegistroProgresso(servico)

    await registro.registrar('lei-1', { pagina: 170 })
    expect(registro.erro.value).toBe(TEXTOS_DO_REGISTRO.erroEnvio)
    await registro.registrar('lei-1', { pagina: 170 })
    expect(registro.erro.value).toBe(TEXTOS_DO_REGISTRO.erroEnvio)
    await registro.registrar('lei-1', { pagina: 170 })

    const chaves = servico.registrarProgresso.mock.calls.map((chamada) => chamada[2])
    expect(new Set(chaves).size).toBe(1)
    expect(registro.ultimoResultado.value).toEqual({ progresso, resumo })
  })

  it('não dispara uma segunda escrita enquanto salva', async () => {
    const servico = servicoFalso()
    const registro = useRegistroProgresso(servico)

    const primeira = registro.registrar('lei-1', { pagina: 172, minutos: 45 })
    expect(registro.salvando.value).toBe(true)
    expect(await registro.registrar('lei-1', { pagina: 172, minutos: 45 })).toBeNull()
    await primeira

    expect(servico.registrarProgresso).toHaveBeenCalledTimes(1)
    expect(registro.salvando.value).toBe(false)
  })

  it('propaga falha que não é da API', async () => {
    const servico = servicoFalso()
    servico.registrarProgresso.mockRejectedValueOnce(new TypeError('quebrou'))
    const registro = useRegistroProgresso(servico)

    await expect(registro.registrar('lei-1', { pagina: 172, minutos: 45 })).rejects.toThrow('quebrou')
    expect(registro.salvando.value).toBe(false)
  })
})
