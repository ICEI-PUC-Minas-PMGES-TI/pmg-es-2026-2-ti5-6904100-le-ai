import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/notificacoes/notificacao.dart';
import 'package:le_ai_mobile/features/notificacoes/preferencias_de_notificacao.dart';
import 'package:le_ai_mobile/features/notificacoes/preferencias_de_notificacao_page.dart';
import 'package:le_ai_mobile/features/notificacoes/preferencias_de_notificacao_service.dart';
import 'package:le_ai_mobile/features/notificacoes/servico_de_push.dart';

import '../livros/apoio.dart';

const String _erroAoSalvar = 'Não foi possível salvar. Verifique sua conexão e tente de novo.';
const String _tituloDoAviso = 'As notificações no celular estão desligadas';

class _Servidor {
  final Map<String, bool> estado = <String, bool>{
    for (final tipo in TipoPreferenciaNotificacao.values) tipo.valorDoContrato: true,
  };
  final List<http.Request> escritas = <http.Request>[];
  int statusDoGet = 200;
  int statusDoPut = 200;

  Future<http.Response> responder(http.Request requisicao) async {
    if (requisicao.method == 'GET') {
      if (statusDoGet != 200) {
        return erro(statusDoGet, 'SERVICO_INDISPONIVEL', 'Serviço indisponível.');
      }
      return json(<String, Object?>{
        'preferencias': <Object?>[
          for (final entrada in estado.entries)
            <String, Object?>{'tipo': entrada.key, 'habilitada': entrada.value},
          <String, Object?>{'tipo': 'TIPO_DO_FUTURO', 'habilitada': false},
        ],
      }, 200);
    }
    escritas.add(requisicao);
    if (statusDoPut != 200) {
      return erro(statusDoPut, 'SERVICO_INDISPONIVEL', 'Serviço indisponível.');
    }
    final corpo = jsonDecode(requisicao.body) as Map<String, dynamic>;
    for (final item in corpo['preferencias'] as List<dynamic>) {
      estado[item['tipo'] as String] = item['habilitada'] as bool;
    }
    return json(<String, Object?>{'preferencias': <Object?>[]}, 200);
  }
}

class _PushFalso implements ServicoDePush {
  bool permitidas;
  int ajustesAbertos = 0;

  _PushFalso({this.permitidas = true});

  @override
  Future<bool> notificacoesPermitidas() async => permitidas;

  @override
  Future<void> abrirAjustesDeNotificacao() async => ajustesAbertos++;
}

PreferenciasDeNotificacaoService _servico(_Servidor servidor) => PreferenciasDeNotificacaoService(
  ApiClient(
    baseUrl: 'https://social.example.com',
    client: MockClient(servidor.responder),
    esperasDeRetentativa: const <Duration>[],
  ),
);

