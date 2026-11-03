import '../estante/datas_de_leitura.dart';

abstract final class TextosDoHistorico {
  static const String titulo = 'Histórico';
  static const String rotuloPesquisa = 'Pesquisar no histórico';
  static const String placeholder = 'Título ou autor';
  static const String ajudaPesquisa = 'Busca em todos os anos.';
  static const String limparPesquisa = 'Limpar pesquisa';
  static const String todosOsAnos = 'Todos os anos';
  static const String leitura = 'Leitura';
  static const String releitura = 'Releitura';
  static const String carregando = 'Carregando histórico';
  static const String erroTexto =
      'Não foi possível carregar seu histórico. Verifique sua conexão e tente de novo.';
  static const String erroBotao = 'Tentar de novo';
  static const String vazioTitulo = 'Nenhuma leitura concluída ainda';
  static const String vazioTexto =
      'Quando você finalizar um livro, ele entra aqui com a data de conclusão. '
      'Releituras finalizadas também contam.';
  static const String vazioBotao = 'Ver minha estante';
  static const String semResultadoTitulo = 'Nenhuma leitura concluída com esse nome';
  static const String semResultadoTexto =
      'A pesquisa olha o título e o autor de tudo o que você já concluiu, em todos os anos.';
  static const String pesquisarEmTodosOsAnos = 'Pesquisar em todos os anos';

  static String semResultadoNoAno(int ano) => 'Nada com esse nome em $ano.';
}

String textoLeiturasConcluidas(int total) =>
    '$total ${total == 1 ? 'leitura concluída' : 'leituras concluídas'}';

String _livros(int total) => '$total ${total == 1 ? 'livro' : 'livros'}';

String textoContagemDoHistorico({
  required int livros,
  required int leituras,
  int? ano,
  String? busca,
}) {
  if (busca == null) {
    return ano == null
        ? textoLeiturasConcluidas(leituras)
        : '${textoLeiturasConcluidas(leituras)} em $ano';
  }
  final escopo = ano == null ? '${_livros(livros)} no seu histórico' : '${_livros(livros)} em $ano';
  return leituras == 0 ? escopo : '$escopo, ${textoLeiturasConcluidas(leituras)}';
}

String textoConcluidoEm(String dataFim, int duracaoDias) =>
    'Concluído em ${dataIsoPorExtenso(dataFim)} · ${textoDuracaoEmDias(duracaoDias)}';
