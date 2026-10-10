import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { routes } from '../../router'
import type { Atividade, TipoAtividade } from '../../services/social'
import ItemAtividade from './ItemAtividade.vue'

const AUTOR = { id: 'u1', username: 'dandaralp', nomeExibicao: 'Dandara Lopes', avatarUrl: null }

function atividade(sobrescreve: Partial<Atividade> = {}): Atividade {
  return {
    id: 'a1',
    tipo: 'LEITURA_INICIADA',
    autor: AUTOR,
    livro: { id: 'l1', tipo: 'OFICIAL', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null },
    resenha: null,
    criadoEm: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    totalCurtidas: 4,
    totalComentarios: 2,
    curtidaPeloSolicitante: false,
    ...sobrescreve,
  }
}

async function montar(props: { atividade: Atividade }) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/feed')
  await router.isReady()
  return mount(ItemAtividade, { props, global: { plugins: [router] } })
}

describe('ItemAtividade', () => {
  const VERBOS: [TipoAtividade, string][] = [
    ['LEITURA_INICIADA', 'começou a ler'],
    ['LEITURA_RETOMADA', 'retomou a leitura'],
    ['LEITURA_FINALIZADA', 'terminou de ler'],
    ['LEITURA_ABANDONADA', 'abandonou a leitura'],
    ['RESENHA_PUBLICADA', 'publicou uma resenha'],
  ]

  it.each(VERBOS)('mostra o verbo certo para %s', async (tipo, texto) => {
    const wrapper = await montar({ atividade: atividade({ tipo }) })
    expect(wrapper.text()).toContain(texto)
  })

  it('abandono não leva classe de alerta ou destrutiva', async () => {
    const wrapper = await montar({ atividade: atividade({ tipo: 'LEITURA_ABANDONADA' }) })
    expect(wrapper.html()).not.toMatch(/rubi|ambar/)
  })

  it('nome e avatar levam ao perfil do autor com ?via=feed', async () => {
    const wrapper = await montar({ atividade: atividade() })
    const links = wrapper.findAll(`a[href="/leitores/dandaralp?via=feed"]`)
    expect(links.length).toBeGreaterThanOrEqual(2)
  })

  it('card do livro oficial leva a /livros/:id', async () => {
    const wrapper = await montar({ atividade: atividade() })
    expect(wrapper.find('a[href="/livros/l1"]').exists()).toBe(true)
  })

  it('livro pessoal leva a /livros/pessoal/:id?via=feed&referenciaId= e mostra o chip', async () => {
    const wrapper = await montar({
      atividade: atividade({ livro: { id: 'lp1', tipo: 'PESSOAL', titulo: 'Meu diário', autor: 'Caio Ferraz', capaUrl: null } }),
    })
    expect(wrapper.find('a[href="/livros/pessoal/lp1?via=feed&referenciaId=a1"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Livro pessoal')
  })

  it('sem chip quando o livro é oficial', async () => {
    const wrapper = await montar({ atividade: atividade() })
    expect(wrapper.text()).not.toContain('Livro pessoal')
  })

  it('bloco de resenha só aparece em RESENHA_PUBLICADA, com o texto e "Ler resenha"', async () => {
    const semResenha = await montar({ atividade: atividade() })
    expect(semResenha.text()).not.toContain('Ler resenha')

    const comResenha = await montar({
      atividade: atividade({ tipo: 'RESENHA_PUBLICADA', resenha: { id: 'r1', texto: 'Um livro grandioso.', spoiler: false, nota: null } }),
    })
    expect(comResenha.text()).toContain('Um livro grandioso.')
    expect(comResenha.text()).toContain('Ler resenha')
  })

  it('a prévia da resenha sai sem a marcação do Markdown (F-AVA-2)', async () => {
    const wrapper = await montar({
      atividade: atividade({
        tipo: 'RESENHA_PUBLICADA',
        resenha: { id: 'r1', texto: '**Um** livro *grandioso*.\n\n> Para reler.', spoiler: false, nota: null },
      }),
    })

    expect(wrapper.text()).toContain('Um livro grandioso.')
    expect(wrapper.text()).toContain('Para reler.')
    expect(wrapper.text()).not.toContain('**')
    expect(wrapper.find('strong').exists()).toBe(false)
  })

  // RF-AVA-03: com spoiler, o texto não está no DOM até a ação de revelar.
  it('resenha com spoiler fica fora do DOM até "Mostrar mesmo assim"', async () => {
    const wrapper = await montar({
      atividade: atividade({
        tipo: 'RESENHA_PUBLICADA',
        resenha: { id: 'r1', texto: 'O final surpreende.', spoiler: true, nota: 4 },
      }),
    })
    expect(wrapper.text()).toContain('Esta resenha contém spoiler')
    expect(wrapper.html()).not.toContain('O final surpreende.')

    const revelar = wrapper.findAll('button').find((b) => b.text() === 'Mostrar mesmo assim')
    await revelar!.trigger('click')

    expect(wrapper.text()).toContain('O final surpreende.')
    expect(wrapper.text()).not.toContain('Esta resenha contém spoiler')
  })

  // Livro oficial sem autor chega com autor null: a linha some, como na busca.
  it('sem linha de autor quando o livro não tem autor', async () => {
    const wrapper = await montar({
      atividade: atividade({ livro: { id: 'l2', tipo: 'OFICIAL', titulo: 'Sem autor', autor: null, capaUrl: null } }),
    })
    expect(wrapper.text()).toContain('Sem autor')
    expect(wrapper.text()).not.toContain('null')
  })

  it('aria-label de curtir muda para descurtir conforme o estado, com a contagem', async () => {
    const naoCurtida = await montar({ atividade: atividade({ totalCurtidas: 4, curtidaPeloSolicitante: false }) })
    expect(naoCurtida.find('[aria-label="Curtir, 4 curtidas"]').exists()).toBe(true)

    const curtida = await montar({ atividade: atividade({ totalCurtidas: 5, curtidaPeloSolicitante: true }) })
    expect(curtida.find('[aria-label="Descurtir, 5 curtidas"]').exists()).toBe(true)
  })

  it('emite curtir/descurtir com o id da atividade ao clicar', async () => {
    const wrapper = await montar({ atividade: atividade({ curtidaPeloSolicitante: false }) })
    await wrapper.get('[aria-label="Curtir, 4 curtidas"]').trigger('click')
    expect(wrapper.emitted('curtir')).toEqual([['a1']])

    const curtido = await montar({ atividade: atividade({ curtidaPeloSolicitante: true }) })
    await curtido.get('[aria-label="Descurtir, 4 curtidas"]').trigger('click')
    expect(curtido.emitted('descurtir')).toEqual([['a1']])
  })

  it('botão de comentar não mostra número quando zero, e mostra quando houver', async () => {
    const semComentarios = await montar({ atividade: atividade({ totalComentarios: 0 }) })
    const botaoSemComentarios = semComentarios.get('[aria-label="Comentar"]')
    expect(botaoSemComentarios.text()).toBe('')

    const comComentarios = await montar({ atividade: atividade({ totalComentarios: 2 }) })
    expect(comComentarios.get('[aria-label="2 comentários"]').text()).toBe('2')
  })

  it('emite comentar com a atividade ao clicar no botão de comentar', async () => {
    const item = atividade({ totalComentarios: 2 })
    const wrapper = await montar({ atividade: item })
    await wrapper.get('[aria-label="2 comentários"]').trigger('click')
    expect(wrapper.emitted('comentar')).toEqual([[item]])
  })
})
