import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/feed/social_service.dart';

export '../livros/apoio.dart' show envolver, erro, json, tocar;

/// Serviço do `social` sobre um `MockClient`, sem espera entre retentativas.
SocialService socialSimulado(Future<http.Response> Function(http.Request) handler) {
  return SocialService(
    ApiClient(
      baseUrl: 'https://social.example.com',
      client: MockClient(handler),
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    ),
  );
}

Map<String, Object?> autorJson({
  String id = 'u1',
  String username = 'dandara',
  String nome = 'Dandara Lopes',
}) => <String, Object?>{'id': id, 'username': username, 'nomeExibicao': nome, 'avatarUrl': null};

Map<String, Object?> atividadeJson({
  String id = 'a1',
  String tipo = 'LEITURA_INICIADA',
  String tipoLivro = 'OFICIAL',
  num? nota,
  int curtidas = 4,
  int comentarios = 2,
  bool curtida = false,
  String nome = 'Dandara Lopes',
}) => <String, Object?>{
  'id': id,
  'tipo': tipo,
  'autor': autorJson(nome: nome),
  'livro': <String, Object?>{
    'id': 'l1',
    'tipo': tipoLivro,
    'titulo': 'Torto Arado',
    'autor': 'Itamar Vieira Junior',
    'capaUrl': null,
    'link': <String, Object?>{
      'livroId': 'l1',
      'via': tipoLivro == 'PESSOAL' ? 'feed' : 'catalogo',
      'referenciaId': tipoLivro == 'PESSOAL' ? id : null,
    },
  },
  'resenha': tipo == 'RESENHA_PUBLICADA'
      ? <String, Object?>{'id': 'r1', 'texto': 'Um livro grandioso.', 'spoiler': false, 'nota': nota}
      : null,
  'criadoEm': DateTime.now().subtract(const Duration(hours: 2)).toUtc().toIso8601String(),
  'totalCurtidas': curtidas,
  'totalComentarios': comentarios,
  'curtidaPeloSolicitante': curtida,
};

Map<String, Object?> comentarioJson({
  String id = 'c1',
  String nivel = 'RAIZ',
  String? raiz,
  int totalRespostas = 0,
  String texto = 'Que leitura.',
  String username = 'nadia',
  String nome = 'Nadia Sampaio',
  bool meu = false,
  bool editado = false,
  List<Map<String, Object?>> mencoes = const <Map<String, Object?>>[],
}) => <String, Object?>{
  'id': id,
  'atividadeId': 'a1',
  'comentarioRaizId': raiz,
  'comentarioRespondidoId': null,
  'usuarioRespondido': null,
  'autor': autorJson(id: 'u-$username', username: username, nome: nome),
  'texto': texto,
  'mencoes': mencoes,
  'nivel': nivel,
  'totalRespostas': totalRespostas,
  'pertenceAoSolicitante': meu,
  'editado': editado,
  'criadoEm': DateTime.now().subtract(const Duration(minutes: 5)).toUtc().toIso8601String(),
  'atualizadoEm': null,
};
