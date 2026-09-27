import 'package:flutter/material.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../perfil/textos.dart';
import '../perfil/widgets_de_perfil.dart';
import 'social_service.dart';

/// Um comentário da folha (comentarios.md §4): raiz com avatar de 32px, resposta com 28px. O
/// recuo da resposta é de quem monta a lista, que nunca passa de um nível (RN-10).
class ComentarioItem extends StatelessWidget {
  final Comentario comentario;
  final VoidCallback aoResponder;

  const ComentarioItem({super.key, required this.comentario, required this.aoResponder});

  static final RegExp _mencaoInicial = RegExp(r'^@\S+');

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final autor = comentario.autor;
    final corpo = theme.textTheme.bodyMedium;
    final mencao = _mencaoInicial.stringMatch(comentario.texto);
    return Row(
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
              Text.rich(
                TextSpan(
                  children: <InlineSpan>[
                    TextSpan(text: autor.nomeExibicao, style: theme.textTheme.labelLarge),
                    TextSpan(
                      text: ' · ${tempoDeEspera(comentario.criadoEm.toLocal())}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: DesignTokens.space1),
              // Texto puro; a menção inicial só ganha peso, sem cor de link (comentarios.md §4).
              Text.rich(
                TextSpan(
                  style: corpo,
                  children: <InlineSpan>[
                    if (mencao != null)
                      TextSpan(text: mencao, style: theme.textTheme.labelLarge),
                    TextSpan(
                      text: mencao == null
                          ? comentario.texto
                          : comentario.texto.substring(mencao.length),
                    ),
                  ],
                ),
              ),
              Semantics(
                container: true,
                button: true,
                label: 'Responder a ${autor.nomeExibicao}',
                excludeSemantics: true,
                child: TextButton(
                  onPressed: aoResponder,
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(48, 48),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    alignment: Alignment.centerLeft,
                    foregroundColor: theme.secondaryText,
                    textStyle: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  child: const Text('Responder'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
