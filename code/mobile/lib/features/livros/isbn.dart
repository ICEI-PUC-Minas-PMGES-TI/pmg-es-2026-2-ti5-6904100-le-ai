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

/// Grupos da máscara, o mesmo desenho do placeholder do protótipo (`978-85-359-1484-9`). Os
/// hífens são só visuais: a posição real deles varia por editora, e o que vai ao servidor são os
/// 13 dígitos. Mesma regra de `code/front/src/livros/isbn.ts`.
const List<int> _grupos = <int>[3, 2, 3, 4, 1];
const int _digitosDoIsbn = 13;

String _agrupar(String digitos) {
  final partes = <String>[];
  var inicio = 0;
  for (final tamanho in _grupos) {
    if (inicio >= digitos.length) {
      break;
    }
    final fim = inicio + tamanho > digitos.length ? digitos.length : inicio + tamanho;
    partes.add(digitos.substring(inicio, fim));
    inicio = fim;
  }
  return partes.join('-');
}

String _soDigitos(String texto) => texto.replaceAll(RegExp(r'\D'), '');

/// Máscara do campo de ISBN: descarta o que não é dígito, limita a 13 e agrupa. O cursor fica
/// depois do mesmo dígito em que estava; apagar um hífen apaga o dígito anterior, senão o
/// Backspace pararia nele.
({String valor, int cursor}) mascararIsbn(String bruto, int cursor, [String anterior = '']) {
  var digitos = _soDigitos(bruto);
  var antesDoCursor = _soDigitos(bruto.substring(0, cursor.clamp(0, bruto.length))).length;

  final apagouSoSeparador =
      bruto.length < anterior.length && digitos == _soDigitos(anterior) && antesDoCursor > 0;
  if (apagouSoSeparador) {
    digitos = digitos.substring(0, antesDoCursor - 1) + digitos.substring(antesDoCursor);
    antesDoCursor -= 1;
  }

  if (digitos.length > _digitosDoIsbn) {
    digitos = digitos.substring(0, _digitosDoIsbn);
  }
  if (antesDoCursor > digitos.length) {
    antesDoCursor = digitos.length;
  }
  final valor = _agrupar(digitos);

  var posicao = 0;
  for (var vistos = 0; posicao < valor.length && vistos < antesDoCursor; posicao++) {
    if (RegExp(r'\d').hasMatch(valor[posicao])) {
      vistos++;
    }
  }
  return (valor: valor, cursor: posicao);
}
