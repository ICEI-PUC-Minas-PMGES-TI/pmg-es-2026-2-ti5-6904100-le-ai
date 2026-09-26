import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/design/widgets/botao_primario.dart';
import 'package:le_ai_mobile/features/perfil/perfil_de_outro_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';
import 'package:le_ai_mobile/features/perfil/widgets_de_identidade.dart';

import '../livros/apoio.dart';

/// Estrutura visual de meu-perfil e perfil-de-outro-leitor conforme os protótipos: seções de
/// leitura no estado vazio, RN-08, ícone do Seguir, skeleton, banner de erro e copy.

PerfilService _servico(Future<http.Response> Function(http.Request) handler) => PerfilService(
  ApiClient(
    baseUrl: 'https://identidade.example.com',
    client: MockClient(handler),
    esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
  ),
);

Map<String, Object?> _perfil(
  String username,
  String displayName, {
  String privacidade = 'publico',
  String relacao = 'nenhuma',
  bool restrito = false,
}) => <String, Object?>{
  'id': 'id-$username',
  'username': username,
  'displayName': displayName,
  'avatarUrl': null,
  'privacidade': privacidade,
  'conteudoRestrito': restrito,
  'relacao': relacao,
  'biografia': 'Professor de história.',
  'contadores': <String, Object?>{'seguidores': 212, 'seguidos': 148},
};

Map<String, Object?> _paginaVazia() => <String, Object?>{
  'items': <Object?>[],
  'page': 0,
  'size': 1,
  'totalElements': 0,
  'totalPages': 0,
};

void main() {
  group('PerfilPage', () {
    testWidgets('Estante e Resenhas no vazio, com o CTA para Descobrir e sem livros lidos', (tester) async {
      var descobrir = 0;
      var estante = 0;
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: _servico((request) async {
              if (request.url.path == '/solicitacoes') {
                return json(_paginaVazia(), 200);
              }
              return json(_perfil('marinableu', 'Marina Beltrão', relacao: 'proprio'), 200);
            }),
            aoBuscarLivros: () => descobrir++,
            aoVerEstante: () => estante++,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Estante'), findsOneWidget);
      expect(find.text('Os livros que você adicionar aparecem aqui.'), findsOneWidget);
      expect(find.text('Resenhas'), findsOneWidget);
      expect(find.text('Suas resenhas aparecem aqui depois que você escrever a primeira.'), findsOneWidget);
      expect(find.textContaining('livros lidos'), findsNothing);

      await tocar(tester, find.text('Buscar livros'));
      await tocar(tester, find.text('Ver tudo'));
      expect(descobrir, 1);
      expect(estante, 1);
    });

    testWidgets('skeleton sem a barra do botão, com a linha de contadores', (tester) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: _servico(
              (request) => Future<http.Response>.delayed(
                const Duration(seconds: 1),
                () => request.url.path == '/solicitacoes'
                    ? json(_paginaVazia(), 200)
                    : json(_perfil('marinableu', 'Marina Beltrão', relacao: 'proprio'), 200),
              ),
            ),
          ),
        ),
      );

      expect(find.byType(SkeletonDoPerfil), findsOneWidget);
      expect(tester.widget<SkeletonDoPerfil>(find.byType(SkeletonDoPerfil)).comBotao, isFalse);
      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();
      expect(find.byType(SkeletonDoPerfil), findsNothing);
    });

    testWidgets('erro: banner com triângulo e "Tentar de novo" dentro do cartão', (tester) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(PerfilPage(servico: _servico((_) async => erro(500, 'ERRO_INTERNO', 'Falhou.')))),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(PhosphorIconsRegular.warning), findsOneWidget);
      expect(find.byIcon(PhosphorIconsRegular.warningCircle), findsNothing);
      expect(
        find.descendant(of: find.byType(Container), matching: find.text('Tentar de novo')),
        findsOneWidget,
      );
    });
  });

  group('PerfilDeOutroPage', () {
    Future<void> montar(WidgetTester tester, Map<String, Object?> perfil) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilDeOutroPage(
            servico: _servico((_) async => json(perfil, 200)),
            username: perfil['username']! as String,
            aoAbrirProprioPerfil: () {},
            aoBuscarLeitor: () {},
            aoAbrirSolicitacoes: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('conteúdo visível: seções vazias com texto neutro e Seguir com UserPlus', (tester) async {
      await montar(tester, _perfil('rafaokamoto', 'Rafael Okamoto'));

      expect(find.text('Rafael ainda não tem livros na estante.'), findsOneWidget);
      expect(find.text('Rafael ainda não escreveu resenhas.'), findsOneWidget);
      expect(find.text('Buscar livros'), findsNothing);
      final seguir = tester.widget<BotaoPrimario>(find.widgetWithText(BotaoPrimario, 'Seguir'));
      expect(seguir.icone, PhosphorIconsRegular.userPlus);
    });

    testWidgets('RN-08: conteúdo restrito mostra o bloco privado, não as seções', (tester) async {
      await montar(
        tester,
        _perfil('bia.nogueira', 'Beatriz Nogueira', privacidade: 'privado', restrito: true),
      );

      expect(find.text('Este perfil é privado'), findsOneWidget);
      expect(find.byType(SecoesDeLeitura), findsNothing);
      expect(find.text('Resenhas'), findsNothing);
      final solicitar = tester.widget<BotaoPrimario>(
        find.widgetWithText(BotaoPrimario, 'Solicitar para seguir'),
      );
      expect(solicitar.icone, PhosphorIconsRegular.userPlus);
    });

    testWidgets('privado seguido: a frase de quem aceitou a solicitação', (tester) async {
      await montar(
        tester,
        _perfil('bia.nogueira', 'Beatriz Nogueira', privacidade: 'privado', relacao: 'seguindo'),
      );

      expect(find.text('Você vê este perfil porque segue Beatriz.'), findsOneWidget);
      expect(find.byType(SecoesDeLeitura), findsOneWidget);
    });

    testWidgets('pediu para seguir: linha com o texto centralizado', (tester) async {
      await montar(tester, _perfil('rafaokamoto', 'Rafael Okamoto', relacao: 'solicitacao_recebida'));

      final texto = tester.widget<Text>(find.text('Rafael pediu para seguir você.'));
      expect(texto.textAlign, TextAlign.center);
    });

    testWidgets('não encontrado: CTA com a largura do conteúdo', (tester) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilDeOutroPage(
            servico: _servico((_) async => erro(404, 'RECURSO_NAO_ENCONTRADO', 'Não encontramos.')),
            username: 'ninguem',
            aoAbrirProprioPerfil: () {},
            aoBuscarLeitor: () {},
            aoAbrirSolicitacoes: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Perfil não encontrado'), findsOneWidget);
      final botao = tester.widget<BotaoPrimario>(find.widgetWithText(BotaoPrimario, 'Buscar leitor'));
      expect(botao.larguraTotal, isFalse);
    });
  });
}
