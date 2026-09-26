import 'package:flutter/services.dart';

import 'isbn.dart';

/// `TextInputFormatter` da máscara de ISBN: digitar com ou sem hífen, com espaço ou colar do
/// livro dá o mesmo valor, e nada passa de 13 dígitos.
class MascaraIsbn extends TextInputFormatter {
  const MascaraIsbn();

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final cursor = newValue.selection.isValid ? newValue.selection.baseOffset : newValue.text.length;
    final mascarado = mascararIsbn(newValue.text, cursor, oldValue.text);
    return TextEditingValue(
      text: mascarado.valor,
      selection: TextSelection.collapsed(offset: mascarado.cursor),
    );
  }
}
