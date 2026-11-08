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
  final Future<void> Function()? revogarDispositivo;
  String? _token;
  String? _refreshToken;
  bool _carregando = true;
  Future<bool>? _renovacaoEmCurso;
  AcessoDeRecuperacao? _recuperacao;
  bool _saindoPorExpiracao = false;
  bool _saindoPorSuspensao = false;
  bool _leituraDescartadaNaSaida = false;
  String? _avisoDeSaida;

  SessionController(this.store, {this.revogarDispositivo});

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
    await _revogarDispositivoDePush();
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

  /// RF-NOT-07: antes do refresh e da limpeza, porque a revogação do dispositivo usa o token da
  /// sessão, e uma renovação feita por ela troca o refresh que [sairRevogando] vai ler.
  Future<void> _revogarDispositivoDePush() async {
    try {
      await revogarDispositivo?.call();
    } on Object {
      return;
    }
  }

  /// Verdadeiro só durante a saída forçada pela renovação recusada: quem ouve a saída sabe que a
  /// pessoa não pediu para sair.
  bool get saindoPorExpiracao => _saindoPorExpiracao;

  /// F-MOD-OPC: primeira linha do banner de sessão encerrada por suspensão (login.md P3 §8). A
  /// tela de entrada reconhece este aviso e mostra o banner de conta suspensa no lugar do comum.
  static const String avisoDeContaSuspensa =
      'Sua sessão foi encerrada porque esta conta foi suspensa.';

  /// Código do 403 do `identidade` para conta suspensa.
  static const String codigoContaSuspensa = 'CONTA_SUSPENSA';

  /// Mensagem que a tela de entrada mostra para explicar uma saída que a pessoa não pediu.
  void avisarSaida(String mensagem) => _avisoDeSaida = mensagem;

  /// Devolve o aviso pendente e o apaga: a tela de entrada mostra cada aviso uma vez.
  String? consumirAvisoDeSaida() {
    final aviso = _avisoDeSaida;
    _avisoDeSaida = null;
    return aviso;
  }

  /// F-MOD-OPC: o aviso é gravado **antes** de [sair], porque o `notifyListeners` de [sair] pode
  /// levar ao login antes de o aviso existir. Não liga [saindoPorExpiracao]: o ouvinte da sessão
  /// de leitura (`features/sessao/sessao_controller.dart`) só troca o aviso nesse caso, então o de
  /// suspensão fica. A sessão de leitura em curso é descartada, e o ouvinte dela marca
  /// [avisarLeituraDescartada] para o banner do login avisar o descarte.
  Future<void> _sairPorSuspensao() async {
    avisarSaida(avisoDeContaSuspensa);
    _saindoPorSuspensao = true;
    try {
      await sair();
    } finally {
      _saindoPorSuspensao = false;
    }
  }

  /// F-MOD-OPC: saída pela suspensão pedida de fora da renovação, quando uma chamada autenticada
  /// recebe o 403 [codigoContaSuspensa] dentro dos 15 minutos do token de acesso (por exemplo, o
  /// pedido de exclusão de conta). Sem sessão, não faz nada: não sai duas vezes nem troca o aviso.
  Future<void> encerrarPorSuspensao() async {
    await _renovacaoEmCurso;
    if (_token == null) {
      return;
    }
    await _sairPorSuspensao();
  }

  /// Verdadeiro só durante a saída pela suspensão: o ouvinte da sessão de leitura usa para avisar
  /// que a leitura em andamento foi descartada, sem trocar o aviso de suspensão.
  bool get saindoPorSuspensao => _saindoPorSuspensao;

  /// A sessão de leitura em andamento foi descartada na saída por suspensão (F-MOD-OPC).
  void avisarLeituraDescartada() => _leituraDescartadaNaSaida = true;

  /// Devolve e apaga a marca: a tela de entrada a mostra uma vez, junto do banner.
  bool consumirLeituraDescartada() {
    final descartada = _leituraDescartadaNaSaida;
    _leituraDescartadaNaSaida = false;
    return descartada;
  }

  Future<void> _sairPorExpiracao() async {
    _saindoPorExpiracao = true;
    try {
      await sair();
    } finally {
      _saindoPorExpiracao = false;
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
    if (_token == null) {
      // A sessão já acabou (por exemplo, pela suspensão): não sai de novo nem troca o aviso.
      return false;
    }
    if (_token != tokenQueFalhou) {
      // Outra chamada já renovou enquanto esta esperava a resposta do 401.
      return true;
    }
    final refresh = _refreshToken;
    if (refresh == null) {
      await _sairPorExpiracao();
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
        await _sairPorExpiracao();
      } else if (erro.codigo == codigoContaSuspensa) {
        // F-MOD-OPC: a moderação suspendeu a conta. Sai uma vez, com o aviso; sem sessão, a
        // próxima chamada não renova de novo.
        await _sairPorSuspensao();
      }
      return false;
    }
  }
}
