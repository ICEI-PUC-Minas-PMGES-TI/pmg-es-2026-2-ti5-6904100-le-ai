import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/livros/livro_oficial_controller.dart';

import 'apoio.dart';

const String _id = 'b0a1c2d3-0000-4000-8000-000000000001';

Map<String, Object?> _resenha(String id, String texto) => <String, Object?>{
  'id': id,
  'autorId': 'autor-$id',
  'autorNome': 'Marina Antunes',
  'autorAvatarUrl': null,
  'texto': texto,
  'spoiler': false,
  'criadoEm': '2026-08-03T12:00:00.000Z',
  'atualizadoEm': '2026-08-03T12:00:00.000Z',
};

/// `GET /livros/{id}` com a sinopse já disponível (sem polling) e as notas dadas.
Map<String, Object?> _livro({
  String sinopse = 'Bibiana e Belonísia crescem no interior da Bahia.',
  List<Map<String, Object?>> resenhas = const <Map<String, Object?>>[],
  String? cursor,
  Map<String, Object?>? notaDosLeitores,
  List<Map<String, Object?>> distribuicao = const <Map<String, Object?>>[],
}) => <String, Object?>{
  'id': _id,
  'titulo': 'Torto Arado',
  'autores': <Object?>[],
  'editora': 'Todavia',
  'anoPublicacao': 2019,
  'paginas': 264,
  'capa': <String, Object?>{'url': null, 'origem': 'placeholder'},
  'assuntos': <Object?>[],
  'isbn': '9788588808911',
  'sinopse': <String, Object?>{'status': 'disponivel', 'texto': sinopse},
  'resenhas': <String, Object?>{
    'itens': resenhas,
    'limit': 10,
    'proximoCursor': cursor,
  },
  'notaGeral': <String, Object?>{'valor': 4.3, 'quantidade': 412},
  'notaDosLeitores': notaDosLeitores,
  'distribuicao': distribuicao,
};

/// O leitor deu 5: a média e a distribuição de um leitor só.
Map<String, Object?> _comANotaDoLeitor({String sinopse = 'Outra sinopse.'}) =>
    _livro(
      sinopse: sinopse,
      notaDosLeitores: <String, Object?>{'valor': 5, 'quantidade': 1},
      distribuicao: <Map<String, Object?>>[
        for (final valor in <num>[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0])
          <String, Object?>{'valor': valor, 'quantidade': valor == 5 ? 1 : 0},
      ],
    );

