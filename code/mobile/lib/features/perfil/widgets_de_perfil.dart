import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import 'avatar.dart';
import 'perfil_service.dart';

/// Primeira letra do primeiro e do último nome, em maiúsculas: "Marina Beltrão" vira "MB".
String iniciaisDoNome(String nome) {
  final partes = nome.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (partes.isEmpty) {
    return '';
  }
  String primeiraLetra(String palavra) => String.fromCharCode(palavra.runes.first);
  final primeira = primeiraLetra(partes.first);
  final ultima = partes.length > 1 ? primeiraLetra(partes.last) : '';
  return (primeira + ultima).toUpperCase();
}

/// Avatar circular de leitor (meu-perfil.md §4, editar-perfil.md §4): borda de 1px `linha`. Sem
/// foto, os protótipos de F-PERFIL mostram as iniciais do [nome] em `musgo`, peso 600, sobre
/// `musgo-fundo`, em cerca de um terço do lado (31 no avatar de 96, 38 no de 120). Sem nome, fica
/// o ícone de pessoa. A prévia do upload vem em [bytes]; a foto do Cloudinary vai como miniatura.
class AvatarLeitor extends StatelessWidget {
  final String? url;
  final Uint8List? bytes;
  final double tamanho;

  /// Nome de exibição, de onde saem as iniciais quando não há foto.
  final String? nome;

  const AvatarLeitor({super.key, this.url, this.bytes, required this.tamanho, this.nome});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final iniciais = iniciaisDoNome(nome ?? '');
    final semFoto = bytes == null && url == null;
    final vazio = iniciais.isEmpty
        ? Icon(PhosphorIconsRegular.user, size: tamanho / 2, color: theme.tertiaryText)
        : Text(
            iniciais,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontSize: (tamanho * 0.32).roundToDouble(),
              fontWeight: FontWeight.w600,
              height: 1,
              color: theme.primaryAccent,
            ),
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
          color: semFoto && iniciais.isNotEmpty ? theme.accentTint : theme.elevatedSurface,
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

/// Leitor numa lista (protótipos seguidores-e-seguidos e solicitacoes-de-seguir): avatar de 48px,
/// nome, `@username` e a biografia em `caption` `grafite`, numa linha com reticências nas listas
/// e em duas no card da busca ([linhasDaBiografia]). A área do nome leva ao perfil; a ação à
/// direita é alvo separado, centrada na linha ou no topo ([acaoNoTopo], o tempo da solicitação).
/// [abaixoDoUsername] entra entre o `@username` e a biografia (o chip de privacidade da busca).
class LinhaDeLeitor extends StatelessWidget {
  final PerfilResumo leitor;
  final VoidCallback? aoAbrir;
  final Widget? acao;
  final bool acaoNoTopo;
  final int linhasDaBiografia;
  final Widget? abaixoDoUsername;

