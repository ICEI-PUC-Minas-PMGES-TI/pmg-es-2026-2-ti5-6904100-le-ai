import 'estatisticas_service.dart';

typedef ItemDoSeletor = ({PeriodoEstatisticas periodo, int livrosConcluidos});

/// Faixa de períodos: os anos com registro, o ano corrente (que abre ativo mesmo sem registro) e
/// o período escolhido pela rota, do mais recente ao mais antigo, e o acumulado por último com a
/// soma dos livros. Espelha `itensDoSeletor` de `code/front/src/estatisticas/useEstatisticas.ts`.
List<ItemDoSeletor> itensDoSeletor(
  List<AnoComRegistro> anos,
  int anoCorrente,
  PeriodoEstatisticas escolhido,
) {
  final porAno = <int, int>{for (final a in anos) a.ano: a.livrosConcluidos};
  porAno.putIfAbsent(anoCorrente, () => 0);
  if (escolhido case PeriodoAno(:final ano)) {
    porAno.putIfAbsent(ano, () => 0);
  }
  final ordenados = porAno.keys.toList()..sort((a, b) => b.compareTo(a));
  final acumulado = anos.fold(0, (soma, a) => soma + a.livrosConcluidos);
  return <ItemDoSeletor>[
    for (final ano in ordenados) (periodo: PeriodoAno(ano), livrosConcluidos: porAno[ano]!),
    (periodo: const PeriodoAcumulado(), livrosConcluidos: acumulado),
  ];
}
