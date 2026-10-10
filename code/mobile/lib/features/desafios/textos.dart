/// Textos das telas de F-DSF (docs/design/periodo-2/F-DSF/desafios.md e criar-desafio.md, bloco
/// `Desafios` de meu-perfil.md). O contrato devolve só a configuração e o acumulado; título, nome
/// da janela, o que falta e as datas são compostos aqui. Todo número aparece com unidade e nunca
/// há porcentagem (desafios.md §4).
library;

import '../livros/formatos.dart';
import '../perfil/textos.dart';
import 'desafios_service.dart';

/// `página`/`páginas`, `minuto`/`minutos`, `livro`/`livros`, conforme [valor].
String nomeDaUnidade(UnidadeDesafio unidade, int valor) => switch (unidade) {
  UnidadeDesafio.paginas => valor == 1 ? 'página' : 'páginas',
  UnidadeDesafio.minutos => valor == 1 ? 'minuto' : 'minutos',
  UnidadeDesafio.livros => valor == 1 ? 'livro' : 'livros',
};

String _porJanela(JanelaDesafio janela) => switch (janela) {
  JanelaDesafio.diaria => 'por dia',
  JanelaDesafio.semanal => 'por semana',
  JanelaDesafio.mensal => 'por mês',
  JanelaDesafio.anual => 'por ano',
};

/// `20 páginas por dia`, `1 livro por semana`.
String tituloDoDesafio(UnidadeDesafio unidade, JanelaDesafio janela, int alvo) =>
    '$alvo ${nomeDaUnidade(unidade, alvo)} ${_porJanela(janela)}';

String _capitalizar(String texto) =>
    texto.isEmpty ? texto : '${texto[0].toUpperCase()}${texto.substring(1)}';

/// Nome da janela no card: `Hoje`, `Esta semana` (nunca o intervalo de datas: o início da semana
/// ainda é decisão a ratificar), `Setembro`, `2026`. [inicio] é o primeiro dia da janela.
String nomeDaJanela(JanelaDesafio janela, DateTime inicio) => switch (janela) {
  JanelaDesafio.diaria => 'Hoje',
  JanelaDesafio.semanal => 'Esta semana',
  JanelaDesafio.mensal => _capitalizar(nomeDoMes(inicio.month)),
  JanelaDesafio.anual => '${inicio.year}',
};

/// A janela em curso dentro de uma frase: `hoje`, `nesta semana`, `em setembro`, `em 2026`.
String _naJanela(JanelaDesafio janela, DateTime inicio) => switch (janela) {
  JanelaDesafio.diaria => 'hoje',
  JanelaDesafio.semanal => 'nesta semana',
  JanelaDesafio.mensal => 'em ${nomeDoMes(inicio.month)}',
  JanelaDesafio.anual => 'em ${inicio.year}',
};

/// `Cumprido hoje`, `Cumprido nesta semana`, `Cumprido em setembro`, `Cumprido em 2026`.
String textoDeCumprido(JanelaDesafio janela, DateTime inicio) =>
    'Cumprido ${_naJanela(janela, inicio)}';

/// `Faltam 8 páginas`, `Falta 1 livro`.
String textoDeFalta(UnidadeDesafio unidade, int faltam) =>
    '${faltam == 1 ? 'Falta' : 'Faltam'} $faltam ${nomeDaUnidade(unidade, faltam)}';

/// `12 de 20 páginas`: a unidade concorda com o alvo.
String textoDoAcumulado(Desafio desafio) =>
    '${desafio.janelaCorrente.acumulado} de ${desafio.valorAlvo} '
    '${nomeDaUnidade(desafio.unidade, desafio.valorAlvo)}';

/// `15 de setembro`, no fuso do aparelho; o ano entra só quando não é o corrente.
String dataDaPausa(DateTime instante, [DateTime? agora]) {
  final local = instante.toLocal();
  final ano = (agora ?? DateTime.now()).year;
  final base = '${local.day} de ${nomeDoMes(local.month)}';
  return local.year == ano ? base : '$base de ${local.year}';
}

/// `Pausado desde 15 de setembro`.
String textoDePausadoDesde(Desafio desafio) {
  final desde = desafio.pausadoDesde;
  return desde == null ? 'Pausado' : 'Pausado desde ${dataDaPausa(desde)}';
}

/// O que a pausa significa, no card do desafio pausado.
const String textoDaPausa =
    'O que você registrar enquanto ele estiver pausado não conta para este desafio.';

String tituloDe(Desafio desafio) =>
    tituloDoDesafio(desafio.unidade, desafio.janela, desafio.valorAlvo);

/// Rótulo do card para leitor de tela (desafios.md §9).
String semanticaDoCard(Desafio desafio) {
  final titulo = tituloDe(desafio);
  if (desafio.pausado) {
    return '$titulo. ${textoDePausadoDesde(desafio)}.';
  }
  final janela = desafio.janelaCorrente;
  if (janela.cumprida) {
    return '$titulo. ${textoDeCumprido(desafio.janela, janela.inicio)}: '
        '${textoDoAcumulado(desafio)}.';
  }
  return '$titulo. ${nomeDaJanela(desafio.janela, janela.inicio)}: ${textoDoAcumulado(desafio)}. '
      '${textoDeFalta(desafio.unidade, desafio.faltam)}.';
}

