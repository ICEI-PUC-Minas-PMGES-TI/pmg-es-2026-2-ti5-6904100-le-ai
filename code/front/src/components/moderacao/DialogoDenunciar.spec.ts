import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AlvoDaDenuncia } from '../../moderacao/useDenunciar'
import { ApiError } from '../../services/api'
import DenunciaDeConteudo from './DenunciaDeConteudo.vue'
import DialogoDenunciar from './DialogoDenunciar.vue'

const RESENHA: AlvoDaDenuncia = {
  tipo: 'resenha',
  id: 'r1',
  autorNome: 'Letícia Nakamura',
  autorAvatarUrl: null,
  livroTitulo: 'Torto Arado',
  texto: 'A segunda parte *muda tudo*.\n\n- e **conta** o final',
}

const COMENTARIO: AlvoDaDenuncia = {
  tipo: 'comentario',
  id: 'c1',
  autorNome: 'Rafael Okamoto',
  autorAvatarUrl: null,
  livroTitulo: 'Os Sertões',
  texto: '<b>Vale.</b> A terceira parte reorganiza tudo.',
}

function montar(alvo: AlvoDaDenuncia = RESENHA, denunciar = vi.fn()) {
  const wrapper = mount(DialogoDenunciar, { props: { alvo, servico: { denunciar } }, attachTo: document.body })
  return { wrapper, tela: new DOMWrapper(document.body), denunciar }
}

function botao(tela: DOMWrapper<Element>, texto: string) {
  return tela.findAll('button').find((b) => b.text() === texto)!
}

async function escreverERevisar(tela: DOMWrapper<Element>, motivo: string) {
  await tela.get('textarea').setValue(motivo)
  await botao(tela, 'Revisar denúncia').trigger('click')
  await flushPromises()
}

describe('DialogoDenunciar', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('passo 1 da resenha: card com o trecho formatado, sem v-html, e o contador zerado', () => {
    const { tela } = montar()

    expect(tela.get('h2').text()).toBe('Denunciar resenha')
    expect(tela.text()).toContain('Resenha de Torto Arado')
    expect(tela.get('em').text()).toBe('muda tudo')
    expect(tela.get('strong').text()).toBe('conta')
    expect(tela.text()).toContain('0 de 500 caracteres')
    expect(tela.text()).toContain('Obrigatório. Conte o que há de errado com as suas palavras.')
  })

  it('resenha com spoiler não mostra o texto no card', () => {
    const { tela } = montar({ ...RESENHA, spoiler: true })

    expect(tela.text()).toContain('Resenha com spoiler. O texto fica oculto aqui.')
    expect(tela.text()).not.toContain('muda tudo')
  })

  it('comentário: título, linha do card e texto como texto puro', () => {
    const { tela } = montar(COMENTARIO)

    expect(tela.get('h2').text()).toBe('Denunciar comentário')
    expect(tela.text()).toContain('Resposta em Os Sertões')
    expect(tela.find('b').exists()).toBe(false)
    expect(tela.text()).toContain('<b>Vale.</b>')
  })

  it('revisar sem motivo mostra o erro no lugar do helper e fica no passo 1', async () => {
    const { tela } = montar()

    await botao(tela, 'Revisar denúncia').trigger('click')

    expect(tela.text()).toContain('Escreva o motivo da denúncia para continuar.')
    expect(tela.get('textarea').attributes('aria-invalid')).toBe('true')
    expect(tela.get('h2').text()).toBe('Denunciar resenha')
  })

  it('passo 2 repete o motivo e foca Voltar ao motivo, que volta com o texto intacto', async () => {
    const { tela } = montar()

    await escreverERevisar(tela, 'Conta quem narra a segunda parte.')

    expect(tela.get('h2').text()).toBe('Enviar esta denúncia?')
    expect(tela.text()).toContain('A resenha de Letícia Nakamura e o seu motivo vão para a moderação.')
    expect(tela.text()).toContain('Seu motivo')
    expect(tela.text()).toContain('Conta quem narra a segunda parte.')
    expect(document.activeElement?.textContent?.trim()).toBe('Voltar ao motivo')

    await botao(tela, 'Voltar ao motivo').trigger('click')
    expect((tela.get('textarea').element as HTMLTextAreaElement).value).toBe('Conta quem narra a segunda parte.')
  })

  it('enviar chama o serviço e emite enviada', async () => {
    const denunciar = vi.fn().mockResolvedValue({ id: 'd1', estado: 'pendente', criadoEm: '' })
    const { wrapper, tela } = montar(COMENTARIO, denunciar)
    await escreverERevisar(tela, 'Divulgação repetida.')

    await botao(tela, 'Enviar denúncia').trigger('click')
    await flushPromises()

    expect(denunciar).toHaveBeenCalledWith(
      { alvoTipo: 'comentario', alvoId: 'c1', motivo: 'Divulgação repetida.' },
      expect.any(String),
    )
    expect(wrapper.emitted('enviada')).toHaveLength(1)
  })

  it('falha de conexão e 429 mostram o banner certo, com o motivo preservado', async () => {
    const denunciar = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('rede'))
      .mockRejectedValueOnce(new ApiError('limite', 429, 'MUITAS_REQUISICOES'))
    const { tela } = montar(RESENHA, denunciar)
    await escreverERevisar(tela, 'Spam')

    await botao(tela, 'Enviar denúncia').trigger('click')
    await flushPromises()
    expect(tela.get('[role="alert"]').text()).toBe(
      'Não foi possível enviar a denúncia. Verifique sua conexão e tente de novo.',
    )

    await botao(tela, 'Enviar denúncia').trigger('click')
    await flushPromises()
    expect(tela.get('[role="alert"]').text()).toBe(
      'Você enviou muitas denúncias em pouco tempo. Espere alguns minutos e tente de novo.',
    )
    expect(tela.text()).toContain('Spam')
  })

  it('404 troca para o conteúdo indisponível, e Fechar emite fechar', async () => {
    const denunciar = vi.fn().mockRejectedValue(new ApiError('sumiu', 404, 'RECURSO_NAO_ENCONTRADO'))
    const { wrapper, tela } = montar(RESENHA, denunciar)
    await escreverERevisar(tela, 'Spam')

    await botao(tela, 'Enviar denúncia').trigger('click')
    await flushPromises()

    expect(tela.get('h2').text()).toBe('Esta resenha não está mais disponível')
    await botao(tela, 'Fechar').trigger('click')
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })

  it('o X com motivo escrito pergunta antes; Descartar fecha', async () => {
    const { wrapper, tela } = montar()
    await tela.get('textarea').setValue('Algo')

    await tela.get('button[aria-label="Fechar"]').trigger('click')
    expect(tela.get('h2').text()).toBe('Descartar esta denúncia?')
    expect(wrapper.emitted('fechar')).toBeUndefined()

    await botao(tela, 'Descartar').trigger('click')
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })
})

describe('DenunciaDeConteudo', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('depois do envio fecha e mostra o aviso de confirmação', async () => {
    document.body.innerHTML = '<div id="avisos-flutuantes"></div>'
    const denunciar = vi.fn().mockResolvedValue({})
    const wrapper = mount(DenunciaDeConteudo, {
      props: { alvo: RESENHA, servico: { denunciar } },
      attachTo: document.body,
    })
    const tela = new DOMWrapper(document.body)
    await escreverERevisar(tela, 'Spam')

    await botao(tela, 'Enviar denúncia').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('fechar')).toHaveLength(1)
    expect(tela.text()).toContain('Denúncia enviada. A moderação vai analisar.')
  })
})
