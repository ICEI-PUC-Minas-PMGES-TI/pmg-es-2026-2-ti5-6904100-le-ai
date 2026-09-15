import 'package:flutter/material.dart';

import '../design/theme.dart';
import '../design/widgets/logo_leai.dart';

/// O que a guarda de rota mostra enquanto `SessionController.load()` ainda não resolveu
/// (shell-de-navegacao.md §4.4). Existe porque, ao contrário da web, ler o secure storage é
/// assíncrono: há um intervalo real em que ninguém sabe se a sessão existe.
///
/// Fundo `papel`, sem header e sem barra — ainda não se sabe em que área o usuário está. Só o
/// wordmark centralizado em cor grafite (`TomLogo.neutro`, a variante esmaecida que o §3.7
/// permite). Sem spinner, sem texto, sem skeleton: o próprio prompt proíbe os três.
class VerificandoSessaoPage extends StatelessWidget {
  const VerificandoSessaoPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: theme.pageBackground,
      body: const Center(
        child: LogoLeAi(altura: 32, tom: TomLogo.neutro),
      ),
    );
  }
}
