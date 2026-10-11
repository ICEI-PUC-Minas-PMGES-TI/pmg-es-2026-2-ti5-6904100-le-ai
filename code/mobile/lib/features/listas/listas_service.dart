import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../perfil/perfil_service.dart';

/// Listas de livros do `social` (F-LST, `docs/api/social.yaml`, tag `listas`), espelho do
/// `services/listas.ts` da web. Toda escrita leva `Idempotency-Key`; quem chama guarda a chave da
/// intenção e a repete no reenvio da mesma mudança (mover, adicionar), como pede o `ApiClient`.

/// Limites decididos em 30/09/2026 e conferidos pelo servidor (CHECK de `V20261005100000`).
const int limiteDoTitulo = 80;
const int limiteDaDescricao = 300;

/// Itens por segmento: o teto do servidor (RNF-DES-02).
const int limiteDeItens = 50;

class DonoDaLista {
  final String id;
  final String username;
  final String nomeExibicao;
  final String? avatarUrl;

  const DonoDaLista({
    required this.id,
    required this.username,
    required this.nomeExibicao,
    required this.avatarUrl,
  });

  factory DonoDaLista.fromJson(Map<String, dynamic> json) => DonoDaLista(
    id: json['id'] as String,
    username: json['username'] as String,
    nomeExibicao: json['nomeExibicao'] as String,
    avatarUrl: json['avatarUrl'] as String?,
  );
}

class Lista {
  final String id;
  final DonoDaLista dono;
  final String titulo;
  final String? descricao;
  final int quantidadeLivros;

  /// Decide o modo da tela (dono ou outro leitor). Quem decide é o servidor.
  final bool pertenceAoSolicitante;
  final DateTime atualizadaEm;

  const Lista({
    required this.id,
    required this.dono,
    required this.titulo,
    required this.descricao,
    required this.quantidadeLivros,
    required this.pertenceAoSolicitante,
    required this.atualizadaEm,
  });

  factory Lista.fromJson(Map<String, dynamic> json) => Lista(
    id: json['id'] as String,
    dono: DonoDaLista.fromJson(json['dono'] as Map<String, dynamic>),
    titulo: json['titulo'] as String,
    descricao: json['descricao'] as String?,
    quantidadeLivros: (json['quantidadeLivros'] as num?)?.toInt() ?? 0,
    pertenceAoSolicitante: json['pertenceAoSolicitante'] as bool? ?? false,
    atualizadaEm: DateTime.parse(json['atualizadaEm'] as String),
  );

  Lista copiar({int? quantidadeLivros, DateTime? atualizadaEm}) => Lista(
    id: id,
    dono: dono,
    titulo: titulo,
    descricao: descricao,
    quantidadeLivros: quantidadeLivros ?? this.quantidadeLivros,
    pertenceAoSolicitante: pertenceAoSolicitante,
    atualizadaEm: atualizadaEm ?? this.atualizadaEm,
  );
}

class CapaDaLista {
  final String livroId;
  final bool pessoal;
  final String titulo;
  final String? capaUrl;

  const CapaDaLista({
    required this.livroId,
    required this.pessoal,
    required this.titulo,
    required this.capaUrl,
  });

  factory CapaDaLista.fromJson(Map<String, dynamic> json) => CapaDaLista(
    livroId: json['livroId'] as String,
    pessoal: json['tipo'] == 'PESSOAL',
    titulo: json['titulo'] as String? ?? '',
    capaUrl: json['capaUrl'] as String?,
  );
}

/// Item do índice e do sheet `Adicionar à lista`.
class ListaResumo {
  final String id;
  final String titulo;
  final String? descricao;
  final int quantidadeLivros;
  final List<CapaDaLista> capas;
  final DateTime atualizadaEm;

  /// Só em `listarMinhas` com `livroId`.
  final bool contemLivro;

  const ListaResumo({
    required this.id,
    required this.titulo,
    required this.descricao,
    required this.quantidadeLivros,
    required this.capas,
    required this.atualizadaEm,
    this.contemLivro = false,
  });

  factory ListaResumo.fromJson(Map<String, dynamic> json) => ListaResumo(
    id: json['id'] as String,
    titulo: json['titulo'] as String,
    descricao: json['descricao'] as String?,
    quantidadeLivros: (json['quantidadeLivros'] as num?)?.toInt() ?? 0,
    capas: (json['capas'] as List<dynamic>? ?? const <dynamic>[])
        .map((bruto) => CapaDaLista.fromJson(bruto as Map<String, dynamic>))
        .toList(),
    atualizadaEm: DateTime.parse(json['atualizadaEm'] as String),
    contemLivro: json['contemLivro'] as bool? ?? false,
  );
}

class LivroDaLista {
  final String id;
  final bool pessoal;
  final String titulo;
  final String? autor;
  final String? capaUrl;

  const LivroDaLista({
    required this.id,
    required this.pessoal,
    required this.titulo,
    required this.autor,
    required this.capaUrl,
  });

  factory LivroDaLista.fromJson(Map<String, dynamic> json) => LivroDaLista(
    id: json['id'] as String,
    pessoal: json['tipo'] == 'PESSOAL',
    titulo: json['titulo'] as String,
    autor: json['autor'] as String?,
    capaUrl: json['capaUrl'] as String?,
  );
}

class ItemDeLista {
  final String id;
  final LivroDaLista livro;

  /// Posição visível, contínua a partir de 1 (livro inativo não conta).
  final int posicao;

  const ItemDeLista({required this.id, required this.livro, required this.posicao});

