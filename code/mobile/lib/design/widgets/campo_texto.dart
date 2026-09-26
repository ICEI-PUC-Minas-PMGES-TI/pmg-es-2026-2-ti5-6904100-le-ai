import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme.dart';
import '../tokens.dart';

/// Campo de formulário com label acima (documento-de-design §4.2): nunca placeholder no lugar
/// do label, três estados visuais (padrão, foco, erro) mais desabilitado.
///
/// A altura não é fixada em 48px com `SizedBox`: o padding vertical mira esse valor no
/// tamanho padrão de texto, mas cresce com o escalonamento do sistema em vez de cortar o
/// conteúdo — regra do `AGENTS.md` do mobile ("nada de tamanho fixo que quebre em outra
/// tela").
class CampoTexto extends StatelessWidget {
  final TextEditingController controller;
  final String label;

  /// Presença ativa a borda de erro e uma legenda com esta mensagem abaixo do campo. Coexiste
  /// com [helper] (cadastro.md §4.3): o helper da senha continua visível acima do erro, porque
  /// a regra não deixou de existir.
  final String? erro;

  /// Borda de erro sem legenda própria — para quando um banner acima do formulário já explica
  /// o erro (login.md §4.2: repetir o texto do banner no campo diria a mesma coisa duas
  /// vezes). Ignorado se [erro] também estiver presente.
  final bool bordaDeErro;

  /// Texto permanente abaixo do campo, visível mesmo sem erro.
  final String? helper;

  final TextInputType keyboardType;
  final bool obscureText;
  final bool enabled;
  final Widget? trailing;
  final Iterable<String>? autofillHints;
  final ValueChanged<String>? onChanged;

  /// Bloqueia a digitação sem desabilitar o campo — para um valor escolhido por outra
  /// interação, como o seletor de data (cadastro.md §4: `CalendarBlank` abre o calendário, o
  /// campo em si não aceita teclado).
  final bool readOnly;

  /// Chamado a cada toque no campo, inclusive quando [readOnly]. É o que abre o seletor de
  /// data em vez do teclado.
  final VoidCallback? onTap;

  /// Exemplo dentro do campo. Nunca substitui o [label] (documento-de-design §4.2).
  final String? placeholder;

  /// Área de texto: com [maxLines] maior que 1 o campo cresce até esse limite (sinopse do livro
  /// pessoal). O padrão é uma linha, como todo campo que já existia.
  final int? minLines;
  final int maxLines;
  final List<TextInputFormatter>? inputFormatters;

  /// Estilo do texto digitado, quando o campo pede outra fonte: o ISBN usa numeral tabular da
  /// JetBrains Mono, porque a pessoa confere dígito a dígito contra o livro.
  final TextStyle? estiloDoTexto;
  final FocusNode? focusNode;

  /// Ícone Phosphor à esquerda, dentro do campo (protótipos de F-AUT/login e cadastro: 20px,
  /// `grafite-suave`). Decorativo: o label já diz o que o campo é, então fica fora da semântica.
  final IconData? icone;

  /// Mensagem de erro logo abaixo do campo e o helper depois dela (alterar-senha.md §4.3 e os
  /// protótipos de recuperar e redefinir senha). O padrão é o do cadastro.md §4.3: helper, erro.
  final bool erroAntesDoHelper;

  const CampoTexto({
    super.key,
    required this.controller,
    required this.label,
    this.erro,
    this.bordaDeErro = false,
    this.helper,
    this.keyboardType = TextInputType.text,
    this.obscureText = false,
    this.enabled = true,
    this.trailing,
    this.autofillHints,
    this.onChanged,
    this.readOnly = false,
    this.onTap,
    this.placeholder,
    this.minLines,
    this.maxLines = 1,
    this.inputFormatters,
    this.estiloDoTexto,
    this.focusNode,
    this.icone,
    this.erroAntesDoHelper = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final temErro = erro != null || bordaDeErro;
    final corBorda = temErro ? theme.colorScheme.error : theme.divider;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Text(label, style: theme.textTheme.labelMedium),
        const SizedBox(height: DesignTokens.space2),
        TextField(
          controller: controller,
          enabled: enabled,
          obscureText: obscureText,
          keyboardType: keyboardType,
          autofillHints: autofillHints,
          onChanged: onChanged,
          readOnly: readOnly,
          onTap: onTap,
          focusNode: focusNode,
          minLines: minLines,
          maxLines: maxLines,
          inputFormatters: inputFormatters,
          style: (estiloDoTexto ?? theme.textTheme.bodyMedium)?.copyWith(
            color: enabled ? null : theme.tertiaryText,
          ),
          decoration: InputDecoration(
            hintText: placeholder,
            filled: true,
            fillColor: enabled ? theme.elevatedSurface : theme.divider,
            hintStyle: theme.textTheme.bodyMedium?.copyWith(
              color: theme.tertiaryText,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: DesignTokens.space4,
              vertical: DesignTokens.space3,
            ),
            prefixIcon: icone == null
                ? null
                : ExcludeSemantics(
                    child: Padding(
                      padding: const EdgeInsetsDirectional.only(
                        start: DesignTokens.space4,
                        end: DesignTokens.space2,
                      ),
                      child: Icon(icone, size: 20, color: theme.tertiaryText),
                    ),
                  ),
            prefixIconConstraints: const BoxConstraints(),
            suffixIcon: trailing,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(DesignTokens.radius),
              borderSide: BorderSide(color: corBorda),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(DesignTokens.radius),
              borderSide: BorderSide(
                color: corBorda,
                width: temErro ? 1.5 : 1,
              ),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(DesignTokens.radius),
              borderSide: BorderSide(color: theme.divider),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(DesignTokens.radius),
              borderSide: BorderSide(
                color: temErro ? theme.colorScheme.error : theme.primaryAccent,
                width: 1.5,
              ),
            ),
          ),
        ),
        if (erro != null && erroAntesDoHelper) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          Text(
            erro!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.error,
            ),
          ),
        ],
        if (helper != null) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          Text(
            helper!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.secondaryText,
            ),
          ),
        ],
        if (erro != null && !erroAntesDoHelper) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          Text(
            erro!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.error,
            ),
          ),
        ],
      ],
    );
  }
}
