import { describe, expect, it } from 'vitest'

import { denunciaDeComentario, denunciaDeResenha, registro } from '../testes/massaDeModeracao'
import {
  acaoDoRegistro,
  alvoDoRegistro,
  consequenciaDaRemocao,
  dataCurta,
  dataDoRegistro,
  linhaDoCard,
  lugarDaDenuncia,
  quemDenunciou,
} from './textos'

describe('textos do painel de moderação', () => {
  it('datas da fila, do detalhe e do registro', () => {
    expect(dataCurta('2026-09-27T21:08:00')).toBe('27 set, 21:08')
    expect(quemDenunciou(denunciaDeResenha('d'))).toBe(
      'Recebida em 27 de setembro de 2026, às 21:08, de @otaviobrandao',
    )
    expect(dataDoRegistro('2026-09-05T08:03:00')).toBe('05/09/2026 08:03')
  })

  it('lugar e linha do card de resenha e de comentário', () => {
    expect(lugarDaDenuncia(denunciaDeResenha('d'))).toBe('Torto Arado')
    expect(lugarDaDenuncia(denunciaDeComentario('d'))).toBe('atividade de Rafael Okamoto')
    expect(linhaDoCard(denunciaDeResenha('d'))).toBe('Resenha de Torto Arado · publicada em 12 de setembro de 2026')
    expect(linhaDoCard(denunciaDeComentario('d'))).toBe(
      'Comentário na atividade Rafael Okamoto publicou uma resenha de Os Sertões · 28 set, 16:12',
    )
  })

  it('conta excluída no lugar do username, sem @', () => {
    expect(quemDenunciou(denunciaDeResenha('d', { denunciante: null }))).toContain('de conta excluída')
  })

  it('consequência da remoção conta as respostas', () => {
    expect(consequenciaDaRemocao(denunciaDeComentario('d'))).toBe(
      'O comentário e as 2 respostas a ele saem da atividade para todos os leitores. A remoção não pode ser desfeita e fica no registro de auditoria.',
    )
    expect(consequenciaDaRemocao(denunciaDeResenha('d'))).toContain('A resenha sai da página do livro')
  })

  it('ação e alvo do registro, com frase sem denúncia e conta excluída', () => {
    expect(acaoDoRegistro(registro('r'))).toBe('Removeu comentário')
    expect(alvoDoRegistro(registro('r'))).toBe('Comentário de @tiagomoreira na atividade de @rafaokamoto')
    expect(acaoDoRegistro(registro('r', { acao: 'arquivar_denuncia' }))).toBe('Arquivou denúncia')
    expect(
      acaoDoRegistro(registro('r', { alvoTipo: 'frase', comDenuncia: false, atividadeAutor: null })),
    ).toBe('Removeu frase, sem denúncia')
    expect(
      alvoDoRegistro(
        registro('r', { alvoTipo: 'resenha', alvoAutor: null, atividadeAutor: null, anonimizado: true }),
      ),
    ).toBe('Resenha de conta excluída')
    expect(alvoDoRegistro(registro('r', { alvoTipo: 'resenha', atividadeAutor: null }))).toBe(
      'Resenha de @tiagomoreira em Os Sertões',
    )
  })
})
