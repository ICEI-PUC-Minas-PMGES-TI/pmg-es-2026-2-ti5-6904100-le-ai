import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PoliticaDePrivacidade from './PoliticaDePrivacidade.vue'

/**
 * Texto da política de privacidade 1.1 (RNF-SEC-42, F-CONTA-2; L-19 da E6-02). A política mora
 * num lugar só, e as Configurações, a tela empilhada do celular e a versão pública do cadastro a
 * usam; o que se confere aqui vale para os três.
 */
describe('PoliticaDePrivacidade', () => {
  function blocos(): [string, string][] {
    const wrapper = mount(PoliticaDePrivacidade)
    return wrapper.findAll('section').map((secao) => [secao.get('h2').text(), secao.get('p').text()])
  }

  it('é a versão 1.1 e tem os quatro blocos, nesta ordem, com o título como cabeçalho', () => {
    const wrapper = mount(PoliticaDePrivacidade)

    expect(wrapper.get('article > p').text()).toBe('Versão 1.1, de 29 de setembro de 2026')
    expect(blocos().map(([titulo]) => titulo)).toEqual([
      'Dados que coletamos',
      'Para que usamos',
      'Por quanto tempo guardamos',
      'Seus direitos',
    ])
  })

  it('retenção e exclusão: 30 dias ocultos com cancelamento, apagamento definitivo e prazos dos registros', () => {
    const retencao = blocos().find(([titulo]) => titulo === 'Por quanto tempo guardamos')![1]

    expect(retencao).toBe(
      'Enquanto a conta existir. Se você pedir a exclusão, seus dados ficam guardados e ocultos para os outros leitores por 30 dias, e você pode cancelar nesse prazo. Depois disso, eles são apagados definitivamente, e só restam registros técnicos sem nada que identifique você. O token de recuperação de senha vale por 1 hora. Registros de acesso ficam por 6 meses.',
    )
  })

  it('direitos: corrigir pelo perfil e pedir a exclusão da conta em Configurações', () => {
    const direitos = blocos().find(([titulo]) => titulo === 'Seus direitos')![1]

    expect(direitos).toBe(
      'Você pode acessar e corrigir seus dados pelo perfil, pedir a exclusão da conta em Configurações e pedir suporte pelo e-mail de contato do projeto.',
    )
  })
})
