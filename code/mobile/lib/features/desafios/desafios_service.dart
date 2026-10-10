import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../estante/datas_de_leitura.dart';

/// Desafios de leitura do `leitura` (F-DSF, RF-DSF-01..04, `docs/api/leitura.yaml`, tag
/// `desafios`). Toda escrita leva `Idempotency-Key`; quem chama guarda a chave da intenção e a
/// repete no reenvio, como pede o `ApiClient`.

enum UnidadeDesafio {
  paginas('paginas'),
  minutos('minutos'),
  livros('livros');

  final String valor;

  const UnidadeDesafio(this.valor);

  static UnidadeDesafio deValor(Object? valor) => values.firstWhere(
    (unidade) => unidade.valor == valor,
    orElse: () => throw FormatException('Unidade de desafio desconhecida: $valor.'),
  );

  /// Teto do alvo por unidade, o mesmo do servidor (decisão do dono de 09/10/2026).
  int get tetoDoAlvo => this == livros ? 1000 : 100000;
}

/// Janelas de calendário no fuso do dispositivo (RN-20.1). A semana vai de segunda a domingo.
enum JanelaDesafio {
  diaria('diaria'),
  semanal('semanal'),
  mensal('mensal'),
  anual('anual');

  final String valor;

  const JanelaDesafio(this.valor);

  static JanelaDesafio deValor(Object? valor) => values.firstWhere(
    (janela) => janela.valor == valor,
    orElse: () => throw FormatException('Janela de desafio desconhecida: $valor.'),
  );
}

/// Acumulado da janela em curso. [inicio] e [fim] são datas de calendário, sem hora.
class JanelaCorrente {
  final DateTime inicio;
  final DateTime fim;
  final int acumulado;
  final bool cumprida;

  const JanelaCorrente({
    required this.inicio,
    required this.fim,
    required this.acumulado,
    required this.cumprida,
  });

  factory JanelaCorrente.fromJson(Map<String, dynamic> json) {
    final acumulado = json['acumulado'];
    final cumprida = json['cumprida'];
    if (acumulado is! num || cumprida is! bool) {
      throw const FormatException('Janela corrente sem acumulado.');
    }
    return JanelaCorrente(
      inicio: _data(json['inicio']),
      fim: _data(json['fim']),
      acumulado: acumulado.toInt(),
      cumprida: cumprida,
    );
  }

  /// `2026-09-01` como dia local, sem passar por UTC: o mês da janela não pode virar o anterior.
  static DateTime _data(Object? valor) {
    if (valor is! String) {
      throw const FormatException('Data da janela ausente.');
    }
    final dia = DateTime.parse(valor);
    return DateTime(dia.year, dia.month, dia.day);
  }
}

class Desafio {
  final String id;
  final UnidadeDesafio unidade;
  final JanelaDesafio janela;
  final int valorAlvo;
  final String fusoHorario;
  final bool pausado;
  final DateTime? pausadoDesde;
  final DateTime criadoEm;
  final JanelaCorrente janelaCorrente;

  const Desafio({
    required this.id,
    required this.unidade,
    required this.janela,
    required this.valorAlvo,
    required this.fusoHorario,
    required this.pausado,
    required this.pausadoDesde,
    required this.criadoEm,
    required this.janelaCorrente,
  });

  factory Desafio.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final valorAlvo = json['valorAlvo'];
    final janelaCorrente = json['janelaCorrente'];
    if (id is! String || valorAlvo is! num || janelaCorrente is! Map<String, dynamic>) {
      throw const FormatException('Desafio fora do contrato.');
    }
    final pausadoDesde = json['pausadoDesde'];
    return Desafio(
      id: id,
      unidade: UnidadeDesafio.deValor(json['unidade']),
      janela: JanelaDesafio.deValor(json['janela']),
      valorAlvo: valorAlvo.toInt(),
      fusoHorario: json['fusoHorario'] as String? ?? '',
      pausado: json['pausado'] == true,
      pausadoDesde: pausadoDesde is String ? DateTime.parse(pausadoDesde) : null,
      criadoEm: DateTime.parse(json['criadoEm'] as String),
      janelaCorrente: JanelaCorrente.fromJson(janelaCorrente),
    );
  }

  /// O que falta para cumprir, nunca negativo.
  int get faltam {
    final faltam = valorAlvo - janelaCorrente.acumulado;
    return faltam > 0 ? faltam : 0;
  }
}

