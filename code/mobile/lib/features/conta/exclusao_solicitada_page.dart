import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';
import 'exclusao_service.dart';
import 'widgets_de_exclusao.dart';

/// Exclusão solicitada (F-CONTA-2, excluir-conta.md §4.8). Fora do shell: a sessão já acabou.
/// [previstaEm] é a data que o servidor devolveu no `202`, levada na rota (`?ate=`). Sem ela, a
/// tela fala do prazo sem data, em vez de inventar uma.
class ExclusaoSolicitadaPage extends StatelessWidget {
  final DateTime? previstaEm;
  final VoidCallback aoIrParaLogin;

  const ExclusaoSolicitadaPage({super.key, required this.previstaEm, required this.aoIrParaLogin});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final texto = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    final prevista = previstaEm;
    return TelaForaDoShell(
      aoVoltarDoSistema: aoIrParaLogin,
      filhos: <Widget>[
        const SizedBox(height: DesignTokens.space16),
        // `grafite`, não `musgo`: a tela confirma um pedido, não comemora nada.
        Align(
          alignment: Alignment.centerLeft,
          child: ExcludeSemantics(
            child: Icon(PhosphorIconsRegular.calendarX, size: 32, color: theme.secondaryText),
          ),
        ),
        const SizedBox(height: DesignTokens.space5),
        Semantics(
          header: true,
          child: Text('Exclusão solicitada', style: theme.textTheme.headlineSmall),
        ),
        const SizedBox(height: DesignTokens.space4),
        Text(
          'Sua conta já está oculta para os outros leitores e você saiu de todos os aparelhos.',
          style: texto,
        ),
        const SizedBox(height: DesignTokens.space5),
        BlocoDaData(
          data: prevista == null ? 'daqui a 30 dias' : dataPorExtenso(prevista),
          apoio: 'Até essa data, entre com seu e-mail e senha para cancelar a exclusão.',
        ),
        const SizedBox(height: DesignTokens.space8),
        BotaoPrimario(texto: 'Ir para o login', onPressed: aoIrParaLogin),
      ],
    );
  }
}
