import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../feed/social_service.dart';
import '../livros/rotas_livros.dart';
import '../perfil/rotas_perfil.dart';
import 'recomendacoes_recebidas_page.dart';
import 'secao_recomendacoes.dart';

const String rotaRecomendacoesRecebidas = '/descobrir/recomendacoes';

Widget secaoDeRecomendacoes(BuildContext context, SocialService social) => SecaoRecomendacoes(
  social: social,
  aoAbrirLivro: (id) => context.push<void>(rotaLivroOficial(id)),
  aoVerTodas: () => context.push<void>(rotaRecomendacoesRecebidas),
);

GoRoute rotaDeRecomendacoesRecebidas(SocialService social) => GoRoute(
  path: 'recomendacoes',
  builder: (context, state) => RecomendacoesRecebidasPage(
    social: social,
    aoVoltar: () => context.canPop() ? context.pop() : context.go('/descobrir'),
    aoAbrirLivro: (id) => context.push<void>(rotaLivroOficial(id)),
    aoAbrirPerfil: (username) => context.push(rotaPerfilDeOutro(username)),
  ),
);
