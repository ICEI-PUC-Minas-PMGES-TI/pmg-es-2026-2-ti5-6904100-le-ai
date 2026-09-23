import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/livros/formatos.dart';
import 'package:le_ai_mobile/features/livros/isbn.dart';

void main() {
  group('normalizarIsbn13 (mesmos casos de isbn.spec.ts)', () {
    test('aceita a forma que o leitor digita, com hífen e espaço', () {
      expect(normalizarIsbn13('978-85-359-1484-9'), '9788535914849');
      expect(normalizarIsbn13(' 978 85 359 1484 9 '), '9788535914849');
    });

    test('recusa dígito verificador errado, prefixo inválido e URL', () {
      expect(normalizarIsbn13('9788535914848'), isNull);
      expect(normalizarIsbn13('9778535914849'), isNull);
      expect(normalizarIsbn13('https://loja.com/livro/9788535914849'), isNull);
      expect(normalizarIsbn13('978853591484'), isNull);
    });
  });

  test('nota com vírgula e sem casa decimal quando inteira', () {
    expect(formatarNota(4.5), '4,5');
    expect(formatarNota(4), '4');
  });

  test('data por extenso sem zero à esquerda', () {
    expect(formatarData(DateTime(2026, 9, 2, 12)), '2 de setembro de 2026');
  });

  test('tamanho em MB com vírgula decimal', () {
    expect(formatarMegabytes((8.2 * 1024 * 1024).round()), '8,2 MB');
  });

  test('páginas sempre com unidade', () {
    expect(formatarPaginas(288), '288 páginas');
    expect(formatarPaginas(1), '1 página');
  });
}
