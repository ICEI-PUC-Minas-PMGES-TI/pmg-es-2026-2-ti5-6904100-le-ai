import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/sequencia/calendario.dart';

/// Setembro de 2026 do prompt (calendario-de-sequencia.md §3): dia 1 numa terça, hoje 24.
CalendarioDaSequencia _setembro({String hoje = '2026-09-24', List<int>? dias}) =>
    CalendarioDaSequencia.fromJson(<String, dynamic>{
      'mes': '2026-09',
      'mesAtual': '2026-09',
      'mesMaisAntigo': '2026-04',
      'hoje': hoje,
      'dias': <String>[
        for (final dia in dias ?? <int>[1, 2, 3, 5, 6, 8, 9, 10, for (var d = 13; d <= 24; d++) d])
          '2026-09-${dia.toString().padLeft(2, '0')}',
      ],
    });

void main() {
  group('Mes', () {
    test('lê e escreve AAAA-MM e navega pela virada do ano', () {
      expect(Mes.doContrato('2026-09'), const Mes(2026, 9));
      expect(const Mes(2026, 1).anterior.valor, '2025-12');
      expect(const Mes(2026, 12).seguinte.valor, '2027-01');
      expect(const Mes(2026, 4) < const Mes(2026, 9), isTrue);
      expect(const Mes(2026, 9).titulo, 'Setembro de 2026');
      expect(const Mes(2026, 2).diasNoMes, 28);
    });

    test('recusa mês fora do formato', () {
      expect(() => Mes.doContrato('2026-13'), throwsFormatException);
      expect(() => Mes.doContrato('2026-9'), throwsFormatException);
      expect(() => Mes.doContrato(null), throwsFormatException);
    });

    test('dia 1 na coluna certa, com a semana começando na segunda (ISO)', () {
      expect(const Mes(2026, 9).colunaDoPrimeiroDia, 1); // terça
      expect(const Mes(2026, 6).colunaDoPrimeiroDia, 0); // segunda
      expect(const Mes(2026, 5).colunaDoPrimeiroDia, 4); // sexta
    });
  });

  group('CalendarioDaSequencia', () {
    test('situação de cada dia: com e sem leitura, hoje e futuro', () {
      final calendario = _setembro();
      expect(calendario.situacao(24), SituacaoDoDia.hojeComLeitura);
      expect(calendario.situacao(23), SituacaoDoDia.comLeitura);
      expect(calendario.situacao(12), SituacaoDoDia.semLeitura);
      expect(calendario.situacao(25), SituacaoDoDia.futuro);
      expect(_setembro(hoje: '2026-09-25').situacao(25), SituacaoDoDia.hojeSemLeitura);
    });

    test('limites da janela e o dia de hoje fora do mês exibido', () {
      final calendario = _setembro();
      expect(calendario.podeVoltar, isTrue);
      expect(calendario.podeAvancar, isFalse);
      final abril = CalendarioDaSequencia.fromJson(<String, dynamic>{
        'mes': '2026-04',
        'mesAtual': '2026-09',
        'mesMaisAntigo': '2026-04',
        'hoje': '2026-09-24',
        'dias': <String>['2026-04-18'],
      });
      expect(abril.podeVoltar, isFalse);
      expect(abril.podeAvancar, isTrue);
      expect(abril.diaDeHoje, isNull);
    });

    test('dia de outro mês ou inexistente é resposta fora do contrato', () {
      Map<String, dynamic> com(List<String> dias) => <String, dynamic>{
        'mes': '2026-09',
        'mesAtual': '2026-09',
        'mesMaisAntigo': '2026-09',
        'hoje': '2026-09-24',
        'dias': dias,
      };
      expect(
        () => CalendarioDaSequencia.fromJson(com(<String>['2026-08-31'])),
        throwsFormatException,
      );
      expect(
        () => CalendarioDaSequencia.fromJson(com(<String>['2026-09-31'])),
        throwsFormatException,
      );
    });
  });

  group('linhasDoMes', () {
    test('setembro de 2026: cinco linhas, segunda da primeira vazia, sem dias vizinhos', () {
      final linhas = linhasDoMes(_setembro());
      expect(linhas, hasLength(5));
      expect(linhas.first.first.dia, isNull);
      expect(linhas.first[1].dia, 1);
      expect(linhas.last.where((c) => c.dia != null).map((c) => c.dia), <int>[28, 29, 30]);
    });

    test('a faixa liga dias seguidos da mesma linha e quebra na virada do domingo', () {
      final linhas = linhasDoMes(_setembro());
      CelulaDoMes dia(int n) => linhas.expand((l) => l).firstWhere((c) => c.dia == n);

      // 1, 2 e 3 ligados; 4 sem leitura não liga a nada.
      expect(dia(1).ligadaAEsquerda, isFalse);
      expect(dia(1).ligadaADireita, isTrue);
      expect(dia(3).ligadaADireita, isFalse);
      expect(dia(4).ligadaAEsquerda, isFalse);
      // 13 (domingo) começa a sequência atual isolado no fim da linha; 14 (segunda) recomeça.
      expect(dia(13).ligadaAEsquerda, isFalse);
      expect(dia(13).ligadaADireita, isFalse);
      expect(dia(14).ligadaAEsquerda, isFalse);
      expect(dia(14).ligadaADireita, isTrue);
      expect(dia(20).ligadaADireita, isFalse);
      // Hoje com leitura (24) liga ao 23 e não ao futuro 25.
      expect(dia(24).ligadaAEsquerda, isTrue);
      expect(dia(24).ligadaADireita, isFalse);
    });

    test('mês que começa na sexta ocupa cinco linhas; fevereiro pode ocupar quatro', () {
      final maio = CalendarioDaSequencia.fromJson(<String, dynamic>{
        'mes': '2026-05',
        'mesAtual': '2026-09',
        'mesMaisAntigo': '2026-04',
        'hoje': '2026-09-24',
        'dias': <String>[],
      });
      expect(linhasDoMes(maio), hasLength(5));
      final fevereiro = CalendarioDaSequencia.fromJson(<String, dynamic>{
        'mes': '2027-02',
        'mesAtual': '2027-02',
        'mesMaisAntigo': '2027-02',
        'hoje': '2027-02-10',
        'dias': <String>[],
      });
      expect(linhasDoMes(fevereiro), hasLength(4));
    });
  });

  test('textos: total do mês, rótulo do dia e fila do aparelho', () {
    expect(totalDoMes(0), 'Nenhum dia com leitura');
    expect(totalDoMes(1), '1 dia com leitura');
    expect(totalDoMes(20), '20 dias com leitura');
    const setembro = Mes(2026, 9);
    expect(
      rotuloDoDia(setembro, 24, SituacaoDoDia.hojeComLeitura),
      '24 de setembro, hoje, com leitura',
    );
    expect(rotuloDoDia(setembro, 23, SituacaoDoDia.comLeitura), '23 de setembro, com leitura');
    expect(rotuloDoDia(setembro, 12, SituacaoDoDia.semLeitura), '12 de setembro, sem leitura');
    expect(
      rotuloDoDia(setembro, 25, SituacaoDoDia.hojeSemLeitura),
      '25 de setembro, hoje, sem leitura ainda',
    );
    expect(rotuloDoDia(setembro, 28, SituacaoDoDia.futuro), '28 de setembro, dia futuro');
    expect(registrosNaFila(1), startsWith('1 registro ainda não foi enviado.'));
    expect(registrosNaFila(3), startsWith('3 registros ainda não foram enviados.'));
    expect(
      TextosDoCalendario.erroDoMes(const Mes(2026, 8)),
      startsWith('Não foi possível carregar agosto de 2026.'),
    );
  });
}
