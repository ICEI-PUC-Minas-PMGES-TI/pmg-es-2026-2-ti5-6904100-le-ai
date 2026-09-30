import 'package:flutter/material.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';

/// Política de privacidade (RNF-SEC-42): dados coletados, finalidade, retenção e direitos, como
/// texto de interface, nunca PDF nem link externo (configuracoes.md §4.4).
///
/// **O conteúdo é o mock declarado do protótipo** (configuracoes.md §3), o mesmo da web
/// (`PoliticaDePrivacidade.vue`). O texto final é entrega do grupo e entra com a Etapa 13 de
/// F-AUT, junto do versionamento e do acesso pelo cadastro.
class PoliticaDePrivacidadePage extends StatelessWidget {
  final VoidCallback? aoVoltar;

  /// Aberta pelo cadastro, fora do shell (cadastro.md §5): sem sino e com `Scaffold` próprio.
  /// Mesmo conteúdo e estrutura da versão das configurações.
  final bool semSessao;

  const PoliticaDePrivacidadePage({super.key, this.aoVoltar, this.semSessao = false});

  static const String versao = 'Versão 1.0, de 15 de setembro de 2026';

  static const List<(String, String)> blocos = <(String, String)>[
    (
      'Dados que coletamos',
      'E-mail, nome de usuário, nome de exibição, data de nascimento, senha guardada apenas como '
          'hash, e o que você registra no aplicativo: livros, leituras, progresso, notas, '
          'resenhas, comentários e quem você segue. Avatar e capa de livro pessoal, quando você '
          'envia.',
    ),
    (
      'Para que usamos',
      'Manter sua conta e sua sessão, montar sua estante e seu feed, mostrar seu perfil conforme '
          'a privacidade que você escolheu e enviar o e-mail de recuperação de senha. Não vendemos '
          'dados e não usamos seus dados para publicidade.',
    ),
    (
      'Por quanto tempo guardamos',
      'Enquanto a conta existir. O token de recuperação de senha vale por 1 hora. Registros de '
          'acesso ficam por 6 meses.',
    ),
    (
      'Seus direitos',
      'Você pode acessar e corrigir seus dados pelo perfil, e pedir suporte pelo e-mail de '
          'contato do projeto.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final conteudo = Column(
      children: <Widget>[
        // O protótipo desenha "Política de privacidade" em duas linhas; no app o título é o curto
        // "Privacidade", para caber numa linha ao lado da seta e do sino (decisão de 29/09/2026).
        CabecalhoTela(titulo: 'Privacidade', aoVoltar: aoVoltar, comSino: !semSessao),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space5,
              DesignTokens.space6,
              DesignTokens.space5,
              DesignTokens.space10,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(versao, style: theme.textTheme.bodySmall),
                for (final (titulo, texto) in blocos) ...<Widget>[
                  const SizedBox(height: DesignTokens.space6),
                  Semantics(
                    header: true,
                    child: Text(titulo, style: theme.textTheme.titleMedium),
                  ),
                  const SizedBox(height: DesignTokens.space2),
                  Text(
                    texto,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
    return semSessao
        ? Scaffold(backgroundColor: theme.pageBackground, body: conteudo)
        : conteudo;
  }
}
