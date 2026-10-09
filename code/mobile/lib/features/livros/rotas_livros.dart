import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../avaliacao/frases_do_livro_page.dart';
import '../avaliacao/leitura_service.dart';
import '../catalogo/catalogo_controller.dart';
import '../catalogo/pagina_de_catalogo_page.dart';
import '../estante/estante_service.dart';
import '../listas/rotas_listas.dart';
import 'acervo_service.dart';
import 'cadastro_isbn_page.dart';
import 'capa.dart';
import 'isbn_nao_encontrado_page.dart';
import 'livro_oficial_page.dart';
import 'livro_pessoal_form_page.dart';
import 'livro_pessoal_page.dart';
import '../progresso/rotas_progresso.dart';

const String rotaAdicionarLivro = '/descobrir/adicionar-livro';
const String rotaEstanteRaiz = '/estante';
const String rotaFeedRaiz = '/feed';

String rotaLivroPessoalNaEstante(String id) => '/estante/livro-pessoal/$id';
String rotaLivroOficial(String id) => '/descobrir/livro/$id';

/// Páginas de autor, editora e série (F-ACV-DESCOBERTA) sob a raiz da aba de origem.
String rotaDoAutor(String raiz, String id) => '$raiz/autor/$id';
String rotaDaEditora(String raiz, String id) => '$raiz/editora/$id';
String rotaDaSerie(String raiz, String id) => '$raiz/serie/$id';

/// O que as telas de livro precisam do mundo lá fora. Construído uma vez em `main.dart` e
/// injetado no roteador; os testes montam o seu com clientes simulados.
class DependenciasDeLivros {
  final AcervoService acervo;

  /// Nota e resenha do leitor (F-AVA), no serviço `leitura`.
  final LeituraService leitura;
  final SeletorDeImagem seletor;
  final EnviadorDeCapa enviador;

  /// `Adicionar à lista` nas páginas de livro (F-LST). O roteador injeta o mesmo das telas de
  /// lista por [comListas], para o aviso de `alteracoes` chegar a elas.
  final DependenciasDeListas? listas;

  const DependenciasDeLivros({
    required this.acervo,
    required this.leitura,
    required this.seletor,
    required this.enviador,
    this.listas,
  });

  /// As mesmas dependências com as de listas, se ainda não houver.
  DependenciasDeLivros comListas(DependenciasDeListas? listas) => listas == null || this.listas != null
      ? this
      : DependenciasDeLivros(
          acervo: acervo,
          leitura: leitura,
          seletor: seletor,
          enviador: enviador,
          listas: listas,
        );

  factory DependenciasDeLivros.padrao({
    required String? Function() getToken,
    Future<bool> Function(String tokenQueFalhou)? renovarSessao,
  }) {
    return DependenciasDeLivros(
      acervo: AcervoService(
        ApiClient(
          baseUrl: AppConfig.acervoBaseUrl,
          getToken: getToken,
          renovarSessao: renovarSessao,
        ),
      ),
      leitura: LeituraService(
        ApiClient(
          baseUrl: AppConfig.leituraBaseUrl,
          getToken: getToken,
          renovarSessao: renovarSessao,
        ),
      ),
      seletor: SeletorDaGaleria(),
      enviador: EnviadorCloudinary(
        cloudName: AppConfig.cloudinaryCloudName,
        uploadPreset: AppConfig.cloudinaryUploadPreset,
      ),
    );
  }
}

void _voltar(BuildContext context, String raiz) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(raiz);
  }
}

