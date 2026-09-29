import 'package:go_router/go_router.dart';

import '../livros/rotas_livros.dart';
import '../perfil/rotas_perfil.dart';
import 'contador_de_nao_lidas.dart';
import 'notificacao.dart';
import 'notificacoes_page.dart';
import 'notificacoes_service.dart';

const String _segmento = 'notificacoes';

/// A tela é empilhada na aba de origem, para a barra inferior continuar com ela ativa
/// (notificacoes.md §4): `/estante/notificacoes`, `/feed/notificacoes`...
String rotaNotificacoes(String raizDaAba) => '$raizDaAba/$_segmento';

/// O que F-NOT precisa do mundo lá fora, no molde de `DependenciasDePerfil`. O contador é um só
/// para o app inteiro: é o número do badge em todo cabeçalho.
class DependenciasDeNotificacoes {
  final NotificacoesService servico;
  final ContadorDeNaoLidas contador;

  DependenciasDeNotificacoes(this.servico) : contador = ContadorDeNaoLidas(servico);

  factory DependenciasDeNotificacoes.padrao({
    required String? Function() getToken,
    Future<bool> Function(String tokenQueFalhou)? renovarSessao,
  }) => DependenciasDeNotificacoes(
    NotificacoesService.padrao(getToken: getToken, renovarSessao: renovarSessao),
  );
}

/// Destino de cada tipo (§4, item de notificação). Os comentários da atividade ainda não existem
/// no app (o feed mobile é placeholder), então os três tipos de atividade levam ao feed.
String destinoDaNotificacao(Notificacao notificacao) {
  switch (notificacao.tipo) {
    case TipoNotificacao.novoSeguidor:
    case TipoNotificacao.solicitacaoAceita:
      final ator = notificacao.ator;
      return ator == null ? rotaPerfilRaiz : rotaPerfilDeOutro(ator.username);
    case TipoNotificacao.solicitacaoCriada:
      return rotaSolicitacoes;
    case TipoNotificacao.atividadeCurtida:
    case TipoNotificacao.atividadeComentada:
    case TipoNotificacao.comentarioRespondido:
      return rotaFeedRaiz;
    case TipoNotificacao.leituraEmRisco:
    case TipoNotificacao.leituraExpirada:
      final livro = notificacao.livro;
      if (livro == null) {
        return rotaEstanteRaiz;
      }
      return livro.pessoal ? rotaLivroPessoalNaEstante(livro.id) : rotaLivroOficial(livro.id);
  }
}

/// Sub-rota `notificacoes` de uma aba. `go`, e não `push`, para o destino: ele pode estar em
/// outra aba, e o `StatefulShellRoute` troca de aba com `go`.
GoRoute rotaDeNotificacoes(DependenciasDeNotificacoes deps, String raizDaAba) => GoRoute(
  path: _segmento,
  builder: (context, state) => NotificacoesPage(
    servico: deps.servico,
    contador: deps.contador,
    aoVoltar: () => context.canPop() ? context.pop() : context.go(raizDaAba),
    aoAbrir: (notificacao) => context.go(destinoDaNotificacao(notificacao)),
    // O registro de progresso (F-PRG) ainda não tem tela no app: a estante é onde a leitura está.
    aoRegistrarProgresso: (_) => context.go(rotaEstanteRaiz),
  ),
);
