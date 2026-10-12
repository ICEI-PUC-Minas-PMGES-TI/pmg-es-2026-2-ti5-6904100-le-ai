import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../perfil/rotas_perfil.dart';
import 'estatisticas_do_perfil.dart';
import 'estatisticas_page.dart';
import 'estatisticas_service.dart';
import 'formatos.dart';
import 'textos.dart';

/// O painel mora sob a aba Perfil (estatisticas.md §2): empilhado sobre ela, com `Perfil` ativo
/// na barra inferior. O período vai na query.
const String rotaEstatisticas = '/perfil/estatisticas';

String rotaEstatisticasDoPeriodo(PeriodoEstatisticas periodo) =>
    '$rotaEstatisticas?periodo=${periodo.valor}';

/// O que as telas de F-STA precisam do mundo lá fora. [alteracoesDeLeitura] junta os avisos de
/// progresso, de leitura (estante) e de nota, que mexem nos totais e nas médias.
class DependenciasDeEstatisticas {
  final EstatisticasService servico;
  final Listenable? alteracoesDeLeitura;

  /// Destino de `Ir para a estante` no vazio.
  final String rotaDaEstante;

  const DependenciasDeEstatisticas({
    required this.servico,
    this.alteracoesDeLeitura,
    required this.rotaDaEstante,
  });

  factory DependenciasDeEstatisticas.comAvisos(
    EstatisticasService servico,
    List<ValueListenable<int>> avisos, {
    required String rotaDaEstante,
  }) => DependenciasDeEstatisticas(
    servico: servico,
    alteracoesDeLeitura: avisos.isEmpty ? null : Listenable.merge(avisos),
    rotaDaEstante: rotaDaEstante,
  );
}

void _voltar(BuildContext context) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(rotaPerfilRaiz);
  }
}

/// O painel, sob `/perfil`.
List<RouteBase> rotasDasEstatisticas(DependenciasDeEstatisticas deps) => <RouteBase>[
  GoRoute(
    path: 'estatisticas',
    builder: (context, state) {
      final hoje = hojeEmSaoPaulo();
      final valor = state.uri.queryParameters['periodo'];
      return EstatisticasPage(
        servico: deps.servico,
        periodoInicial: PeriodoEstatisticas.daRota(valor, hoje.year),
        // O período trocado na página vai para a URL, como o filtro da Estante.
        aoMudarPeriodo: (periodo) => context.go(rotaEstatisticasDoPeriodo(periodo)),
        aoVoltar: () => _voltar(context),
        aoIrParaEstante: () => context.go(deps.rotaDaEstante),
        alteracoesDeLeitura: deps.alteracoesDeLeitura,
      );
    },
  ),
];

/// Bloco `Estatísticas do ano` do Meu perfil, com `Ver estatísticas`. Os números são os do
/// painel no ano corrente; sem nenhum registro, a frase no lugar dos cards.
Widget secaoDasEstatisticas(BuildContext context, DependenciasDeEstatisticas deps) {
  final ano = hojeEmSaoPaulo().year;
  return EstatisticasDoPerfil(
    ano: ano,
    carregar: () async {
      final estatisticas = await deps.servico.consultar(PeriodoAno(ano));
      return (totais: estatisticas.totais, vazio: estatisticas.semRegistro);
    },
    textoVazio: TextosDoBloco.vazioProprio,
    textoErro: TextosDoBloco.erroProprio,
    aoVerEstatisticas: () => context.push(rotaEstatisticas),
    alteracoes: deps.alteracoesDeLeitura,
  );
}

/// Bloco do perfil de outro leitor: só os totais, sem entrada para o painel, que é do dono. A
/// página só o monta com o conteúdo visível (RN-08); 403 ou 404 do `leitura` o escondem.
Widget estatisticasDeOutroLeitor(DependenciasDeEstatisticas deps, String usuarioId, String nome) {
  final ano = hojeEmSaoPaulo().year;
  return EstatisticasDoPerfil(
    key: ValueKey<String>('estatisticas-$usuarioId'),
    ano: ano,
    carregar: () async {
      final doPerfil = await deps.servico.doPerfil(usuarioId);
      return (totais: doPerfil.totais, vazio: doPerfil.totais.zerados);
    },
    textoVazio: TextosDoBloco.vazioDeOutro(nome, ano),
    textoErro: TextosDoBloco.erroDeOutro(nome),
  );
}
