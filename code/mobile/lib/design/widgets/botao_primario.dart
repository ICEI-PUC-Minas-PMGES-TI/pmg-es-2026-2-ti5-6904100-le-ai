import 'package:flutter/material.dart';

/// CTA principal da tela (documento-de-design §4.1). Pill, `musgo`/`papel`, alvo mínimo de
/// 48x48 e tipografia `body-strong` já vêm prontos do `elevatedButtonTheme` gerado em
/// `theme.g.dart` — este widget só cuida de largura total e do estado de carregamento.
///
/// Não conhece a copy de carregamento ("Entrando", "Criando conta"): [texto] já vem pronto de
/// quem chama, porque a frase muda por tela e o widget não deveria hardcodar nenhuma das duas
/// (mesma divisão de responsabilidade da versão web).
class BotaoPrimario extends StatelessWidget {
  final String texto;
  final VoidCallback? onPressed;

  /// Desabilita o botão enquanto uma requisição está em curso (ex.: cold start, RNF-ERR-09).
  final bool carregando;

  const BotaoPrimario({
    super.key,
    required this.texto,
    required this.onPressed,
    this.carregando = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: carregando ? null : onPressed,
        child: Text(texto),
      ),
    );
  }
}
