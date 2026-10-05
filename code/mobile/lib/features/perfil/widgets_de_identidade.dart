import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';

/// Widgets do bloco de identidade de meu-perfil e perfil-de-outro-leitor, refeitos a partir dos
/// protótipos renderizados (docs/design/AGENTS.md §10): skeleton com a linha de contadores,
/// contadores com divisor de altura total, a linha de pedido centralizada e as seções Estante e
/// Resenhas no estado vazio.

/// Um contador do perfil: [valor] com a unidade em [rotulo], anunciado como `84 seguidores`
/// (meu-perfil.md §9). Com [aoTocar], leva à aba correspondente de Conexões.
class DadoDeContador {
  final int valor;
  final String rotulo;
  final VoidCallback? aoTocar;

  const DadoDeContador({required this.valor, required this.rotulo, this.aoTocar});
}

/// Contadores numa linha (§4): células com 12 em cima e embaixo, divisor vertical de altura total
/// entre elas e o divisor de largura total logo abaixo, como no protótipo.
class ContadoresDoPerfil extends StatelessWidget {
  final List<DadoDeContador> contadores;

  const ContadoresDoPerfil({super.key, required this.contadores});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filhos = <Widget>[];
    for (var i = 0; i < contadores.length; i++) {
      if (i > 0) {
        filhos.add(VerticalDivider(width: 1, thickness: 1, color: theme.divider));
      }
      filhos.add(Expanded(child: _CelulaDeContador(dado: contadores[i])));
    }
    return DecoratedBox(
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.divider))),
      child: IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: filhos),
      ),
    );
  }
}

class _CelulaDeContador extends StatelessWidget {
  final DadoDeContador dado;

  const _CelulaDeContador({required this.dado});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final corpo = Semantics(
      button: dado.aoTocar != null,
      label: '${dado.valor} ${dado.rotulo}',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: DesignTokens.space3),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text('${dado.valor}', style: theme.numInline),
            const SizedBox(height: 2),
            Text(dado.rotulo, style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText)),
          ],
        ),
      ),
    );
    if (dado.aoTocar == null) {
      return corpo;
    }
    return InkWell(onTap: dado.aoTocar, splashFactory: NoSplash.splashFactory, child: corpo);
  }
}

/// Linha em `musgo-fundo` com ícone, texto e `CaretRight` (meu-perfil.md §4.3,
/// perfil-de-outro-leitor.md §4.8). Com [centralizada], o texto herda o alinhamento central do
/// bloco de identidade, como em "Rafael pediu para seguir você." no protótipo.
class LinhaDePedido extends StatelessWidget {
  final String texto;
  final VoidCallback aoTocar;
  final bool centralizada;

  const LinhaDePedido({super.key, required this.texto, required this.aoTocar, this.centralizada = false});

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
              Icon(PhosphorIconsRegular.userPlus, size: 20, color: theme.primaryAccent),
              const SizedBox(width: DesignTokens.space3),
              Expanded(
                child: Text(
                  texto,
                  style: theme.textTheme.bodyMedium,
                  textAlign: centralizada ? TextAlign.center : TextAlign.start,
                ),
              ),
              Icon(PhosphorIconsRegular.caretRight, size: 20, color: theme.primaryAccent),
            ],
          ),
        ),
      ),
    );
  }
}

/// Skeleton estático do perfil (meu-perfil §4.5, perfil-de-outro-leitor §4.7): sem shimmer, sem
/// spinner. Avatar e três barras com 12 entre si; no perfil de outro leitor, [comBotao] acrescenta
/// a barra em pill de 240 do botão de relação; depois, a linha de contadores. O meu perfil não tem
/// a barra do botão no protótipo.
class SkeletonDoPerfil extends StatelessWidget {
  final bool comBotao;

  const SkeletonDoPerfil({super.key, this.comBotao = false});

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
    Widget contador() => Expanded(
      child: Column(
        children: <Widget>[
          barra(22, 0.40),
          const SizedBox(height: 6),
          barra(13, 0.70),
        ],
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
          const SizedBox(height: DesignTokens.space3),
          barra(32, comBotao ? 0.60 : 0.55),
          const SizedBox(height: DesignTokens.space3),
          barra(13, comBotao ? 0.35 : 0.30),
          const SizedBox(height: DesignTokens.space3),
          barra(15, comBotao ? 0.85 : 0.80),
          if (comBotao) ...<Widget>[
            const SizedBox(height: DesignTokens.space3),
            Container(
              width: 240,
              height: 48,
              decoration: BoxDecoration(
                color: theme.coverPlaceholder,
                borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
              ),
            ),
          ],
          const SizedBox(height: DesignTokens.space6),
          Row(children: <Widget>[contador(), const SizedBox(width: DesignTokens.space4), contador()]),
        ],
      ),
    );
  }
}

