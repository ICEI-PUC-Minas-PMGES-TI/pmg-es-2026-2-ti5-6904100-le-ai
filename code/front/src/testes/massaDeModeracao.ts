import type { DenunciaPendente, RegistroDeModeracao } from '../services/moderacao'

export function denunciaDeResenha(id: string, extras: Partial<DenunciaPendente> = {}): DenunciaPendente {
  return {
    id,
    tipo: 'resenha',
    criadoEm: '2026-09-27T21:08:00',
    motivo: 'Conta o final sem aviso de spoiler.',
    denunciante: { id: 'd1', username: 'otaviobrandao', nomeExibicao: 'Otávio Brandão', avatarUrl: null },
    autor: { id: 'a1', username: 'leticia', nomeExibicao: 'Letícia Nakamura', avatarUrl: null },
    livro: { id: 'l1', titulo: 'Torto Arado', pessoal: false },
    atividade: null,
    conteudo: {
      texto: 'A troca de narradora é o melhor recurso. Depois *não consegui parar*.',
      spoiler: false,
      nota: 4.5,
      publicadoEm: '2026-09-12T10:00:00',
      respostas: 0,
    },
    remocaoNaoConfirmada: false,
    ...extras,
  }
}

export function denunciaDeComentario(id: string, extras: Partial<DenunciaPendente> = {}): DenunciaPendente {
  return {
    id,
    tipo: 'comentario',
    criadoEm: '2026-09-28T16:40:00',
    motivo: 'Ofende quem gostou do livro.',
    denunciante: { id: 'd2', username: 'dandaralp', nomeExibicao: 'Dandara Lopes', avatarUrl: null },
    autor: { id: 'a2', username: 'sergiov', nomeExibicao: 'Sérgio Valadares', avatarUrl: null },
    livro: { id: 'l2', titulo: 'Os Sertões', pessoal: false },
    atividade: {
      id: 'at1',
      tipo: 'resenha_publicada',
      autorNome: 'Rafael Okamoto',
      livroTitulo: 'Os Sertões',
      visivelParaAdmin: false,
    },
    conteudo: {
      texto: 'Quem gosta desse livro não entendeu nada.',
      spoiler: false,
      nota: null,
      publicadoEm: '2026-09-28T16:12:00',
      respostas: 2,
    },
    remocaoNaoConfirmada: false,
    ...extras,
  }
}

export function registro(id: string, extras: Partial<RegistroDeModeracao> = {}): RegistroDeModeracao {
  return {
    id,
    criadoEm: '2026-09-29T10:12:00',
    acao: 'remover_conteudo',
    alvoTipo: 'comentario',
    comDenuncia: true,
    alvoAutor: 'tiagomoreira',
    atividadeAutor: 'rafaokamoto',
    livroTitulo: 'Os Sertões',
    anonimizado: false,
    ...extras,
  }
}