/// Sub-rotas da aba Descobrir: o fluxo que começa pelo ISBN.
List<RouteBase> rotasDeDescobrir(
  DependenciasDeLivros deps, {
  EstanteService? estante,
  DependenciasDeProgresso? progresso,
}) => <RouteBase>[
  GoRoute(
    path: 'adicionar-livro',
    builder: (context, state) => CadastroIsbnPage(
      servico: deps.acervo,
      aoVoltar: () => _voltar(context, '/descobrir'),
      aoNaoEncontrar: (isbn) => context.push<bool>(
        Uri(
          path: '$rotaAdicionarLivro/nao-encontrado',
          queryParameters: <String, String>{'isbn': isbn},
        ).toString(),
      ),
      aoAbrirLivro: (id) => context.push(rotaLivroOficial(id)),
      aoCadastrarPessoal: () => context.push('$rotaAdicionarLivro/pessoal'),
    ),
    routes: <RouteBase>[
      GoRoute(
        path: 'nao-encontrado',
        builder: (context, state) => IsbnNaoEncontradoPage(
          isbn: state.uri.queryParameters['isbn'],
          aoConferirIsbn: () => context.pop(true),
          aoCadastrarPessoal: () => context.pushReplacement('$rotaAdicionarLivro/pessoal'),
        ),
      ),
      GoRoute(
        path: 'pessoal',
        builder: (context, state) => LivroPessoalFormPage(
          servico: deps.acervo,
          seletor: deps.seletor,
          enviador: deps.enviador,
          aoCancelar: () => _voltar(context, rotaAdicionarLivro),
          // O livro nasce na estante do dono: a página dele mora na aba Estante.
          // Antes de trocar de aba, esvazia a pilha da aba Descobrir com `pop()`: como o shell é
          // um `indexedStack`, o formulário preenchido continuaria vivo aqui e reapareceria ao
          // voltar para Descobrir. Não dá para fazer isso com `go('/descobrir')` + `go(estante)`
          // no mesmo frame — o go_router funde as duas navegações e só a última vale, deixando
          // Descobrir intacta. Os `pop()` são imperativos e imediatos na pilha da aba.
          aoSalvar: (livro) {
            final router = GoRouter.of(context);
            while (router.canPop()) {
              router.pop();
            }
            router.go(rotaLivroPessoalNaEstante(livro.id));
          },
        ),
      ),
    ],
  ),
  rotaDoLivroOficial(deps, raiz: '/descobrir', estante: estante, progresso: progresso),
  ...rotasDeCatalogo(deps, raiz: '/descobrir'),
];

/// Páginas de autor, editora e série (F-ACV-DESCOBERTA) dentro da aba de origem, como a página do
/// livro: abertas da ficha no Perfil, ficam no Perfil. Os livros delas abrem sob a mesma raiz.
List<RouteBase> rotasDeCatalogo(DependenciasDeLivros deps, {required String raiz}) => <RouteBase>[
  for (final (caminho, tipo) in <(String, TipoDeCatalogo)>[
    ('autor', TipoDeCatalogo.autor),
    ('editora', TipoDeCatalogo.editora),
    ('serie', TipoDeCatalogo.serie),
  ])
    GoRoute(
      path: '$caminho/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return PaginaDeCatalogoPage(
          key: ValueKey<String>('catalogo-$caminho-$id'),
          servico: deps.acervo,
          tipo: tipo,
          id: id,
          aoVoltar: () => _voltar(context, raiz),
          aoAbrirLivro: (livroId) => context.push('$raiz/livro/$livroId'),
          aoAbrirAutor: (autorId) => context.push(rotaDoAutor(raiz, autorId)),
          aoBuscarNoDescobrir: () => context.go('/descobrir'),
        );
      },
    ),
];

/// Página do livro oficial dentro da aba de origem (pagina-do-livro.md §4.1: o item ativo da barra
/// é sempre a aba de onde se chegou). Descobrir usa agora; Estante e Feed montam a mesma rota sob a
/// raiz delas quando F-EST e F-FEED linkarem o livro.
GoRoute rotaDoLivroOficial(
  DependenciasDeLivros deps, {
  required String raiz,
  EstanteService? estante,
  DependenciasDeProgresso? progresso,
}) {
  return GoRoute(
    path: 'livro/:id',
    builder: (context, state) {
      final id = state.pathParameters['id']!;
      return LivroOficialPage(
        // A chave pelo id faz a página recarregar se a rota trocar de livro sem desmontar.
        key: ValueKey<String>('livro-oficial-$id'),
        servico: deps.acervo,
        leitura: deps.leitura,
        livroId: id,
        aoVoltar: () => _voltar(context, raiz),
        estante: estante,
        progresso: progresso,
        aoVerAtualizacoes: progresso == null
            ? null
            : (leituraId) => context.push<void>(rotaProgressoDaLeitura(leituraId)),
        listas: deps.listas,
        aoAbrirAutor: (autorId) => context.push(rotaDoAutor(raiz, autorId)),
        aoAbrirEditora: (editoraId) => context.push(rotaDaEditora(raiz, editoraId)),
        aoAbrirSerie: (serieId) => context.push(rotaDaSerie(raiz, serieId)),
        // O assunto é filtro de busca (RN-21): leva ao Descobrir, que passa a ser a aba ativa.
        aoBuscarAssunto: (assuntoId) =>
            context.go(Uri(path: '/descobrir', queryParameters: {'assunto': assuntoId}).toString()),
        aoVerFrases: () => context.push('$raiz/livro/$id/frases'),
      );
    },
    routes: <RouteBase>[_frasesDoLivro(deps, raiz: raiz, pessoal: false)],
  );
}

