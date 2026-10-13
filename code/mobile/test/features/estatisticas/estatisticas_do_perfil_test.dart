import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/design/widgets/banner_aviso.dart';
import 'package:le_ai_mobile/features/estatisticas/estatisticas_do_perfil.dart';
import 'package:le_ai_mobile/features/estatisticas/estatisticas_service.dart';
import 'package:le_ai_mobile/features/estatisticas/rotas_estatisticas.dart';
import 'package:le_ai_mobile/features/estatisticas/textos.dart';
import 'package:le_ai_mobile/features/perfil/perfil_de_outro_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';

import 'apoio_estatisticas.dart';

PerfilService _identidade(Map<String, Object?> perfil) => PerfilService(
  ApiClient(
    baseUrl: 'https://identidade.example.com',
    client: MockClient((pedido) async {
      if (pedido.url.path == '/me/perfil' || pedido.url.path.startsWith('/perfis/')) {
        return json(perfil, 200);
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

Map<String, Object?> _perfil({
  String username = 'marinableu',
  String nome = 'Marina Beltrão',
  String relacao = 'proprio',
  String privacidade = 'publico',
  bool restrito = false,
}) => <String, Object?>{
  'id': 'id-$username',
  'username': username,
  'displayName': nome,
  'avatarUrl': null,
  'privacidade': privacidade,
  'conteudoRestrito': restrito,
  'relacao': relacao,
  'biografia': null,
  'contadores': <String, Object?>{'seguidores': 84, 'seguidos': 97},
};

void main() {
  final ano = DateTime.now().toUtc().subtract(const Duration(hours: 3)).year;
  late List<Uri> pedidas;

  setUp(() => pedidas = <Uri>[]);

  DependenciasDeEstatisticas deps(Future<http.Response> Function(http.Request) responder) =>
      DependenciasDeEstatisticas(
        servico: estatisticasSimulado((pedido) {
          pedidas.add(pedido.url);
          return responder(pedido);
        }),
        rotaDaEstante: '/estante',
      );

  group('bloco isolado', () {
    late int verEstatisticas;

    Future<void> montar(
      WidgetTester tester,
      Future<http.Response> Function(http.Request) responder, {
      bool proprio = true,
    }) async {
      verEstatisticas = 0;
      final servico = estatisticasSimulado(responder);
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          Padding(
            padding: const EdgeInsets.all(20),
            child: EstatisticasDoPerfil(
              ano: 2026,
              carregar: proprio
                  ? () async {
                      final e = await servico.consultar(const PeriodoAno(2026));
                      return (totais: e.totais, vazio: e.semRegistro);
                    }
                  : () async {
                      final p = await servico.doPerfil('u2');
                      return (totais: p.totais, vazio: p.totais.zerados);
                    },
              textoVazio: proprio
                  ? TextosDoBloco.vazioProprio
                  : TextosDoBloco.vazioDeOutro('Rafael', 2026),
              textoErro: proprio ? TextosDoBloco.erroProprio : TextosDoBloco.erroDeOutro('Rafael'),
              aoVerEstatisticas: proprio ? () => verEstatisticas++ : null,
            ),
          ),
        ),
      );
      await assentar(tester);
    }

    testWidgets('os três totais do ano em cards, com Ver estatísticas no próprio perfil', (
      tester,
    ) async {
      await montar(tester, (_) async => json(estatisticasJson(), 200));

      expect(find.text(TextosDoBloco.titulo), findsOneWidget);
      expect(find.text('2026, até hoje'), findsOneWidget);
      expect(find.bySemanticsLabel('Livros concluídos: 9 livros'), findsOneWidget);
      expect(find.bySemanticsLabel('Páginas lidas: 3.818 páginas'), findsOneWidget);
      expect(find.bySemanticsLabel('Tempo de leitura: 71 h 20 min'), findsOneWidget);
      await tester.tap(find.text(TextosDoBloco.verEstatisticas));
      expect(verEstatisticas, 1);
    });

    testWidgets(
      'sem registro, a frase no lugar dos cards, sem Ver estatísticas nem a linha do ano',
      (tester) async {
        await montar(tester, (_) async => json(semRegistroJson(), 200));

        expect(find.text(TextosDoBloco.vazioProprio), findsOneWidget);
        expect(find.text(TextosDoBloco.verEstatisticas), findsNothing);
        expect(find.text('2026, até hoje'), findsNothing);
      },
    );

    testWidgets('falha mostra o banner do bloco, e Tentar de novo recarrega', (tester) async {
      var falhar = true;
      await montar(
        tester,
        (_) async =>
            falhar ? erro(503, 'SERVICO_INDISPONIVEL', 'Fora.') : json(estatisticasJson(), 200),
      );

      expect(find.text(TextosDoBloco.erroProprio), findsOneWidget);
      expect(find.text(TextosDoBloco.verEstatisticas), findsNothing);
      falhar = false;
      await tester.tap(find.text(TextosDasEstatisticas.tentarDeNovo));
      await assentar(tester);
      expect(find.byType(BannerAviso), findsNothing);
      expect(find.bySemanticsLabel('Livros concluídos: 9 livros'), findsOneWidget);
    });

    for (final status in <int>[403, 404]) {
      testWidgets('$status do leitura esconde o bloco do outro leitor', (tester) async {
        await montar(tester, proprio: false, (_) async => erro(status, 'X', 'Não.'));

        expect(find.text(TextosDoBloco.titulo), findsNothing);
      });
    }

    testWidgets('outro leitor: totais zerados viram a frase com o primeiro nome, sem botão', (
      tester,
    ) async {
      await montar(
        tester,
        proprio: false,
        (_) async => json(<String, Object?>{
          'ano': 2026,
          'livrosConcluidos': 0,
          'paginasLidas': 0,
          'minutosLidos': 0,
        }, 200),
      );

      expect(find.text('Rafael ainda não registrou leituras em 2026.'), findsOneWidget);
      expect(find.text(TextosDoBloco.verEstatisticas), findsNothing);
    });
  });

  group('no Meu perfil', () {
    testWidgets('entre a sequência (ou os contadores) e as seções de leitura, com o ano corrente', (
      tester,
    ) async {
      usarTelaDeCelular(tester);
      final d = deps((_) async => json(estatisticasJson(), 200));
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: _identidade(_perfil()),
            estatisticas: () => EstatisticasDoPerfil(
              ano: ano,
              carregar: () async {
                final e = await d.servico.consultar(PeriodoAno(ano));
                return (totais: e.totais, vazio: e.semRegistro);
              },
              textoVazio: TextosDoBloco.vazioProprio,
              textoErro: TextosDoBloco.erroProprio,
              aoVerEstatisticas: () {},
            ),
          ),
        ),
      );
      await assentar(tester);

      expect(pedidas.single.query, 'periodo=$ano');
      final bloco = tester.getTopLeft(find.text(TextosDoBloco.titulo)).dy;
      expect(tester.getTopLeft(find.text('seguindo')).dy, lessThan(bloco));
      expect(tester.getTopLeft(find.text('Estante')).dy, greaterThan(bloco));
    });

    testWidgets('falha das estatísticas não derruba o perfil', (tester) async {
      usarTelaDeCelular(tester);
      final d = deps((_) async => erro(503, 'SERVICO_INDISPONIVEL', 'Fora.'));
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: _identidade(_perfil()),
            estatisticas: () => EstatisticasDoPerfil(
              ano: ano,
              carregar: () async {
                final e = await d.servico.consultar(PeriodoAno(ano));
                return (totais: e.totais, vazio: e.semRegistro);
              },
              textoVazio: TextosDoBloco.vazioProprio,
              textoErro: TextosDoBloco.erroProprio,
            ),
          ),
        ),
      );
      await assentar(tester);

      expect(find.text('Marina Beltrão'), findsOneWidget);
      expect(find.text(TextosDoBloco.erroProprio), findsOneWidget);
    });
  });

  group('no perfil de outro leitor', () {
    Future<void> montar(
      WidgetTester tester,
      Map<String, Object?> perfil,
      DependenciasDeEstatisticas d,
    ) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilDeOutroPage(
            servico: _identidade(perfil),
            username: perfil['username']! as String,
            aoAbrirProprioPerfil: () {},
            aoBuscarLeitor: () {},
            aoAbrirSolicitacoes: () {},
            estatisticas: (usuarioId, nome) => estatisticasDeOutroLeitor(d, usuarioId, nome),
          ),
        ),
      );
      await assentar(tester);
    }

    testWidgets('perfil visível: o bloco com os totais do leitor, sem Ver estatísticas', (
      tester,
    ) async {
      final d = deps(
        (_) async => json(<String, Object?>{
          'ano': ano,
          'livrosConcluidos': 14,
          'paginasLidas': 4920,
          'minutosLidos': 5800,
        }, 200),
      );
      await montar(
        tester,
        _perfil(username: 'rafaokamoto', nome: 'Rafael Okamoto', relacao: 'nenhuma'),
        d,
      );

      expect(pedidas.single.path, '/perfis/id-rafaokamoto/estatisticas');
      expect(find.text('$ano, até hoje'), findsOneWidget);
      expect(find.bySemanticsLabel('Tempo de leitura: 96 h 40 min'), findsOneWidget);
      expect(find.text(TextosDoBloco.verEstatisticas), findsNothing);
    });

    testWidgets(
      'privado sem seguimento: nem pede as estatísticas, e a frase de restrição as cita',
      (tester) async {
        final d = deps((_) async => json(estatisticasJson(), 200));
        await montar(
          tester,
          _perfil(
            username: 'bia.nogueira',
            nome: 'Beatriz Nogueira',
            relacao: 'nenhuma',
            privacidade: 'privado',
            restrito: true,
          ),
          d,
        );

        expect(pedidas, isEmpty);
        expect(find.text(TextosDoBloco.titulo), findsNothing);
        expect(
          find.text(
            'Envie uma solicitação para ver a estante, as resenhas e as estatísticas de Beatriz.',
          ),
          findsOneWidget,
        );
      },
    );
  });
}
