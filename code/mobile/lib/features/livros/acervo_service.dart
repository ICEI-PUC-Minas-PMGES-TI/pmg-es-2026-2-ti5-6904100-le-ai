import '../../core/network/api_client.dart';

/// Contrato do serviço `acervo` usado por F-ACV-CADASTRO. Espelha `docs/api/acervo.yaml`:
/// mesmos campos, mesmas rotas, mesmos estados.

enum EstadoImportacao { pendente, concluida, naoEncontrado, falhaTransitoria }

EstadoImportacao _estadoDe(String bruto) {
  switch (bruto) {
    case 'concluida':
      return EstadoImportacao.concluida;
    case 'nao_encontrado':
      return EstadoImportacao.naoEncontrado;
    case 'falha_transitoria':
      return EstadoImportacao.falhaTransitoria;
    default:
      return EstadoImportacao.pendente;
  }
}

/// Resumo da edição para o card de confirmação (cadastro-por-isbn.md §4.4 e §4.5): vem na
/// importação concluída e no `409` de ISBN já cadastrado.
class LivroImportadoResumo {
  final String id;
  final String titulo;
  final String? autores;
  final String? editora;
  final int? anoPublicacao;
  final int paginas;
  final String? capaUrl;

  const LivroImportadoResumo({
    required this.id,
    required this.titulo,
    required this.autores,
    required this.editora,
    required this.anoPublicacao,
    required this.paginas,
    required this.capaUrl,
  });

  static LivroImportadoResumo? deJson(Object? bruto) {
    if (bruto is! Map<String, dynamic>) {
      return null;
    }
    return LivroImportadoResumo(
      id: bruto['id'] as String,
      titulo: bruto['titulo'] as String,
      autores: bruto['autores'] as String?,
      editora: bruto['editora'] as String?,
      anoPublicacao: bruto['anoPublicacao'] as int?,
      paginas: bruto['paginas'] as int,
      capaUrl: bruto['capaUrl'] as String?,
    );
  }
}

class Importacao {
  final String importacaoId;
  final String isbn;
  final EstadoImportacao estado;
  final String? livroId;

  /// Só em `concluida`.
  final LivroImportadoResumo? livro;
  final bool permiteCadastroPessoal;

  const Importacao({
    required this.importacaoId,
    required this.isbn,
    required this.estado,
    required this.livroId,
    this.livro,
    required this.permiteCadastroPessoal,
  });

  factory Importacao.fromJson(Map<String, dynamic> json) {
    return Importacao(
      importacaoId: json['importacaoId'] as String,
      isbn: json['isbn'] as String,
      estado: _estadoDe(json['status'] as String),
      livroId: json['livroId'] as String?,
      livro: LivroImportadoResumo.deJson(json['livro']),
      permiteCadastroPessoal: json['permiteCadastroPessoal'] as bool? ?? false,
    );
  }
}

/// Desfecho de `POST /livros/oficial`: a solicitação foi aceita (`202`) ou o ISBN já existe na
/// base oficial (`409` com `livroId`, RF-ACV-07). Os dois são caminhos de sucesso para a tela.
sealed class ResultadoDaSolicitacao {
  const ResultadoDaSolicitacao();
}

class SolicitacaoAceita extends ResultadoDaSolicitacao {
  final String importacaoId;
  const SolicitacaoAceita(this.importacaoId);
}

class LivroJaCadastrado extends ResultadoDaSolicitacao {
  final String livroId;
  final LivroImportadoResumo? livro;
  const LivroJaCadastrado(this.livroId, [this.livro]);
}

class ResenhaDoDono {
  final String autorNome;
  final String? autorAvatarUrl;
  final String texto;
  final bool spoiler;
  final DateTime atualizadoEm;

  const ResenhaDoDono({
    required this.autorNome,
    required this.autorAvatarUrl,
    required this.texto,
    required this.spoiler,
    required this.atualizadoEm,
  });

  factory ResenhaDoDono.fromJson(Map<String, dynamic> json) {
    return ResenhaDoDono(
      autorNome: json['autorNome'] as String,
      autorAvatarUrl: json['autorAvatarUrl'] as String?,
      texto: json['texto'] as String,
      spoiler: json['spoiler'] as bool? ?? false,
      atualizadoEm: DateTime.parse(json['atualizadoEm'] as String),
    );
  }
}

class LivroPessoal {
  final String id;
  final String donoId;
  final String titulo;
  final String autor;
  final int paginas;
  final String? sinopse;
  final String? capaUrl;

  /// `true` para terceiro autorizado por RN-15, `false` para o dono. Decidido pelo servidor: o
  /// cliente só escolhe o que desenhar, nunca o que é permitido.
  final bool modoConsulta;
  final double? notaDoDono;
  final ResenhaDoDono? resenhaDoDono;

