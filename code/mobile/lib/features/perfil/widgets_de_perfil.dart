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

/// Leitor numa lista (seguidores-e-seguidos.md e solicitacoes-de-seguir.md §4): avatar de 48px,
/// nome e `@username`. A área do nome leva ao perfil; a ação à direita é alvo separado. Sem a
/// linha de biografia dos protótipos: o `PerfilResumo` do contrato não traz biografia.
class LinhaDeLeitor extends StatelessWidget {
  final PerfilResumo leitor;
  final VoidCallback? aoAbrir;
  final Widget? acao;

  const LinhaDeLeitor({super.key, required this.leitor, this.aoAbrir, this.acao});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: <Widget>[
        Expanded(
          child: Semantics(
            button: aoAbrir != null,
            label: '${leitor.displayName}, arroba ${leitor.username}',
            excludeSemantics: true,
            child: InkWell(
              onTap: aoAbrir,
              splashFactory: NoSplash.splashFactory,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Row(
                  children: <Widget>[
                    AvatarLeitor(url: leitor.avatarUrl, tamanho: 48),
                    const SizedBox(width: DesignTokens.space4),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Text(
                            leitor.displayName,
                            style: theme.textTheme.titleMedium,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            '@${leitor.username}',
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (acao != null) ...<Widget>[const SizedBox(width: DesignTokens.space3), acao!],
      ],
    );
  }
}

/// Fim de uma lista paginada: `Carregar mais` enquanto houver página, ou o aviso de falha com
/// `Tentar de novo`. A rolagem até perto do fim também carrega sozinha (quem monta a lista
/// escuta o `ScrollNotification`); o botão cobre a lista curta que não rola.
class FimDaLista extends StatelessWidget {
  final bool temMais;
  final bool carregandoMais;
  final bool falhou;
  final VoidCallback aoCarregar;

  const FimDaLista({
    super.key,
    required this.temMais,
    required this.carregandoMais,
    required this.falhou,
    required this.aoCarregar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (carregandoMais) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: DesignTokens.space4),
        child: SkeletonDeLinha(),
      );
    }
    if (!temMais) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
      child: Column(
        children: <Widget>[
          if (falhou)
            Text(
              'Não foi possível carregar mais. Verifique sua conexão.',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          TextButton(
            onPressed: aoCarregar,
            style: TextButton.styleFrom(
              foregroundColor: theme.primaryAccent,
              minimumSize: const Size(48, 48),
            ),
            child: Text(falhou ? 'Tentar de novo' : 'Carregar mais'),
          ),
        ],
      ),
    );
  }
}

/// Uma linha de lista em skeleton estático: círculo de 48px e duas barras.
class SkeletonDeLinha extends StatelessWidget {
  const SkeletonDeLinha({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget barra(double altura, double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: theme.coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
    return ExcludeSemantics(
      child: Row(
        children: <Widget>[
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(shape: BoxShape.circle, color: theme.coverPlaceholder),
          ),
          const SizedBox(width: DesignTokens.space4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                barra(17, 0.45),
                const SizedBox(height: DesignTokens.space2),
                barra(13, 0.30),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Botão da linha de lista (seguidores-e-seguidos.md e solicitacoes-de-seguir.md §4): outline
/// `rubi` para remover e recusar, secundário com ícone para seguindo, preenchido `musgo` e pill
/// para aceitar. O rótulo acessível nomeia a pessoa, para a decisão não depender da posição na
/// lista. Área de toque de 48px.
class BotaoDeLinha extends StatelessWidget {
  final String texto;
  final String rotuloAcessivel;
  final VoidCallback? aoTocar;
  final bool destrutivo;
  final bool preenchido;
  final IconData? icone;

  const BotaoDeLinha({
    super.key,
    required this.texto,
    required this.rotuloAcessivel,
    required this.aoTocar,
    this.destrutivo = false,
    this.preenchido = false,
    this.icone,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filho = Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        if (icone != null) ...<Widget>[
          Icon(icone, size: 16, color: theme.primaryAccent),
          const SizedBox(width: DesignTokens.space1),
        ],
        Text(texto),
      ],
    );
    final estiloDoTexto = theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600);
    const padding = EdgeInsets.symmetric(horizontal: DesignTokens.space5);
    final botao = preenchido
        ? FilledButton(
            onPressed: aoTocar,
            style: FilledButton.styleFrom(
              backgroundColor: theme.primaryAccent,
              foregroundColor: theme.colorScheme.onPrimary,
              minimumSize: const Size(48, 40),
              tapTargetSize: MaterialTapTargetSize.padded,
              padding: padding,
              shape: const StadiumBorder(),
              textStyle: estiloDoTexto,
            ),
            child: filho,
          )
        : OutlinedButton(
            onPressed: aoTocar,
            style: OutlinedButton.styleFrom(
              foregroundColor: destrutivo ? theme.colorScheme.error : theme.colorScheme.onSurface,
              minimumSize: const Size(48, 40),
              tapTargetSize: MaterialTapTargetSize.padded,
              padding: padding,
              side: BorderSide(color: destrutivo ? theme.colorScheme.error : theme.divider),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(DesignTokens.radius),
              ),
              textStyle: estiloDoTexto,
            ),
            child: filho,
          );
    return Semantics(button: true, label: rotuloAcessivel, excludeSemantics: true, child: botao);
  }
}

/// Linha de largura total em `musgo-fundo` com ícone, texto e `CaretRight` (meu-perfil.md §4.3,
/// perfil-de-outro-leitor.md §4.8). Sem badge vermelho nem ponto pulsando.
class LinhaDeAcento extends StatelessWidget {
  final IconData icone;
  final String texto;
  final VoidCallback aoTocar;

  const LinhaDeAcento({super.key, required this.icone, required this.texto, required this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      button: true,
      label: texto,
      excludeSemantics: true,
      child: InkWell(
        onTap: aoTocar,
        borderRadius: BorderRadius.circular(DesignTokens.radius),
        splashFactory: NoSplash.splashFactory,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(DesignTokens.space4),
          decoration: BoxDecoration(
            color: theme.accentTint,
            borderRadius: BorderRadius.circular(DesignTokens.radius),
          ),
          child: Row(
            children: <Widget>[
              Icon(icone, size: 20, color: theme.primaryAccent),
              const SizedBox(width: DesignTokens.space3),
              Expanded(child: Text(texto, style: theme.textTheme.bodyMedium)),
              Icon(PhosphorIconsRegular.caretRight, size: 20, color: theme.primaryAccent),
            ],
          ),
        ),
      ),
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