/// Rótulo do card compacto do Meu perfil, que abre a lista (meu-perfil.md §4.1 B).
String semanticaDoCardDoPerfil(Desafio desafio) {
  final janela = desafio.janelaCorrente;
  final situacao = janela.cumprida
      ? textoDeCumprido(desafio.janela, janela.inicio).toLowerCase()
      : textoDeFalta(desafio.unidade, desafio.faltam).toLowerCase();
  return '${tituloDe(desafio)}, ${nomeDaJanela(desafio.janela, janela.inicio).toLowerCase()}, '
      '${textoDoAcumulado(desafio)}, $situacao. Abrir desafios.';
}

/// Segunda linha do cabeçalho do menu: `Esta semana: 95 de 150 minutos` ou a data da pausa.
String subtituloDoMenu(Desafio desafio) => desafio.pausado
    ? textoDePausadoDesde(desafio)
    : '${nomeDaJanela(desafio.janela, desafio.janelaCorrente.inicio)}: '
          '${textoDoAcumulado(desafio)}';

String tituloDaExclusao(Desafio desafio) => 'Excluir o desafio ${tituloDe(desafio)}?';

const String textoDaExclusao =
    'O desafio e o progresso dele saem da sua lista. Seus registros de leitura continuam como '
    'estão. Não dá para desfazer.';

const String textoDeFalhaDeRede = 'Verifique sua conexão e tente de novo.';

/// Legenda do bloco do perfil quando todos os desafios estão pausados (decisão do dono de
/// 09/10/2026; o protótipo não desenha o caso).
String contagemDePausados(int valor) => contagem(valor, 'desafio pausado', 'desafios pausados');

/// `Mais 3 desafios`, contando os pausados.
String textoDeMaisDesafios(int valor) => 'Mais ${contagem(valor, 'desafio', 'desafios')}';

// Formulário (criar-desafio.md).

String ajudaDaUnidade(UnidadeDesafio? unidade) => switch (unidade) {
  null => 'Escolha uma unidade para ver o que conta.',
  UnidadeDesafio.paginas => 'Conta as páginas de cada registro de progresso.',
  UnidadeDesafio.minutos =>
    'Conta o tempo de cada registro de progresso, informado ou cronometrado.',
  UnidadeDesafio.livros =>
    'Conta cada leitura ou releitura finalizada. Livro abandonado não conta.',
};

String rotuloDaUnidade(UnidadeDesafio unidade) => switch (unidade) {
  UnidadeDesafio.paginas => 'Páginas',
  UnidadeDesafio.minutos => 'Minutos',
  UnidadeDesafio.livros => 'Livros',
};

String rotuloDaJanela(JanelaDesafio janela) => switch (janela) {
  JanelaDesafio.diaria => 'Por dia',
  JanelaDesafio.semanal => 'Por semana',
  JanelaDesafio.mensal => 'Por mês',
  JanelaDesafio.anual => 'Por ano',
};

const String ajudaDaJanela =
    'O período segue o calendário: o dia, a semana, o mês ou o ano em curso, no horário do seu '
    'celular.';

const String ajudaDoAlvo = 'Um número inteiro maior que zero.';

/// A mesma frase do servidor para o teto (`Para páginas, o alvo vai de 1 a 100.000.`).
String erroDoTeto(UnidadeDesafio unidade) {
  final nome = switch (unidade) {
    UnidadeDesafio.paginas => 'páginas',
    UnidadeDesafio.minutos => 'minutos',
    UnidadeDesafio.livros => 'livros',
  };
  return 'Para $nome, o alvo vai de 1 a ${_milhares(unidade.tetoDoAlvo)}.';
}

String _milhares(int valor) =>
    valor.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+$)'), (_) => '.');

/// Faixa da criação: o que já foi registrado na janela em curso conta (RN-20.2).
String faixaDaCriacao(JanelaDesafio janela, DateTime hoje) => switch (janela) {
  JanelaDesafio.anual => 'O que você já registrou em ${hoje.year} também conta, desde janeiro.',
  _ => 'O que você já registrou ${_naJanela(janela, hoje)} também conta.',
};

/// Faixa da edição (RN-20.7): a primeira frase nomeia a janela corrente da configuração nova; a
/// segunda, as janelas encerradas da configuração salva.
String faixaDaEdicao(JanelaDesafio nova, JanelaDesafio salva, DateTime hoje) {
  final corrente = switch (nova) {
    JanelaDesafio.diaria => 'hoje, que é recalculado',
    JanelaDesafio.semanal => 'esta semana, que é recalculada',
    JanelaDesafio.mensal => '${nomeDoMes(hoje.month)}, que é recalculado',
    JanelaDesafio.anual => '${hoje.year}, que é recalculado',
  };
  final encerradas = switch (salva) {
    JanelaDesafio.diaria => 'Dias',
    JanelaDesafio.semanal => 'Semanas',
    JanelaDesafio.mensal => 'Meses',
    JanelaDesafio.anual => 'Anos',
  };
  return 'A mudança vale para $corrente. $encerradas que já terminaram continuam como estavam.';
}
