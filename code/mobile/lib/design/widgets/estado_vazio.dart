import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme.dart';
import '../tokens.dart';

/// Estado vazio com desenho intencional (documento-de-design §8): título e texto centralizados.
/// O ícone ou a ilustração são decorativos e ficam fora da árvore de acessibilidade; o título
/// carrega o significado.
///
/// Três formas, conforme o protótipo de cada tela:
/// - padrão: ícone em círculo de 72px `papel-elevado` (telas de livros de F-ACV-CADASTRO);
/// - [solto]: ícone de 32px sem círculo, como nos protótipos de F-PERFIL;
/// - [ilustracao]: um SVG de `assets/ilustracoes/` no lugar do ícone (a arte de "nenhum leitor
///   encontrado" da busca), na largura que o protótipo dá.
/// Nas duas formas novas o rodapé ganha `space-6` de respiro, como nos protótipos. Centralizar na
/// vertical é de quem usa, porque depende da área útil de cada tela.
class EstadoVazio extends StatelessWidget {
  final IconData? icone;
  final String titulo;
  final String? texto;
  final Widget? rodape;
  final bool solto;
  final String? ilustracao;
  final double larguraDaIlustracao;

  const EstadoVazio({
    super.key,
    this.icone,
    required this.titulo,
    this.texto,
    this.rodape,
    this.solto = false,
    this.ilustracao,
    this.larguraDaIlustracao = 160,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final novo = solto || ilustracao != null;
    final Widget? arte = ilustracao != null
        ? SvgPicture.asset(ilustracao!, width: larguraDaIlustracao)
        : icone == null
        ? null
        : solto
        ? Icon(icone, size: 32, color: theme.tertiaryText)
        : Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(color: theme.elevatedSurface, shape: BoxShape.circle),
            child: Icon(icone, size: 32, color: theme.tertiaryText),
          );
    return Semantics(
      liveRegion: true,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (arte != null) ...<Widget>[
            ExcludeSemantics(child: arte),
            SizedBox(height: novo ? DesignTokens.space5 : DesignTokens.space6),
          ],
          Text(titulo, style: theme.textTheme.titleLarge, textAlign: TextAlign.center),
          if (texto != null) ...<Widget>[
            // Nas formas dos protótipos de F-PERFIL o texto fica a 24 do título, em até 280.
            SizedBox(height: novo ? DesignTokens.space6 : DesignTokens.space3),
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: novo ? 280 : 300),
              child: Text(
                texto!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
              ),
            ),
          ],
          if (rodape != null && novo) const SizedBox(height: DesignTokens.space6),
          ?rodape,
        ],
      ),
    );
  }
}
