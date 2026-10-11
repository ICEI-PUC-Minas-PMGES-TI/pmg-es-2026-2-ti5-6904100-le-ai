import MarkdownIt from 'markdown-it'
import { describe, expect, it } from 'vitest'

import {
  arvoreDaResenha,
  type Bloco,
  REGRAS_FORA_DO_SUBCONJUNTO,
  renderizarResenha,
  temMarcacaoForaDoSubconjunto,
  textoSemMarcacao,
} from './resenha'
import casosCompartilhados from '../../../../docs/design-system/markdown-resenha-casos.json'

/** Casos compartilhados com o mobile (RN-13.4): os dois clientes produzem a mesma árvore. */
const CASOS = casosCompartilhados as unknown as { casos: { nome: string; entrada: string; arvore: Bloco[] }[] }

describe('árvore da resenha (casos compartilhados com o mobile)', () => {
  it.each(CASOS.casos.map((caso) => [caso.nome, caso] as const))('%s', (_, caso) => {
    expect(arvoreDaResenha(caso.entrada)).toEqual(caso.arvore)
  })
})

describe('renderização segura (RNF-SEC-15)', () => {
  it('as regras desligadas existem no markdown-it (o disable não lança)', () => {
    expect(() => new MarkdownIt().disable([...REGRAS_FORA_DO_SUBCONJUNTO])).not.toThrow()
  })

  it.each([
    ['<script>alert(1)</script>', '<script'],
    ['<img src=x onerror=alert(1)>', '<img'],
    ['[clique](javascript:alert(1))', 'href'],
    ['![x](https://exemplo.com/a.png)', '<img'],
    ['<a href="https://exemplo.com">link</a>', '<a '],
  ])('%s não vira HTML', (entrada, proibido) => {
    const html = renderizarResenha(entrada)
    expect(html).not.toContain(proibido)
  })

  it('HTML digitado aparece escapado, como texto', () => {
    expect(renderizarResenha('<b>forte</b>')).toBe('<p>&lt;b&gt;forte&lt;/b&gt;</p>\n')
  })

  it('o subconjunto vira as tags certas', () => {
    const html = renderizarResenha('**forte** *leve* ~~riscado~~\n\n- item\n\n> citação')
    expect(html).toContain('<strong>forte</strong>')
    expect(html).toContain('<em>leve</em>')
    expect(html).toContain('<s>riscado</s>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<blockquote>')
  })

  it('lista numerada mantém o número inicial', () => {
    expect(renderizarResenha('3. três')).toContain('<ol start="3">')
  })
})

describe('texto sem marcação (prévia do feed e do perfil)', () => {
  it('tira a marcação e põe cada bloco numa linha', () => {
    expect(textoSemMarcacao('**Forte** e *leve*\n\n- um\n- dois\n\n> citado')).toBe('Forte e leve\num\ndois\ncitado')
  })

  it('o que não é do subconjunto continua literal', () => {
    expect(textoSemMarcacao('[link](https://x.com)')).toBe('[link](https://x.com)')
  })
})

describe('marcação fora do subconjunto (faixa da pré-visualização)', () => {
  it.each([
    '[leia aqui](https://exemplo.com)',
    '![capa](https://exemplo.com/a.png)',
    '# Título',
    'um `código`',
    '| a | b |\n|---|---|',
    '<b>html</b>',
  ])('%s liga a faixa', (texto) => {
    expect(temMarcacaoForaDoSubconjunto(texto)).toBe(true)
  })

  it('o subconjunto não liga a faixa', () => {
    expect(temMarcacaoForaDoSubconjunto('**forte** *leve* ~~x~~\n- item\n1. um\n> citação')).toBe(false)
  })
})
