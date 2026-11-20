import 'dart:ui' show Tristate;
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/design/tokens.dart';
import 'package:le_ai_mobile/design/widgets/banner_aviso.dart';
import 'package:le_ai_mobile/design/widgets/cartao_de_sequencia.dart';
import 'package:le_ai_mobile/features/progresso/fila_de_progresso.dart';
import 'package:le_ai_mobile/features/sequencia/calendario_da_sequencia_page.dart';
import 'package:le_ai_mobile/features/sequencia/grade_do_mes.dart';
import 'package:le_ai_mobile/features/sequencia/sequencia_service.dart';

import '../livros/apoio.dart';
import '../progresso/apoio_progresso.dart';

String _dia(String mes, int dia) => '$mes-${dia.toString().padLeft(2, '0')}';

Map<String, Object?> _calendario(
  String mes, {
  String mesAtual = '2026-09',
  String mesMaisAntigo = '2026-04',
  String hoje = '2026-09-24',
  List<int> dias = const <int>[],
}) => <String, Object?>{
  'mes': mes,
  'mesAtual': mesAtual,
  'mesMaisAntigo': mesMaisAntigo,
  'hoje': hoje,
  'dias': <String>[for (final d in dias) _dia(mes, d)],
};

/// Os dias de setembro do prompt (§3): 20 dias, sequência atual de 13 a 24.
const List<int> _diasDeSetembro = <int>[
  1,
  2,
  3,
  5,
  6,
  8,
  9,
  10,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
];

Map<String, Object?> _sequencia(int atual, int maior) => <String, Object?>{
  'sequenciaAtual': atual,
  'maiorSequencia': maior,
  'ultimoDiaComLeitura': maior == 0 ? null : '2026-09-24',
};

