import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/feed/item_atividade.dart';
import 'package:le_ai_mobile/features/feed/social_service.dart';

import 'apoio.dart';

Atividade _atividade({
  String tipo = 'LEITURA_INICIADA',
  String tipoLivro = 'OFICIAL',
  num? nota,
  int curtidas = 4,
  int comentarios = 2,
  bool curtida = false,
}) => Atividade.fromJson(
  atividadeJson(
    tipo: tipo,
    tipoLivro: tipoLivro,
    nota: nota,
    curtidas: curtidas,
    comentarios: comentarios,
    curtida: curtida,
  ),
);

Future<List<String>> _montar(
  WidgetTester tester,
  Atividade atividade, {
  bool pendente = false,
}) async {
  final eventos = <String>[];
  await tester.pumpWidget(
    envolver(
      SingleChildScrollView(
        child: ItemAtividade(
          atividade: atividade,
          curtidaPendente: pendente,
          aoCurtir: () => eventos.add('curtir'),
          aoDescurtir: () => eventos.add('descurtir'),
          aoComentar: () => eventos.add('comentar'),
          aoAbrirAutor: () => eventos.add('autor'),
          aoAbrirLivro: () => eventos.add('livro'),
        ),
      ),
    ),
  );
  return eventos;
}

void main() {
  testWidgets('cada tipo mostra o verbo na própria linha', (tester) async {
    const verbos = <String, String>{
      'LEITURA_INICIADA': 'começou a ler',
      'LEITURA_RETOMADA': 'retomou a leitura',
      'LEITURA_FINALIZADA': 'terminou de ler',
      'LEITURA_ABANDONADA': 'abandonou a leitura',
      'RESENHA_PUBLICADA': 'publicou uma resenha',
    };
    for (final MapEntry(key: tipo, value: verbo) in verbos.entries) {
      await _montar(tester, _atividade(tipo: tipo));
      expect(find.text(verbo), findsOneWidget, reason: tipo);
    }
  });

  testWidgets('o chip Livro pessoal só aparece em livro pessoal', (tester) async {
    await _montar(tester, _atividade());
    expect(find.text('Livro pessoal'), findsNothing);

    await _montar(tester, _atividade(tipoLivro: 'PESSOAL'));
    expect(find.text('Livro pessoal'), findsOneWidget);
  });

  testWidgets('resenha mostra texto, estrelas com a nota e Ler resenha', (tester) async {
    await _montar(tester, _atividade(tipo: 'RESENHA_PUBLICADA', nota: 4.5));

    expect(find.text('Um livro grandioso.'), findsOneWidget);
    expect(find.bySemanticsLabel('4,5 de 5'), findsOneWidget);
    expect(find.text('Ler resenha'), findsOneWidget);
  });

  testWidgets('resenha sem nota não mostra estrelas', (tester) async {
    await _montar(tester, _atividade(tipo: 'RESENHA_PUBLICADA'));

    expect(find.text('Um livro grandioso.'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp(r'de 5$')), findsNothing);
  });

  testWidgets('curtir e descurtir conforme o estado, com rótulo acessível', (tester) async {
    var eventos = await _montar(tester, _atividade());
    await tester.tap(find.bySemanticsLabel('Curtir, 4 curtidas'));
    expect(eventos, <String>['curtir']);

    eventos = await _montar(tester, _atividade(curtidas: 5, curtida: true));
    await tester.tap(find.bySemanticsLabel('Descurtir, 5 curtidas'));
    await tester.pump(const Duration(seconds: 1));
    expect(eventos, <String>['descurtir']);
  });

  testWidgets('curtida pendente não emite de novo', (tester) async {
    final eventos = await _montar(tester, _atividade(), pendente: true);

    await tester.tap(find.bySemanticsLabel('Curtir, 4 curtidas'));

    expect(eventos, isEmpty);
  });

  testWidgets('comentar mostra a contagem e, sem comentários, só o ícone', (tester) async {
    var eventos = await _montar(tester, _atividade());
    await tester.tap(find.bySemanticsLabel('2 comentários'));
    expect(eventos, <String>['comentar']);

    await _montar(tester, _atividade(comentarios: 0));
    expect(find.bySemanticsLabel('Comentar'), findsOneWidget);
    expect(find.text('0'), findsNothing);
  });

  testWidgets('autor e card do livro emitem a navegação', (tester) async {
    final eventos = await _montar(tester, _atividade());

    await tester.tap(find.text('Dandara Lopes'));
    await tester.tap(find.text('Torto Arado'));

    expect(eventos, <String>['autor', 'livro']);
  });
}
