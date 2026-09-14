import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';
import '../tokens.dart';

/// Duas variantes, nunca confundidas (login.md §4.2/§4.3 e §10): [erro] é `rubi` — o usuário
/// mandou algo inválido. [alerta] é `ambar` — bloqueio temporário, o usuário não errou nada.
enum VarianteAviso { erro, alerta }

/// Ícone e texto juntos: a diferença não pode depender só de cor (§9 acessibilidade dos
/// prompts). `liveRegion` anuncia o banner para leitor de tela assim que ele aparece —
/// equivalente ao `role="alert"` da versão web.
class BannerAviso extends StatelessWidget {
  final VarianteAviso variante;
  final String mensagem;

  const BannerAviso({
    super.key,
    required this.variante,
    required this.mensagem,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ehErro = variante == VarianteAviso.erro;
    final corIcone = ehErro ? theme.colorScheme.error : theme.warningColor;
    final corFundo = ehErro ? theme.errorTint : theme.warningTint;

    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(DesignTokens.space4),
        decoration: BoxDecoration(
          color: corFundo,
          borderRadius: BorderRadius.circular(DesignTokens.radius),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(
              ehErro
                  ? PhosphorIconsRegular.warningCircle
                  : PhosphorIconsRegular.warning,
              size: 20,
              color: corIcone,
            ),
            const SizedBox(width: DesignTokens.space3),
            Expanded(
              child: Text(mensagem, style: theme.textTheme.bodyMedium),
            ),
          ],
        ),
      ),
    );
  }
}
