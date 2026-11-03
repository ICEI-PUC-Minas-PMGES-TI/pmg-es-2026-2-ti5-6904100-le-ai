import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../descobrir/widgets_da_busca.dart';
import 'busca_na_estante.dart';
import 'textos.dart';

class CabecalhoDaBuscaNaEstante extends StatefulWidget {
  final BuscaNaEstante busca;

  const CabecalhoDaBuscaNaEstante({super.key, required this.busca});

  @override
  State<CabecalhoDaBuscaNaEstante> createState() => _CabecalhoDaBuscaNaEstanteState();
}

class _CabecalhoDaBuscaNaEstanteState extends State<CabecalhoDaBuscaNaEstante> {
  late final TextEditingController _controlador = TextEditingController(text: widget.busca.termo);

  @override
  void dispose() {
    _controlador.dispose();
    super.dispose();
  }

  void _limpar() {
    _controlador.clear();
    widget.busca.definir('');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.pageBackground,
        border: Border(bottom: BorderSide(color: theme.divider)),
      ),
      child: SafeArea(
        bottom: false,
        child: ConstrainedBox(
          constraints: const BoxConstraints.tightFor(height: CabecalhoTela.altura),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
            child: Row(
              children: <Widget>[
                IconButton(
                  tooltip: TextosDaBuscaNaEstante.sair,
                  onPressed: widget.busca.fechar,
                  constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                  padding: EdgeInsets.zero,
                  icon: Icon(
                    PhosphorIconsRegular.arrowLeft,
                    size: 24,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                const SizedBox(width: DesignTokens.space2),
                Expanded(
                  child: CampoDeBuscaDeLivros(
                    controlador: _controlador,
                    aoMudar: widget.busca.digitar,
                    aoLimpar: _limpar,
                    dica: TextosDaBuscaNaEstante.placeholder,
                    autofoco: true,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
