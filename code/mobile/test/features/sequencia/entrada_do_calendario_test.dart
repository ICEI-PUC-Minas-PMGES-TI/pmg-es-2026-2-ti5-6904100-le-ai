import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/design/widgets/cartao_de_sequencia.dart';
import 'package:le_ai_mobile/features/sequencia/sequencia_do_perfil.dart';
import 'package:le_ai_mobile/features/sequencia/sequencia_service.dart';

import '../livros/apoio.dart';

/// Entrada do calendário pelo bloco do Meu perfil (F-GAM-OPC; meu-perfil.md P3 §4.1 e §9).
void main() {
  SequenciaService servico(int atual, int maior) => SequenciaService(
    ApiClient(
      baseUrl: 'https://leitura.example.com',
      client: MockClient(
        (_) async => json(<String, Object?>{
          'sequenciaAtual': atual,
          'maiorSequencia': maior,
          'ultimoDiaComLeitura': maior == 0 ? null : '2026-09-24',
        }, 200),
      ),
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    ),
  );

  Future<void> montar(WidgetTester tester, Widget bloco) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(envolver(Padding(padding: const EdgeInsets.all(20), child: bloco)));
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 1));
    }
  }

  testWidgets('o container inteiro abre o calendário, com CaretRight e o destino no rótulo', (
    tester,
  ) async {
    final semantica = tester.ensureSemantics();
    var abriu = 0;
    await montar(
      tester,
      SequenciaDoPerfil(servico: servico(12, 31), aoAbrirCalendario: () => abriu++),
    );

    expect(find.byIcon(PhosphorIconsRegular.caretRight), findsOneWidget);
    expect(
      find.bySemanticsLabel(
        'Sequência diária: 12 dias seguidos. Recorde: 31 dias. Abrir calendário da sequência.',
      ),
      findsOneWidget,
    );
    // Tocar no helper, longe do número, também abre: não há área morta.
    await tester.tap(find.text('Conta cada dia em que você registra ao menos 1 página.'));
    await tester.pumpAndSettle();
    expect(abriu, 1);
    semantica.dispose();
  });

  testWidgets('zerada continua tocável e anuncia "nenhum dia seguido"', (tester) async {
    final semantica = tester.ensureSemantics();
    var abriu = 0;
    await montar(
      tester,
      SequenciaDoPerfil(servico: servico(0, 31), aoAbrirCalendario: () => abriu++),
    );

    expect(
      find.bySemanticsLabel(
        'Sequência diária: nenhum dia seguido, leia hoje para começar. Recorde: 31 dias. '
        'Abrir calendário da sequência.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.byType(CartaoDeSequencia));
    await tester.pumpAndSettle();
    expect(abriu, 1);
    semantica.dispose();
  });

  testWidgets('pressionado: fundo musgo-fundo enquanto o dedo está em cima', (tester) async {
    await montar(tester, SequenciaDoPerfil(servico: servico(5, 9), aoAbrirCalendario: () {}));

    Color fundo() {
      final caixa = tester.widget<AnimatedContainer>(
        find.descendant(
          of: find.byType(CartaoDeSequencia),
          matching: find.byType(AnimatedContainer),
        ),
      );
      return (caixa.decoration! as BoxDecoration).color!;
    }

    final tema = Theme.of(tester.element(find.byType(CartaoDeSequencia)));
    expect(fundo(), tema.elevatedSurface);
    final gesto = await tester.startGesture(tester.getCenter(find.byType(CartaoDeSequencia)));
    await tester.pump();
    expect(fundo(), tema.accentTint);
    await gesto.up();
    await tester.pumpAndSettle();
    expect(fundo(), tema.elevatedSurface);
  });

  testWidgets('sem a entrada (resumo do calendário), não é botão nem tem CaretRight', (
    tester,
  ) async {
    await montar(tester, const CartaoDeSequencia(atual: 12, recorde: 31));

    expect(find.byIcon(PhosphorIconsRegular.caretRight), findsNothing);
    expect(find.byType(GestureDetector), findsNothing);
  });
}
