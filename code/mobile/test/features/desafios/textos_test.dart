import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/desafios/desafios_service.dart';
import 'package:le_ai_mobile/features/desafios/textos.dart';

import 'apoio_desafios.dart';

Desafio _desafio(Map<String, Object?> json) => Desafio.fromJson(json);

void main() {
  test('título com a unidade no singular só quando o alvo é 1', () {
    expect(tituloDoDesafio(UnidadeDesafio.paginas, JanelaDesafio.diaria, 20), '20 páginas por dia');
    expect(tituloDoDesafio(UnidadeDesafio.livros, JanelaDesafio.semanal, 1), '1 livro por semana');
    expect(
      tituloDoDesafio(UnidadeDesafio.minutos, JanelaDesafio.mensal, 150),
      '150 minutos por mês',
    );
    expect(tituloDoDesafio(UnidadeDesafio.livros, JanelaDesafio.anual, 12), '12 livros por ano');
  });

  test('nome da janela: hoje, esta semana (nunca datas), mês e ano', () {
    final inicio = DateTime(2026, 9, 1);
    expect(nomeDaJanela(JanelaDesafio.diaria, inicio), 'Hoje');
    expect(nomeDaJanela(JanelaDesafio.semanal, inicio), 'Esta semana');
    expect(nomeDaJanela(JanelaDesafio.mensal, inicio), 'Setembro');
    expect(nomeDaJanela(JanelaDesafio.anual, DateTime(2026)), '2026');
  });

  test('cumprido e falta, com o singular', () {
    final inicio = DateTime(2026, 9, 1);
    expect(textoDeCumprido(JanelaDesafio.diaria, inicio), 'Cumprido hoje');
    expect(textoDeCumprido(JanelaDesafio.semanal, inicio), 'Cumprido nesta semana');
    expect(textoDeCumprido(JanelaDesafio.mensal, inicio), 'Cumprido em setembro');
    expect(textoDeCumprido(JanelaDesafio.anual, inicio), 'Cumprido em 2026');
    expect(textoDeFalta(UnidadeDesafio.paginas, 8), 'Faltam 8 páginas');
    expect(textoDeFalta(UnidadeDesafio.livros, 1), 'Falta 1 livro');
  });

  test('data da pausa sem o ano corrente e com o ano quando é outro', () {
    final agora = DateTime(2026, 10, 9);
    expect(dataDaPausa(DateTime(2026, 9, 15, 12), agora), '15 de setembro');
    expect(dataDaPausa(DateTime(2025, 12, 30, 12), agora), '30 de dezembro de 2025');
  });

  test('rótulos de leitor de tela do card (desafios.md §9)', () {
    expect(
      semanticaDoCard(_desafio(desafioJson())),
      '20 páginas por dia. Hoje: 12 de 20 páginas. Faltam 8 páginas.',
    );
    expect(
      semanticaDoCard(_desafio(desafioJson(janela: 'mensal', alvo: 600, acumulado: 612))),
      '600 páginas por mês. Cumprido em setembro: 612 de 600 páginas.',
    );
    expect(
      semanticaDoCardDoPerfil(_desafio(desafioJson())),
      '20 páginas por dia, hoje, 12 de 20 páginas, faltam 8 páginas. Abrir desafios.',
    );
  });

  test('teto com a frase do servidor', () {
    expect(erroDoTeto(UnidadeDesafio.paginas), 'Para páginas, o alvo vai de 1 a 100.000.');
    expect(erroDoTeto(UnidadeDesafio.livros), 'Para livros, o alvo vai de 1 a 1.000.');
  });

  test('faixa da criação nomeia a janela em curso', () {
    final hoje = DateTime(2026, 9, 25);
    expect(
      faixaDaCriacao(JanelaDesafio.diaria, hoje),
      'O que você já registrou hoje também conta.',
    );
    expect(
      faixaDaCriacao(JanelaDesafio.semanal, hoje),
      'O que você já registrou nesta semana também conta.',
    );
    expect(
      faixaDaCriacao(JanelaDesafio.mensal, hoje),
      'O que você já registrou em setembro também conta.',
    );
    expect(
      faixaDaCriacao(JanelaDesafio.anual, hoje),
      'O que você já registrou em 2026 também conta, desde janeiro.',
    );
  });

  test('faixa da edição: janela nova na primeira frase, plural da salva na segunda', () {
    final hoje = DateTime(2026, 9, 25);
    expect(
      faixaDaEdicao(JanelaDesafio.semanal, JanelaDesafio.semanal, hoje),
      'A mudança vale para esta semana, que é recalculada. Semanas que já terminaram continuam '
      'como estavam.',
    );
    expect(
      faixaDaEdicao(JanelaDesafio.mensal, JanelaDesafio.semanal, hoje),
      'A mudança vale para setembro, que é recalculado. Semanas que já terminaram continuam como '
      'estavam.',
    );
    expect(
      faixaDaEdicao(JanelaDesafio.anual, JanelaDesafio.diaria, hoje),
      'A mudança vale para 2026, que é recalculado. Dias que já terminaram continuam como estavam.',
    );
  });
}
