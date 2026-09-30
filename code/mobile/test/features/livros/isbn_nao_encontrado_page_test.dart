import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/livros/isbn_nao_encontrado_page.dart';

import 'apoio.dart';

void main() {
  testWidgets('mensagem específica, ISBN para conferência e as duas saídas', (tester) async {
    usarTelaDeCelular(tester);
    var pessoal = false;
    var conferir = false;
    await tester.pumpWidget(
      envolver(
        IsbnNaoEncontradoPage(
          isbn: '9788535914849',
          aoCadastrarPessoal: () => pessoal = true,
          aoConferirIsbn: () => conferir = true,
        ),
      ),
    );

    expect(find.text('Adicionar livro'), findsOneWidget);
    expect(find.text('Não encontramos este livro'), findsOneWidget);
    expect(
      find.text('Procuramos em todas as nossas fontes e nenhuma conhece o ISBN 9788535914849.'),
      findsOneWidget,
    );
    expect(find.text('9788535914849'), findsOneWidget);
    expect(find.text('Cadastrar como livro pessoal?'), findsOneWidget);
    // Nem "erro", nem "tentar de novo": as fontes responderam (§10).
    expect(find.textContaining('erro'), findsNothing);
    expect(find.textContaining('Tentar'), findsNothing);

    await tocar(tester, find.text('Cadastrar livro pessoal'));
    await tocar(tester, find.text('Conferir o ISBN'));
    expect(pessoal, isTrue);
    expect(conferir, isTrue);
  });

  testWidgets('sem o ISBN em mãos, o layout não quebra', (tester) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(envolver(const IsbnNaoEncontradoPage()));

    expect(
      find.text('Procuramos em todas as nossas fontes e nenhuma conhece esse ISBN.'),
      findsOneWidget,
    );
    expect(find.text('Cadastrar livro pessoal'), findsOneWidget);
  });
}