  const LivroPessoal({
    required this.id,
    required this.donoId,
    required this.titulo,
    required this.autor,
    required this.paginas,
    required this.sinopse,
    required this.capaUrl,
    required this.modoConsulta,
    required this.notaDoDono,
    required this.resenhaDoDono,
  });

  factory LivroPessoal.fromJson(Map<String, dynamic> json) {
    final nota = json['notaDoDono'] as Map<String, dynamic>?;
    final resenha = json['resenhaDoDono'] as Map<String, dynamic>?;
    return LivroPessoal(
      id: json['id'] as String,
      donoId: json['donoId'] as String,
      titulo: json['titulo'] as String,
      autor: json['autor'] as String,
      paginas: json['paginas'] as int,
      sinopse: json['sinopse'] as String?,
      capaUrl: json['capaUrl'] as String?,
      modoConsulta: json['modoConsulta'] as bool? ?? false,
      notaDoDono: (nota?['valor'] as num?)?.toDouble(),
      resenhaDoDono: resenha == null ? null : ResenhaDoDono.fromJson(resenha),
    );
  }
}

/// Campos do formulário de livro pessoal. Sem ISBN: em livro pessoal o campo é ausente, não
/// vazio (RN-02).
class DadosLivroPessoal {
  final String titulo;
  final String autor;
  final int paginas;
  final String? sinopse;
  final String? capaUrl;

  const DadosLivroPessoal({
    required this.titulo,
    required this.autor,
    required this.paginas,
    this.sinopse,
    this.capaUrl,
  });

  /// Na criação, opcional ausente não vai no corpo. Na edição, `null` explícito limpa o campo
  /// no servidor (`capaUrl: null` remove a capa), então tudo vai.
  Map<String, Object?> paraJson({required bool edicao}) {
    return <String, Object?>{
      'titulo': titulo,
      'autor': autor,
      'paginas': paginas,
      if (edicao || sinopse != null) 'sinopse': sinopse,
      if (edicao || capaUrl != null) 'capaUrl': capaUrl,
    };
  }
}

class AcervoService {
  final ApiClient client;

  const AcervoService(this.client);

  /// `POST /livros/oficial`. O `409` de ISBN já cadastrado vira resultado, não exceção.
  Future<ResultadoDaSolicitacao> solicitarImportacao({
    required String isbn,
    required String idempotencyKey,
  }) async {
    try {
      final json = await client.postJson(
        '/livros/oficial',
        body: <String, String>{'isbn': isbn},
        idempotencyKey: idempotencyKey,
      );
      return SolicitacaoAceita(json['importacaoId'] as String);
    } on ApiException catch (erro) {
      final livroId = erro.livroId;
      if (erro.status == 409 && livroId != null) {
        return LivroJaCadastrado(livroId, LivroImportadoResumo.deJson(erro.corpo?['livro']));
      }
      rethrow;
    }
  }

  Future<Importacao> obterImportacao(String importacaoId) async {
    final json = await client.getJson('/livros/importacoes/$importacaoId');
    return Importacao.fromJson(json);
  }

  Future<void> reprocessarImportacao({
    required String importacaoId,
    required String idempotencyKey,
  }) async {
    await client.postJson(
      '/livros/importacoes/$importacaoId/reprocessar',
      idempotencyKey: idempotencyKey,
    );
  }

  Future<LivroPessoal> criarLivroPessoal(
    DadosLivroPessoal dados, {
    required String idempotencyKey,
  }) async {
    final json = await client.postJson(
      '/livros/pessoal',
      body: dados.paraJson(edicao: false),
      idempotencyKey: idempotencyKey,
    );
    return LivroPessoal.fromJson(json);
  }

  /// O dono abre sem `via`. Terceiro só com `via=feed&referenciaId=<atividadeId>` (RN-15).
  Future<LivroPessoal> obterLivroPessoal(
    String id, {
    String? via,
    String? referenciaId,
  }) async {
    final consulta = <String, String>{
      'via': ?via,
      'referenciaId': ?referenciaId,
    };
    final caminho = Uri(
      path: '/livros/pessoal/$id',
      queryParameters: consulta.isEmpty ? null : consulta,
    ).toString();
    final json = await client.getJson(caminho);
    return LivroPessoal.fromJson(json);
  }

  Future<LivroPessoal> atualizarLivroPessoal(
    String id,
    DadosLivroPessoal dados, {
    required String idempotencyKey,
  }) async {
    final json = await client.patchJson(
      '/livros/pessoal/$id',
      body: dados.paraJson(edicao: true),
      idempotencyKey: idempotencyKey,
    );
    return LivroPessoal.fromJson(json);
  }

  Future<void> excluirLivroPessoal(
    String id, {
    required String idempotencyKey,
  }) {
    return client.deleteVazio(
      '/livros/pessoal/$id',
      idempotencyKey: idempotencyKey,
    );
  }
}