Future<void> _abrir(
  WidgetTester tester,
  _Servidor servidor, {
  ServicoDePush? push,
}) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    envolver(
      PreferenciasDeNotificacaoPage(
        servico: _servico(servidor),
        servicoDePush: push,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Finder _linha(String titulo) => find.ancestor(
  of: find.text(titulo),
  matching: find.byWidgetPredicate((w) => w is Semantics && w.properties.toggled != null),
);

bool? _ligada(WidgetTester tester, String titulo) =>
    tester.widget<Semantics>(_linha(titulo)).properties.toggled;

void main() {
  test('todo tipo de notificação da lista é configurável', () {
    final cobertos = TipoPreferenciaNotificacao.values.map((tipo) => tipo.notificacao).toSet();
    expect(cobertos, containsAll(TipoNotificacao.values));
  });

  testWidgets('mostra os doze tipos nas quatro seções com o estado do servidor', (tester) async {
    final servidor = _Servidor()..estado['ATIVIDADE_CURTIDA'] = false;
    await _abrir(tester, servidor);

    for (final titulo in <String>[
      'Seguidores',
      'Atividades e comentários',
      'Resenhas e recomendações',
      'Leituras',
    ]) {
      expect(find.text(titulo), findsOneWidget);
    }
    expect(find.byWidgetPredicate((w) => w is Semantics && w.properties.toggled != null),
        findsNWidgets(TipoPreferenciaNotificacao.values.length));
    expect(_ligada(tester, 'Curtida em atividade'), isFalse);
    expect(_ligada(tester, 'Novo seguidor'), isTrue);
    expect(find.text(_tituloDoAviso), findsNothing);
  });

  testWidgets('o toque salva só aquela linha, na hora, com Idempotency-Key', (tester) async {
    final servidor = _Servidor();
    await _abrir(tester, servidor);

    await tester.tap(find.text('Menção em comentário'));
    await tester.pump();

    expect(_ligada(tester, 'Menção em comentário'), isFalse);
    await tester.pumpAndSettle();
    expect(servidor.escritas, hasLength(1));
    expect(servidor.escritas.single.method, 'PUT');
    expect(servidor.escritas.single.headers['Idempotency-Key'], isNotEmpty);
    expect(jsonDecode(servidor.escritas.single.body), <String, Object?>{
      'preferencias': <Object?>[
        <String, Object?>{'tipo': 'USUARIO_MENCIONADO', 'habilitada': false},
      ],
    });
    expect(servidor.estado['USUARIO_MENCIONADO'], isFalse);
    expect(find.text(_erroAoSalvar), findsNothing);
  });

  testWidgets('falha ao salvar volta o switch com erro na linha; o próximo toque tenta de novo', (
    tester,
  ) async {
    final servidor = _Servidor()..statusDoPut = 503;
    await _abrir(tester, servidor);

    await tester.tap(find.text('Comentário em atividade'));
    await tester.pumpAndSettle();

    expect(_ligada(tester, 'Comentário em atividade'), isTrue);
    expect(find.text(_erroAoSalvar), findsOneWidget);
    expect(_ligada(tester, 'Novo seguidor'), isTrue);

    servidor.statusDoPut = 200;
    await tester.tap(find.text('Comentário em atividade'));
    await tester.pumpAndSettle();

    expect(_ligada(tester, 'Comentário em atividade'), isFalse);
    expect(find.text(_erroAoSalvar), findsNothing);
    expect(servidor.estado['ATIVIDADE_COMENTADA'], isFalse);
  });

  testWidgets('toque enquanto a linha ainda salva não dispara um segundo PUT', (tester) async {
    final liberar = Completer<http.Response>();
    final servidor = _Servidor();
    final esperando = PreferenciasDeNotificacaoService(
      ApiClient(
        baseUrl: 'https://social.example.com',
        client: MockClient((requisicao) {
          if (requisicao.method == 'PUT') {
            servidor.escritas.add(requisicao);
            return liberar.future;
          }
          return servidor.responder(requisicao);
        }),
      ),
    );
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(envolver(PreferenciasDeNotificacaoPage(servico: esperando)));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Novo seguidor'));
    await tester.pump();
    await tester.tap(find.text('Novo seguidor'));
    await tester.pump();
    liberar.complete(json(<String, Object?>{'preferencias': <Object?>[]}, 200));
    await tester.pumpAndSettle();

    expect(servidor.escritas, hasLength(1));
    expect(_ligada(tester, 'Novo seguidor'), isFalse);
  });

  testWidgets('falha ao carregar não mostra switch e Tentar de novo recarrega', (tester) async {
    final servidor = _Servidor()..statusDoGet = 503;
    await _abrir(tester, servidor);

    expect(
      find.text('Não foi possível carregar suas preferências. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    expect(find.byWidgetPredicate((w) => w is Semantics && w.properties.toggled != null),
        findsNothing);

    servidor.statusDoGet = 200;
    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();

    expect(find.text('Novo seguidor'), findsOneWidget);
    expect(find.text('Tentar de novo'), findsNothing);
  });

  testWidgets('push negado no aparelho mostra o aviso, que some quando a permissão volta', (
    tester,
  ) async {
    final push = _PushFalso(permitidas: false);
    await _abrir(tester, _Servidor(), push: push);

    expect(find.text(_tituloDoAviso), findsOneWidget);
    expect(_ligada(tester, 'Novo seguidor'), isTrue);

    await tester.tap(find.text('Abrir ajustes do Android'));
    expect(push.ajustesAbertos, 1);

    push.permitidas = true;
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();

    expect(find.text(_tituloDoAviso), findsNothing);
  });

  testWidgets('a linha é um único controle de switch para o leitor de tela', (tester) async {
    final semantica = tester.ensureSemantics();
    await _abrir(tester, _Servidor());

    final no = tester.getSemantics(find.text('Novo seguidor'));
    expect(
      no,
      matchesSemantics(
        label: 'Novo seguidor',
        hint: 'Quando alguém começa a seguir você.',
        hasToggledState: true,
        isToggled: true,
        hasTapAction: true,
        hasEnabledState: false,
      ),
    );

    tester.semantics.tap(find.semantics.byLabel('Novo seguidor'));
    await tester.pumpAndSettle();
    expect(_ligada(tester, 'Novo seguidor'), isFalse);
    semantica.dispose();
  });
}
