import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme.dart';
import '../tokens.dart';

/// As combinações de cor que a regra dura do §3.7 permite: `musgo` sobre papel (padrão) e
/// `papel` sobre musgo, para quando o lockup senta sobre um fundo de acento. `neutro` é a
/// terceira exceção que o próprio §3.7 abre — "uma variante esmaecida (logo desabilitada/
/// marca-d'água), num neutro derivado, nunca um segundo matiz" — usada na tela de verificação
/// de sessão (shell-de-navegacao.md §4.4: wordmark em cor grafite, sozinho na tela).
enum TomLogo { musgo, papel, neutro }

/// Lockup da marca (documento-de-design §3.7): símbolo + wordmark tipográfico. `assets/imagens/
/// logo-leai.svg` é monocromático e recolorível (`fill: currentColor` em cada path), tingido em
/// runtime via `ColorFilter`, literalmente como o §9.4 prescreve.
class LogoLeAi extends StatelessWidget {
  /// Altura do símbolo. Mínimo de 24 — abaixo disso a marca perde legibilidade (§3.7).
  final double altura;

  final TomLogo tom;

  /// Só o símbolo, sem o wordmark — para espaços apertados (§3.7 "símbolo isolado").
  final bool somenteSimbolo;

  const LogoLeAi({
    super.key,
    this.altura = 32,
    this.tom = TomLogo.musgo,
    this.somenteSimbolo = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final Color cor = switch (tom) {
      TomLogo.musgo => theme.primaryAccent,
      TomLogo.papel => theme.colorScheme.onPrimary,
      TomLogo.neutro => theme.secondaryText,
    };

    final simbolo = SvgPicture.asset(
      'assets/imagens/logo-leai.svg',
      height: altura,
      width: altura,
      colorFilter: ColorFilter.mode(cor, BlendMode.srcIn),
      semanticsLabel: somenteSimbolo ? 'Lê Ai' : null,
    );

    if (somenteSimbolo) {
      return simbolo;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        simbolo,
        const SizedBox(width: DesignTokens.space3),
        Text(
          'Lê Ai',
          style: GoogleFonts.spaceGrotesk(
            fontSize: altura * 1.4,
            fontWeight: FontWeight.w600,
            height: 1.0,
            letterSpacing: -0.015 * (altura * 1.4),
            color: cor,
          ),
        ),
      ],
    );
  }
}
