import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import 'markdown_edicao.dart';

class _Botao {
  final String rotulo;
  final IconData icone;
  final bool Function(TextEditingValue valor) ativo;
  final TextEditingValue Function(TextEditingValue valor) aplicar;

  const _Botao(this.rotulo, this.icone, this.ativo, this.aplicar);

  _Botao.marca(this.rotulo, this.icone, Marca marca)
    : ativo = ((valor) => marcaAtiva(valor, marca)),
      aplicar = ((valor) => alternarMarca(valor, marca));

  _Botao.prefixo(this.rotulo, this.icone, Prefixo prefixo)
    : ativo = ((valor) => prefixoAtivo(valor, prefixo)),
      aplicar = ((valor) => alternarPrefixo(valor, prefixo));
}

final List<List<_Botao>> _grupos = <List<_Botao>>[
  <_Botao>[
    _Botao.marca('Negrito', PhosphorIconsRegular.textB, Marca.negrito),
    _Botao.marca('Itálico', PhosphorIconsRegular.textItalic, Marca.italico),
    _Botao.marca('Tachado', PhosphorIconsRegular.textStrikethrough, Marca.tachado),
  ],
  <_Botao>[
    _Botao.prefixo('Lista com marcadores', PhosphorIconsRegular.listBullets, Prefixo.marcadores),
    _Botao.prefixo('Lista numerada', PhosphorIconsRegular.listNumbers, Prefixo.numerada),
    _Botao.prefixo('Citação', PhosphorIconsRegular.quotes, Prefixo.citacao),
  ],
];

/// Barra de formatação do editor de resenha (escrever-resenha.md §4.1): faixa de 48px acima da
/// barra de spoiler e contador, seis botões de 48px em dois grupos, só o subconjunto do RN-13.
/// Cada botão é de alternar, com o estado exposto ao leitor de tela; o fundo `musgo-fundo` é só o
/// reforço, e o ícone fica no peso `regular` (exceção declarada à regra do `fill`).
///
/// A barra não mexe no campo: lê o valor do controlador e devolve o novo em [aoAplicar].
class BarraDeFormatacao extends StatelessWidget {
  final TextEditingValue valor;
  final ValueChanged<TextEditingValue>? aoAplicar;

  const BarraDeFormatacao({super.key, required this.valor, required this.aoAplicar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final habilitada = aoAplicar != null;
    return Semantics(
      container: true,
      label: 'Formatação',
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: theme.elevatedSurface,
          border: Border(top: BorderSide(color: theme.divider)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space3),
          child: SizedBox(
            height: 48,
            child: Row(
              children: <Widget>[
                for (var i = 0; i < _grupos.length; i++) ...<Widget>[
                  if (i > 0)
                    Container(
                      width: 1,
                      height: 24,
                      margin: const EdgeInsets.symmetric(horizontal: DesignTokens.space2),
                      color: theme.divider,
                    ),
                  for (final botao in _grupos[i])
                    _BotaoDeFormatacao(
                      rotulo: botao.rotulo,
                      icone: botao.icone,
                      ativo: habilitada && botao.ativo(valor),
                      aoTocar: habilitada ? () => aoAplicar!(botao.aplicar(valor)) : null,
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BotaoDeFormatacao extends StatelessWidget {
  final String rotulo;
  final IconData icone;
  final bool ativo;
  final VoidCallback? aoTocar;

  const _BotaoDeFormatacao({
    required this.rotulo,
    required this.icone,
    required this.ativo,
    required this.aoTocar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = aoTocar == null
        ? theme.tertiaryText
        : ativo
        ? theme.primaryAccent
        : theme.secondaryText;
    // `excludeSemantics` descarta o toque do `InkWell`; sem o `onTap` aqui, Switch Access e Voice
    // Access não acionam o botão (como no `ToggleSpoiler`).
    return Semantics(
      button: true,
      toggled: ativo,
      enabled: aoTocar != null,
      label: rotulo,
      onTap: aoTocar,
      excludeSemantics: true,
      child: SizedBox(
        width: 48,
        height: 48,
        child: InkWell(
          onTap: aoTocar,
          customBorder: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(DesignTokens.radius),
          ),
          // O toque não tira o foco do campo: o teclado continua aberto enquanto se formata.
          canRequestFocus: false,
          child: Center(
            child: Container(
              width: 40,
              height: 40,
              decoration: ativo
                  ? BoxDecoration(
                      color: theme.accentTint,
                      borderRadius: BorderRadius.circular(DesignTokens.radius),
                    )
                  : null,
              child: Icon(icone, size: 20, color: cor),
            ),
          ),
        ),
      ),
    );
  }
}

/// Alternância segmentada `Escrever | Visualizar` (escrever-resenha.md §4.1): contêiner de 48 por
/// 240px em `papel-elevado`, segmento ativo em `musgo-fundo` com rótulo `musgo`. Os dois segmentos
/// são abas para o leitor de tela, com a selecionada anunciada.
class AlternanciaDeModo extends StatelessWidget {
  final bool visualizando;
  final ValueChanged<bool>? aoMudar;

  const AlternanciaDeModo({super.key, required this.visualizando, required this.aoMudar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget segmento(String rotulo, bool doVisualizar) {
      final ativo = visualizando == doVisualizar;
      final cor = aoMudar == null
          ? theme.tertiaryText
          : ativo
          ? theme.primaryAccent
          : theme.secondaryText;
      return Expanded(
        child: Semantics(
          selected: ativo,
          button: true,
          enabled: aoMudar != null,
          label: rotulo,
          onTap: aoMudar == null ? null : () => aoMudar!(doVisualizar),
          excludeSemantics: true,
          child: InkWell(
            onTap: aoMudar == null ? null : () => aoMudar!(doVisualizar),
            customBorder: const StadiumBorder(),
            child: Container(
              alignment: Alignment.center,
              decoration: ativo && aoMudar != null
                  ? ShapeDecoration(color: theme.accentTint, shape: const StadiumBorder())
                  : null,
              child: Text(rotulo, style: theme.textTheme.labelLarge?.copyWith(color: cor)),
            ),
          ),
        ),
      );
    }

    return Align(
      alignment: Alignment.centerLeft,
      child: ConstrainedBox(
        // Altura mínima: com a fonte do sistema aumentada, o contêiner cresce em vez de cortar.
        constraints: const BoxConstraints(minHeight: 48, maxWidth: 240),
        child: DecoratedBox(
          decoration: ShapeDecoration(
            color: theme.elevatedSurface,
            shape: StadiumBorder(side: BorderSide(color: theme.divider)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(DesignTokens.space1),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[segmento('Escrever', false), segmento('Visualizar', true)],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
