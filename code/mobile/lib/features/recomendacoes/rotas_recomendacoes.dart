import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../feed/social_service.dart';
import '../livros/rotas_livros.dart';
import '../perfil/rotas_perfil.dart';
import 'recomendacoes_recebidas_page.dart';
import 'secao_recomendacoes.dart';
import 'secoes_de_sugestoes.dart';

const String rotaRecomendacoesRecebidas = '/descobrir/recomendacoes';

/// Aterrissagem do Descobrir: `Recomendações recebidas` e, abaixo, as duas seções de sugestão de
/// F-REC-ALG, cada fonte com a sua chamada.
Widget secaoDeRecomendacoes(BuildContext context, SocialService social) => Column(
  crossAxisAlignment: CrossAxisAlignment.stretch,
  children: <Widget>[
    SecaoRecomendacoes(
      social: social,
      aoAbrirLivro: (id) => context.push<void>(rotaLivroOficial(id)),
      aoVerTodas: () => context.push<void>(rotaRecomendacoesRecebidas),
      aoAbrirPerfil: (username) => context.push(rotaPerfilDeOutro(username)),
    ),
    SecoesDeSugestoes(
      social: social,
      aoAbrirLivro: (id) => context.push<void>(rotaLivroOficial(id)),
    ),
  ],
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
