/// Copy das estatísticas (F-STA), do protótipo `F-STA/prototipos/estatisticas.html` e da copy
/// completa do prompt (§8). Zero em-dash, número sempre com unidade. Espelha
/// `code/front/src/estatisticas/textos.ts`, com as mesmas decisões do dono (12/10/2026): o
/// "desde" diz o primeiro registro de leitura, não a entrada na conta.
library;

import '../livros/formatos.dart';
import 'estatisticas_service.dart';
import 'formatos.dart';

enum Medida { paginas, livros }

String rotuloPaginas(int valor) => '${formatarMilhar(valor)} ${valor == 1 ? 'página' : 'páginas'}';

String rotuloLivros(int valor) => '${formatarMilhar(valor)} ${valor == 1 ? 'livro' : 'livros'}';

String rotuloDaMedida(Medida medida, int valor) =>
    medida == Medida.paginas ? rotuloPaginas(valor) : rotuloLivros(valor);

String unidadeDaMedida(Medida medida, int valor) => switch (medida) {
  Medida.paginas => valor == 1 ? 'página' : 'páginas',
  Medida.livros => valor == 1 ? 'livro' : 'livros',
};

abstract final class TextosDasEstatisticas {
  static const String titulo = 'Estatísticas';
  static const String acumulado = 'Acumulado';
  static const String totais = 'Totais';
  static const String livrosConcluidos = 'Livros concluídos';
  static const String paginasLidas = 'Páginas lidas';
  static const String tempoDeLeitura = 'Tempo de leitura';
  static const String ajudaDosTotais =
      'Páginas lidas incluem as leituras que você abandonou. O tempo soma as sessões '
      'cronometradas e o tempo que você informou nos registros.';
  static const String medias = 'Médias';
  static const String paginasPorDia = 'Páginas por dia';
  static const String ajudaPaginasPorDia = 'Só conta os dias em que você registrou leitura.';
  static const String unidadePaginasPorDia = 'páginas por dia';
  static const String diasPorLivro = 'Dias por livro';
  static const String ajudaDiasPorLivro =
      'Do início ao fim de cada leitura concluída, com os dias sem leitura.';
  static const String unidadeDiasPorLivro = 'dias por livro';
  static const String notaMedia = 'Nota média';
  static const String unidadeNotaMedia = 'estrelas';
  static const String verComoTabela = 'Ver como tabela';
  static const String verComoGrafico = 'Ver como gráfico';
  static const String rodape = 'Um registro novo pode levar alguns instantes para aparecer aqui.';
  static const String vazioTitulo = 'Suas estatísticas começam no primeiro registro';
  static const String vazioTexto =
      'Registre em que página você parou em qualquer livro da estante. Páginas, tempo e médias '
      'passam a ser contados a partir daí.';
  static const String vazioAcao = 'Ir para a estante';
  static const String erro =
      'Não foi possível carregar suas estatísticas. Verifique sua conexão e tente de novo.';
  static const String tentarDeNovo = 'Tentar de novo';
  static const String carregando = 'Carregando estatísticas';
  static const String ateHoje = 'até hoje';
}

/// Rótulo do período no seletor e nas frases: `2026` ou `Acumulado`.
String rotuloDoPeriodo(PeriodoEstatisticas periodo) => switch (periodo) {
  PeriodoAno(:final ano) => '$ano',
  PeriodoAcumulado() => TextosDasEstatisticas.acumulado,
};

/// O intervalo exato que os números cobrem:
/// - ano corrente: `De 1º de janeiro a 29 de setembro de 2026`;
/// - ano fechado: `De 1º de janeiro a 31 de dezembro de 2025`;
/// - ano do primeiro registro: `De 12 de novembro a 31 de dezembro de 2023, desde o seu primeiro registro`;
/// - acumulado: `Desde 12 de novembro de 2023, seu primeiro registro`.
String linhaDoPeriodo(PeriodoEstatisticas periodo, DateTime hoje, DateTime? primeiroRegistro) {
  switch (periodo) {
    case PeriodoAcumulado():
      return primeiroRegistro == null
          ? ''
          : 'Desde ${diaEMes(primeiroRegistro)} de ${primeiroRegistro.year}, seu primeiro registro';
    case PeriodoAno(:final ano):
      final doPrimeiroAno = primeiroRegistro != null && primeiroRegistro.year == ano;
      final inicio = doPrimeiroAno ? primeiroRegistro : DateTime(ano);
      final fim = ano == hoje.year ? hoje : DateTime(ano, 12, 31);
      final linha = 'De ${diaEMes(inicio)} a ${diaEMes(fim)} de $ano';
      return doPrimeiroAno ? '$linha, desde o seu primeiro registro' : linha;
  }
}

