import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import 'livro_oficial.dart';
import 'seletor_de_assuntos_controller.dart';

/// Campo `Assuntos` do formulário de livro pessoal (cadastro-pessoal.md §4.1). Não é campo de
/// texto: sem assunto, um gatilho abre o seletor; com assuntos, chips com `X` e `Alterar
/// assuntos`. O helper vira aviso a partir do sexto assunto, sem bloquear (RN-21.2), e o erro do
/// servidor toma o lugar dele.
class CampoAssuntos extends StatefulWidget {
  /// Em ordem alfabética: quem chama ordena (o seletor já devolve assim).
  final List<AssuntoResumo> assuntos;
  final String? erro;

  /// `false` enquanto o formulário salva: chips neutros, sem `X`, e a ação sem toque (§4.5).
  final bool habilitado;
  final VoidCallback aoEscolher;
  final ValueChanged<AssuntoResumo> aoRemover;

  /// Foco do gatilho ou de `Alterar assuntos`, o que estiver na tela. O formulário o usa para
  /// levar o foco ao campo no erro do servidor (§4.1 C).
  final FocusNode focoDaAcao;

  const CampoAssuntos({
    super.key,
    required this.assuntos,
    required this.erro,
    required this.habilitado,
    required this.aoEscolher,
    required this.aoRemover,
    required this.focoDaAcao,
  });

  @override
  State<CampoAssuntos> createState() => _CampoAssuntosState();
}

class _CampoAssuntosState extends State<CampoAssuntos> {
  final Map<String, FocusNode> _focoDoX = <String, FocusNode>{};

  FocusNode _foco(AssuntoResumo assunto) =>
      _focoDoX.putIfAbsent(assunto.id, () => FocusNode(debugLabel: 'Remover ${assunto.nome}'));

  @override
  void didUpdateWidget(CampoAssuntos antigo) {
    super.didUpdateWidget(antigo);
    final ids = widget.assuntos.map((a) => a.id).toSet();
    _focoDoX.removeWhere((id, no) {
      if (ids.contains(id)) {
        return false;
      }
      no.dispose();
      return true;
    });
  }

  @override
  void dispose() {
    for (final no in _focoDoX.values) {
      no.dispose();
    }
    super.dispose();
  }

  /// Ao remover, o foco vai ao chip seguinte ou, sem ele, à ação do campo (§9).
  void _remover(int indice) {
    final assuntos = widget.assuntos;
    final seguinte = indice + 1 < assuntos.length ? assuntos[indice + 1] : null;
    widget.aoRemover(assuntos[indice]);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      final alvo = seguinte == null ? widget.focoDaAcao : _focoDoX[seguinte.id];
      alvo?.requestFocus();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final assuntos = widget.assuntos;
    final nomes = <String>[for (final a in assuntos) a.nome];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Text('Assuntos', style: theme.textTheme.labelMedium),
        const SizedBox(height: DesignTokens.space2),
        if (assuntos.isEmpty)
          _Gatilho(
            foco: widget.focoDaAcao,
            erro: widget.erro != null,
            aoTocar: widget.habilitado ? widget.aoEscolher : null,
          )
        else ...<Widget>[
          Wrap(
            spacing: DesignTokens.space2,
            children: <Widget>[
              for (final (indice, assunto) in assuntos.indexed)
                _ChipEscolhido(
                  nome: assunto.nome,
                  foco: _foco(assunto),
                  aoRemover: widget.habilitado ? () => _remover(indice) : null,
                ),
            ],
          ),
          const SizedBox(height: DesignTokens.space1),
          Semantics(
            button: true,
            label:
                'Assuntos, ${assuntos.length} ${assuntos.length == 1 ? 'escolhido' : 'escolhidos'}: '
                '${juntarComE(nomes)}, alterar',
            excludeSemantics: true,
            onTap: widget.habilitado ? widget.aoEscolher : null,
            child: TextButton.icon(
              focusNode: widget.focoDaAcao,
              onPressed: widget.habilitado ? widget.aoEscolher : null,
              style: TextButton.styleFrom(
                minimumSize: const Size(48, 48),
                padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space1),
                foregroundColor: theme.primaryAccent,
                disabledForegroundColor: theme.tertiaryText,
                textStyle: theme.textTheme.labelLarge,
                splashFactory: NoSplash.splashFactory,
              ),
              icon: const Icon(PhosphorIconsRegular.pencilSimple, size: 20),
              label: const Text('Alterar assuntos'),
            ),
          ),
        ],
        const SizedBox(height: DesignTokens.space2),
        if (widget.erro != null)
          Semantics(
            liveRegion: true,
            child: Text(
              widget.erro!,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
            ),
          )
        else if (assuntos.length > assuntosRecomendados)
          Semantics(
            liveRegion: true,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.only(top: 1),
                  child: Icon(PhosphorIconsRegular.warning, size: 16, color: theme.warningColor),
                ),
                const SizedBox(width: DesignTokens.space2),
                // O texto fica em `tinta`: `ambar` sobre `papel` não passa no contraste (§4.1 B).
                Expanded(
                  child: Text(
                    'Você escolheu ${assuntos.length} assuntos. Até 5 ajuda a encontrar o livro '
                    'com mais precisão.',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface),
                  ),
                ),
              ],
            ),
          )
        else
          Text(
            'Opcional. Escolha da lista do Lê Ai, de preferência até 5.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
      ],
    );
  }
}

