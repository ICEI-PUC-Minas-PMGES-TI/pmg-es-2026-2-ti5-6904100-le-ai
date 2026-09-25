import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import 'avatar.dart';
import 'perfil_service.dart';

/// Avatar circular de leitor (meu-perfil.md §4, editar-perfil.md §4): borda de 1px `linha`. Sem
/// foto, o círculo fica em `papel-elevado` com o ícone de pessoa (nenhum protótipo define esse
/// estado). A prévia do upload vem em [bytes]; a foto do Cloudinary vai como miniatura.
class AvatarLeitor extends StatelessWidget {
  final String? url;
  final Uint8List? bytes;
  final double tamanho;

  const AvatarLeitor({super.key, this.url, this.bytes, required this.tamanho});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final vazio = Icon(
      PhosphorIconsRegular.user,
      size: tamanho / 2,
      color: theme.tertiaryText,
    );
    Widget conteudo;
    if (bytes != null) {
      conteudo = Image.memory(bytes!, fit: BoxFit.cover, width: tamanho, height: tamanho);
    } else if (url != null) {
      final origem = url!.startsWith('https://res.cloudinary.com/')
          ? miniaturaDoAvatar(url!, tamanho)
          : url!;
      conteudo = Image.network(
        origem,
        fit: BoxFit.cover,
        width: tamanho,
        height: tamanho,
        errorBuilder: (context, erro, pilha) => vazio,
      );
    } else {
      conteudo = vazio;
    }
    return ExcludeSemantics(
      child: Container(
        width: tamanho,
        height: tamanho,
        alignment: Alignment.center,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: theme.elevatedSurface,
          border: Border.all(color: theme.divider),
        ),
        child: conteudo,
      ),
    );
  }
}

/// Chip de privacidade: distinguível sem cor, com ícone e palavra (meu-perfil.md §9).
class ChipPrivacidade extends StatelessWidget {
  final Privacidade privacidade;

  const ChipPrivacidade({super.key, required this.privacidade});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final publico = privacidade == Privacidade.publico;
    final cor = publico ? theme.primaryAccent : theme.secondaryText;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space3,
        vertical: DesignTokens.space1,
      ),
      decoration: BoxDecoration(
        color: publico ? theme.accentTint : theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
        border: publico ? null : Border.all(color: theme.divider),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(
            publico ? PhosphorIconsRegular.globe : PhosphorIconsRegular.lock,
            size: 16,
            color: cor,
          ),
          const SizedBox(width: DesignTokens.space1),
          Text(
            publico ? 'Perfil público' : 'Perfil privado',
            style: theme.textTheme.bodySmall?.copyWith(color: cor, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

/// Um contador com unidade: número em `num-inline` acima, rótulo abaixo. Anunciado por extenso,
/// no formato `84 seguidores` (meu-perfil.md §9).
class ContadorDePerfil extends StatelessWidget {
  final int valor;
  final String rotulo;
  final VoidCallback? aoTocar;

  const ContadorDePerfil({super.key, required this.valor, required this.rotulo, this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final corpo = Semantics(
      button: aoTocar != null,
      label: '$valor $rotulo',
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text('$valor', style: theme.numInline),
            Text(rotulo, style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText)),
          ],
        ),
      ),
    );
    if (aoTocar == null) {
      return corpo;
    }
    return InkWell(onTap: aoTocar, splashFactory: NoSplash.splashFactory, child: corpo);
  }
}

/// Os contadores numa linha, com divisor vertical e o divisor de largura total abaixo (§4).
class LinhaDeContadores extends StatelessWidget {
  final List<ContadorDePerfil> contadores;

  const LinhaDeContadores({super.key, required this.contadores});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filhos = <Widget>[];
    for (var i = 0; i < contadores.length; i++) {
      if (i > 0) {
        filhos.add(SizedBox(height: 40, child: VerticalDivider(width: 1, color: theme.divider)));
      }
      filhos.add(Expanded(child: contadores[i]));
    }
    return Container(
      padding: const EdgeInsets.only(bottom: DesignTokens.space4),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.divider))),
      child: Row(children: filhos),
    );
  }
}

/// Skeleton estático do bloco de identidade (§4.5): sem shimmer, sem spinner.
class SkeletonDeIdentidade extends StatelessWidget {
  const SkeletonDeIdentidade({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget barra(double altura, double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: theme.coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
    return ExcludeSemantics(
      child: Column(
        children: <Widget>[
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(shape: BoxShape.circle, color: theme.coverPlaceholder),
          ),
          const SizedBox(height: DesignTokens.space4),
          barra(32, 0.55),
          const SizedBox(height: DesignTokens.space2),
          barra(13, 0.30),
          const SizedBox(height: DesignTokens.space3),
          barra(15, 0.80),
          const SizedBox(height: DesignTokens.space5),
          barra(48, 0.62),
        ],
      ),
    );
  }
}
