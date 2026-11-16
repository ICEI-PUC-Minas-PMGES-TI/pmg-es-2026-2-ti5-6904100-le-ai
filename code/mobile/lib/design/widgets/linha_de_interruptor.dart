import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';
import '../tokens.dart';

const double _alturaMinimaDaLinha = 72;
const double _larguraDoTrilho = 52;
const double _alturaDoTrilho = 32;
const double _larguraDoContorno = 2;
const double _botaoLigado = 24;
const double _botaoDesligado = 16;
const double _folgaLigado = 4;
const double _folgaDesligado = 8;
const double _tamanhoDoIcone = 24;
const double _tamanhoDoIconeDeErro = 16;

class LinhaDeInterruptor extends StatelessWidget {
  final IconData icone;
  final String titulo;
  final String descricao;
  final bool ligado;
  final VoidCallback aoAlternar;
  final String? erro;
  final bool comDivisor;

  const LinhaDeInterruptor({
    super.key,
    required this.icone,
    required this.titulo,
    required this.descricao,
    required this.ligado,
    required this.aoAlternar,
    this.erro,
    this.comDivisor = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mensagemDeErro = erro;
    return Semantics(
      toggled: ligado,
      label: titulo,
      hint: mensagemDeErro == null ? descricao : '$descricao $mensagemDeErro',
      liveRegion: mensagemDeErro != null,
      onTap: aoAlternar,
      excludeSemantics: true,
      child: InkWell(
        onTap: aoAlternar,
        child: Column(
          children: <Widget>[
            ConstrainedBox(
              constraints: const BoxConstraints(minHeight: _alturaMinimaDaLinha),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: DesignTokens.space5,
                  vertical: DesignTokens.space3,
                ),
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      Align(
                        alignment: Alignment.topLeft,
                        child: Icon(icone, size: _tamanhoDoIcone, color: theme.secondaryText),
                      ),
                      const SizedBox(width: DesignTokens.space4),
                      Expanded(child: _textos(theme, mensagemDeErro)),
                      const SizedBox(width: DesignTokens.space4),
                      Center(child: _Trilho(ligado: ligado)),
                    ],
                  ),
                ),
              ),
            ),
            if (comDivisor)
              Divider(
                height: 1,
                thickness: 1,
                indent: DesignTokens.space5 + _tamanhoDoIcone + DesignTokens.space4,
                color: theme.divider,
              ),
          ],
        ),
      ),
    );
  }

  Widget _textos(ThemeData theme, String? mensagemDeErro) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        Text(titulo, style: theme.textTheme.bodyMedium),
        const SizedBox(height: DesignTokens.space1),
        Text(descricao, style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText)),
        if (mensagemDeErro != null) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(
                PhosphorIconsRegular.warning,
                size: _tamanhoDoIconeDeErro,
                color: theme.colorScheme.error,
              ),
              const SizedBox(width: DesignTokens.space1),
              Expanded(
                child: Text(
                  mensagemDeErro,
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _Trilho extends StatelessWidget {
  final bool ligado;

  const _Trilho({required this.ligado});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final duracao = MediaQuery.of(context).disableAnimations
        ? Duration.zero
        : DesignTokens.durFast;
    final escuro = theme.brightness == Brightness.dark;
    final corDoContorno = ligado ? theme.primaryAccent : theme.tertiaryText;
    final tamanhoDoBotao = ligado ? _botaoLigado : _botaoDesligado;
    return SizedBox(
      width: _larguraDoTrilho,
      height: _alturaDoTrilho,
      child: Stack(
        children: <Widget>[
          AnimatedContainer(
            duration: duracao,
            curve: DesignTokens.easeInOut,
            decoration: BoxDecoration(
              color: ligado ? theme.primaryAccent : theme.elevatedSurface,
              borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
              border: Border.all(color: corDoContorno, width: _larguraDoContorno),
            ),
          ),
          AnimatedPositioned(
            duration: duracao,
            curve: DesignTokens.easeInOut,
            left: ligado ? _larguraDoTrilho - _botaoLigado - _folgaLigado : _folgaDesligado,
            top: (_alturaDoTrilho - tamanhoDoBotao) / 2,
            width: tamanhoDoBotao,
            height: tamanhoDoBotao,
            child: AnimatedContainer(
              duration: duracao,
              curve: DesignTokens.easeInOut,
              decoration: BoxDecoration(
                color: ligado
                    ? theme.pageBackground
                    : (escuro ? theme.secondaryText : theme.tertiaryText),
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
