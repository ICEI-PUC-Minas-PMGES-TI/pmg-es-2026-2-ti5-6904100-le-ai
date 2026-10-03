import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/notificacoes/contador_de_nao_lidas.dart';
import 'package:le_ai_mobile/features/notificacoes/notificacao.dart';
import 'package:le_ai_mobile/features/notificacoes/notificacoes_page.dart';
import 'package:le_ai_mobile/features/notificacoes/notificacoes_service.dart';
import 'package:le_ai_mobile/features/notificacoes/rotas_notificacoes.dart';
import 'package:le_ai_mobile/features/livros/rotas_livros.dart';

import '../livros/apoio.dart';

const String _leituraEmRisco = 'n-risco';
const String _leituraId = 'leitura-1';

/// `social` e `leitura` simulados: guardam o estado lida/não lida e registram cada escrita, para
/// o teste conferir o que o app mandou e o que a tela mostrou.
class _Servidor {
  final List<Map<String, Object?>> notificacoes;
  final List<http.Request> escritas = <http.Request>[];
  int statusDoAbandono = 200;
  int statusDaLista = 200;

  _Servidor(this.notificacoes);

  int get naoLidas => notificacoes.where((n) => n['lida'] != true).length;

  Future<http.Response> responder(http.Request requisicao) async {
    final caminho = requisicao.url.path;
    if (requisicao.method == 'GET' && caminho == '/notificacoes') {
      if (statusDaLista != 200) {
        return erro(statusDaLista, 'SERVICO_INDISPONIVEL', 'Serviço indisponível.');
      }
      final pagina = int.parse(requisicao.url.queryParameters['page']!);
      final tamanho = int.parse(requisicao.url.queryParameters['size']!);
      final inicio = pagina * tamanho;
      final fim = (inicio + tamanho).clamp(0, notificacoes.length);
      return json(<String, Object?>{
        'itens': inicio >= notificacoes.length ? <Object>[] : notificacoes.sublist(inicio, fim),
        'pagina': pagina,
        'tamanho': tamanho,
        'totalItens': notificacoes.length,
        'totalPaginas': (notificacoes.length + tamanho - 1) ~/ tamanho,
        'ultima': fim >= notificacoes.length,
        'totalNaoLidas': naoLidas,
      }, 200);
    }
    escritas.add(requisicao);
    if (caminho == '/notificacoes/marcar-lidas') {
      final corpo = jsonDecode(requisicao.body) as Map<String, dynamic>;
      final ids = corpo['modo'] == 'TODAS'
          ? notificacoes.map((n) => n['id']).toSet()
          : (corpo['ids'] as List<dynamic>).toSet();
      var marcadas = 0;
      for (final n in notificacoes) {
        if (ids.contains(n['id']) && n['lida'] != true) {
          n['lida'] = true;
          marcadas++;
        }
      }
      return json(<String, Object?>{'marcadas': marcadas, 'totalNaoLidas': naoLidas}, 200);
    }
    if (caminho == '/leituras/$_leituraId/abandonar') {
      return statusDoAbandono == 200
          ? json(<String, Object?>{'id': _leituraId, 'estado': 'ABANDONADO'}, 200)
          : erro(statusDoAbandono, 'CONFLITO', 'A leitura não está em andamento.');
    }
    return erro(404, 'RECURSO_NAO_ENCONTRADO', 'Não encontramos o que você procura.');
  }

  List<http.Request> escritasEm(String caminho) =>
      escritas.where((r) => r.url.path == caminho).toList();
}

Map<String, Object?> _notificacao(
  String id,
  String tipo,
  String mensagem, {
  bool lida = false,
  Map<String, Object?>? ator,
  bool comAcao = false,
}) => <String, Object?>{
  'id': id,
  'tipo': tipo,
  'mensagem': mensagem,
  'ator': ator,
  'atividadeId': null,
  'comentarioId': null,
  'leituraId': comAcao ? _leituraId : null,
  'limiarDias': comAcao ? 30 : null,
  'livro': comAcao
      ? <String, Object?>{'id': 'livro-1', 'tipo': 'oficial', 'titulo': 'O Avesso da Pele'}
      : null,
  'acao': comAcao
      ? <String, Object?>{
          'tipo': 'ABANDONAR_LEITURA',
          'rotulo': 'Abandonar leitura',
          'service': 'leitura',
          'method': 'POST',
          'path': '/leituras/{leituraId}/abandonar',
          'recursoId': _leituraId,
          'requerConfirmacao': true,
        }
      : null,
  'lida': lida,
  'lidaEm': null,
  'criadoEm': DateTime.now().toUtc().subtract(const Duration(hours: 1)).toIso8601String(),
};

