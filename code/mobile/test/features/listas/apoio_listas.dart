import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/listas/listas_service.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';

export '../livros/apoio.dart' show envolver, erro, json, tocar, usarTelaDeCelular;

const String idDaLista = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

/// Serviço de listas sobre um `MockClient`, sem espera entre retentativas.
ListasService listasSimulado(Future<http.Response> Function(http.Request) handler) {
  return ListasService(
    ApiClient(
      baseUrl: 'https://social.example.com',
      client: MockClient(handler),
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    ),
  );
}

PerfilService perfilSimulado(Future<http.Response> Function(http.Request) handler) {
  return PerfilService(
    ApiClient(
      baseUrl: 'https://identidade.example.com',
      client: MockClient(handler),
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    ),
  );
}

Map<String, Object?> perfilJson({
  String id = 'u-rafael',
  String username = 'rafael',
  String nome = 'Rafael Okamoto',
  String privacidade = 'publico',
  bool restrito = false,
  String relacao = 'nenhuma',
}) => <String, Object?>{
  'id': id,
  'username': username,
  'displayName': nome,
  'avatarUrl': null,
  'privacidade': privacidade,
  'conteudoRestrito': restrito,
  'relacao': relacao,
  'biografia': null,
  'contadores': <String, Object?>{'seguidores': 3, 'seguidos': 4},
};

Map<String, Object?> listaJson({
  String id = idDaLista,
  String titulo = 'Contos que eu indico',
  String? descricao = 'Em ordem de por onde começar.',
  int quantidade = 3,
  bool dono = true,
  String nomeDoDono = 'Marina Beltrão',
}) => <String, Object?>{
  'id': id,
  'dono': <String, Object?>{
    'id': 'u-dono',
    'username': 'marina',
    'nomeExibicao': nomeDoDono,
    'avatarUrl': null,
  },
  'titulo': titulo,
  'descricao': descricao,
  'quantidadeLivros': quantidade,
  'pertenceAoSolicitante': dono,
  'criadaEm': '2026-09-01T12:00:00.000Z',
  'atualizadaEm': '2026-09-12T12:00:00.000Z',
};

Map<String, Object?> itemJson(int posicao, {String? titulo, bool pessoal = false}) {
  final livro = titulo ?? 'Livro $posicao';
  return <String, Object?>{
    'id': 'item-$posicao',
    'listaId': idDaLista,
    'livro': <String, Object?>{
      'id': 'livro-$posicao',
      'tipo': pessoal ? 'PESSOAL' : 'OFICIAL',
      'titulo': livro,
      'autor': 'Autora $posicao',
      'capaUrl': null,
      'link': <String, Object?>{
        'livroId': 'livro-$posicao',
        'via': pessoal ? 'lista' : 'catalogo',
        'referenciaId': pessoal ? idDaLista : null,
      },
    },
    'posicao': posicao,
    'adicionadoEm': '2026-09-12T12:00:00.000Z',
  };
}

Map<String, Object?> itensJson(
  List<Map<String, Object?>> itens, {
  String? proximoCursor,
  bool temMais = false,
}) => <String, Object?>{'itens': itens, 'proximoCursor': proximoCursor, 'temMais': temMais};

Map<String, Object?> resumoJson({
  String id = idDaLista,
  String titulo = 'Contos que eu indico',
  int quantidade = 3,
  bool contem = false,
}) => <String, Object?>{
  'id': id,
  'titulo': titulo,
  'descricao': null,
  'quantidadeLivros': quantidade,
  'capas': <Object?>[],
  'atualizadaEm': '2026-09-12T12:00:00.000Z',
  'contemLivro': contem,
};

Map<String, Object?> paginaJson(List<Map<String, Object?>> itens, {int totalPaginas = 1}) =>
    <String, Object?>{
      'itens': itens,
      'pagina': 0,
      'tamanho': 20,
      'totalItens': itens.length,
      'totalPaginas': itens.isEmpty ? 0 : totalPaginas,
      'ultima': true,
    };
