import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';
import '../tokens.dart';
import 'botao_textual.dart';

/// Resenha com spoiler (pagina-do-livro.md §4.6, RF-AVA-03): o conteúdo simplesmente não está
/// renderizado até o toque, nem borrado nem censurado por caractere. Serve à página do livro, ao
/// livro pessoal em modo consulta e às resenhas do perfil.
class BlocoDeSpoiler extends StatelessWidget {
  final VoidCallback aoRevelar;

  const BlocoDeSpoiler({super.key, required this.aoRevelar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      key: const ValueKey<String>('spoiler'),
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 96),
      padding: const EdgeInsets.all(DesignTokens.space4),
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radius),
        border: Border.all(color: theme.divider),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Icon(PhosphorIconsRegular.eyeSlash, size: 20, color: theme.secondaryText),
          const SizedBox(height: DesignTokens.space2),
          Text(
            'Esta resenha contém spoiler',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
          BotaoTextual(texto: 'Mostrar mesmo assim', onPressed: aoRevelar),
        ],
      ),
    );
  }
}

/// Texto que acabou de ser revelado por "Mostrar mesmo assim": pede o foco ao aparecer, porque o
/// botão deixa de existir e quem navega por leitor de tela ou teclado precisa continuar dali.
class TextoRevelado extends StatefulWidget {
  final Widget child;

  const TextoRevelado({super.key, required this.child});

  @override
  State<TextoRevelado> createState() => _TextoReveladoState();
}

class _TextoReveladoState extends State<TextoRevelado> {
  final FocusNode _foco = FocusNode(debugLabel: 'texto revelado');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _foco.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _foco.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Focus(focusNode: _foco, child: widget.child);
}
