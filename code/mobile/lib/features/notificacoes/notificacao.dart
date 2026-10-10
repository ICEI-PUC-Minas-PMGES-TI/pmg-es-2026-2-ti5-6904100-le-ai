/// Modelos de `docs/api/social.yaml` para F-NOT: `Notificacao` e `PaginaNotificacoes`.
library;

enum TipoNotificacao {
  novoSeguidor,
  solicitacaoCriada,
  solicitacaoAceita,
  atividadeCurtida,
  atividadeComentada,
  comentarioRespondido,
  usuarioMencionado,
  leituraEmRisco,
  leituraExpirada,
  resenhaCurtida;

  static const Map<String, TipoNotificacao> _doContrato = <String, TipoNotificacao>{
    'NOVO_SEGUIDOR': novoSeguidor,
    'SOLICITACAO_CRIADA': solicitacaoCriada,
    'SOLICITACAO_ACEITA': solicitacaoAceita,
    'ATIVIDADE_CURTIDA': atividadeCurtida,
    'ATIVIDADE_COMENTADA': atividadeComentada,
    'COMENTARIO_RESPONDIDO': comentarioRespondido,
    'USUARIO_MENCIONADO': usuarioMencionado,
    'LEITURA_EM_RISCO': leituraEmRisco,
    'LEITURA_EXPIRADA': leituraExpirada,
    'RESENHA_CURTIDA': resenhaCurtida,
  };

  /// Nulo para um tipo que o servidor passou a gerar depois desta versão do app: a lista não
  /// quebra por causa dele, só não o mostra.
  static TipoNotificacao? doContrato(String? valor) => _doContrato[valor];
}

class AtorDaNotificacao {
  final String id;
  final String username;
  final String nomeExibicao;

  const AtorDaNotificacao({required this.id, required this.username, required this.nomeExibicao});

  factory AtorDaNotificacao.fromJson(Map<String, dynamic> json) => AtorDaNotificacao(
    id: json['id'] as String,
    username: json['username'] as String,
    nomeExibicao: json['nomeExibicao'] as String,
  );
}

class LivroDaNotificacao {
  final String id;
  final bool pessoal;
  final String titulo;

  const LivroDaNotificacao({required this.id, required this.pessoal, required this.titulo});

  factory LivroDaNotificacao.fromJson(Map<String, dynamic> json) => LivroDaNotificacao(
    id: json['id'] as String,
    pessoal: json['tipo'] == 'pessoal',
    titulo: json['titulo'] as String,
  );
}

class Notificacao {
  final String id;
  final TipoNotificacao tipo;
  final String mensagem;
  final AtorDaNotificacao? ator;
  final String? atividadeId;
  final String? leituraId;
  final LivroDaNotificacao? livro;

  /// Presente só na leitura em risco: a ação de abandonar, que sempre pede confirmação.
  final bool podeAbandonar;
  final bool lida;
  final DateTime criadoEm;

  const Notificacao({
    required this.id,
    required this.tipo,
    required this.mensagem,
    this.ator,
    this.atividadeId,
    this.leituraId,
    this.livro,
    this.podeAbandonar = false,
    required this.lida,
    required this.criadoEm,
  });

  Notificacao comoLida() => Notificacao(
    id: id,
    tipo: tipo,
    mensagem: mensagem,
    ator: ator,
    atividadeId: atividadeId,
    leituraId: leituraId,
    livro: livro,
    podeAbandonar: podeAbandonar,
    lida: true,
    criadoEm: criadoEm,
  );

  static Notificacao? fromJson(Map<String, dynamic> json) {
    final tipo = TipoNotificacao.doContrato(json['tipo'] as String?);
    if (tipo == null) {
      return null;
    }
    final ator = json['ator'];
    final livro = json['livro'];
    final acao = json['acao'];
    return Notificacao(
      id: json['id'] as String,
      tipo: tipo,
      mensagem: json['mensagem'] as String,
      ator: ator is Map<String, dynamic> ? AtorDaNotificacao.fromJson(ator) : null,
      atividadeId: json['atividadeId'] as String?,
      leituraId: json['leituraId'] as String?,
      livro: livro is Map<String, dynamic> ? LivroDaNotificacao.fromJson(livro) : null,
      podeAbandonar: acao is Map<String, dynamic> && acao['tipo'] == 'ABANDONAR_LEITURA',
      lida: json['lida'] as bool,
      criadoEm: DateTime.parse(json['criadoEm'] as String).toLocal(),
    );
  }
}

class PaginaDeNotificacoes {
  final List<Notificacao> itens;
  final int totalItens;
  final int totalPaginas;
  final int totalNaoLidas;

  const PaginaDeNotificacoes({
    required this.itens,
    required this.totalItens,
    required this.totalPaginas,
    required this.totalNaoLidas,
  });

  factory PaginaDeNotificacoes.fromJson(Map<String, dynamic> json) => PaginaDeNotificacoes(
    itens: (json['itens'] as List<dynamic>)
        .map((bruto) => Notificacao.fromJson(bruto as Map<String, dynamic>))
        .whereType<Notificacao>()
        .toList(),
    totalItens: (json['totalItens'] as num).toInt(),
    totalPaginas: (json['totalPaginas'] as num).toInt(),
    totalNaoLidas: (json['totalNaoLidas'] as num).toInt(),
  );
}
