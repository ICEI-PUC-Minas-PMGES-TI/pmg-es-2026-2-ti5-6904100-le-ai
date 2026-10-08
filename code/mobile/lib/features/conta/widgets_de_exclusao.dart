import 'package:flutter/material.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/logo_leai.dart';

/// Esqueleto das telas fora do shell de F-CONTA-2 (`Exclusão solicitada` e `Recuperar conta`):
/// fundo `papel`, padding lateral `space-5`, o lockup da marca a `space-6` do topo seguro, sem
/// barra inferior nem sino. [aoVoltarDoSistema] substitui o voltar do Android, que nunca leva a
/// uma tela do produto (excluir-conta.md §4.8, recuperar-conta.md §9).
class TelaForaDoShell extends StatelessWidget {
  final List<Widget> filhos;
  final VoidCallback aoVoltarDoSistema;

  const TelaForaDoShell({
    super.key,
    required this.filhos,
    required this.aoVoltarDoSistema,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (saiu, _) {
        if (!saiu) {
          aoVoltarDoSistema();
        }
      },
      child: Scaffold(
        backgroundColor: theme.pageBackground,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space5,
              DesignTokens.space6,
              DesignTokens.space5,
              DesignTokens.space10,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                const Align(alignment: Alignment.centerLeft, child: LogoLeAi(altura: 24)),
                ...filhos,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Bloco da data (`Remoção definitiva em`): fundo `papel-elevado`, `radius-md`, padding
/// `space-5`. O leitor de tela o lê como uma frase só (recuperar-conta.md §9).
class BlocoDaData extends StatelessWidget {
  final String data;
  final String apoio;

  const BlocoDaData({super.key, required this.data, required this.apoio});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      label: 'Remoção definitiva em $data, ${apoio[0].toLowerCase()}${apoio.substring(1)}',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.all(DesignTokens.space5),
        decoration: BoxDecoration(
          color: theme.elevatedSurface,
          borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('Remoção definitiva em', style: theme.textTheme.labelMedium),
            const SizedBox(height: DesignTokens.space2),
            Text(data, style: theme.textTheme.titleLarge),
            const SizedBox(height: DesignTokens.space2),
            Text(
              apoio,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          ],
        ),
      ),
    );
  }
}