void main() {
  late List<Uri> pedidas;

  Future<void> assentar(WidgetTester tester) async {
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 1));
    }
  }

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) responder, {
    Duration timeout = const Duration(seconds: 90),
    FilaDeProgresso? fila,
  }) async {
    usarTelaDeCelular(tester);
    pedidas = <Uri>[];
    final servico = SequenciaService(
      ApiClient(
        baseUrl: 'https://leitura.example.com',
        client: MockClient((request) {
          pedidas.add(request.url);
          return responder(request);
        }),
        timeout: timeout,
        esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
      ),
    );
    await tester.pumpWidget(envolver(CalendarioDaSequenciaPage(servico: servico, fila: fila)));
    await assentar(tester);
  }

  /// Servidor com a sequência fixa e um calendário por mês; [falhar] devolve 503 para os meses dele.
  Future<http.Response> Function(http.Request) servidor({
    Map<String, Object?>? sequencia,
    Map<String, Map<String, Object?>> meses = const <String, Map<String, Object?>>{},
    Set<String> falhar = const <String>{},
  }) {
    return (request) async {
      if (request.url.path == '/me/sequencia') {
        return json(sequencia ?? _sequencia(12, 31), 200);
      }
      final mes = request.url.queryParameters['mes'] ?? '2026-09';
      if (falhar.contains(mes)) {
        return erro(503, 'SERVICO_INDISPONIVEL', 'Serviço indisponível.');
      }
      final calendario = meses[mes];
      if (calendario == null) {
        return erro(422, 'ENTIDADE_NAO_PROCESSAVEL', 'Mês fora da janela.');
      }
      return json(calendario, 200);
    };
  }

  final setembro = _calendario('2026-09', dias: _diasDeSetembro);

  Finder botao(String rotulo) => find.bySemanticsLabel(rotulo);

  bool habilitado(WidgetTester tester, String rotulo) =>
      tester.getSemantics(botao(rotulo)).flagsCollection.isEnabled == Tristate.isTrue;

  testWidgets('mês corrente: resumo, total, dias marcados e só o caret de voltar', (tester) async {
    final semantica = tester.ensureSemantics();
    await montar(tester, servidor(meses: <String, Map<String, Object?>>{'2026-09': setembro}));

    // Resumo e mês corrente juntos; sem `mes`, o servidor decide qual é o corrente.
    expect(pedidas.map((u) => u.path).toSet(), <String>{
      '/me/sequencia',
      '/me/sequencia/calendario',
    });
    expect(pedidas.every((u) => u.queryParameters.isEmpty), isTrue);
    expect(find.text('Sequência'), findsOneWidget);
    expect(find.byType(CartaoDeSequencia), findsOneWidget);
    expect(find.text('Setembro de 2026'), findsOneWidget);
    expect(find.text('20 dias com leitura', findRichText: true), findsOneWidget);
    expect(find.bySemanticsLabel('24 de setembro, hoje, com leitura'), findsOneWidget);
    expect(find.bySemanticsLabel('12 de setembro, sem leitura'), findsOneWidget);
    expect(find.bySemanticsLabel('28 de setembro, dia futuro'), findsOneWidget);
    expect(find.text('Dia com leitura'), findsOneWidget);
    expect(habilitado(tester, 'Mês anterior'), isTrue);
    expect(habilitado(tester, 'Próximo mês'), isFalse);

    // O caret desabilitado não pede nada.
    final antes = pedidas.length;
    await tester.tap(botao('Próximo mês'));
    await assentar(tester);
    expect(pedidas, hasLength(antes));
    expect(find.text('Hoje ainda não tem registro.', findRichText: true), findsNothing);
    semantica.dispose();
  });

  testWidgets('a faixa liga 14 a 20 e quebra no domingo 13 (pintor de cada dia)', (tester) async {
    await montar(tester, servidor(meses: <String, Map<String, Object?>>{'2026-09': setembro}));

    PintorDoDia pintor(int dia) =>
        tester.widget<CustomPaint>(find.byKey(ValueKey<String>('dia-$dia'))).painter!
            as PintorDoDia;
    expect(pintor(13).ligadaAEsquerda || pintor(13).ligadaADireita, isFalse);
    expect(pintor(14).ligadaAEsquerda, isFalse);
    expect(pintor(17).ligadaAEsquerda && pintor(17).ligadaADireita, isTrue);
    expect(pintor(11).situacao.leu, isFalse);
  });

  testWidgets('hoje ainda sem registro: anel sem círculo e a frase sem alerta', (tester) async {
    final semantica = tester.ensureSemantics();
    await montar(
      tester,
      servidor(
        meses: <String, Map<String, Object?>>{
          '2026-09': _calendario('2026-09', hoje: '2026-09-25', dias: _diasDeSetembro),
        },
      ),
    );

    expect(find.bySemanticsLabel('25 de setembro, hoje, sem leitura ainda'), findsOneWidget);
    expect(find.bySemanticsLabel('24 de setembro, com leitura'), findsOneWidget);
    expect(
      find.text(
        'Hoje ainda não tem registro. Registre ao menos 1 página até o fim do dia para manter a '
        'sequência.',
      ),
      findsOneWidget,
    );
    expect(find.byType(BannerAviso), findsNothing);
    semantica.dispose();
  });

  testWidgets('voltar mês a mês até o mais antigo, com mês vazio e caret desabilitado', (
    tester,
  ) async {
    final semantica = tester.ensureSemantics();
    await montar(
      tester,
      servidor(
        meses: <String, Map<String, Object?>>{
          '2026-09': setembro,
          '2026-08': _calendario('2026-08'),
          '2026-07': _calendario('2026-07', dias: <int>[1]),
          '2026-06': _calendario('2026-06'),
          '2026-05': _calendario('2026-05'),
          '2026-04': _calendario('2026-04', dias: <int>[18, 19]),
        },
      ),
    );

    await tester.tap(botao('Mês anterior'));
    await assentar(tester);
    await tester.pumpAndSettle();
    expect(pedidas.last.queryParameters['mes'], '2026-08');
    expect(find.text('Agosto de 2026'), findsOneWidget);
    expect(find.text('Nenhum dia com leitura'), findsOneWidget);
    expect(habilitado(tester, 'Próximo mês'), isTrue);

    await tester.tap(botao('Mês anterior'));
    await assentar(tester);
    await tester.pumpAndSettle();
    expect(find.text('1 dia com leitura', findRichText: true), findsOneWidget);

    for (var i = 0; i < 3; i++) {
      await tester.tap(botao('Mês anterior'));
      await assentar(tester);
      await tester.pumpAndSettle();
    }
    expect(find.text('Abril de 2026'), findsOneWidget);
    expect(habilitado(tester, 'Mês anterior'), isFalse);
    expect(find.text('Este é o mês mais antigo disponível no calendário.'), findsOneWidget);
    // O resumo é sempre o de hoje, não o do mês exibido.
    expect(find.text('dias seguidos'), findsOneWidget);
    semantica.dispose();
  });

  testWidgets('deslizar para a direita volta um mês, para a esquerda avança', (tester) async {
    await montar(
      tester,
      servidor(
        meses: <String, Map<String, Object?>>{
          '2026-09': setembro,
          '2026-08': _calendario('2026-08', dias: <int>[3]),
        },
      ),
    );

    await tester.fling(find.byType(GradeDoMes), const Offset(300, 0), 1000);
    await assentar(tester);
    await tester.pumpAndSettle();
    expect(find.text('Agosto de 2026'), findsOneWidget);

    await tester.fling(find.byType(GradeDoMes), const Offset(-300, 0), 1000);
    await assentar(tester);
    await tester.pumpAndSettle();
    expect(find.text('Setembro de 2026'), findsOneWidget);
  });

  testWidgets('conta sem progresso: frase de conta nova, sem frase de mês mais antigo', (
    tester,
  ) async {
    final semantica = tester.ensureSemantics();
    await montar(
      tester,
      servidor(
        sequencia: _sequencia(0, 0),
        meses: <String, Map<String, Object?>>{
          '2026-09': _calendario('2026-09', mesMaisAntigo: '2026-09'),
        },
      ),
    );

    expect(find.text('leia hoje para começar'), findsOneWidget);
    expect(find.text('Nenhum dia com leitura'), findsOneWidget);
    expect(
      find.text('Cada dia em que você registrar ao menos 1 página aparece marcado aqui.'),
      findsOneWidget,
    );
    expect(find.text('Este é o mês mais antigo disponível no calendário.'), findsNothing);
    expect(habilitado(tester, 'Mês anterior'), isFalse);
    expect(habilitado(tester, 'Próximo mês'), isFalse);
    semantica.dispose();
  });

  testWidgets('falha ao trocar de mês: banner no lugar da grade, resumo fica e tenta de novo', (
    tester,
  ) async {
    final meses = <String, Map<String, Object?>>{'2026-09': setembro};
    final falhar = <String>{'2026-08'};
    await montar(tester, servidor(meses: meses, falhar: falhar));

    await tester.tap(botao('Mês anterior'));
    await assentar(tester);
    await tester.pumpAndSettle();

    expect(
      find.text('Não foi possível carregar agosto de 2026. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    expect(find.byType(CartaoDeSequencia), findsOneWidget);
    expect(find.byType(GradeDoMes), findsNothing);

    falhar.clear();
    meses['2026-08'] = _calendario('2026-08', dias: <int>[2, 3]);
    await tester.tap(find.text('Tentar de novo'));
    await assentar(tester);
    await tester.pumpAndSettle();
    expect(find.text('2 dias com leitura', findRichText: true), findsOneWidget);
  });

  testWidgets('mês que saiu da janela (422) volta ao mês corrente', (tester) async {
    final meses = <String, Map<String, Object?>>{
      '2026-09': setembro,
      '2026-08': _calendario('2026-08'),
    };
    await montar(tester, servidor(meses: meses));
    // O servidor virou o mês: agosto não está mais na janela.
    meses.remove('2026-08');

    await tester.tap(find.bySemanticsLabel('Mês anterior'));
    await assentar(tester);
    await tester.pumpAndSettle();

    expect(find.text('Setembro de 2026'), findsOneWidget);
    expect(find.byType(GradeDoMes), findsOneWidget);
    expect(find.byType(BannerAviso), findsNothing);
  });

  testWidgets('serviço indisponível ao abrir: banner de erro e Tentar de novo recarrega', (
    tester,
  ) async {
    var falhar = true;
    final ok = servidor(meses: <String, Map<String, Object?>>{'2026-09': setembro});
    await montar(
      tester,
      (request) async =>
          falhar ? erro(503, 'SERVICO_INDISPONIVEL', 'Serviço indisponível.') : ok(request),
    );

    expect(
      find.text('Não foi possível carregar seu calendário. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    falhar = false;
    await tester.tap(find.text('Tentar de novo'));
    await assentar(tester);
    await tester.pumpAndSettle();
    expect(find.byType(GradeDoMes), findsOneWidget);
  });

  testWidgets('sem conexão: banner neutro e a linha dos registros da fila do aparelho', (
    tester,
  ) async {
    final fila = FilaDeProgresso(
      progressoSimulado((_) async => http.Response('{}', 200)),
      ArmazemEmMemoria(jsonEncode(<Object?>[pendente('k1', 10).toJson()])),
    );
    await montar(tester, (_) async => throw http.ClientException('sem rede'), fila: fila);
    await tester.pump(const Duration(milliseconds: 10));

    expect(
      find.text('Você está sem conexão. O calendário aparece quando a conexão voltar.'),
      findsOneWidget,
    );
    expect(find.byType(BannerAviso), findsNothing);
    expect(
      find.text(
        '1 registro ainda não foi enviado. O dia aparece marcado depois que ele chegar ao servidor.',
      ),
      findsOneWidget,
    );
    expect(find.byType(GradeDoMes), findsNothing);
  });

  testWidgets('cold start: skeleton, aviso depois de 3 s e, no tempo esgotado, o erro', (
    tester,
  ) async {
    await montar(tester, (request) async {
      await Future<void>.delayed(const Duration(seconds: 8));
      return json(_sequencia(1, 1), 200);
    }, timeout: const Duration(seconds: 5));

    expect(find.byType(GradeEsqueleto), findsOneWidget);
    expect(find.text('O serviço está iniciando. Isso pode levar alguns segundos.'), findsNothing);
    await tester.pump(const Duration(seconds: 3));
    expect(find.text('O serviço está iniciando. Isso pode levar alguns segundos.'), findsOneWidget);

    // Timeout e retentativas; deixa também as respostas atrasadas do servidor terminarem.
    await tester.pump(const Duration(seconds: 30));
    expect(
      find.text('Não foi possível carregar seu calendário. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
  });

  testWidgets('texto ampliado: cabeçalho de uma letra, nome completo no rótulo, sem estourar', (
    tester,
  ) async {
    final semantica = tester.ensureSemantics();
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await montar(tester, servidor(meses: <String, Map<String, Object?>>{'2026-09': setembro}));

    expect(tester.takeException(), isNull);
    expect(find.text('seg'), findsNothing);
    expect(find.bySemanticsLabel('segunda-feira'), findsOneWidget);
    semantica.dispose();
  });

  testWidgets('modo escuro: dia com leitura em broto-vivo', (tester) async {
    usarTelaDeCelular(tester);
    final servico = SequenciaService(
      ApiClient(
        baseUrl: 'https://leitura.example.com',
        client: MockClient(servidor(meses: <String, Map<String, Object?>>{'2026-09': setembro})),
        esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
      ),
    );
    await tester.pumpWidget(envolver(CalendarioDaSequenciaPage(servico: servico), escuro: true));
    await tester.pumpAndSettle();

    final pintor =
        tester.widget<CustomPaint>(find.byKey(const ValueKey<String>('dia-23'))).painter!
            as PintorDoDia;
    expect(pintor.corDoDia, DesignTokens.brotoVivo);
  });
}
