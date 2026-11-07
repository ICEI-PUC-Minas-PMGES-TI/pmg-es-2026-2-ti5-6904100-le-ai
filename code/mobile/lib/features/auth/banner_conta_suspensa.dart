import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/session/session_controller.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';

/// Segunda parte do banner, igual nos dois estados (login.md P3 §8).
const String explicacaoDaSuspensao =
    'A moderação do Lê Ai suspendeu o acesso. Enquanto isso, ninguém consegue entrar nela, e os '
    'dados continuam guardados.';

/// Quando a sessão de leitura em andamento foi descartada na saída (F-MOD-OPC).
const String leituraDescartadaNaSuspensao =
    'A sessão de leitura em andamento foi encerrada, e o tempo medido não foi registrado.';

/// Primeira linha quando a senha conferiu numa conta suspensa.
const String contaSuspensaNoLogin = 'Esta conta está suspensa.';

/// Banner de conta suspensa (F-MOD-OPC, login.md P3): alerta `ambar-fundo` com `Prohibit`, não o
/// `rubi` da credencial inválida, porque o leitor não errou nada nesta tentativa. Duas partes de
/// texto, sem botão, sem link e sem fechar. [sessaoEncerrada] troca só a primeira linha. A
/// `liveRegion` anuncia o texto inteiro quando o estado abre.
class BannerContaSuspensa extends StatelessWidget {
  final bool sessaoEncerrada;

  /// Acrescenta a frase da leitura descartada (só com [sessaoEncerrada]).
  final bool leituraDescartada;

  const BannerContaSuspensa({
    super.key,
    this.sessaoEncerrada = false,
    this.leituraDescartada = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primeira = sessaoEncerrada
        ? SessionController.avisoDeContaSuspensa
        : contaSuspensaNoLogin;

    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(DesignTokens.space4),
        decoration: BoxDecoration(
          color: theme.warningTint,
          borderRadius: BorderRadius.circular(DesignTokens.radius),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(PhosphorIconsRegular.prohibit, size: 20, color: theme.warningColor),
            const SizedBox(width: DesignTokens.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(primeira, style: theme.textTheme.labelLarge),
                  const SizedBox(height: DesignTokens.space1),
                  Text(explicacaoDaSuspensao, style: theme.textTheme.bodyMedium),
                  if (sessaoEncerrada && leituraDescartada) ...<Widget>[
                    const SizedBox(height: DesignTokens.space1),
                    Text(leituraDescartadaNaSuspensao, style: theme.textTheme.bodyMedium),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
