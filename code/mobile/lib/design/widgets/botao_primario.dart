import 'package:flutter/material.dart';

import '../theme.dart';
import '../tokens.dart';

/// CTA principal da tela (documento-de-design §4.1). Pill, `musgo`/`papel`, alvo mínimo de
/// 48x48, tipografia `body-strong`, sem sombra e desabilitado como `musgo` esmaecido já vêm do
/// `elevatedButtonTheme` gerado em `theme.g.dart` — este widget cuida de largura, ícone e dos
/// estados de carregamento e de desabilitado neutro.
///
/// Não conhece a copy de carregamento ("Entrando", "Criando conta"): [texto] já vem pronto de
/// quem chama, porque a frase muda por tela e o widget não deveria hardcodar nenhuma das duas
/// (mesma divisão de responsabilidade da versão web).
class BotaoPrimario extends StatelessWidget {
  final String texto;
  final VoidCallback? onPressed;

  /// Bloqueia o toque enquanto uma requisição está em curso (ex.: cold start, RNF-ERR-09). Por
  /// padrão mantém o `musgo` pleno (login.md e cadastro.md de P0-NAV, cadastro-por-isbn.md §4.3).
  final bool carregando;

  /// Com [carregando], esmaece o botão (opacidade 45%) como nos protótipos de F-AUT e F-PERFIL,
  /// que pelo §10 de docs/design/AGENTS.md prevalecem sobre o prompt.
  final bool carregandoEsmaecido;

  /// Desabilitado em fundo `linha` com texto `grafite-suave`, para o botão que ainda espera a
  /// entrada ficar completa (cadastro-por-isbn.md §4.1). Sem isto, vale o desabilitado do tema.
  final bool desabilitadoNeutro;

  /// Ícone Phosphor de 20px antes do texto (`UserPlus` em "Seguir", perfil-de-outro-leitor).
  final IconData? icone;

  /// Largura total da coluna (padrão) ou a do conteúdo com padding de 24, como os CTAs dos estados
  /// vazios de F-PERFIL.
  final bool larguraTotal;

  const BotaoPrimario({
    super.key,
    required this.texto,
    required this.onPressed,
    this.carregando = false,
    this.carregandoEsmaecido = false,
    this.desabilitadoNeutro = false,
    this.icone,
    this.larguraTotal = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ButtonStyle? estilo = carregando && !carregandoEsmaecido
        ? ElevatedButton.styleFrom(
            disabledBackgroundColor: theme.colorScheme.primary,
            disabledForegroundColor: theme.colorScheme.onPrimary,
          )
        : desabilitadoNeutro
        ? ElevatedButton.styleFrom(
            disabledBackgroundColor: theme.divider,
            disabledForegroundColor: theme.tertiaryText,
          )
        : null;
    final comPadding = larguraTotal
        ? estilo
        : (estilo ?? const ButtonStyle()).merge(
            ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space6),
            ),
          );
    final acao = carregando ? null : onPressed;
    final botao = icone == null
        ? ElevatedButton(onPressed: acao, style: comPadding, child: Text(texto))
        : ElevatedButton.icon(
            onPressed: acao,
            style: comPadding,
            icon: Icon(icone, size: 20),
            label: Text(texto),
          );
    return larguraTotal ? SizedBox(width: double.infinity, child: botao) : botao;
  }
}
