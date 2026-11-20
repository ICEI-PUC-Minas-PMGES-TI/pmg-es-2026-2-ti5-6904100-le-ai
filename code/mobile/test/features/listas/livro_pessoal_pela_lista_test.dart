import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/features/estante/estante_service.dart';
import 'package:le_ai_mobile/features/estante/situacao_na_estante.dart';
import 'package:le_ai_mobile/features/livros/capa.dart';
import 'package:le_ai_mobile/features/livros/livro_pessoal_page.dart';
import 'package:le_ai_mobile/features/livros/rotas_livros.dart';
import 'package:le_ai_mobile/features/listas/rotas_listas.dart';

import '../livros/apoio.dart' show acervoSimulado, leituraSimulada;
import 'apoio_listas.dart';

/// Terceiro abre o livro pessoal pela lista do dono, com sucesso (L-28 da E6-02; RF-LST-06,
/// RN-15): as rotas reais de F-LST e da página do livro pessoal, sob a aba Perfil. O toque na
/// linha leva `via=lista` e a lista como referência ao `acervo`, e a página abre em modo consulta,
/// sem ações do dono nem de estante (RN-15.3).

const String _livroId = 'livro-3';

class _SemImagem implements SeletorDeImagem {
  @override
  Future<ImagemEscolhida?> escolher() async => null;
}

class _SemEnvio implements EnviadorDeCapa {
  @override
  Future<String> enviar(ImagemEscolhida imagem, {void Function(double)? aoProgredir}) async =>
      throw const FalhaNoEnvioDaCapa();
}

Map<String, Object?> _livroEmConsulta() => <String, Object?>{
  'id': _livroId,
  'tipo': 'pessoal',
  'donoId': 'u-dono',
  'titulo': 'Contos da Rua Direita',
  'autor': 'Helena Prado',
  'paginas': 184,
  'sinopse': 'Contos de uma rua só.',
  'capaUrl': null,
  'modoConsulta': true,
  'notaDoDono': <String, Object>{'valor': 4},
  'resenhaDoDono': null,
  'dono': <String, Object?>{'nome': 'Rafael Okamoto', 'avatarUrl': null},
  'assuntos': <Object?>[],
};

void main() {
  testWidgets('pela lista de outro leitor, o livro pessoal abre em modo consulta, com via=lista', (
    tester,
  ) async {
    usarTelaDeCelular(tester);
    final pedidosAoAcervo = <http.Request>[];
    final pedidosAoLeitura = <http.Request>[];
    final pedidosAEstante = <http.Request>[];

    final listas = DependenciasDeListas(
      servico: listasSimulado((pedido) async {
        if (pedido.url.path.endsWith('/livros')) {
          return json(
            itensJson(<Map<String, Object?>>[
              itemJson(1, titulo: 'Sagarana'),
              itemJson(3, titulo: 'Contos da Rua Direita', pessoal: true),
            ]),
            200,
          );
        }
        return json(listaJson(dono: false, nomeDoDono: 'Rafael Okamoto'), 200);
      }),
      perfil: perfilSimulado((_) async => json(perfilJson(), 200)),
    );
    final livros = DependenciasDeLivros(
      acervo: acervoSimulado((pedido) async {
        pedidosAoAcervo.add(pedido);
        return json(_livroEmConsulta(), 200);
      }),
      leitura: leituraSimulada((pedido) async {
        pedidosAoLeitura.add(pedido);
        return json(<String, Object?>{}, 200);
      }),
      seletor: _SemImagem(),
      enviador: _SemEnvio(),
    ).comListas(listas);
    final estante = EstanteService(
      ApiClient(
        baseUrl: 'https://leitura.example.com',
        client: MockClient((pedido) async {
          pedidosAEstante.add(pedido);
          return json(<String, Object?>{}, 200);
        }),
      ),
    );

    final roteador = GoRouter(
      initialLocation: rotaListaDoLeitor('/perfil', 'rafael', idDaLista),
      routes: <RouteBase>[
        GoRoute(
          path: '/perfil',
          builder: (context, state) => const SizedBox.shrink(),
          routes: <RouteBase>[
            GoRoute(
              path: 'leitores/:username',
              builder: (context, state) => const SizedBox.shrink(),
              routes: rotasDasListasDoLeitor(listas, raiz: '/perfil'),
            ),
            rotaDoLivroPessoal(livros, raiz: '/perfil', estante: estante),
          ],
        ),
      ],
    );
    addTearDown(roteador.dispose);

    await tester.pumpWidget(
      MaterialApp.router(
        theme: AppTheme.light(),
        locale: const Locale('pt', 'BR'),
        supportedLocales: const <Locale>[Locale('pt', 'BR')],
        localizationsDelegates: const <LocalizationsDelegate<Object?>>[
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        routerConfig: roteador,
        // As telas vivem dentro do `Scaffold` do shell; aqui, um próprio faz esse papel.
        builder: (context, filho) => Scaffold(body: filho),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Lista de '), findsOneWidget);
    await tocar(tester, find.text('Contos da Rua Direita').last);
    await tester.pumpAndSettle();

    // A rota e o pedido levam a via e a lista como referência (RN-15).
    expect(
      roteador.routerDelegate.currentConfiguration.last.matchedLocation,
      '/perfil/livro-pessoal/$_livroId',
    );
    final pagina = tester.widget<LivroPessoalPage>(find.byType(LivroPessoalPage));
    expect(pagina.livroId, _livroId);
    expect(pagina.via, 'lista');
    expect(pagina.referenciaId, idDaLista);
    expect(pedidosAoAcervo.single.url.path, '/livros/pessoal/$_livroId');
    expect(pedidosAoAcervo.single.url.queryParameters, <String, String>{
      'via': 'lista',
      'referenciaId': idDaLista,
    });

    // Abriu com sucesso, em modo consulta.
    expect(find.byType(LivroPessoalPage), findsOneWidget);
    expect(find.text('Contos da Rua Direita'), findsOneWidget);
    expect(find.text('Livro pessoal de Rafael Okamoto'), findsOneWidget);
    expect(find.text('Nota de Rafael'), findsOneWidget);
    expect(find.text('Este livro não está mais disponível'), findsNothing);

    // Sem ações do dono (RN-15.3): nem o menu, nem a avaliação própria.
    expect(find.bySemanticsLabel('Ações do livro'), findsNothing);
    expect(find.text('Adicionar à lista'), findsNothing);
    expect(find.text('Sua avaliação'), findsNothing);
    expect(pedidosAoLeitura, isEmpty);

    // Nem de estante: a situação não é desenhada e a estante não é consultada (RNF-SEC-07).
    expect(find.byType(SituacaoNaEstante), findsNothing);
    expect(find.text('Adicionar à estante'), findsNothing);
    expect(pedidosAEstante, isEmpty);
  });
}
