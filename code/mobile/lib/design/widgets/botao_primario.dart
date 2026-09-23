import 'package:flutter/material.dart';

import '../theme.dart';

/// CTA principal da tela (documento-de-design §4.1). Pill, `musgo`/`papel`, alvo mínimo de
/// 48x48 e tipografia `body-strong` já vêm prontos do `elevatedButtonTheme` gerado em
/// `theme.g.dart` — este widget só cuida de largura total e dos estados de carregamento e de
/// desabilitado.
///
/// Não conhece a copy de carregamento ("Entrando", "Criando conta"): [texto] já vem pronto de
/// quem chama, porque a frase muda por tela e o widget não deveria hardcodar nenhuma das duas
/// (mesma divisão de responsabilidade da versão web).
class BotaoPrimario extends StatelessWidget {
  final String texto;
  final VoidCallback? onPressed;

  /// Bloqueia o toque enquanto uma requisição está em curso (ex.: cold start, RNF-ERR-09), mas
  /// **mantém o `musgo` pleno**: é trabalho em andamento, não botão indisponível (login.md e
  /// cadastro.md de P0-NAV, cadastro-por-isbn.md §4.3).
  final bool carregando;

  /// Desabilitado em fundo `linha` com texto `grafite-suave`, para o botão que ainda espera a
  /// entrada ficar completa (cadastro-por-isbn.md §4.1). Sem isto, vale o desabilitado do tema.
  final bool desabilitadoNeutro;

  const BotaoPrimario({
    super.key,
    required this.texto,
    required this.onPressed,
    this.carregando = false,
    this.desabilitadoNeutro = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ButtonStyle? estilo = carregando
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
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: carregando ? null : onPressed,
        style: estilo,
        child: Text(texto),
      ),
    );
  }
}
