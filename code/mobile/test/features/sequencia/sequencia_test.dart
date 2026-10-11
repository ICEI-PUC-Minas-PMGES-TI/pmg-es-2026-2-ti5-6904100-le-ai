import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/design/tokens.dart';
import 'package:le_ai_mobile/design/widgets/banner_aviso.dart';
import 'package:le_ai_mobile/design/widgets/cartao_de_sequencia.dart';
import 'package:le_ai_mobile/features/perfil/perfil_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';
import 'package:le_ai_mobile/features/sequencia/sequencia_do_perfil.dart';
import 'package:le_ai_mobile/features/sequencia/sequencia_service.dart';

import '../livros/apoio.dart';

Map<String, Object?> _sequencia(int atual, int maior) => <String, Object?>{
  'sequenciaAtual': atual,
  'maiorSequencia': maior,
  'ultimoDiaComLeitura': atual == 0 && maior == 0 ? null : '2026-10-08',
};

SequenciaService _servico(
  Future<http.Response> Function(http.Request) handler, {
  Duration timeout = const Duration(seconds: 90),
}) => SequenciaService(
  ApiClient(
    baseUrl: 'https://leitura.example.com',
    client: MockClient(handler),
    timeout: timeout,
    esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
  ),
);

void main() {
  late List<Uri> pedidas;

  /// Respostas e retentativas sem espera terminam em alguns ciclos.
  Future<void> assentar(WidgetTester tester) async {
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 1));
    }
  }

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) responder, {
    bool escuro = false,
    ValueListenable<int>? alteracoes,
    Duration timeout = const Duration(seconds: 90),
  }) async {
    usarTelaDeCelular(tester);
    pedidas = <Uri>[];
    final servico = _servico((request) {
      pedidas.add(request.url);
      return responder(request);
    }, timeout: timeout);
    await tester.pumpWidget(
      envolver(
        Padding(
          padding: const EdgeInsets.all(20),
          child: SequenciaDoPerfil(servico: servico, alteracoes: alteracoes),
        ),
        escuro: escuro,
      ),
    );
    await assentar(tester);
  }

  Color corDoNumero(WidgetTester tester, String numero) {
    final rico = tester.widget<RichText>(
      find.byWidgetPredicate((w) => w is RichText && w.text.toPlainText().contains(numero)),
    );
    // O número herda a cor do estilo da raiz do texto.
    return (rico.text as TextSpan).children!.whereType<TextSpan>().first.style!.color!;
  }

  testWidgets('pede /me/sequencia e mostra a atual, o recorde e a regra', (tester) async {
    await montar(tester, (_) async => json(_sequencia(12, 31), 200));

    expect(pedidas.single.path, '/me/sequencia');
    expect(find.text('Sequência diária'), findsOneWidget);
    expect(find.textContaining('12'), findsOneWidget);
    expect(find.text('dias seguidos'), findsOneWidget);
    expect(find.text('Recorde: 31 dias', findRichText: true), findsOneWidget);
    expect(find.text('Conta cada dia em que você registra ao menos 1 página.'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.flame), findsOneWidget);
    expect(find.byType(BannerAviso), findsNothing);
  });

  testWidgets('o leitor de tela lê o bloco como um rótulo só', (tester) async {
    final semantica = tester.ensureSemantics();
    await montar(tester, (_) async => json(_sequencia(12, 31), 200));

    expect(
      find.bySemanticsLabel('Sequência diária: 12 dias seguidos. Recorde: 31 dias.'),
      findsOneWidget,
    );
    semantica.dispose();
  });

  testWidgets('zerada não é erro: "leia hoje para começar" e o recorde mantido (RN-18.6)', (
    tester,
  ) async {
    await montar(tester, (_) async => json(_sequencia(0, 31), 200));

    expect(find.textContaining('0'), findsWidgets);
    expect(find.text('leia hoje para começar'), findsOneWidget);
    expect(find.text('dias seguidos'), findsNothing);
    expect(find.text('Recorde: 31 dias', findRichText: true), findsOneWidget);
    expect(find.byType(BannerAviso), findsNothing);
  });

  testWidgets('um dia fica no singular', (tester) async {
    await montar(tester, (_) async => json(_sequencia(1, 1), 200));

    expect(find.text('dia seguido'), findsOneWidget);
    expect(find.text('Recorde: 1 dia', findRichText: true), findsOneWidget);
  });

  testWidgets('número e chama em musgo no claro e broto-vivo no escuro (contraste)', (
    tester,
  ) async {
    await montar(tester, (_) async => json(_sequencia(12, 31), 200));
    expect(corDoNumero(tester, '12'), DesignTokens.musgo);
    expect(tester.widget<Icon>(find.byIcon(PhosphorIconsRegular.flame)).color, DesignTokens.musgo);

    await montar(tester, (_) async => json(_sequencia(12, 31), 200), escuro: true);
    // O `MaterialApp` anima a troca de tema.
    await tester.pumpAndSettle();
    expect(corDoNumero(tester, '12'), DesignTokens.brotoVivo);
  });

  testWidgets('enquanto carrega, o skeleton de 104px', (tester) async {
    await montar(tester, (_) async {
      await Future<void>.delayed(const Duration(seconds: 1));
      return json(_sequencia(3, 3), 200);
    });

    expect(find.byType(SkeletonDeSequencia), findsOneWidget);
    expect(tester.getSize(find.byType(SkeletonDeSequencia)).height, 104);

    await tester.pump(const Duration(seconds: 1));
    expect(find.byType(SkeletonDeSequencia), findsNothing);
    expect(find.text('dias seguidos'), findsOneWidget);
  });

  testWidgets('serviço indisponível mostra o banner do bloco e "Tentar de novo" recarrega', (
    tester,
  ) async {
    var falhar = true;
    await montar(
      tester,
      (_) async => falhar
          ? erro(503, 'SERVICO_INDISPONIVEL', 'Serviço indisponível.')
          : json(_sequencia(5, 9), 200),
    );

    expect(
      find.text('Não foi possível carregar sua sequência. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    falhar = false;
    await tester.tap(find.text('Tentar de novo'));
    await assentar(tester);

    expect(find.byType(BannerAviso), findsNothing);
    expect(find.text('Recorde: 9 dias', findRichText: true), findsOneWidget);
  });

  testWidgets('timeout (cold start) também cai no banner do bloco', (tester) async {
    await montar(tester, (_) async {
      await Future<void>.delayed(const Duration(seconds: 2));
      return json(_sequencia(5, 9), 200);
    }, timeout: const Duration(milliseconds: 100));

    // O GET retenta o timeout; deixa as tentativas e as respostas atrasadas terminarem.
    await tester.pump(const Duration(seconds: 10));

    expect(find.byType(BannerAviso), findsOneWidget);
    expect(find.text('Tentar de novo'), findsOneWidget);
  });

  testWidgets('resposta fora do contrato vira erro, não número inventado', (tester) async {
    await montar(tester, (_) async => json(<String, Object?>{'sequenciaAtual': 'muitos'}, 200));

    expect(find.byType(BannerAviso), findsOneWidget);
  });

  testWidgets('progresso registrado recarrega em silêncio depois do consumo assíncrono', (
    tester,
  ) async {
    final alteracoes = ValueNotifier<int>(0);
    addTearDown(alteracoes.dispose);
    var atual = 4;
    await montar(tester, (_) async => json(_sequencia(atual, 10), 200), alteracoes: alteracoes);
    expect(find.textContaining('4'), findsOneWidget);

    atual = 5;
    // A fila offline manda vários seguidos: uma recarga só, depois do último.
    alteracoes.value++;
    alteracoes.value++;
    await tester.pump(const Duration(seconds: 1));
    expect(pedidas, hasLength(1));

    await tester.pump(const Duration(seconds: 3));
    expect(find.byType(SkeletonDeSequencia), findsNothing);
    await tester.pump();
    expect(pedidas, hasLength(2));
    expect(find.textContaining('5'), findsOneWidget);
  });

  testWidgets('recarga silenciosa que falha mantém a sequência na tela', (tester) async {
    final alteracoes = ValueNotifier<int>(0);
    addTearDown(alteracoes.dispose);
    var falhar = false;
    await montar(
      tester,
      (_) async => falhar
          ? erro(503, 'SERVICO_INDISPONIVEL', 'Serviço indisponível.')
          : json(_sequencia(7, 7), 200),
      alteracoes: alteracoes,
    );

    falhar = true;
    alteracoes.value++;
    await tester.pump(const Duration(seconds: 4));
    await tester.pump();

    expect(find.byType(BannerAviso), findsNothing);
    expect(find.byType(CartaoDeSequencia), findsOneWidget);
  });

  group('no Meu perfil', () {
    Map<String, Object?> perfil() => <String, Object?>{
      'id': 'u1',
      'username': 'marinableu',
      'displayName': 'Marina Beltrão',
      'avatarUrl': null,
      'privacidade': 'publico',
      'conteudoRestrito': false,
      'relacao': 'proprio',
      'biografia': null,
      'contadores': <String, Object?>{'seguidores': 84, 'seguidos': 97},
    };

    PerfilService identidade() => PerfilService(
      ApiClient(
        baseUrl: 'https://identidade.example.com',
        client: MockClient((request) async {
          if (request.url.path == '/me/perfil') {
            return json(perfil(), 200);
          }
          return json(<String, Object?>{
            'items': <Object?>[],
            'page': 0,
            'size': 1,
            'totalElements': 0,
            'totalPages': 0,
          }, 200);
        }),
        esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
      ),
    );

    testWidgets('o bloco entra depois dos contadores e antes das seções de leitura', (
      tester,
    ) async {
      usarTelaDeCelular(tester);
      final sequencia = _servico((_) async => json(_sequencia(12, 31), 200));
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: identidade(),
            sequencia: () => SequenciaDoPerfil(servico: sequencia),
          ),
        ),
      );
      await assentar(tester);

      final cartao = tester.getTopLeft(find.byType(CartaoDeSequencia)).dy;
      expect(tester.getTopLeft(find.text('seguindo')).dy, lessThan(cartao));
      expect(tester.getTopLeft(find.text('Estante')).dy, greaterThan(cartao));
    });

    testWidgets('falha da sequência não derruba o perfil', (tester) async {
      usarTelaDeCelular(tester);
      final sequencia = _servico((_) async => erro(503, 'SERVICO_INDISPONIVEL', 'Fora.'));
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: identidade(),
            sequencia: () => SequenciaDoPerfil(servico: sequencia),
          ),
        ),
      );
      await assentar(tester);

      expect(find.text('Marina Beltrão'), findsOneWidget);
      expect(
        find.text(
          'Não foi possível carregar sua sequência. Verifique sua conexão e tente de novo.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('o skeleton da página traz o bloco da sequência', (tester) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: PerfilService(
              ApiClient(
                baseUrl: 'https://identidade.example.com',
                client: MockClient((_) async {
                  await Future<void>.delayed(const Duration(seconds: 1));
                  return json(perfil(), 200);
                }),
              ),
            ),
            sequencia: () =>
                SequenciaDoPerfil(servico: _servico((_) async => json(_sequencia(1, 1), 200))),
          ),
        ),
      );

      expect(find.byType(SkeletonDeSequencia), findsOneWidget);
      await tester.pump(const Duration(seconds: 1));
      await tester.pump();
    });
  });
}