/// Anúncio para o leitor de tela quando todos os números mudam de uma vez (§9).
String anuncioDoPeriodo(PeriodoEstatisticas periodo, String linha) {
  final intervalo = linha.isEmpty ? '' : ', ${linha[0].toLowerCase()}${linha.substring(1)}';
  return switch (periodo) {
    PeriodoAno(:final ano) => 'Mostrando $ano$intervalo',
    PeriodoAcumulado() => 'Mostrando o acumulado$intervalo',
  };
}

/// Ajuda da nota média, com a quantidade de notas que a compõe.
String ajudaDaNota(PeriodoEstatisticas periodo, int quantidade) {
  final quando = switch (periodo) {
    PeriodoAno(:final ano) => 'deu em $ano',
    PeriodoAcumulado() => 'já deu',
  };
  if (quantidade == 0) {
    return 'Média das notas que você $quando.';
  }
  if (quantidade == 1) {
    return 'A única nota que você $quando.';
  }
  return 'Média das ${formatarMilhar(quantidade)} notas que você $quando.';
}

String _em(PeriodoEstatisticas periodo) => switch (periodo) {
  PeriodoAno(:final ano) => ' em $ano',
  PeriodoAcumulado() => '',
};

/// Frases no lugar da média sem denominador: nunca `0`, nunca traço.
abstract final class MediaAusente {
  static String paginasPorDia(PeriodoEstatisticas periodo) => 'Sem dias com leitura${_em(periodo)}';
  static String diasPorLivro(PeriodoEstatisticas periodo) =>
      'Sem leituras concluídas${_em(periodo)}';
  static String notaMedia(PeriodoEstatisticas periodo) => switch (periodo) {
    PeriodoAno(:final ano) => 'Nenhuma nota dada em $ano',
    PeriodoAcumulado() => 'Nenhuma nota dada ainda',
  };
}

int valorDoPonto(Medida medida, PontoEstatistica ponto) =>
    medida == Medida.paginas ? ponto.paginasLidas : ponto.livrosConcluidos;

int somaDaMedida(Medida medida, List<PontoEstatistica> pontos) =>
    pontos.fold(0, (soma, p) => soma + valorDoPonto(medida, p));

String tituloDoGrafico(Medida medida, {required bool porAno}) =>
    '${medida == Medida.paginas ? 'Páginas' : 'Livros concluídos'} por ${porAno ? 'ano' : 'mês'}';

/// Subtítulo com o total da série: `3.818 páginas de janeiro a setembro`, `5.150 páginas em
/// 2025`, `13.538 páginas desde 2023`.
String subtituloDoGrafico(
  Medida medida,
  List<PontoEstatistica> pontos,
  PeriodoEstatisticas periodo,
) {
  final total = rotuloDaMedida(medida, somaDaMedida(medida, pontos));
  if (pontos.isEmpty) {
    return total;
  }
  final primeiro = pontos.first;
  final ultimo = pontos.last;
  return switch (periodo) {
    PeriodoAcumulado() => '$total desde ${primeiro.ano}',
    PeriodoAno(:final ano) when primeiro.mes == 1 && ultimo.mes == 12 => '$total em $ano',
    PeriodoAno() when primeiro.mes == ultimo.mes => '$total em ${nomeDoMes(primeiro.mes!)}',
    PeriodoAno() => '$total de ${nomeDoMes(primeiro.mes!)} a ${nomeDoMes(ultimo.mes!)}',
  };
}

/// Linha no lugar do gráfico quando o período não tem nada desta medida.
String graficoSemDados(Medida medida, PeriodoEstatisticas periodo) {
  final quando = _em(periodo);
  return medida == Medida.livros
      ? 'Nenhum livro concluído$quando.'
      : 'Nenhuma página registrada$quando.';
}

/// O primeiro ponto com o maior valor (o rótulo direto vai só nele); nulo sem valor.
int? indiceDoMaior(Medida medida, List<PontoEstatistica> pontos) {
  int? maior;
  for (var i = 0; i < pontos.length; i++) {
    final valor = valorDoPonto(medida, pontos[i]);
    if (valor > 0 && (maior == null || valor > valorDoPonto(medida, pontos[maior]))) {
      maior = i;
    }
  }
  return maior;
}

/// O ponto ainda está em andamento: mês corrente, ou ano corrente no acumulado.
bool pontoEmAndamento(PontoEstatistica ponto, DateTime hoje) =>
    ponto.ano == hoje.year && (ponto.mes == null || ponto.mes == hoje.month);