/// Gatilho sem assunto: o desenho de campo do §2, mas um botão, sem cursor nem placeholder.
class _Gatilho extends StatelessWidget {
  final FocusNode foco;
  final bool erro;
  final VoidCallback? aoTocar;

  const _Gatilho({required this.foco, required this.erro, required this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final habilitado = aoTocar != null;
    final cor = habilitado ? theme.secondaryText : theme.tertiaryText;
    return Semantics(
      button: true,
      label: 'Assuntos, nenhum escolhido, escolher',
      excludeSemantics: true,
      onTap: aoTocar,
      child: Material(
        color: habilitado ? theme.elevatedSurface : theme.divider,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DesignTokens.radius),
          side: BorderSide(
            color: erro ? theme.colorScheme.error : theme.divider,
            width: erro ? 1.5 : 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          focusNode: foco,
          onTap: aoTocar,
          splashFactory: NoSplash.splashFactory,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: DesignTokens.space4,
                vertical: DesignTokens.space3,
              ),
              child: Row(
                children: <Widget>[
                  Icon(PhosphorIconsRegular.tag, size: 20, color: cor),
                  const SizedBox(width: DesignTokens.space3),
                  Expanded(
                    child: Text(
                      'Escolher assuntos',
                      style: theme.textTheme.bodyMedium?.copyWith(color: cor),
                    ),
                  ),
                  Icon(PhosphorIconsRegular.caretRight, size: 20, color: cor),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Chip de assunto escolhido: o chip é texto, o `X` é o botão (`Remover <assunto>`, alvo de
/// 48px). Desabilitado, perde o `X` e fica neutro.
class _ChipEscolhido extends StatelessWidget {
  final String nome;
  final FocusNode foco;
  final VoidCallback? aoRemover;

  const _ChipEscolhido({required this.nome, required this.foco, required this.aoRemover});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final habilitado = aoRemover != null;
    final cor = habilitado ? theme.primaryAccent : theme.secondaryText;
    final fundo = habilitado ? theme.accentTint : theme.elevatedSurface;
    const raio = Radius.circular(DesignTokens.radiusFull);
    final texto = Container(
      constraints: const BoxConstraints(minHeight: 32),
      padding: EdgeInsetsDirectional.only(
        start: DesignTokens.space3,
        end: habilitado ? DesignTokens.space1 : DesignTokens.space3,
        top: DesignTokens.space1,
        bottom: DesignTokens.space1,
      ),
      decoration: BoxDecoration(
        color: fundo,
        borderRadius: habilitado
            ? const BorderRadiusDirectional.horizontal(
                start: raio,
              ).resolve(Directionality.of(context))
            : const BorderRadius.all(raio),
      ),
      // `widthFactor: 1`: o chip tem a largura do nome, e o texto fica centrado na altura.
      child: Align(
        widthFactor: 1,
        child: Text(
          nome,
          style: theme.textTheme.bodySmall?.copyWith(color: cor, fontWeight: FontWeight.w600),
        ),
      ),
    );
    if (!habilitado) {
      return ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Align(widthFactor: 1, child: texto),
      );
    }
    // O chip tem 32px de altura; o alvo do `X` tem 48 por 48: a altura inteira da linha e 12px
    // transparentes depois do chip, que fazem o vão até o próximo.
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Flexible(child: texto),
        Semantics(
          button: true,
          label: 'Remover $nome',
          excludeSemantics: true,
          onTap: aoRemover,
          child: InkResponse(
            focusNode: foco,
            onTap: aoRemover,
            radius: 20,
            containedInkWell: false,
            highlightShape: BoxShape.circle,
            splashFactory: NoSplash.splashFactory,
            child: SizedBox(
              width: 48,
              height: 48,
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Container(
                  width: 36,
                  height: 32,
                  alignment: AlignmentDirectional.centerStart,
                  padding: const EdgeInsetsDirectional.only(end: DesignTokens.space4),
                  decoration: BoxDecoration(
                    color: fundo,
                    borderRadius: const BorderRadiusDirectional.horizontal(
                      end: raio,
                    ).resolve(Directionality.of(context)),
                  ),
                  child: Icon(PhosphorIconsRegular.x, size: 16, color: cor),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
