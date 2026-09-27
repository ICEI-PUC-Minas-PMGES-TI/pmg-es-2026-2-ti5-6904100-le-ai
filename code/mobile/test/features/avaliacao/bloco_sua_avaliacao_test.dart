import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/avaliacao/avaliacao_controller.dart';
import 'package:le_ai_mobile/features/avaliacao/bloco_sua_avaliacao.dart';
import 'package:le_ai_mobile/features/avaliacao/painel_de_nota.dart';

import '../livros/apoio.dart';

const String _id = 'b0a1c2d3-0000-4000-8000-000000000001';

void main() {
  // Com `excludeSemantics`, o toque do `InkWell` sumia da árvore: Switch Access e Voice Access
  // não acionavam a linha de estrelas.
  testWidgets('a linha "Sua nota" tem ação de toque na semântica', (tester) async {
    usarTelaDeCelular(tester);
    final avaliacao = AvaliacaoController(
      leituraSimulada((_) async => json(semAvaliacao(_id), 200)),
      _id,
    );
    addTearDown(avaliacao.dispose);
    await avaliacao.carregar();
    final semantica = tester.ensureSemantics();

    await tester.pumpWidget(
      envolver(
        BlocoSuaAvaliacao(
          avaliacao: avaliacao,
          livro: const LivroAvaliado(titulo: 'Torto Arado'),
        ),
      ),
    );

    final dados = tester.getSemantics(find.bySemanticsLabel('Sem nota. Dar nota'));
    expect(dados.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    semantica.dispose();
  });
}