class PaginaDesafios {
  final List<Desafio> itens;
  final int pagina;
  final int totalItens;
  final int totalPaginas;

  const PaginaDesafios({
    required this.itens,
    required this.pagina,
    required this.totalItens,
    required this.totalPaginas,
  });

  factory PaginaDesafios.fromJson(Map<String, dynamic> json) {
    final itens = json['itens'];
    final paginacao = json['paginacao'];
    if (itens is! List<dynamic> || paginacao is! Map<String, dynamic>) {
      throw const FormatException('Página de desafios fora do contrato.');
    }
    return PaginaDesafios(
      itens: itens.map((bruto) => Desafio.fromJson(bruto as Map<String, dynamic>)).toList(),
      pagina: (paginacao['page'] as num).toInt(),
      totalItens: (paginacao['totalItens'] as num).toInt(),
      totalPaginas: (paginacao['totalPaginas'] as num).toInt(),
    );
  }
}

class DesafiosService {
  final ApiClient _api;

  /// Fuso do dispositivo enviado na criação e em toda edição: define o dia de hoje e, com ele,
  /// a janela corrente (RN-20.1). Injetável para os testes.
  final String Function() _fuso;

  DesafiosService(this._api, {String Function()? fuso}) : _fuso = fuso ?? fusoHorarioDoDispositivo;

  /// Incrementado depois de toda escrita que deu certo: a tela e o bloco do perfil recarregam.
  final ValueNotifier<int> alteracoes = ValueNotifier<int>(0);

  static String _id(String id) => Uri.encodeComponent(id);

  void _avisar() => alteracoes.value++;

  /// Resposta fora do contrato vira a mesma falha das demais (`invalidResponse`).
  static T _ler<T>(T Function() ler) {
    try {
      return ler();
    } on FormatException {
      throw _respostaInvalida;
    } on TypeError {
      throw _respostaInvalida;
    }
  }

  static const ApiException _respostaInvalida = ApiException(
    kind: ApiFailureKind.invalidResponse,
    correlationId: '',
    message: 'O serviço retornou uma resposta inválida.',
  );

  /// [pagina] começa em 1, como no contrato. Ativos antes dos pausados, por janela e do mais
  /// novo para o mais antigo: a ordem é do servidor.
  Future<PaginaDesafios> listar({int pagina = 1, int limite = 20}) async {
    final json = await _api.getJson('/desafios?page=$pagina&limite=$limite');
    return _ler(() => PaginaDesafios.fromJson(json));
  }

  Future<Desafio> criar({
    required UnidadeDesafio unidade,
    required JanelaDesafio janela,
    required int valorAlvo,
    required String idempotencyKey,
  }) async {
    final json = await _api.postJson(
      '/desafios',
      body: <String, Object?>{
        'unidade': unidade.valor,
        'janela': janela.valor,
        'valorAlvo': valorAlvo,
        'fusoHorario': _fuso(),
      },
      idempotencyKey: idempotencyKey,
    );
    final desafio = _ler(() => Desafio.fromJson(json));
    _avisar();
    return desafio;
  }

  /// [corpo] só com o que mudou (`unidade`, `janela`, `valorAlvo`); o fuso vai sempre.
  Future<Desafio> editar(
    String id,
    Map<String, Object?> corpo, {
    required String idempotencyKey,
  }) async {
    final json = await _api.patchJson(
      '/desafios/${_id(id)}',
      body: <String, Object?>{...corpo, 'fusoHorario': _fuso()},
      idempotencyKey: idempotencyKey,
    );
    final desafio = _ler(() => Desafio.fromJson(json));
    _avisar();
    return desafio;
  }

  Future<Desafio> pausar(String id, {required String idempotencyKey}) =>
      _acao(id, 'pausar', idempotencyKey);

  Future<Desafio> retomar(String id, {required String idempotencyKey}) =>
      _acao(id, 'retomar', idempotencyKey);

  Future<Desafio> _acao(String id, String acao, String idempotencyKey) async {
    final json = await _api.postJson('/desafios/${_id(id)}/$acao', idempotencyKey: idempotencyKey);
    final desafio = _ler(() => Desafio.fromJson(json));
    _avisar();
    return desafio;
  }

  Future<void> excluir(String id, {required String idempotencyKey}) async {
    await _api.deleteVazio('/desafios/${_id(id)}', idempotencyKey: idempotencyKey);
    _avisar();
  }
}
