import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../avaliacao/leitura_service.dart';
import '../estante/estante_service.dart';
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

/// O que as telas de livro precisam do mundo lá fora. Construído uma vez em `main.dart` e
/// injetado no roteador; os testes montam o seu com clientes simulados.
class DependenciasDeLivros {
  final AcervoService acervo;

  /// Nota e resenha do leitor (F-AVA), no serviço `leitura`.
  final LeituraService leitura;
  final SeletorDeImagem seletor;
  final EnviadorDeCapa enviador;

  const DependenciasDeLivros({
    required this.acervo,
    required this.leitura,
    required this.seletor,
    required this.enviador,
  });

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
      );
    },
  );
}

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
      );
    },
    routes: <RouteBase>[
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