/// Estante e Resenhas do perfil. A estante entra por [estante] (F-EST, `listarEstantePerfil`, com o
/// próprio título); sem ele, fica o estado vazio. As resenhas entram por [resenhas] (F-AVA, 27/09/2026: a lista do
/// `leitura`, com o próprio vazio); sem ele, fica o texto vazio de antes.
///
/// [proprio] usa a segunda pessoa, o CTA "Buscar livros" ([aoBuscarLivros]) e o "Ver tudo" da
/// estante ([aoVerEstante]); no perfil de outro leitor, os textos são neutros, com o [nome]. Quem
/// usa decide se mostra: com conteúdo restrito (RN-08), vale o bloco "Este perfil é privado".
/// Texto do perfil sem resenhas, na segunda pessoa para o próprio leitor.
String textoSemResenhas({required bool proprio, String? nome}) => proprio
    ? 'Suas resenhas aparecem aqui depois que você escrever a primeira.'
    : '${nome ?? 'Este leitor'} ainda não escreveu resenhas.';

class SecoesDeLeitura extends StatelessWidget {
  final bool proprio;
  final String? nome;
  final VoidCallback? aoBuscarLivros;
  final VoidCallback? aoVerEstante;

  /// Conteúdo da seção "Resenhas" (a lista de F-AVA). Sem ele, o texto vazio.
  final Widget? resenhas;

  final Widget? estante;

  /// Seção "Listas" (F-LST), com o próprio título; a última do perfil. Sem ela, a seção não
  /// aparece.
  final Widget? listas;

  const SecoesDeLeitura({
    super.key,
    required this.proprio,
    this.nome,
    this.aoBuscarLivros,
    this.aoVerEstante,
    this.resenhas,
    this.estante,
    this.listas,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final quem = nome ?? 'Este leitor';
    final textoMudo = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    Widget titulo(String texto, {Widget? acao}) => Row(
      children: <Widget>[
        Expanded(
          child: Semantics(header: true, child: Text(texto, style: theme.textTheme.headlineSmall)),
        ),
        ?acao,
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (estante case final estante?)
          estante
        else ...<Widget>[
          titulo(
            'Estante',
            acao: proprio && aoVerEstante != null
                ? TextButton(
                    onPressed: aoVerEstante,
                    style: TextButton.styleFrom(
                      foregroundColor: theme.primaryAccent,
                      minimumSize: const Size(48, 48),
                      padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space1),
                      textStyle: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    child: const Text('Ver tudo'),
                  )
                : null,
          ),
          const SizedBox(height: DesignTokens.space5),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
            child: Column(
              children: <Widget>[
                ExcludeSemantics(
                  child: Icon(PhosphorIconsRegular.books, size: 32, color: theme.tertiaryText),
                ),
                const SizedBox(height: DesignTokens.space6),
                Text(
                  proprio
                      ? 'Os livros que você adicionar aparecem aqui.'
                      : '$quem ainda não tem livros na estante.',
                  style: textoMudo,
                  textAlign: TextAlign.center,
                ),
                if (proprio && aoBuscarLivros != null) ...<Widget>[
                  const SizedBox(height: DesignTokens.space6),
                  BotaoPrimario(texto: 'Buscar livros', onPressed: aoBuscarLivros, larguraTotal: false),
                ],
              ],
            ),
          ),
        ],
        const SizedBox(height: DesignTokens.space12),
        titulo('Resenhas'),
        const SizedBox(height: DesignTokens.space4),
        resenhas ??
            Text(
              textoSemResenhas(proprio: proprio, nome: nome),
              style: textoMudo,
              textAlign: TextAlign.center,
            ),
        if (listas case final listas?) ...<Widget>[
          const SizedBox(height: DesignTokens.space12),
          listas,
        ],
      ],
    );
  }
}
