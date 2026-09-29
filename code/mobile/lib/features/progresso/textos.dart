const int _minutosPorHora = 60;

String rotuloPaginaDeTotal(int pagina, int totalPaginas) => 'Página $pagina de $totalPaginas';

String rotuloPaginas(int quantidade) => '$quantidade ${quantidade == 1 ? 'página' : 'páginas'}';

String rotuloRegistros(int quantidade) =>
    '$quantidade ${quantidade == 1 ? 'registro' : 'registros'}';

String rotuloDuracao(int minutos) {
  final horas = minutos ~/ _minutosPorHora;
  final resto = minutos % _minutosPorHora;
  if (horas == 0) {
    return '$resto min';
  }
  return resto == 0 ? '$horas h' : '$horas h $resto min';
}

abstract final class TextosDoRegistro {
  static const String titulo = 'Registrar progresso';
  static const String rotuloPagina = 'Página em que parou';
  static const String rotuloTempo = 'Tempo gasto';
  static const String sufixoHoras = 'h';
  static const String sufixoMinutos = 'min';
  static const String ajudaTempo = 'Opcional. Ajuda a calcular sua média de leitura.';
  static const String erroPaginaAusente = 'Informe a página em que parou, em número inteiro.';
  static const String erroTempoInvalido = 'Informe o tempo em horas e minutos inteiros.';
  static const String erroTempoMaximo = 'Informe até 12 horas de leitura por registro.';
  static const String erroEnvio = 'Não foi possível salvar. Verifique sua conexão e tente de novo.';
  static const String erroListaDesatualizada =
      'Suas atualizações mudaram em outro lugar. Recarregamos a lista para você conferir.';
  static const String avisoOffline =
      'Registro salvo no aparelho. Será enviado quando você voltar a ficar online.';
  static const String botaoSalvar = 'Salvar';
  static const String botaoSalvando = 'Salvando';
  static const String botaoCancelar = 'Cancelar';

  static String ajudaPagina(int minima, int maxima) =>
      'Entre $minima e $maxima. Informe onde você parou, não quantas páginas leu.';

  static String derivado(int paginasLidas) => 'Você leu ${rotuloPaginas(paginasLidas)}';

  static String erroPaginaBaixa(int paginaAtual) =>
      'Você já está na página $paginaAtual. Informe uma página maior.';

  static String erroPaginaAlta(int totalPaginas) =>
      'O livro tem $totalPaginas páginas. Informe uma página até $totalPaginas.';
}

abstract final class TextosDasAtualizacoes {
  static const String titulo = 'Progresso';
  static const String iniciada = 'Iniciada';
  static const String rotuloLidas = 'Lidas';
  static const String rotuloTempo = 'Tempo';
  static const String rotuloRegistros = 'Registros';
  static const String tituloSecao = 'Atualizações';
  static const String confirmacaoTitulo = 'Excluir esta atualização?';
  static const String confirmacaoBotao = 'Excluir atualização';
  static const String botaoCancelar = 'Cancelar';
  static const String vazioTitulo = 'Nenhuma atualização ainda';
  static const String vazioTexto =
      'Registre em qual página você parou para acompanhar seu progresso.';
  static const String vazioBotao = 'Registrar progresso';
  static const String erroTexto =
      'Não foi possível carregar suas atualizações. Verifique sua conexão e tente de novo.';
  static const String erroBotao = 'Tentar de novo';
  static const String pendenteCorrigir = 'Corrigir';
  static const String pendenteDescartar = 'Descartar';
  static const String descarteTitulo = 'Descartar este registro?';

  static String descarteTexto(int pagina) =>
      'O registro da página $pagina ainda não foi enviado e será perdido.';

  static String iniciadaEm(String dataPorExtenso) => 'Iniciada em $dataPorExtenso';

  static String itemPagina(int pagina) => 'página $pagina';

  static String itemDetalhe(int paginasLidas, int minutos) => minutos == 0
      ? rotuloPaginas(paginasLidas)
      : '${rotuloPaginas(paginasLidas)} · ${rotuloDuracao(minutos)}';

  static String avisoRitmo(int paginasLidas, int minutos, int paginaAnterior) {
    final ritmo = minutos == 0
        ? 'de uma vez'
        : 'em $minutos ${minutos == 1 ? 'minuto' : 'minutos'}';
    return '${rotuloPaginas(paginasLidas)} $ritmo. Se você digitou errado, exclua este registro '
        'para voltar à página $paginaAnterior.';
  }

  static String confirmacaoTexto(int paginaAtual, double percentual) =>
      'Sua página atual volta para $paginaAtual e o percentual para ${percentual.round()}%. '
      'Os outros registros não mudam.';

  static String confirmacaoAlcance(int quantidade) => quantidade == 2
      ? 'Esta atualização e a seguinte serão excluídas.'
      : 'Esta atualização e as ${quantidade - 1} seguintes serão excluídas.';

  static String rotuloExcluir(int pagina) => 'Excluir a atualização da página $pagina';
}
