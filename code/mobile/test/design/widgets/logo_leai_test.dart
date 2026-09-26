import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/design/widgets/logo_leai.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light(),
    home: Scaffold(body: child),
  );
}

void main() {
  // Testa o asset de verdade (SvgPicture.asset lendo pubspec.yaml), não presentacional só por
  // acaso: um caminho errado em "assets/imagens/" não dá erro de compilação, só falha em
  // runtime — o mesmo risco de transcrição que a versão web teve com o SVG embutido.
  testWidgets('carrega o asset do símbolo sem lançar exceção', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(const LogoLeAi()));
    await tester.pumpAndSettle();

    expect(find.byType(SvgPicture), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  // O flutter_svg ignora `transform-origin` e `transform-box` do CSS e aplica a `matrix` em
  // torno de (0,0). O asset veio de um editor web que usa as duas: a metade espelhada do livro
  // caía fora do viewBox e o símbolo aparecia cortado no celular, embora carregasse sem erro.
  // A origem fica embutida na própria matrix; um novo export do editor quebraria de novo.
  test('asset do símbolo não depende de transform-origin/transform-box', () async {
    TestWidgetsFlutterBinding.ensureInitialized();
    final svg = await rootBundle.loadString('assets/imagens/logo-leai.svg');

    expect(svg, isNot(contains('transform-origin')));
    expect(svg, isNot(contains('transform-box')));
  });

  testWidgets('mostra o wordmark, exceto quando somenteSimbolo', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(const LogoLeAi()));
    expect(find.text('Lê Ai'), findsOneWidget);

    await tester.pumpWidget(_wrap(const LogoLeAi(somenteSimbolo: true)));
    expect(find.text('Lê Ai'), findsNothing);
  });

  // TomLogo.neutro (shell-de-navegacao.md §3.7, "variante esmaecida"): a única tela que usa é
  // VerificandoSessaoPage, mas o mapeamento de cor é lógica do componente, não da tela.
  testWidgets('tom neutro usa a cor secundaria do tema, nao o acento', (tester) async {
    await tester.pumpWidget(_wrap(const LogoLeAi(tom: TomLogo.neutro)));

    final texto = tester.widget<Text>(find.text('Lê Ai'));
    final theme = AppTheme.light();
    expect(texto.style?.color, theme.secondaryText);
    expect(texto.style?.color, isNot(theme.primaryAccent));
  });
}
