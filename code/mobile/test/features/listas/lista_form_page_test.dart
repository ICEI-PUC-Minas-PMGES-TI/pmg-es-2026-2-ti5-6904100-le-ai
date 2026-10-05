import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/listas/lista_form_page.dart';
import 'package:le_ai_mobile/features/listas/listas_service.dart';
import 'package:le_ai_mobile/features/listas/textos.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';

import 'apoio_listas.dart';

void main() {
  group('textoDaExclusao', () {
    test('com um livro, não escreve "a ordem dos 1 livro"', () {
      expect(
        textoDaExclusao(1),
        'A lista sai do seu perfil. O livro continua na sua estante e no acervo. Não dá para desfazer.',
      );
    });

    test('sem livros, não fala de livro nenhum', () {
      expect(textoDaExclusao(0), 'A lista sai do seu perfil. Não dá para desfazer.');
    });
  });

  late List<http.Request> pedidos;

  setUp(() => pedidos = <http.Request>[]);

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) handler, {
    Lista? lista,
    LivroDeOrigem? livro,
    Privacidade privacidade = Privacidade.publico,
  }) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        ListaFormPage(
          servico: listasSimulado((pedido) {
            pedidos.add(pedido);
            return handler(pedido);
          }),
          obterPrivacidade: () async => privacidade,
          lista: lista,
          livro: livro,
        ),
      ),
    );
    await tester.pump();
  }

  Finder campoTitulo() => find.byType(TextField).first;
  Finder botao(String texto) => find.widgetWithText(ElevatedButton, texto);

  testWidgets('criação: contadores, faixa de privacidade e botão desabilitado sem título', (
    tester,
  ) async {
    await montar(tester, (_) async => json(listaJson(), 201));

    expect(find.text('Nova lista'), findsOneWidget);
    expect(find.text('0/80'), findsOneWidget);
    expect(find.text('0/300'), findsOneWidget);
    expect(find.text('Seu perfil é público: qualquer leitor pode ver esta lista.'), findsOneWidget);
    expect(tester.widget<ElevatedButton>(botao('Criar lista')).onPressed, isNull);
    expect(find.text('Excluir lista'), findsNothing);

    await tester.enterText(campoTitulo(), 'Poesia para começar');
    await tester.pump();
    expect(find.text('19/80'), findsOneWidget);
    expect(tester.widget<ElevatedButton>(botao('Criar lista')).onPressed, isNotNull);
  });

  testWidgets('título só com espaços conta como vazio; acima de 80, erro no campo', (
    tester,
  ) async {
    await montar(tester, (_) async => json(listaJson(), 201));

    await tester.enterText(campoTitulo(), '   ');
    await tester.pump();
    expect(tester.widget<ElevatedButton>(botao('Criar lista')).onPressed, isNull);

    await tester.enterText(campoTitulo(), 'a' * 84);
    await tester.pump();
    expect(find.text('84/80'), findsOneWidget);
    expect(find.text('Use até 80 caracteres no título.'), findsOneWidget);
    expect(tester.widget<ElevatedButton>(botao('Criar lista')).onPressed, isNull);
  });

  testWidgets('criar a partir do livro manda o livroId; falha repete a mesma chave', (
    tester,
  ) async {
    var tentativas = 0;
    await montar(
      tester,
      (_) async => ++tentativas == 1
          ? erro(500, 'ERRO_INTERNO', 'Falhou.')
          : json(listaJson(titulo: 'Romances do sertão'), 201),
      livro: const LivroDeOrigem(
        id: 'livro-torto',
        titulo: 'Torto Arado',
        autor: 'Itamar Vieira Junior',
        capaUrl: null,
        pessoal: false,
      ),
    );

    expect(find.text('Este livro entra na lista'), findsOneWidget);
    await tester.enterText(campoTitulo(), 'Romances do sertão');
    await tester.pump();
    await tocar(tester, botao('Criar lista com este livro'));
    await tester.pumpAndSettle();

    expect(
      find.text('Não foi possível criar a lista. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    expect(jsonDecode(pedidos.first.body)['livroId'], 'livro-torto');

    await tocar(tester, botao('Criar lista com este livro'));
    await tester.pumpAndSettle();

    final posts = pedidos.where((p) => p.method == 'POST').toList();
    expect(posts, hasLength(2));
    expect(posts[1].headers['Idempotency-Key'], posts[0].headers['Idempotency-Key']);
  });

  testWidgets('edição: só o que mudou vai no PATCH; sem mudança, o botão fica desabilitado', (
    tester,
  ) async {
    await montar(
      tester,
      (_) async => json(listaJson(titulo: 'Contos para quem acha que não gosta'), 200),
      lista: Lista.fromJson(listaJson()),
      privacidade: Privacidade.privado,
    );

    expect(find.text('Editar lista'), findsOneWidget);
    expect(
      find.text('Seu perfil é privado: só quem você aceitou como seguidor vê esta lista.'),
      findsOneWidget,
    );
    expect(tester.widget<ElevatedButton>(botao('Salvar alterações')).onPressed, isNull);

    await tester.enterText(campoTitulo(), 'Contos para quem acha que não gosta');
    await tester.pump();
    await tocar(tester, botao('Salvar alterações'));
    await tester.pumpAndSettle();

    expect(pedidos.single.method, 'PATCH');
    expect(jsonDecode(pedidos.single.body), <String, Object?>{
      'titulo': 'Contos para quem acha que não gosta',
    });
  });

  testWidgets('excluir pede confirmação com o título salvo e só então apaga', (tester) async {
    await montar(
      tester,
      (_) async => http.Response('', 204),
      lista: Lista.fromJson(listaJson(quantidade: 7)),
    );

    await tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir lista'));
    await tester.pumpAndSettle();

    expect(find.text('Excluir a lista Contos que eu indico?'), findsOneWidget);
    expect(find.textContaining('a ordem dos 7 livros saem do seu perfil'), findsOneWidget);
    expect(pedidos, isEmpty);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Excluir lista').last);
    await tester.pumpAndSettle();

    expect(pedidos.single.method, 'DELETE');
    expect(pedidos.single.url.path, '/listas/$idDaLista');
  });
}
