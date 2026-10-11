import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';
import '../tokens.dart';

// O design não fixa a permanência; 6 s dá para ler duas linhas sem prender a tela.
const Duration duracaoDoAviso = Duration(seconds: 6);

// Erro que some antes de ser lido não é acionável: fica até a pessoa agir ou fechar.
const Duration _duracaoDoErro = Duration(days: 1);

void mostrarAviso(
  BuildContext context,
  String texto, {
  IconData? icone,
  bool erro = false,
  String? rotuloDaAcao,
  VoidCallback? aoAgir,
}) {
  final mensageiro = ScaffoldMessenger.maybeOf(context);
  if (mensageiro == null) {
    return;
  }
  mensageiro
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.transparent,
        elevation: 0,
        padding: EdgeInsets.zero,
        duration: erro ? _duracaoDoErro : duracaoDoAviso,
        content: _ConteudoDoAviso(
          texto: texto,
          icone: icone,
          erro: erro,
          rotuloDaAcao: rotuloDaAcao,
          aoAgir: aoAgir == null
              ? null
              : () {
                  mensageiro.hideCurrentSnackBar();
                  aoAgir();
                },
          aoFechar: mensageiro.hideCurrentSnackBar,
        ),
      ),
    );
}

class _ConteudoDoAviso extends StatelessWidget {
  final String texto;
  final IconData? icone;
  final bool erro;
  final String? rotuloDaAcao;
  final VoidCallback? aoAgir;
  final VoidCallback aoFechar;

  const _ConteudoDoAviso({
    required this.texto,
    required this.icone,
    required this.erro,
    required this.rotuloDaAcao,
    required this.aoAgir,
    required this.aoFechar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final barra = erro ? theme.colorScheme.error : theme.primaryAccent;
    return Container(
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radius),
        border: Border(left: BorderSide(color: barra, width: 4)),
        boxShadow: const <BoxShadow>[
          BoxShadow(color: Color(0x14171512), blurRadius: 12, offset: Offset(0, 4)),
        ],
      ),
      padding: const EdgeInsets.only(left: DesignTokens.space4),
      child: Row(
        children: <Widget>[
          if (icone != null) ...<Widget>[
            Icon(icone, size: 20, color: theme.primaryAccent),
            const SizedBox(width: DesignTokens.space3),
          ],
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Text(texto, style: theme.textTheme.bodyMedium),
                  if (rotuloDaAcao != null && aoAgir != null)
                    GestureDetector(
                      onTap: aoAgir,
                      behavior: HitTestBehavior.opaque,
                      child: Padding(
                        padding: const EdgeInsets.only(top: DesignTokens.space2),
                        child: Text(
                          rotuloDaAcao!,
                          style: theme.textTheme.labelLarge?.copyWith(color: theme.primaryAccent),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Semantics(
            button: true,
            label: 'Fechar aviso',
            child: GestureDetector(
              onTap: aoFechar,
              behavior: HitTestBehavior.opaque,
              child: SizedBox(
                width: 48,
                height: 48,
                child: Icon(PhosphorIconsRegular.x, size: 20, color: theme.secondaryText),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
