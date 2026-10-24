String rotuloMinutos(int minutos) => '$minutos ${minutos == 1 ? 'minuto' : 'minutos'}';

String _rotuloUnidade(int valor, String singular, String plural) =>
    '$valor ${valor == 1 ? singular : plural}';

abstract final class TextosDoModoDeFoco {
  static const String pausar = 'Pausar';
  static const String encerrar = 'Encerrar sessão';
  static const String cancelar = 'Cancelar sessão';
  static const String retomar = 'Retomar leitura';
  static const String tituloDaPausa = 'Pausar por quanto tempo?';
  static const String textoDaPausa =
      'O tempo em pausa não conta como leitura. Se a pausa acabar sem você voltar, a sessão é '
      'encerrada e o tempo lido fica guardado.';
  static const String voltar = 'Voltar';
  static const String pausaTerminaEm = 'Pausa termina em ';
  static const String tituloDoCancelamento = 'Cancelar esta sessão?';
  static const String descartar = 'Descartar sessão';
  static const String continuarLendo = 'Continuar lendo';

  static String opcaoDePausa(Duration duracao) => rotuloMinutos(duracao.inMinutes);

  static String textoDoCancelamento(int minutos) =>
      'Os ${rotuloMinutos(minutos)} medidos serão descartados e nenhum progresso será registrado.';

  static String rotuloDoCronometro(Duration tempo) {
    final horas = tempo.inHours;
    final minutos = tempo.inMinutes.remainder(Duration.minutesPerHour);
    final segundos = tempo.inSeconds.remainder(Duration.secondsPerMinute);
    final partes = <String>[
      if (horas > 0) _rotuloUnidade(horas, 'hora', 'horas'),
      _rotuloUnidade(minutos, 'minuto', 'minutos'),
    ];
    return '${partes.join(', ')} e ${_rotuloUnidade(segundos, 'segundo', 'segundos')} de leitura';
  }
}

abstract final class TextosDoEncerramento {
  static const String titulo = 'Encerrar sessão';
  static const String salvarEEncerrar = 'Salvar e encerrar';
  static const String encerrarSemRegistrar = 'Encerrar sem registrar';
  static const String voltarASessao = 'Voltar à sessão';
  static const String limite = '12 horas';
  static const String tempoNoLimite = '$limite de leitura, o limite da sessão';
  static const String erroPaginaAusente = 'Informe a página em que parou.';
  static const String erroEnvio =
      'Não foi possível salvar agora. Sua sessão continua guardada neste aparelho: tente de novo.';

  static String tempoDeLeitura(int minutos) => '${rotuloMinutos(minutos)} de leitura';

  static String ajudaPagina(int base, int total) =>
      'Entre $base e $total. Se não avançou, informe $base: a sessão termina sem registrar o tempo.';

  static String derivado(int paginasLidas, String tempo) =>
      'Você leu $paginasLidas ${paginasLidas == 1 ? 'página' : 'páginas'} em $tempo';

  static String mesmaPagina(int pagina, String tempo) =>
      'Você continua na página $pagina. A sessão termina sem registrar progresso e os $tempo não '
      'são contados.';

  static String erroPaginaBaixa(int base) =>
      'Você já está na página $base. Informe $base ou uma página maior.';

  static String erroOutroAparelho(int pagina) =>
      'Esta leitura já está na página $pagina, registrada em outro aparelho. Informe uma página a '
      'partir de $pagina.';
}

abstract final class TextosDoAvisoDeSaida {
  static const String encerradaPorExpiracao =
      'Sua sessão de leitura foi encerrada porque o acesso expirou. O tempo medido não foi '
      'registrado. Entre de novo para continuar.';
}

abstract final class TextosDaSessaoPendente {
  static const String tituloDaPausaEsgotada = 'Sua pausa terminou';
  static const String tituloDaExpirada = 'Sua sessão passou de 12 horas';
  static const String textoDaExpirada =
      'A sessão ficou aberta por mais de 12 horas de leitura cronometrada, o limite. Se você '
      'registrar, contamos no máximo 12 horas.';
  static const String salvar = 'Salvar leitura';
  static const String descartar = 'Descartar sessão';
  static const String tituloDoDescarte = 'Descartar esta sessão?';
  static const String voltar = 'Voltar';

  static String textoDaPausaEsgotada(Duration pausa, int minutosLidos) =>
      'A pausa de ${rotuloMinutos(pausa.inMinutes)} acabou sem você voltar, então a sessão foi '
      'encerrada. Guardamos os ${rotuloMinutos(minutosLidos)} que você leu antes da pausa. '
      'Informe onde parou para registrar.';

  static String textoDoDescarte(String tempo) =>
      'Os $tempo de leitura serão perdidos e nenhum progresso será registrado.';
}
