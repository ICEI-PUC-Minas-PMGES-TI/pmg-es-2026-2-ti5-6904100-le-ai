import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/estatisticas/escala.dart';
import 'package:le_ai_mobile/features/estatisticas/estatisticas_service.dart';
import 'package:le_ai_mobile/features/estatisticas/formatos.dart';
import 'package:le_ai_mobile/features/estatisticas/seletor.dart';
import 'package:le_ai_mobile/features/estatisticas/textos.dart';

import 'apoio_estatisticas.dart';

final DateTime _hoje = DateTime(2026, 9, 29);

void main() {
  group('escala do eixo (exemplos do protótipo)', () {
    for (final (maximo, marcas) in <(int, List<int>)>[
      (604, <int>[0, 200, 400, 600]),
      (610, <int>[0, 200, 400, 600]),
      (214, <int>[0, 100, 200]),
      (5150, <int>[0, 2000, 4000, 6000]),
      (14, <int>[0, 5, 10, 15]),
      (2, <int>[0, 1, 2, 3]),
      (1, <int>[0, 1, 2]),
      (939, <int>[0, 500, 1000]),
      (266, <int>[0, 100, 200, 300]),
    ]) {
      test('$maximo → $marcas', () => expect(escalaDoEixo(maximo).marcas, marcas));
    }

    test('o domínio passa da coluna mais alta e nunca há mais de quatro marcas', () {
      for (var maximo = 1; maximo <= 20000; maximo += 37) {
        final escala = escalaDoEixo(maximo);
        expect(escala.dominio, greaterThan(maximo));
        expect(escala.marcas.length, lessThanOrEqualTo(4));
      }
      expect(escalaDoEixo(604).dominio, closeTo(652, 1));
      expect(escalaDoEixo(0).marcas, <int>[0, 1]);
      expect(escalaDoEixo(0).dominio, 1);
    });
  });

  group('formatos', () {
    test('milhar com ponto e decimal com vírgula', () {
      expect(formatarMilhar(3818), '3.818');
      expect(formatarMilhar(13538), '13.538');
      expect(formatarMilhar(1000000), '1.000.000');
      expect(formatarMilhar(999), '999');
      expect(formatarDecimal(20.4), '20,4');
      expect(formatarDecimal(20), '20');
      expect(formatarDecimal(9.666), '9,7');
      expect(formatarNotaMedia(4), '4,0');
      expect(formatarNotaMedia(4.2), '4,2');
    });

    test('tempo em partes, com minutos de dois dígitos quando há horas', () {
      expect(rotuloDoTempo(4280), '71 h 20 min');
      expect(rotuloDoTempo(5285), '88 h 05 min');
      expect(rotuloDoTempo(180), '3 h 00 min');
      expect(rotuloDoTempo(45), '45 min');
      expect(rotuloDoTempo(0), '0 min');
    });

    test('hoje é o dia de São Paulo, mesmo perto da virada em UTC', () {
      expect(hojeEmSaoPaulo(DateTime.utc(2027, 1, 1, 2)), DateTime(2026, 12, 31));
      expect(hojeEmSaoPaulo(DateTime.utc(2026, 9, 29, 15)), DateTime(2026, 9, 29));
    });
  });

  group('textos', () {
    test('linha de período do ano corrente, do ano fechado, do primeiro ano e do acumulado', () {
      final primeiro = DateTime(2023, 11, 12);
      expect(
        linhaDoPeriodo(const PeriodoAno(2026), _hoje, primeiro),
        'De 1º de janeiro a 29 de setembro de 2026',
      );
      expect(
        linhaDoPeriodo(const PeriodoAno(2025), _hoje, primeiro),
        'De 1º de janeiro a 31 de dezembro de 2025',
      );
      expect(
        linhaDoPeriodo(const PeriodoAno(2023), _hoje, primeiro),
        'De 12 de novembro a 31 de dezembro de 2023, desde o seu primeiro registro',
      );
      expect(
        linhaDoPeriodo(const PeriodoAcumulado(), _hoje, primeiro),
        'Desde 12 de novembro de 2023, seu primeiro registro',
      );
      expect(
        anuncioDoPeriodo(const PeriodoAno(2025), 'De 1º de janeiro a 31 de dezembro de 2025'),
        'Mostrando 2025, de 1º de janeiro a 31 de dezembro de 2025',
      );
    });

    test('ajuda da nota e médias ausentes', () {
      expect(ajudaDaNota(const PeriodoAno(2026), 8), 'Média das 8 notas que você deu em 2026.');
      expect(ajudaDaNota(const PeriodoAcumulado(), 31), 'Média das 31 notas que você já deu.');
      expect(ajudaDaNota(const PeriodoAno(2023), 0), 'Média das notas que você deu em 2023.');
      expect(ajudaDaNota(const PeriodoAno(2024), 1), 'A única nota que você deu em 2024.');
      expect(MediaAusente.diasPorLivro(const PeriodoAno(2023)), 'Sem leituras concluídas em 2023');
      expect(MediaAusente.notaMedia(const PeriodoAcumulado()), 'Nenhuma nota dada ainda');
    });

    final ateSetembro = <PontoEstatistica>[
      ponto(1, 380),
      ponto(2, 310),
      ponto(7, 604, 2),
      ponto(8, 0, 2),
      ponto(9, 318, 1),
    ];

    test('subtítulo, rótulo direto e balão', () {
      expect(
        subtituloDoGrafico(Medida.paginas, ateSetembro, const PeriodoAno(2026)),
        '1.612 páginas de janeiro a setembro',
      );
      final doAno = <PontoEstatistica>[for (var m = 1; m <= 12; m++) ponto(m, 1, 0, 2025)];
      expect(
        subtituloDoGrafico(Medida.paginas, doAno, const PeriodoAno(2025)),
        '12 páginas em 2025',
      );
      final anos = <PontoEstatistica>[ponto(null, 1000, 1, 2023), ponto(null, 1000, 1, 2024)];
      expect(
        subtituloDoGrafico(Medida.paginas, anos, const PeriodoAcumulado()),
        '2.000 páginas desde 2023',
      );
      expect(indiceDoMaior(Medida.livros, ateSetembro), 2);
      expect(indiceDoMaior(Medida.livros, <PontoEstatistica>[ponto(1, 0)]), isNull);
      expect(tituloDoBalao(ponto(9, 318), _hoje), 'Setembro de 2026, até hoje');
      expect(valorDoBalao(Medida.livros, ponto(4, 0)), '0 livros concluídos');
      expect(valorDoBalao(Medida.livros, ponto(3, 0, 1)), '1 livro');
      expect(tituloDoBalao(ponto(null, 3818, 9), _hoje), '2026, até hoje');
    });

    test('TalkBack lê o resumo e cada mês (§9)', () {
      expect(
        resumoDoGrafico(Medida.paginas, ateSetembro, const PeriodoAno(2026)),
        'Gráfico de colunas, páginas por mês em 2026, de janeiro a setembro. '
        'Maior valor: julho, 604 páginas.',
      );
      expect(leituraDoPonto(Medida.paginas, ponto(7, 604), _hoje), 'Julho de 2026, 604 páginas');
      expect(
        graficoSemDados(Medida.livros, const PeriodoAno(2023)),
        'Nenhum livro concluído em 2023.',
      );
    });
  });

  group('seletor', () {
    test('anos do mais recente ao mais antigo e o acumulado com a soma dos livros', () {
      final itens = itensDoSeletor(
        const <AnoComRegistro>[
          AnoComRegistro(ano: 2026, livrosConcluidos: 9),
          AnoComRegistro(ano: 2023, livrosConcluidos: 0),
          AnoComRegistro(ano: 2025, livrosConcluidos: 14),
        ],
        2026,
        const PeriodoAno(2026),
      );
      expect(itens.map((i) => rotuloDoPeriodo(i.periodo)), <String>[
        '2026',
        '2025',
        '2023',
        'Acumulado',
      ]);
      expect(itens.last.livrosConcluidos, 23);
    });

    test('o ano corrente e o ano escolhido entram mesmo sem registro', () {
      final itens = itensDoSeletor(
        const <AnoComRegistro>[AnoComRegistro(ano: 2024, livrosConcluidos: 3)],
        2026,
        const PeriodoAno(2019),
      );
      expect(itens.map((i) => rotuloDoPeriodo(i.periodo)), <String>[
        '2026',
        '2024',
        '2019',
        'Acumulado',
      ]);
    });
  });
}
