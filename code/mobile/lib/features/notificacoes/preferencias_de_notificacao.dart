import 'notificacao.dart';

enum SecaoDePreferencias {
  seguidores('Seguidores'),
  atividadesEComentarios('Atividades e comentários'),
  resenhasERecomendacoes('Resenhas e recomendações'),
  leituras('Leituras');

  final String titulo;

  const SecaoDePreferencias(this.titulo);
}

enum TipoPreferenciaNotificacao {
  novoSeguidor(
    'NOVO_SEGUIDOR',
    SecaoDePreferencias.seguidores,
    'Novo seguidor',
    'Quando alguém começa a seguir você.',
    TipoNotificacao.novoSeguidor,
  ),
  solicitacaoCriada(
    'SOLICITACAO_CRIADA',
    SecaoDePreferencias.seguidores,
    'Pedido para seguir',
    'Quando alguém pede para seguir seu perfil privado.',
    TipoNotificacao.solicitacaoCriada,
  ),
  solicitacaoAceita(
    'SOLICITACAO_ACEITA',
    SecaoDePreferencias.seguidores,
    'Pedido aceito',
    'Quando aceitam seu pedido para seguir.',
    TipoNotificacao.solicitacaoAceita,
  ),
  atividadeCurtida(
    'ATIVIDADE_CURTIDA',
    SecaoDePreferencias.atividadesEComentarios,
    'Curtida em atividade',
    'Quando curtem uma atividade sua no feed.',
    TipoNotificacao.atividadeCurtida,
  ),
  atividadeComentada(
    'ATIVIDADE_COMENTADA',
    SecaoDePreferencias.atividadesEComentarios,
    'Comentário em atividade',
    'Quando comentam uma atividade sua.',
    TipoNotificacao.atividadeComentada,
  ),
  comentarioRespondido(
    'COMENTARIO_RESPONDIDO',
    SecaoDePreferencias.atividadesEComentarios,
    'Resposta a comentário',
    'Quando respondem a um comentário seu.',
    TipoNotificacao.comentarioRespondido,
  ),
  usuarioMencionado(
    'USUARIO_MENCIONADO',
    SecaoDePreferencias.atividadesEComentarios,
    'Menção em comentário',
    'Quando mencionam você num comentário.',
    TipoNotificacao.usuarioMencionado,
  ),
  resenhaCurtida(
    'RESENHA_CURTIDA',
    SecaoDePreferencias.resenhasERecomendacoes,
    'Curtida em resenha',
    'Quando curtem uma resenha sua.',
    TipoNotificacao.resenhaCurtida,
  ),
  recomendacaoRecebida(
    'RECOMENDACAO_RECEBIDA',
    SecaoDePreferencias.resenhasERecomendacoes,
    'Livro recomendado',
    'Quando um leitor recomenda um livro para você.',
    TipoNotificacao.recomendacaoRecebida,
  ),
  leituraEmRisco(
    'LEITURA_EM_RISCO',
    SecaoDePreferencias.leituras,
    'Leitura em risco',
    'Depois de 30 dias sem progresso, com a opção de abandonar a leitura.',
    TipoNotificacao.leituraEmRisco,
  ),
  leituraExpirada(
    'LEITURA_EXPIRADA',
    SecaoDePreferencias.leituras,
    'Leitura abandonada',
    'Quando uma leitura é abandonada depois de 40 dias sem progresso.',
    TipoNotificacao.leituraExpirada,
  ),
  lembreteDeSequencia(
    'LEMBRETE_SEQUENCIA',
    SecaoDePreferencias.leituras,
    'Lembrete de sequência',
    'Um aviso por dia, se você tem sequência ativa e ainda não registrou progresso.',
    null,
  );

  final String valorDoContrato;
  final SecaoDePreferencias secao;
  final String rotulo;
  final String descricao;
  final TipoNotificacao? notificacao;

  const TipoPreferenciaNotificacao(
    this.valorDoContrato,
    this.secao,
    this.rotulo,
    this.descricao,
    this.notificacao,
  );

  static const Map<String, TipoPreferenciaNotificacao> _doContrato =
      <String, TipoPreferenciaNotificacao>{
        'NOVO_SEGUIDOR': novoSeguidor,
        'SOLICITACAO_CRIADA': solicitacaoCriada,
        'SOLICITACAO_ACEITA': solicitacaoAceita,
        'ATIVIDADE_CURTIDA': atividadeCurtida,
        'ATIVIDADE_COMENTADA': atividadeComentada,
        'COMENTARIO_RESPONDIDO': comentarioRespondido,
        'USUARIO_MENCIONADO': usuarioMencionado,
        'RESENHA_CURTIDA': resenhaCurtida,
        'RECOMENDACAO_RECEBIDA': recomendacaoRecebida,
        'LEITURA_EM_RISCO': leituraEmRisco,
        'LEITURA_EXPIRADA': leituraExpirada,
        'LEMBRETE_SEQUENCIA': lembreteDeSequencia,
      };

  static TipoPreferenciaNotificacao? doContrato(String? valor) => _doContrato[valor];

  static List<TipoPreferenciaNotificacao> daSecao(SecaoDePreferencias secao) =>
      values.where((tipo) => tipo.secao == secao).toList(growable: false);
}

const bool preferenciaHabilitadaPorPadrao = true;

Map<TipoPreferenciaNotificacao, bool> preferenciasDeNotificacaoDeJson(Map<String, dynamic> json) {
  final itens = json['preferencias'];
  if (itens is! List<dynamic>) {
    throw const FormatException('A resposta não traz a lista de preferências.');
  }
  final habilitadas = <TipoPreferenciaNotificacao, bool>{
    for (final tipo in TipoPreferenciaNotificacao.values) tipo: preferenciaHabilitadaPorPadrao,
  };
  for (final bruto in itens) {
    if (bruto case {'tipo': final String valor, 'habilitada': final bool habilitada}) {
      final tipo = TipoPreferenciaNotificacao.doContrato(valor);
      if (tipo != null) {
        habilitadas[tipo] = habilitada;
      }
    } else {
      throw const FormatException('Preferência fora do contrato.');
    }
  }
  return habilitadas;
}
