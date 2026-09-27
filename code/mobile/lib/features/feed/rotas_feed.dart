import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../livros/rotas_livros.dart';
import '../perfil/perfil_de_outro_page.dart';
import '../perfil/rotas_perfil.dart';
import 'feed_page.dart';
import 'social_service.dart';

/// Perfil de quem publicou, dentro da aba Feed: o toque no autor não troca de aba, e a seta
/// volta ao feed.
String rotaLeitorNoFeed(String username) => '$rotaFeedRaiz/leitores/${Uri.encodeComponent(username)}';

/// O que as telas de F-FEED precisam do mundo lá fora, no molde de `DependenciasDePerfil`.
class DependenciasDeFeed {
  final SocialService social;

  const DependenciasDeFeed({required this.social});

  factory DependenciasDeFeed.padrao({
    required String? Function() getToken,
    Future<bool> Function(String tokenQueFalhou)? renovarSessao,
  }) {
    return DependenciasDeFeed(
      social: SocialService(
        ApiClient(
          baseUrl: AppConfig.socialBaseUrl,
          getToken: getToken,
          renovarSessao: renovarSessao,
        ),
      ),
    );
  }
}

void _voltarAoFeed(BuildContext context) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(rotaFeedRaiz);
  }
}

/// A raiz da aba Feed e as sub-rotas: o perfil do autor e o livro pessoal aberto pela atividade
/// (`via=feed&referenciaId=`, RN-15), que F-ACV-CADASTRO já recebe em `rotasDoFeed`.
GoRoute rotaDoFeed(
  DependenciasDeFeed deps, {
  required DependenciasDePerfil perfil,
  required DependenciasDeLivros livros,
}) {
  return GoRoute(
    path: rotaFeedRaiz,
    builder: (context, state) => FeedPage(
      social: deps.social,
      perfil: perfil.servico,
      aoAbrirAutor: (username) => context.push(rotaLeitorNoFeed(username)),
      aoAbrirLivro: (atividade) {
        final livro = atividade.livro;
        if (livro.pessoal) {
          final referencia = Uri.encodeQueryComponent(livro.referenciaId ?? atividade.id);
          context.push('$rotaFeedRaiz/livro-pessoal/${livro.id}?via=feed&referenciaId=$referencia');
        } else {
          context.push(rotaLivroOficial(livro.id));
        }
      },
      aoBuscarLeitor: () => context.push(rotaBuscarLeitor),
      aoVerEstante: () => context.go(rotaEstanteRaiz),
    ),
    routes: <RouteBase>[
      ...rotasDoFeed(livros),
      GoRoute(
        path: 'leitores/:username',
        builder: (context, state) {
          final username = state.pathParameters['username']!;
          return PerfilDeOutroPage(
            key: ValueKey<String>('perfil-no-feed-$username'),
            servico: perfil.servico,
            username: username,
            aoVoltar: () => _voltarAoFeed(context),
            aoAbrirProprioPerfil: () => context.go(rotaPerfilRaiz),
            aoBuscarLeitor: () => context.push(rotaBuscarLeitor),
            aoAbrirSolicitacoes: () => context.push(rotaSolicitacoes),
          );
        },
      ),
    ],
  );
}