List<Map<String, Object?>> _caixaPadrao() => <Map<String, Object?>>[
  _notificacao(
    _leituraEmRisco,
    'LEITURA_EM_RISCO',
    'Você não registra progresso em O Avesso da Pele há 30 dias. No dia 40 ele é abandonado '
        'automaticamente.',
    comAcao: true,
  ),
  _notificacao(
    'n-seguidor',
    'NOVO_SEGUIDOR',
    'Caio Ferraz começou a seguir você.',
    ator: <String, Object?>{'id': 'u-1', 'username': 'caioferraz', 'nomeExibicao': 'Caio Ferraz'},
  ),
  _notificacao(
    'n-curtida',
    'ATIVIDADE_CURTIDA',
    'Dandara Lopes curtiu sua resenha de Vidas Secas.',
    lida: true,
  ),
];

class _Tela {
  final _Servidor servidor;
  final ContadorDeNaoLidas contador;
  final List<Notificacao> abertas = <Notificacao>[];
  final List<Notificacao> progresso = <Notificacao>[];

  _Tela(this.servidor, {Duration timeout = const Duration(seconds: 90)})
    : contador = ContadorDeNaoLidas(_servico(servidor, timeout));

  static NotificacoesService _servico(_Servidor servidor, Duration timeout) {
    ApiClient cliente(String baseUrl) => ApiClient(
      baseUrl: baseUrl,
      client: MockClient(servidor.responder),
      timeout: timeout,
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    );
    return NotificacoesService(
      cliente('https://social.example.com'),
      cliente('https://leitura.example.com'),
    );
  }