  const LinhaDeLeitor({
    super.key,
    required this.leitor,
    this.aoAbrir,
    this.acao,
    this.acaoNoTopo = false,
    this.linhasDaBiografia = 1,
    this.abaixoDoUsername,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final biografia = leitor.biografia?.trim();
    return Row(
      crossAxisAlignment: acaoNoTopo ? CrossAxisAlignment.start : CrossAxisAlignment.center,
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
                    AvatarLeitor(url: leitor.avatarUrl, tamanho: 48, nome: leitor.displayName),
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
                          if (abaixoDoUsername != null) ...<Widget>[
                            const SizedBox(height: DesignTokens.space1),
                            abaixoDoUsername!,
                          ],
                          if (biografia != null && biografia.isNotEmpty) ...<Widget>[
                            const SizedBox(height: DesignTokens.space1),
                            Text(
                              biografia,
                              key: const ValueKey<String>('biografia-da-linha'),
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.secondaryText,
                              ),
                              maxLines: linhasDaBiografia,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
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
/// escuta o `ScrollNotification`); o botão cobre a lista curta que não rola. Enquanto a página
/// seguinte chega, mostra o [esqueleto] da tela (as linhas de skeleton do "carregando mais" dos
/// protótipos), ou um [SkeletonDeLinha] simples.
class FimDaLista extends StatelessWidget {
  final bool temMais;
  final bool carregandoMais;
  final bool falhou;
  final VoidCallback aoCarregar;
  final Widget? esqueleto;

  const FimDaLista({
    super.key,
    required this.temMais,
    required this.carregandoMais,
    required this.falhou,
    required this.aoCarregar,
    this.esqueleto,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (carregandoMais) {
      return esqueleto ?? const SkeletonDeLinha();
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

/// Onde fica o placeholder das ações num [SkeletonDeLinha]: nenhum, um botão à direita
/// (`Remover`/`Seguindo` das conexões) ou os dois botões numa linha própria abaixo
/// (`Recusar`/`Aceitar` das solicitações).
enum BotoesDoSkeleton { nenhum, aDireita, doisAbaixo }

/// Uma linha de lista em skeleton estático, como nos protótipos de carregando: círculo de 48px,
/// três barras (nome, `@username` e biografia) e o placeholder das ações. Traz o próprio padding
/// (`space-5` nas laterais, `space-4` em cima e embaixo) e, com [comDivisor], o divisor de largura
/// total embaixo, para empilhar igual às linhas de verdade.
class SkeletonDeLinha extends StatelessWidget {
  final BotoesDoSkeleton botoes;
  final bool comDivisor;

  const SkeletonDeLinha({super.key, this.botoes = BotoesDoSkeleton.nenhum, this.comDivisor = false});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget peca(double largura, double altura, double raio) => Container(
      width: largura,
      height: altura,
      decoration: BoxDecoration(
        color: theme.coverPlaceholder,
        borderRadius: BorderRadius.circular(raio),
      ),
    );
    Widget barra(double altura, double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: peca(double.infinity, altura, DesignTokens.radiusSm),
    );
    final identidade = Row(
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
              barra(16, 0.35),
              const SizedBox(height: DesignTokens.space2),
              barra(12, 0.22),
              const SizedBox(height: DesignTokens.space2),
              barra(12, 0.62),
            ],
          ),
        ),
        if (botoes == BotoesDoSkeleton.aDireita) ...<Widget>[
          const SizedBox(width: DesignTokens.space3),
          peca(88, 36, DesignTokens.radius),
        ],
      ],
    );
    return ExcludeSemantics(
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: DesignTokens.space5,
          vertical: DesignTokens.space4,
        ),
        decoration: comDivisor
            ? BoxDecoration(border: Border(bottom: BorderSide(color: theme.divider)))
            : null,
        child: botoes != BotoesDoSkeleton.doisAbaixo
            ? identidade
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  identidade,
                  const SizedBox(height: DesignTokens.space3),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: <Widget>[
                      peca(92, 40, DesignTokens.radius),
                      const SizedBox(width: DesignTokens.space3),
                      peca(92, 40, DesignTokens.radiusFull),
                    ],
                  ),
                ],
              ),
      ),
    );
  }
}

/// Botão da linha de lista (seguidores-e-seguidos.md e solicitacoes-de-seguir.md §4): outline
/// `rubi` para remover e recusar, secundário com ícone para seguindo, preenchido `musgo` e pill
/// para aceitar. O rótulo acessível nomeia a pessoa, para a decisão não depender da posição na
/// lista. Área de toque de 48px; o desenho tem 40px, ou 36px com [compacto] (`Remover` e
/// `Seguindo` das conexões), com `space-4` nas laterais.
class BotaoDeLinha extends StatelessWidget {
  final String texto;
  final String rotuloAcessivel;
  final VoidCallback? aoTocar;
  final bool destrutivo;
  final bool preenchido;
  final IconData? icone;
  final bool compacto;

  const BotaoDeLinha({
    super.key,
    required this.texto,
    required this.rotuloAcessivel,
    required this.aoTocar,
    this.destrutivo = false,
    this.preenchido = false,
    this.icone,
    this.compacto = false,
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
    const padding = EdgeInsets.symmetric(horizontal: DesignTokens.space4);
    final tamanhoMinimo = Size(48, compacto ? 36 : 40);
    final botao = preenchido
        ? FilledButton(
            onPressed: aoTocar,
            style: FilledButton.styleFrom(
              backgroundColor: theme.primaryAccent,
              foregroundColor: theme.colorScheme.onPrimary,
              minimumSize: tamanhoMinimo,
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
              minimumSize: tamanhoMinimo,
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
