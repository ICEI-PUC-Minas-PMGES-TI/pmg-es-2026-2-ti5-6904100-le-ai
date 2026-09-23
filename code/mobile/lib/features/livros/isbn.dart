/// Validação de ISBN-13 no cliente, com as mesmas regras de `code/back/acervo/src/common/isbn.ts`.
///
/// Serve à experiência, não à segurança: o servidor revalida tudo (RNF-SEC-38). O que o cliente
/// ganha é dizer "esse ISBN não confere" antes de gastar uma requisição e o rate limit do
/// leitor (RNF-SEC-18).
library;

final RegExp _separadores = RegExp(r'[-\s‐-—.]');

/// Só os dígitos do que foi digitado, sem validar. É o que decide se o botão habilita.
String digitosDoIsbn(String bruto) => bruto.replaceAll(_separadores, '');

/// Os 13 dígitos normalizados, ou `null` se não for um ISBN-13 de livro válido.
String? normalizarIsbn13(String bruto) {
  final digitos = digitosDoIsbn(bruto.trim());
  if (!RegExp(r'^[0-9]{13}$').hasMatch(digitos)) {
    return null;
  }
  if (!digitos.startsWith('978') && !digitos.startsWith('979')) {
    return null;
  }
  var soma = 0;
  for (var posicao = 0; posicao < 12; posicao++) {
    soma += int.parse(digitos[posicao]) * (posicao.isEven ? 1 : 3);
  }
  final esperado = (10 - soma % 10) % 10;
  return esperado == int.parse(digitos[12]) ? digitos : null;
}