void main() {
  late int consultas;

  /// Controller já carregado. A primeira `GET /livros/{id}` responde [inicial]; as seguintes,
  /// [depois]. As resenhas seguintes vêm de `/resenhas`. O `dispose` do tearDown roda depois da
  /// checagem de timers do `testWidgets`: cada teste deixa as esperas acabarem.
  Future<LivroOficialController> montar(
    WidgetTester tester, {
    required Map<String, Object?> inicial,
    required Future<http.Response> Function() depois,
  }) async {
    consultas = 0;
    final controller = LivroOficialController(
      acervoSimulado((request) async {
        if (request.url.path.endsWith('/resenhas')) {
          return json(<String, Object?>{
            'itens': <Object?>[_resenha('r2', 'Segunda resenha.')],
            'limit': 10,
            'proximoCursor': null,
          }, 200);
        }
        consultas++;
        return consultas == 1 ? json(inicial, 200) : depois();
      }),
      _id,
    );
    addTearDown(controller.dispose);
    await controller.carregar();
    return controller;
  }

  testWidgets('recarregarNotas reconsulta em 2 s, 6 s e 15 s, e para', (
    tester,
  ) async {
    final controller = await montar(
      tester,
      inicial: _livro(),
      depois: () async => json(_comANotaDoLeitor(), 200),
    );
    expect(consultas, 1);

    controller.recarregarNotas();
    await tester.pump(const Duration(milliseconds: 1999));
    expect(consultas, 1);
    await tester.pump(const Duration(milliseconds: 1));
    expect(consultas, 2);
    await tester.pump(const Duration(seconds: 4));
    expect(consultas, 3);
    await tester.pump(const Duration(seconds: 9));
    expect(consultas, 4);
    await tester.pump(const Duration(minutes: 1));
    expect(consultas, 4);
  });

  testWidgets(
    'a recarga troca só as três notas: resenhas, cursor e sinopse ficam',
    (tester) async {
      final controller = await montar(
        tester,
        inicial: _livro(
          resenhas: <Map<String, Object?>>[_resenha('r1', 'Primeira.')],
          cursor: 'c1',
        ),
        depois: () async => json(_comANotaDoLeitor(), 200),
      );
      await controller.carregarResenhas();
      expect(controller.resenhas.map((r) => r.id), <String>['r1', 'r2']);
      expect(controller.livro!.notaDosLeitores, isNull);
      var avisos = 0;
      controller.addListener(() => avisos++);

      controller.recarregarNotas();
      await tester.pump(const Duration(seconds: 2));

      final livro = controller.livro!;
      expect(livro.notaDosLeitores?.valor, 5);
      expect(livro.notaDosLeitores?.quantidade, 1);
      expect(livro.notaGeral?.valor, 4.3);
      expect(livro.distribuicao, hasLength(11));
      expect(livro.distribuicao.first.quantidade, 1);
      expect(avisos, 1);
      // A consulta trouxe outra sinopse e outra primeira página de resenhas: nada disso entra.
      expect(controller.estado, EstadoDaPagina.pronta);
      expect(controller.resenhas.map((r) => r.id), <String>['r1', 'r2']);
      expect(controller.temMaisResenhas, isFalse);
      expect(
        controller.sinopse.texto,
        'Bibiana e Belonísia crescem no interior da Bahia.',
      );
      expect(
        livro.sinopse.texto,
        'Bibiana e Belonísia crescem no interior da Bahia.',
      );
      expect(livro.resenhas?.itens.single.id, 'r1');
      await tester.pump(const Duration(seconds: 15));
    },
  );

  testWidgets('remover a nota volta a nota dos leitores para nula', (
    tester,
  ) async {
    final controller = await montar(
      tester,
      inicial: _comANotaDoLeitor(),
      depois: () async => json(_livro(), 200),
    );
    expect(controller.livro!.notaDosLeitores, isNotNull);

    controller.recarregarNotas();
    await tester.pump(const Duration(seconds: 2));

    expect(controller.livro!.notaDosLeitores, isNull);
    expect(controller.livro!.distribuicao, isEmpty);
    expect(controller.livro!.notaGeral?.valor, 4.3);
    await tester.pump(const Duration(seconds: 15));
  });

  testWidgets(
    'erro numa reconsulta é ignorado em silêncio e a próxima aplica',
    (tester) async {
      var falhar = true;
      final controller = await montar(
        tester,
        inicial: _livro(),
        depois: () async => falhar
            ? erro(503, 'SERVICO_INDISPONIVEL', 'Serviço indisponível.')
            : json(_comANotaDoLeitor(), 200),
      );
      var avisos = 0;
      controller.addListener(() => avisos++);

      controller.recarregarNotas();
      await tester.pump(const Duration(seconds: 2));

      expect(controller.estado, EstadoDaPagina.pronta);
      expect(controller.mensagemDoErro, isNull);
      expect(controller.livro!.notaDosLeitores, isNull);
      expect(avisos, 0);

      falhar = false;
      await tester.pump(const Duration(seconds: 4));

      expect(controller.livro!.notaDosLeitores?.valor, 5);
      expect(avisos, 1);
      await tester.pump(const Duration(seconds: 15));
    },
  );

  testWidgets('dispose cancela as reconsultas agendadas', (tester) async {
    final controller = LivroOficialController(
      acervoSimulado((request) async {
        consultas++;
        return json(_livro(), 200);
      }),
      _id,
    );
    consultas = 0;
    await controller.carregar();

    controller.recarregarNotas();
    controller.dispose();
    await tester.pump(const Duration(seconds: 20));

    expect(consultas, 1);
  });

  testWidgets('uma escrita nova recomeça o agendamento', (tester) async {
    final controller = await montar(
      tester,
      inicial: _livro(),
      depois: () async => json(_comANotaDoLeitor(), 200),
    );

    controller.recarregarNotas();
    await tester.pump(const Duration(seconds: 5));
    expect(consultas, 2);

    // Nova escrita aos 5 s: a espera de 6 s da primeira não acontece mais.
    controller.recarregarNotas();
    await tester.pump(const Duration(milliseconds: 1500));
    expect(consultas, 2);
    await tester.pump(const Duration(milliseconds: 500));
    expect(consultas, 3);
    await tester.pump(const Duration(seconds: 4));
    expect(consultas, 4);
    await tester.pump(const Duration(seconds: 9));
    expect(consultas, 5);
    await tester.pump(const Duration(minutes: 1));
    expect(consultas, 5);
  });
}