  Future<void> abrir(WidgetTester tester, {Duration timeout = const Duration(seconds: 90)}) async {
    await tester.pumpWidget(
      envolver(
        NotificacoesPage(
          servico: _servico(servidor, timeout),
          contador: contador,
          aoAbrir: abertas.add,
          aoRegistrarProgresso: progresso.add,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }
}

void main() {
  testWidgets('lista com nao lidas: contagem, Marcar todas e badge em dia', (tester) async {
    final tela = _Tela(_Servidor(_caixaPadrao()));

    await tela.abrir(tester);

    expect(find.text('2 não lidas'), findsOneWidget);
    expect(find.text('Marcar todas'), findsOneWidget);
    expect(find.textContaining('Caio Ferraz'), findsOneWidget);
    expect(find.textContaining('Vidas Secas'), findsOneWidget);
    expect(tela.contador.total, 2);
  });

  testWidgets('abrir uma nao lida marca so ela como lida e leva ao destino', (tester) async {
    final servidor = _Servidor(_caixaPadrao());
    final tela = _Tela(servidor);
    await tela.abrir(tester);

    await tester.tap(find.textContaining('começou a seguir você'));
    await tester.pumpAndSettle();

    final marcacoes = servidor.escritasEm('/notificacoes/marcar-lidas');
    expect(marcacoes, hasLength(1));
    expect(jsonDecode(marcacoes.single.body), <String, Object?>{
      'modo': 'SELECIONADAS',
      'ids': <String>['n-seguidor'],
    });
    expect(marcacoes.single.headers['Idempotency-Key'], isNotEmpty);
    expect(tela.abertas.single.id, 'n-seguidor');
    expect(tela.contador.total, 1);
    expect(find.text('1 não lida'), findsOneWidget);
  });

  testWidgets('mencao aparece com a frase do servidor e leva ao feed', (tester) async {
    final tela = _Tela(
      _Servidor(<Map<String, Object?>>[
        _notificacao(
          'n-mencao',
          'USUARIO_MENCIONADO',
          'Tiago Moreira mencionou você num comentário na atividade de Rafael Okamoto.',
          ator: <String, Object?>{'id': 'u-2', 'username': 'tiagom', 'nomeExibicao': 'Tiago Moreira'},
        ),
      ]),
    );
    await tela.abrir(tester);

    await tester.tap(find.textContaining('mencionou você num comentário'));
    await tester.pumpAndSettle();

    expect(tela.abertas.single.tipo, TipoNotificacao.usuarioMencionado);
    expect(destinoDaNotificacao(tela.abertas.single), rotaFeedRaiz);
  });

  testWidgets('Marcar todas zera o badge e some junto com a linha de contexto', (tester) async {
    final servidor = _Servidor(_caixaPadrao());
    final tela = _Tela(servidor);
    await tela.abrir(tester);

    await tester.tap(find.text('Marcar todas'));
    await tester.pumpAndSettle();

    expect(
      jsonDecode(servidor.escritasEm('/notificacoes/marcar-lidas').single.body),
      <String, Object?>{'modo': 'TODAS'},
    );
    expect(tela.contador.total, 0);
    expect(find.text('Marcar todas'), findsNothing);
    expect(find.textContaining('não lida'), findsNothing);
    // Nada sai da lista: lido é só a ausência do ponto.
    expect(find.textContaining('Caio Ferraz'), findsOneWidget);
  });

  testWidgets('abandonar pede confirmacao; cancelar nao chama o leitura', (tester) async {
    final servidor = _Servidor(_caixaPadrao());
    await _Tela(servidor).abrir(tester);

    await tester.tap(find.text('Abandonar leitura'));
    await tester.pumpAndSettle();

    expect(find.text('Abandonar O Avesso da Pele?'), findsOneWidget);
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();

    expect(servidor.escritasEm('/leituras/$_leituraId/abandonar'), isEmpty);
    expect(find.text('Abandonar leitura'), findsOneWidget);
  });

  testWidgets('abandonar confirmado chama o leitura, informa e marca a notificacao como lida', (
    tester,
  ) async {
    final servidor = _Servidor(_caixaPadrao());
    final tela = _Tela(servidor);
    await tela.abrir(tester);

    await tester.tap(find.text('Abandonar leitura'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(OutlinedButton, 'Abandonar'));
    await tester.pumpAndSettle();

    final abandono = servidor.escritasEm('/leituras/$_leituraId/abandonar');
    expect(abandono, hasLength(1));
    expect(abandono.single.headers['Idempotency-Key'], isNotEmpty);
    expect(find.text('Leitura abandonada.'), findsOneWidget);
    expect(find.text('Abandonar leitura'), findsNothing);
    expect(
      jsonDecode(servidor.escritasEm('/notificacoes/marcar-lidas').single.body)['ids'],
      <String>[_leituraEmRisco],
    );
    expect(tela.contador.total, 1);
    // Não navega: o item fica na lista informando o que foi feito.
    expect(tela.abertas, isEmpty);
  });

  testWidgets('leitura que ja saiu de andamento mostra o motivo e mantem as acoes', (tester) async {
    final servidor = _Servidor(_caixaPadrao())..statusDoAbandono = 409;
    await _Tela(servidor).abrir(tester);

    await tester.tap(find.text('Abandonar leitura'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(OutlinedButton, 'Abandonar'));
    await tester.pumpAndSettle();

    expect(find.text('Esta leitura não está mais em andamento.'), findsOneWidget);
    expect(find.text('Leitura abandonada.'), findsNothing);
    expect(servidor.escritasEm('/notificacoes/marcar-lidas'), isEmpty);
  });

  testWidgets('Registrar progresso leva a leitura sem abandonar', (tester) async {
    final servidor = _Servidor(_caixaPadrao());
    final tela = _Tela(servidor);
    await tela.abrir(tester);

    await tester.tap(find.text('Registrar progresso'));
    await tester.pumpAndSettle();

    expect(tela.progresso.single.leituraId, _leituraId);
    expect(servidor.escritasEm('/leituras/$_leituraId/abandonar'), isEmpty);
  });

  testWidgets('rolar ate o fim carrega a proxima pagina sem repetir nem recarregar', (
    tester,
  ) async {
    final muitas = List<Map<String, Object?>>.generate(
      25,
      (i) => _notificacao('n-$i', 'NOVO_SEGUIDOR', 'Leitor $i começou a seguir você.', lida: true),
    );
    final servidor = _Servidor(muitas);
    await _Tela(servidor).abrir(tester);

    await tester.scrollUntilVisible(find.text('Leitor 24 começou a seguir você.'), 400);
    await tester.pumpAndSettle();

    expect(find.text('Leitor 24 começou a seguir você.'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Leitor 0 começou a seguir você.'), -400);
    expect(find.text('Leitor 0 começou a seguir você.'), findsOneWidget);
  });

  testWidgets('servico indisponivel mostra o erro e Tentar de novo recarrega', (tester) async {
    final servidor = _Servidor(_caixaPadrao())..statusDaLista = 503;
    await _Tela(servidor).abrir(tester);

    expect(
      find.text(
        'Não foi possível carregar suas notificações. Verifique sua conexão e tente de novo.',
      ),
      findsOneWidget,
    );
    expect(find.text('Marcar todas'), findsNothing);

    servidor.statusDaLista = 200;
    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Caio Ferraz'), findsOneWidget);
  });

  testWidgets('timeout de cold start vira o mesmo erro recuperavel', (tester) async {
    final servidor = _Servidor(_caixaPadrao());
    final tela = _Tela(servidor);
    final pendente = Completer<http.Response>();
    await tester.pumpWidget(
      envolver(
        NotificacoesPage(
          servico: NotificacoesService(
            ApiClient(
              baseUrl: 'https://social.example.com',
              client: MockClient((_) => pendente.future),
              timeout: const Duration(seconds: 5),
            ),
            ApiClient(baseUrl: 'https://leitura.example.com'),
          ),
          contador: tela.contador,
          aoAbrir: (_) {},
          aoRegistrarProgresso: (_) {},
        ),
      ),
    );

    // Enquanto espera, é carregamento, não erro (RNF-ERR-09).
    await tester.pump(const Duration(seconds: 1));
    expect(find.textContaining('Não foi possível carregar'), findsNothing);

    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.text('Tentar de novo'), findsOneWidget);
  });

  testWidgets('sem notificacoes mostra o vazio sem Marcar todas', (tester) async {
    await _Tela(_Servidor(<Map<String, Object?>>[])).abrir(tester);

    expect(find.text('Nada por enquanto'), findsOneWidget);
    expect(find.text('Marcar todas'), findsNothing);
  });
}
