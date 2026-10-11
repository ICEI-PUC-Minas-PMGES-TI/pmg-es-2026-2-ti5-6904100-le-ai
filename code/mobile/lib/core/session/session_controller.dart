import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../network/api_client.dart';
import 'acesso_de_recuperacao.dart';
import 'token_store.dart';

/// Par de tokens que o login e a renovação devolvem (`Sessao` em `docs/api/identidade.yaml`).
class TokensDaSessao {
  final String accessToken;
  final String refreshToken;

  const TokensDaSessao({required this.accessToken, required this.refreshToken});
}

/// Estado de sessão do app, persistido em `TokenStore`. No molde de `ThemeController`
/// (`lib/design/theme_controller.dart`): `load()` restaura do store, `notifyListeners()` roda
/// antes de persistir para a UI reagir sem esperar a escrita em disco.
///
/// **Dois tokens (F-AUT).** O de acesso vale 15 minutos; o de renovação é rotativo e troca a cada
/// uso. Os dois vão juntos para o store, como JSON, no Keystore/Keychain. Sessão gravada antes de
/// F-AUT, só com o token de acesso cru, continua sendo lida: vale até o acesso vencer e, sem
/// renovação, termina no primeiro `401`.
///
/// **Renovação sem lock.** Na web duas abas dividem o `localStorage` e precisam de lock entre
/// elas; aqui há um processo só, então basta que chamadas simultâneas compartilhem a mesma
/// renovação. Duas renovações com o mesmo token contariam como reuso no servidor, que derruba
/// todas as sessões do usuário (RNF-SEC-30).
///
/// [carregando] existe porque, ao contrário da web, ler `flutter_secure_storage` é assíncrono: há
/// um intervalo real entre o app abrir e a sessão ser conhecida, e é nele que a guarda de rota
/// mostra a tela de verificação de sessão.
class SessionController extends ChangeNotifier {
  final TokenStore store;
  String? _token;
  String? _refreshToken;
  bool _carregando = true;
  Future<bool>? _renovacaoEmCurso;
  AcessoDeRecuperacao? _recuperacao;

  SessionController(this.store);

  /// Acesso de recuperação da conta com exclusão pendente (F-CONTA-2, RN-23.3). **Só em
  /// memória**, nunca no [store]: vale 15 minutos e só cancela a exclusão, então fechar o app e
  /// entrar de novo custa pouco, e não fica token restrito esquecido no Keystore. Não conta como
  /// sessão: [estaAutenticado] continua falso.
  AcessoDeRecuperacao? get recuperacao => _recuperacao;

  /// Guardado pelo login. Avisa os ouvintes, e a guarda de rota leva à recuperação.
  void guardarRecuperacao(AcessoDeRecuperacao acesso) {
    _recuperacao = acesso;
    notifyListeners();
  }

  /// Descartado ao sair, ao recuperar a conta e ao expirar (recuperar-conta.md §9). **Não avisa
  /// os ouvintes**: a tela de recuperação continua aberta para mostrar `Conta recuperada` ou o
  /// acesso expirado, e a guarda só a recusa na próxima navegação.
  void descartarRecuperacao() {
    _recuperacao = null;
  }

  String? get token => _token;

  String? get refreshToken => _refreshToken;

  bool get estaAutenticado => _token != null;

  bool get carregando => _carregando;

  Future<void> load() async {
    _aplicar(await store.read());
    _carregando = false;
    notifyListeners();
  }

  void _aplicar(String? gravado) {
    _token = null;
    _refreshToken = null;
    if (gravado == null || gravado.isEmpty) {
      return;
    }
    try {
      final json = jsonDecode(gravado);
      if (json is Map<String, dynamic> && json['token'] is String) {
        _token = json['token'] as String;
        _refreshToken = json['refreshToken'] as String?;
        return;
      }
    } on FormatException {
      // Não é JSON: é o token cru gravado antes de F-AUT.
    }
    _token = gravado;
  }

  /// Grava a sessão depois de um login. [refreshToken] é opcional só para os testes e o código
  /// de antes de F-AUT; todo login real traz os dois.
  Future<void> entrar(String accessToken, {String? refreshToken}) async {
    _token = accessToken;
    _refreshToken = refreshToken;
    notifyListeners();
    await store.write(
      jsonEncode(<String, String>{
        'token': accessToken,
        'refreshToken': ?refreshToken,
      }),
    );
  }

  /// Limpa a sessão local. A revogação no servidor é de [sairRevogando].
  Future<void> sair() async {
    _token = null;
    _refreshToken = null;
    notifyListeners();
    await store.delete();
  }

  /// Logout (RF-AUT-06): revoga a renovação no servidor e limpa a sessão local sempre, mesmo
  /// com o servidor fora. Sair não pode depender de rede; o custo é o token de renovação seguir
  /// válido no servidor até vencer, se a revogação não chegar.
  Future<void> sairRevogando(
    Future<void> Function(String refreshToken) revogar,
  ) async {
    // Uma renovação em curso gravaria a sessão de novo depois desta limpeza.
    await _renovacaoEmCurso;
    final refresh = _refreshToken;
    try {
      if (refresh != null) {
        await revogar(refresh);
      }
    } on Object {
      // Revogação é melhor esforço; ver acima.
    } finally {
      await sair();
    }
  }

  /// Renova se [tokenQueFalhou] ainda é o token da sessão, chamando [chamada] com o token de
  /// renovação. Devolve se vale repetir a requisição que recebeu `401`. Chamadas simultâneas
  /// compartilham a mesma renovação.
  Future<bool> renovar(
    String tokenQueFalhou,
    Future<TokensDaSessao> Function(String refreshToken) chamada,
  ) {
    return _renovacaoEmCurso ??= _executarRenovacao(
      tokenQueFalhou,
      chamada,
    ).whenComplete(() => _renovacaoEmCurso = null);
  }

  Future<bool> _executarRenovacao(
    String tokenQueFalhou,
    Future<TokensDaSessao> Function(String refreshToken) chamada,
  ) async {
    if (_token != tokenQueFalhou && _token != null) {
      // Outra chamada já renovou enquanto esta esperava a resposta do 401.
      return true;
    }
    final refresh = _refreshToken;
    if (refresh == null) {
      await sair();
      return false;
    }
    try {
      final novos = await chamada(refresh);
      await entrar(novos.accessToken, refreshToken: novos.refreshToken);
      return true;
    } on ApiException catch (erro) {
      // 401 é token vencido, revogado ou reusado: a sessão acabou. Rede fora ou 5xx não é
      // motivo para deslogar; a chamada original devolve o erro dela.
      if (erro.status == 401) {
        await sair();
      }
      return false;
    }
  }
}