  factory ItemDeLista.fromJson(Map<String, dynamic> json) => ItemDeLista(
    id: json['id'] as String,
    livro: LivroDaLista.fromJson(json['livro'] as Map<String, dynamic>),
    posicao: (json['posicao'] as num).toInt(),
  );

  ItemDeLista naPosicao(int posicao) =>
      posicao == this.posicao ? this : ItemDeLista(id: id, livro: livro, posicao: posicao);
}

class ItensDaLista {
  final List<ItemDeLista> itens;
  final String? proximoCursor;
  final bool temMais;

  const ItensDaLista({required this.itens, required this.proximoCursor, required this.temMais});
}

class ListasService {
  final ApiClient _api;

  ListasService(this._api);

  /// Incrementado depois de toda escrita que deu certo, no molde de `EstanteService.alteracoes`:
  /// a seção do perfil, o índice e a lista aberta por baixo recarregam quando um livro entra
  /// pela página do livro.
  final ValueNotifier<int> alteracoes = ValueNotifier<int>(0);

  static String _id(String id) => Uri.encodeComponent(id);

  static Pagina<ListaResumo> _pagina(Map<String, dynamic> json) => Pagina<ListaResumo>(
    itens: (json['itens'] as List<dynamic>? ?? const <dynamic>[])
        .map((bruto) => ListaResumo.fromJson(bruto as Map<String, dynamic>))
        .toList(),
    pagina: (json['pagina'] as num?)?.toInt() ?? 0,
    totalElementos: (json['totalItens'] as num?)?.toInt() ?? 0,
    totalPaginas: (json['totalPaginas'] as num?)?.toInt() ?? 0,
  );

  void _avisar() => alteracoes.value++;

  /// Com [livroId], o livro entra na posição 1 na mesma transação (lista criada pela página do
  /// livro).
  Future<Lista> criar({
    required String titulo,
    String? descricao,
    String? livroId,
    required String idempotencyKey,
  }) async {
    final lista = Lista.fromJson(
      await _api.postJson(
        '/listas',
        body: <String, Object?>{'titulo': titulo, 'descricao': descricao, 'livroId': ?livroId},
        idempotencyKey: idempotencyKey,
      ),
    );
    _avisar();
    return lista;
  }

  Future<Lista> obter(String id) async => Lista.fromJson(await _api.getJson('/listas/${_id(id)}'));

  /// [corpo] só com o que mudou: campo omitido mantém, `descricao: null` apaga.
  Future<Lista> editar(
    String id,
    Map<String, Object?> corpo, {
    required String idempotencyKey,
  }) async {
    final lista = Lista.fromJson(
      await _api.patchJson('/listas/${_id(id)}', body: corpo, idempotencyKey: idempotencyKey),
    );
    _avisar();
    return lista;
  }

  Future<void> excluir(String id, {required String idempotencyKey}) async {
    await _api.deleteVazio('/listas/${_id(id)}', idempotencyKey: idempotencyKey);
    _avisar();
  }

  Future<ItensDaLista> listarItens(String id, {String? cursor, int limite = tamanhoDaPagina}) async {
    final parametros = <String, String>{'limit': '$limite', 'cursor': ?cursor};
    final json = await _api.getJson(
      Uri(path: '/listas/${_id(id)}/livros', queryParameters: parametros).toString(),
    );
    return ItensDaLista(
      itens: (json['itens'] as List<dynamic>? ?? const <dynamic>[])
          .map((bruto) => ItemDeLista.fromJson(bruto as Map<String, dynamic>))
          .toList(),
      proximoCursor: json['proximoCursor'] as String?,
      temMais: json['temMais'] as bool? ?? false,
    );
  }

  /// 201 quando entrou agora, 200 quando já estava: os dois devolvem o item.
  Future<ItemDeLista> adicionar(
    String id,
    String livroId, {
    required String idempotencyKey,
  }) async {
    final item = ItemDeLista.fromJson(
      await _api.postJson(
        '/listas/${_id(id)}/livros',
        body: <String, Object?>{'livroId': livroId},
        idempotencyKey: idempotencyKey,
      ),
    );
    _avisar();
    return item;
  }

  Future<void> remover(String id, String livroId, {required String idempotencyKey}) async {
    await _api.deleteVazio(
      '/listas/${_id(id)}/livros/${_id(livroId)}',
      idempotencyKey: idempotencyKey,
    );
    _avisar();
  }

  /// [posicao] é a visível, de 1 até a quantidade de livros.
  Future<ItemDeLista> mover(
    String id,
    String itemId,
    int posicao, {
    required String idempotencyKey,
  }) async {
    final item = ItemDeLista.fromJson(
      await _api.putJson(
        '/listas/${_id(id)}/livros/${_id(itemId)}/posicao',
        body: <String, Object?>{'posicao': posicao},
        idempotencyKey: idempotencyKey,
      ),
    );
    _avisar();
    return item;
  }

  Future<Pagina<ListaResumo>> listarDoPerfil(
    String usuarioId,
    int pagina, {
    int tamanho = tamanhoDaPagina,
  }) async => _pagina(
    await _api.getJson('/perfis/${_id(usuarioId)}/listas?page=$pagina&size=$tamanho'),
  );

  Future<Pagina<ListaResumo>> listarMinhas(
    int pagina, {
    String? livroId,
    int tamanho = tamanhoDaPagina,
  }) async {
    final parametros = <String, String>{
      'page': '$pagina',
      'size': '$tamanho',
      'livroId': ?livroId,
    };
    return _pagina(
      await _api.getJson(Uri(path: '/me/listas', queryParameters: parametros).toString()),
    );
  }
}