/// `jul` no eixo do ano; `2025` no acumulado.
String marcaDoEixoX(PontoEstatistica ponto) =>
    ponto.mes == null ? '${ponto.ano}' : mesesAbreviados[ponto.mes! - 1];

/// Nome do ponto por extenso: `Julho de 2026` ou `2025`.
String nomeDoPonto(PontoEstatistica ponto) =>
    ponto.mes == null ? '${ponto.ano}' : '${capitalizar(nomeDoMes(ponto.mes!))} de ${ponto.ano}';

/// Nome da linha na tabela: `Janeiro` ou `2025`.
String nomeNaTabela(PontoEstatistica ponto) =>
    ponto.mes == null ? '${ponto.ano}' : capitalizar(nomeDoMes(ponto.mes!));

/// Primeira linha do balão: `Julho de 2026`; no mês corrente, `Setembro de 2026, até hoje`.
String tituloDoBalao(PontoEstatistica ponto, DateTime hoje) {
  final nome = nomeDoPonto(ponto);
  return pontoEmAndamento(ponto, hoje) ? '$nome, ${TextosDasEstatisticas.ateHoje}' : nome;
}

/// Valor do balão: `604 páginas`, `2 livros`; mês sem livro, `0 livros concluídos`.
String valorDoBalao(Medida medida, PontoEstatistica ponto) {
  final valor = valorDoPonto(medida, ponto);
  if (medida == Medida.livros && valor == 0) {
    return '0 livros concluídos';
  }
  return rotuloDaMedida(medida, valor);
}

/// Leitura de cada mês para o TalkBack: `Julho de 2026, 604 páginas`.
String leituraDoPonto(Medida medida, PontoEstatistica ponto, DateTime hoje) =>
    '${tituloDoBalao(ponto, hoje)}, ${valorDoBalao(medida, ponto)}';

/// `em 2026, de janeiro a setembro`, `em 2025`, `desde 2023`.
String _intervaloDaSerie(List<PontoEstatistica> pontos, PeriodoEstatisticas periodo) {
  if (pontos.isEmpty) {
    return _em(periodo).trim();
  }
  final primeiro = pontos.first;
  final ultimo = pontos.last;
  return switch (periodo) {
    PeriodoAcumulado() => 'desde ${primeiro.ano}',
    PeriodoAno(:final ano) when primeiro.mes == 1 && ultimo.mes == 12 => 'em $ano',
    PeriodoAno(:final ano) when primeiro.mes == ultimo.mes =>
      'em ${nomeDoMes(primeiro.mes!)} de $ano',
    PeriodoAno(:final ano) => 'em $ano, de ${nomeDoMes(primeiro.mes!)} a ${nomeDoMes(ultimo.mes!)}',
  };
}

/// Resumo do gráfico para o TalkBack (§9): `Gráfico de colunas, páginas por mês em 2026, de
/// janeiro a setembro. Maior valor: julho, 604 páginas.`
String resumoDoGrafico(Medida medida, List<PontoEstatistica> pontos, PeriodoEstatisticas periodo) {
  final porAno = pontos.isNotEmpty && pontos.first.mes == null;
  final titulo = tituloDoGrafico(medida, porAno: porAno).toLowerCase();
  final indice = indiceDoMaior(medida, pontos);
  final maior = indice == null ? null : pontos[indice];
  final pontoMaior = maior == null
      ? ''
      : ' Maior valor: ${maior.mes == null ? maior.ano : nomeDoMes(maior.mes!)}, '
            '${rotuloDaMedida(medida, valorDoPonto(medida, maior))}.';
  return 'Gráfico de colunas, $titulo ${_intervaloDaSerie(pontos, periodo)}.$pontoMaior';
}

/// Blocos `Estatísticas do ano` do Meu perfil e do perfil de outro leitor.
abstract final class TextosDoBloco {
  static const String titulo = 'Estatísticas do ano';
  static const String verEstatisticas = 'Ver estatísticas';
  static String ateHoje(int ano) => '$ano, até hoje';
  static const String vazioProprio = 'Suas estatísticas começam no primeiro registro de progresso.';
  static String vazioDeOutro(String nome, int ano) => '$nome ainda não registrou leituras em $ano.';
  static const String erroProprio = TextosDasEstatisticas.erro;
  static String erroDeOutro(String nome) =>
      'Não foi possível carregar as estatísticas de $nome. Verifique sua conexão e tente de novo.';
  static const String carregando = 'Carregando estatísticas do ano';
}
