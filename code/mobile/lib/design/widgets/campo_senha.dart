import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';
import 'campo_texto.dart';

/// CampoTexto especializado em senha: alterna entre `Eye` e `EyeSlash` (Phosphor, `regular`,
/// login.md §9) para mostrar/ocultar o valor digitado. Reaproveita CampoTexto por composição —
/// label, foco e erro são o mesmo widget; só o `obscureText` e o botão à direita mudam.
class CampoSenha extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String? erro;
  final bool bordaDeErro;
  final String? helper;
  final bool enabled;
  final Iterable<String>? autofillHints;
  final ValueChanged<String>? onChanged;
  final FocusNode? focusNode;

  /// Cadeado à esquerda, como nos protótipos de login e cadastro de F-AUT.
  final bool comIcone;

  final bool erroAntesDoHelper;

  const CampoSenha({
    super.key,
    required this.controller,
    required this.label,
    this.erro,
    this.bordaDeErro = false,
    this.helper,
    this.enabled = true,
    this.autofillHints,
    this.onChanged,
    this.focusNode,
    this.comIcone = false,
    this.erroAntesDoHelper = false,
  });

  @override
  State<CampoSenha> createState() => _CampoSenhaState();
}

class _CampoSenhaState extends State<CampoSenha> {
  bool _mostrando = false;

  void _alternarVisibilidade() {
    setState(() => _mostrando = !_mostrando);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return CampoTexto(
      controller: widget.controller,
      label: widget.label,
      erro: widget.erro,
      bordaDeErro: widget.bordaDeErro,
      helper: widget.helper,
      enabled: widget.enabled,
      obscureText: !_mostrando,
      autofillHints: widget.autofillHints,
      onChanged: widget.onChanged,
      focusNode: widget.focusNode,
      icone: widget.comIcone ? PhosphorIconsRegular.lock : null,
      erroAntesDoHelper: widget.erroAntesDoHelper,
      trailing: IconButton(
        onPressed: widget.enabled ? _alternarVisibilidade : null,
        tooltip: _mostrando ? 'Ocultar senha' : 'Mostrar senha',
        icon: Icon(
          _mostrando ? PhosphorIconsRegular.eyeSlash : PhosphorIconsRegular.eye,
          size: 20,
          color: theme.secondaryText,
        ),
      ),
    );
  }
}
