/// `AcessoDeRecuperacao` do contrato (F-CONTA-2, RN-23.3): o login de conta com exclusão
/// pendente devolve um token curto que só serve para cancelar a exclusão, sem renovação, e as
/// datas que a tela de recuperação mostra. Mora em `core/session` porque é estado de sessão do
/// [SessionController], não da tela.
class AcessoDeRecuperacao {
  static const String tipo = 'recuperacao_exclusao';

  final String accessToken;
  final int expiresIn;
  final DateTime exclusaoSolicitadaEm;
  final DateTime exclusaoPrevistaEm;
  final String username;
  final String nomeExibicao;

  const AcessoDeRecuperacao({
    required this.accessToken,
    required this.expiresIn,
    required this.exclusaoSolicitadaEm,
    required this.exclusaoPrevistaEm,
    required this.username,
    required this.nomeExibicao,
  });

  factory AcessoDeRecuperacao.fromJson(Map<String, dynamic> json) {
    return AcessoDeRecuperacao(
      accessToken: json['accessToken'] as String,
      expiresIn: json['expiresIn'] as int,
      exclusaoSolicitadaEm: DateTime.parse(json['exclusaoSolicitadaEm'] as String),
      exclusaoPrevistaEm: DateTime.parse(json['exclusaoPrevistaEm'] as String),
      username: json['username'] as String,
      nomeExibicao: json['nomeExibicao'] as String,
    );
  }
}
