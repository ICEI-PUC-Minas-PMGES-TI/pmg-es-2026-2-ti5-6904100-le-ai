import 'package:flutter/material.dart';

import '../../design/theme.dart';

/// Indicador do envio (cold start, RNF-ERR-09) dos protótipos de login e cadastro de F-AUT:
/// trilho `musgo-fundo`, arco `musgo`, traço de 3. O documento-de-design proíbe "spinner
/// girando", mas o protótipo aprovado desenha este indicador e prevalece (docs/design/AGENTS.md
/// §10); a divergência fica registrada em feature-F-AUT.md. Com as animações desligadas no
/// sistema, o arco fica parado, como o `prefers-reduced-motion` do protótipo.
class IndicadorDeEnvio extends StatelessWidget {
  /// 28 no login (acima do botão) e 36 no cadastro (no lugar do formulário).
  final double tamanho;

  const IndicadorDeEnvio({super.key, this.tamanho = 28});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final parado = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    return Center(
      // A legenda "O servidor está iniciando..." já diz o que acontece; o arco é só visual.
      child: ExcludeSemantics(
        child: SizedBox.square(
          dimension: tamanho,
          child: CircularProgressIndicator(
            value: parado ? 0.25 : null,
            strokeWidth: 3,
            color: theme.primaryAccent,
            backgroundColor: theme.accentTint,
          ),
        ),
      ),
    );
  }
}
