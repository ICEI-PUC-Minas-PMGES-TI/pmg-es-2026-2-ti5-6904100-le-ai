import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';
import '../tokens.dart';
import 'botao_textual.dart';
import 'capa_livro.dart';

enum EstadoDaCapa { vazia, enviando, preenchida, erro }

/// Área de upload de imagem (cadastro-pessoal.md §4.1 a §4.4 e §7), com os quatro estados:
/// vazia, enviando, preenchida e erro. Só desenha; quem escolhe, valida e envia é a tela.
///
/// A capa é opcional, e a área vazia precisa parecer convite, não campo faltando: borda
/// tracejada `linha`, nunca `rubi` fora do erro.
class AreaUploadCapa extends StatelessWidget {
  final EstadoDaCapa estado;
  final Uint8List? bytes;
  final String? url;
  final double progresso;
  final String? erro;
  final VoidCallback? aoEscolher;
  final VoidCallback? aoRemover;

  static const double largura = 120;
  static const double altura = 160;

  const AreaUploadCapa({
    super.key,
    required this.estado,
    this.bytes,
    this.url,
    this.progresso = 0,
    this.erro,
    this.aoEscolher,
    this.aoRemover,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final temImagem = estado == EstadoDaCapa.preenchida || estado == EstadoDaCapa.enviando;

    final area = temImagem ? _imagem(theme) : _vazia(theme);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            area,
            if (!temImagem) ...<Widget>[
              const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: Text(
                  'Opcional. JPG, PNG ou WEBP, até 5 MB.',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ],
        ),
        if (estado == EstadoDaCapa.enviando) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          Text(
            'Enviando capa',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
        ],
        if (estado == EstadoDaCapa.preenchida)
          BotaoTextual(texto: 'Trocar capa', onPressed: aoEscolher),
        if (estado == EstadoDaCapa.erro && erro != null) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          Semantics(
            liveRegion: true,
            child: Text(
              erro!,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
            ),
          ),
        ],
      ],
    );
  }

  Widget _vazia(ThemeData theme) {
    final ehErro = estado == EstadoDaCapa.erro;
    return Semantics(
      button: true,
      label: 'Adicionar capa',
      child: GestureDetector(
        onTap: aoEscolher,
        behavior: HitTestBehavior.opaque,
        child: CustomPaint(
          painter: _BordaTracejada(
            cor: ehErro ? theme.colorScheme.error : theme.divider,
            espessura: ehErro ? 1.5 : 1,
          ),
          child: Container(
            width: largura,
            height: altura,
            decoration: BoxDecoration(
              color: theme.elevatedSurface,
              borderRadius: BorderRadius.circular(DesignTokens.radius),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Icon(PhosphorIconsRegular.imageSquare, size: 24, color: theme.tertiaryText),
                const SizedBox(height: DesignTokens.space2),
                Text(
                  'Adicionar capa',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _imagem(ThemeData theme) {
    final enviando = estado == EstadoDaCapa.enviando;
    return SizedBox(
      width: largura,
      height: altura,
      // Sobreposição, não layout de fluxo: o botão de remover sai um pouco da borda da imagem.
      child: Stack(
        clipBehavior: Clip.none,
        children: <Widget>[
          CapaLivro(
            bytes: bytes,
            url: url,
            largura: largura,
            altura: altura,
            raio: DesignTokens.radius,
          ),
          if (enviando)
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.pageBackground.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(DesignTokens.radius),
                ),
                child: Center(
                  child: SizedBox(
                    width: 80,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: LinearProgressIndicator(
                        value: progresso,
                        minHeight: 4,
                        backgroundColor: theme.divider,
                        color: theme.primaryAccent,
                        semanticsLabel: 'Enviando capa',
                      ),
                    ),
                  ),
                ),
              ),
            ),
          if (!enviando)
            // Círculo visível de 28px dentro de uma área tocável de 48px (§9).
            Positioned(
              top: -10,
              right: -10,
              child: Semantics(
                button: true,
                label: 'Remover capa',
                child: GestureDetector(
                  onTap: aoRemover,
                  behavior: HitTestBehavior.opaque,
                  child: SizedBox(
                    width: 48,
                    height: 48,
                    child: Center(
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: theme.pageBackground.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          PhosphorIconsRegular.x,
                          size: 16,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _BordaTracejada extends CustomPainter {
  final Color cor;
  final double espessura;

  const _BordaTracejada({required this.cor, required this.espessura});

  @override
  void paint(Canvas canvas, Size size) {
    final pincel = Paint()
      ..color = cor
      ..strokeWidth = espessura
      ..style = PaintingStyle.stroke;
    final contorno = Path()
      ..addRRect(
        RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(DesignTokens.radius)),
      );
    for (final metrica in contorno.computeMetrics()) {
      for (var inicio = 0.0; inicio < metrica.length; inicio += 8) {
        canvas.drawPath(metrica.extractPath(inicio, inicio + 4), pincel);
      }
    }
  }

  @override
  bool shouldRepaint(_BordaTracejada antiga) =>
      antiga.cor != cor || antiga.espessura != espessura;
}