/// Lista completa de frases (F-AVA-2), empilhada sobre a página do livro na mesma aba.
GoRoute _frasesDoLivro(DependenciasDeLivros deps, {required String raiz, required bool pessoal}) {
  return GoRoute(
    path: 'frases',
    builder: (context, state) {
      final id = state.pathParameters['id']!;
      return FrasesDoLivroPage(
        key: ValueKey<String>('frases-$id'),
        leitura: deps.leitura,
        acervo: deps.acervo,
        livroId: id,
        pessoal: pessoal,
        aoVoltar: () => _voltar(context, pessoal ? '$raiz/livro-pessoal/$id' : '$raiz/livro/$id'),
      );
    },
  );
}

/// Página do livro pessoal dentro da aba de origem: a Estante do dono, o Feed e, desde F-LST, o
/// Perfil (o livro aberto por uma lista).
GoRoute rotaDoLivroPessoal(
  DependenciasDeLivros deps, {
  required String raiz,
  EstanteService? estante,
  DependenciasDeProgresso? progresso,
}) => _paginaDoLivroPessoal(deps, raiz: raiz, estante: estante, progresso: progresso);

GoRoute _paginaDoLivroPessoal(
  DependenciasDeLivros deps, {
  required String raiz,
  EstanteService? estante,
  DependenciasDeProgresso? progresso,
}) {
  return GoRoute(
    path: 'livro-pessoal/:id',
    builder: (context, state) {
      final id = state.pathParameters['id']!;
      return LivroPessoalPage(
        // A chave pelo id faz a página recarregar se a rota trocar de livro sem desmontar.
        key: ValueKey<String>('livro-pessoal-$id-${state.uri.query}'),
        servico: deps.acervo,
        leitura: deps.leitura,
        livroId: id,
        via: state.uri.queryParameters['via'],
        referenciaId: state.uri.queryParameters['referenciaId'],
        aoVoltar: () => _voltar(context, raiz),
        aoEditar: (id) async {
          await context.push<void>('$raiz/livro-pessoal/$id/editar');
        },
        aoExcluir: () => context.go(rotaEstanteRaiz),
        aoVoltarAoFeed: () => context.go(rotaFeedRaiz),
        estante: estante,
        progresso: progresso,
        aoVerAtualizacoes: progresso == null
            ? null
            : (leituraId) => context.push<void>(rotaProgressoDaLeitura(leituraId)),
        listas: deps.listas,
        aoVerFrases: () => context.push('$raiz/livro-pessoal/$id/frases'),
      );
    },
    routes: <RouteBase>[
      _frasesDoLivro(deps, raiz: raiz, pessoal: true),
      GoRoute(
        path: 'editar',
        builder: (context, state) => LivroPessoalFormPage(
          servico: deps.acervo,
          seletor: deps.seletor,
          enviador: deps.enviador,
          livroId: state.pathParameters['id'],
          aoCancelar: () => _voltar(context, raiz),
          aoSalvar: (_) => _voltar(context, raiz),
          aoExcluir: () => context.go(rotaEstanteRaiz),
        ),
      ),
    ],
  );
}

/// O dono chega ao livro pessoal pela própria estante.
List<RouteBase> rotasDaEstante(
  DependenciasDeLivros deps,
  EstanteService estante, {
  DependenciasDeProgresso? progresso,
}) => <RouteBase>[
  _paginaDoLivroPessoal(deps, raiz: rotaEstanteRaiz, estante: estante, progresso: progresso),
];

/// O terceiro chega **exclusivamente** pelo feed, com `via=feed&referenciaId=` (RN-15). F-FEED
/// monta o link; esta rota só o recebe.
List<RouteBase> rotasDoFeed(DependenciasDeLivros deps) => <RouteBase>[
  _paginaDoLivroPessoal(deps, raiz: rotaFeedRaiz),
];
