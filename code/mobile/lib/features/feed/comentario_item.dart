import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../perfil/textos.dart';
import '../perfil/widgets_de_perfil.dart';
import 'social_service.dart';

/// Um comentário da folha (comentarios.md §4): raiz com avatar de 32px, resposta com 28px. O
/// recuo da resposta é de quem monta a lista, que nunca passa de um nível (RN-10).
class ComentarioItem extends StatefulWidget {
  final Comentario comentario;
  final VoidCallback? aoResponder;
  final ValueChanged<String> aoAbrirPerfil;
  final VoidCallback? aoAbrirAcoes;
  final bool emEdicao;

  const ComentarioItem({
    super.key,
    required this.comentario,
    required this.aoResponder,
    required this.aoAbrirPerfil,
    this.aoAbrirAcoes,
    this.emEdicao = false,
  });

  @override
  State<ComentarioItem> createState() => _ComentarioItemState();
}

class _ComentarioItemState extends State<ComentarioItem> {
  final List<TapGestureRecognizer> _toques = <TapGestureRecognizer>[];

  @override
  void dispose() {
    _descartarToques();
    super.dispose();
  }

  void _descartarToques() {
    for (final toque in _toques) {
      toque.dispose();
    }
    _toques.clear();
  }

  List<InlineSpan> _trechos(ThemeData theme) {
    _descartarToques();
    final texto = widget.comentario.texto;
    final mencoes = <Mencao>[...widget.comentario.mencoes]
      ..sort((a, b) => a.posicao.compareTo(b.posicao));
    final trechos = <InlineSpan>[];
    var cursor = 0;
    for (final mencao in mencoes) {
      final fim = mencao.posicao + mencao.comprimento;
      if (mencao.posicao < cursor || fim > texto.length) {
        continue;
      }
      if (mencao.posicao > cursor) {
        trechos.add(TextSpan(text: texto.substring(cursor, mencao.posicao)));
      }
      final toque = TapGestureRecognizer()..onTap = () => widget.aoAbrirPerfil(mencao.username);
      _toques.add(toque);
      trechos.add(
        TextSpan(
          text: texto.substring(mencao.posicao, fim),
          style: TextStyle(color: theme.primaryAccent, fontWeight: FontWeight.w600),
          recognizer: toque,
          semanticsLabel: 'Perfil de @${mencao.username}',
        ),
      );
      cursor = fim;
    }
    if (cursor < texto.length) {
      trechos.add(TextSpan(text: texto.substring(cursor)));
    }
    return trechos;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final comentario = widget.comentario;
    final autor = comentario.autor;
    final metadado = theme.textTheme.bodySmall;
    final conteudo = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        ExcludeSemantics(
          child: AvatarLeitor(
            url: autor.avatarUrl,
            nome: autor.nomeExibicao,
            tamanho: comentario.resposta ? 28 : 32,
          ),
        ),
        const SizedBox(width: DesignTokens.space3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        children: <InlineSpan>[
                          TextSpan(text: autor.nomeExibicao, style: theme.textTheme.labelLarge),
                          TextSpan(
                            text: ' · ${tempoDeEspera(comentario.criadoEm.toLocal())}',
                            style: metadado,
                          ),
                          if (comentario.editado) TextSpan(text: ' · editado', style: metadado),
                        ],
                      ),
                    ),
                  ),
                  if (comentario.meu)
                    Transform.translate(
                      offset: const Offset(DesignTokens.space3, -DesignTokens.space3),
                      child: IconButton(
                        onPressed: widget.aoAbrirAcoes,
                        tooltip: comentario.resposta ? 'Ações da sua resposta' : 'Ações do seu comentário',
                        constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                        icon: Icon(
                          PhosphorIconsRegular.dotsThree,
                          size: 20,
                          color: widget.aoAbrirAcoes == null ? theme.tertiaryText : theme.secondaryText,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: DesignTokens.space1),
              Text.rich(TextSpan(style: theme.textTheme.bodyMedium, children: _trechos(theme))),
              Semantics(
                container: true,
                button: true,
                label: 'Responder a ${autor.nomeExibicao}',
                excludeSemantics: true,
                // O respiro dos lados é do realce do toque; o deslocamento mantém o texto alinhado
                // ao do comentário.
                child: Transform.translate(
                  offset: const Offset(-DesignTokens.space3, 0),
                  child: TextButton(
                    onPressed: widget.aoResponder,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space3),
                      minimumSize: const Size(48, 48),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      alignment: Alignment.centerLeft,
                      foregroundColor: theme.secondaryText,
                      disabledForegroundColor: theme.tertiaryText,
                      textStyle: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    child: const Text('Responder'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
    if (!widget.emEdicao) {
      return conteudo;
    }
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.accentTint,
        borderRadius: BorderRadius.circular(DesignTokens.radius),
      ),
      child: Padding(padding: const EdgeInsets.all(DesignTokens.space2), child: conteudo),
    );
  }
}
