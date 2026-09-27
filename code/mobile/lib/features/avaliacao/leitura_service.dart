import '../../core/network/api_client.dart';

/// Contrato do serviço `leitura` usado por F-AVA. Espelha `docs/api/leitura.yaml`: mesmos
/// campos, mesmas rotas. O parse é defensivo: JSON inesperado vira [FormatException], nunca um
/// `TypeError` solto na tela.

/// `Nota` do contrato: de 0 a 5 em passos de 0,5 (RN-06).
class Nota {
  final String livroId;
  final double valor;
  final DateTime criadoEm;
  final DateTime atualizadoEm;

  const Nota({
    required this.livroId,
    required this.valor,
    required this.criadoEm,
    required this.atualizadoEm,
  });

  factory Nota.fromJson(Map<String, dynamic> json) {
    return Nota(
      livroId: _texto(json, 'livroId'),
      valor: _numero(json, 'valor'),
      criadoEm: _data(json, 'criadoEm'),
      atualizadoEm: _data(json, 'atualizadoEm'),
    );
  }
}

/// `Resenha` do contrato: texto cru, até 5.000 caracteres (RN-07).
class Resenha {
  final String id;
  final String usuarioId;
  final String livroId;
  final String texto;
  final bool spoiler;
  final DateTime criadoEm;
  final DateTime atualizadoEm;

  const Resenha({
    required this.id,
    required this.usuarioId,
    required this.livroId,
    required this.texto,
    required this.spoiler,
    required this.criadoEm,
    required this.atualizadoEm,
  });

  factory Resenha.fromJson(Map<String, dynamic> json) {
    final spoiler = json['spoiler'];
    if (spoiler is! bool) {
      throw const FormatException('Resenha sem o campo spoiler.');
    }
    return Resenha(
      id: _texto(json, 'id'),
      usuarioId: _texto(json, 'usuarioId'),
      livroId: _texto(json, 'livroId'),
      texto: _texto(json, 'texto'),
      spoiler: spoiler,
      criadoEm: _data(json, 'criadoEm'),
      atualizadoEm: _data(json, 'atualizadoEm'),
    );
  }
}

/// `MinhaAvaliacao` do contrato. Ausente é `null`, nunca valor inventado: nota `0` é uma nota.
class MinhaAvaliacao {
  final String livroId;
  final Nota? nota;
  final Resenha? resenha;

  const MinhaAvaliacao({required this.livroId, this.nota, this.resenha});

  factory MinhaAvaliacao.fromJson(Map<String, dynamic> json) {
    final nota = json['nota'];
    final resenha = json['resenha'];
    return MinhaAvaliacao(
      livroId: _texto(json, 'livroId'),
      nota: nota is Map<String, dynamic> ? Nota.fromJson(nota) : null,
      resenha: resenha is Map<String, dynamic> ? Resenha.fromJson(resenha) : null,
    );
  }

  MinhaAvaliacao comNota(Nota? novaNota) =>
      MinhaAvaliacao(livroId: livroId, nota: novaNota, resenha: resenha);
}

class LeituraService {
  final ApiClient _api;

  LeituraService(this._api);

  Future<MinhaAvaliacao> obterMinhaAvaliacao(String livroId) async {
    final json = await _api.getJson('/livros/$livroId/minha-avaliacao');
    return MinhaAvaliacao.fromJson(json);
  }

  /// Cria ou atualiza a nota. A mesma [idempotencyKey] em cada reenvio da mesma intenção não
  /// cria uma segunda nota (RNF-ERR-04).
  Future<Nota> salvarNota(String livroId, double valor, {required String idempotencyKey}) async {
    final json = await _api.putJson(
      '/livros/$livroId/nota',
      body: <String, Object?>{'valor': valor},
      idempotencyKey: idempotencyKey,
    );
    return Nota.fromJson(json);
  }

  Future<void> excluirNota(String livroId, {required String idempotencyKey}) {
    return _api.deleteVazio('/livros/$livroId/nota', idempotencyKey: idempotencyKey);
  }
}

String _texto(Map<String, dynamic> json, String campo) {
  final valor = json[campo];
  if (valor is! String) {
    throw FormatException('Campo $campo ausente ou inválido.');
  }
  return valor;
}

double _numero(Map<String, dynamic> json, String campo) {
  final valor = json[campo];
  if (valor is! num) {
    throw FormatException('Campo $campo ausente ou inválido.');
  }
  return valor.toDouble();
}

DateTime _data(Map<String, dynamic> json, String campo) {
  final data = DateTime.tryParse(_texto(json, campo));
  if (data == null) {
    throw FormatException('Campo $campo não é uma data.');
  }
  return data;
}
