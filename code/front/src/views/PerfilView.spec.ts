import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { perfilService, type Perfil } from '../services/perfil'
import { montarNaRota } from '../testes/montarNaRota'

vi.mock('../services/perfil', () => ({ perfilService: { obterMeuPerfil: vi.fn() } }))

const servico = vi.mocked(perfilService)

const PERFIL: Perfil = {
  id: 'u1',
  username: 'marinableu',
  displayName: 'Marina Beltrão',
  avatarUrl: null,
  privacidade: 'publico',
  conteudoRestrito: false,
  relacao: 'proprio',
  biografia: 'Leio ficção brasileira contemporânea.',
  contadores: { seguidores: 84, seguidos: 1 },
}

describe('PerfilView', () => {
  beforeEach(() => {
    localStorage.clear()
    servico.obterMeuPerfil.mockReset().mockResolvedValue(PERFIL)
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mostra identidade, chip público, biografia e os contadores com unidade', async () => {
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Perfil')
    expect(wrapper.text()).toContain('Marina Beltrão')
    expect(wrapper.text()).toContain('@marinableu')
    expect(wrapper.text()).toContain('Perfil público')
    expect(wrapper.text()).toContain('Leio ficção brasileira contemporânea.')
    expect(wrapper.find('[aria-label="84 seguidores"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="1 seguindo"]').exists()).toBe(true)
    expect(wrapper.get('a[href="/perfil/editar"]').text()).toBe('Editar perfil')
    // Sem conteúdo de `leitura` ainda: nada de estante vazia fingindo que não há livros.
    expect(wrapper.text()).not.toContain('livros lidos')
  })

  it('perfil privado troca o chip e explica quem vê o conteúdo', async () => {
    servico.obterMeuPerfil.mockResolvedValue({ ...PERFIL, privacidade: 'privado' })
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(wrapper.text()).toContain('Perfil privado')
    expect(wrapper.text()).toContain('Só quem você aceita vê sua estante e suas resenhas.')
    expect(wrapper.text()).not.toContain('Perfil público')
  })

  it('falha de carga mostra o banner e tenta de novo', async () => {
    servico.obterMeuPerfil.mockRejectedValueOnce(new Error('rede'))
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar seu perfil.')
    const tentar = wrapper.findAll('button').find((botao) => botao.text() === 'Tentar de novo')!
    await tentar.trigger('click')
    await flushPromises()

    expect(servico.obterMeuPerfil).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Marina Beltrão')
  })
})
