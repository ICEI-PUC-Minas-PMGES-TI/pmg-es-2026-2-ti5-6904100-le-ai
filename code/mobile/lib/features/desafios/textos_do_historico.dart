/// Textos do histórico do desafio (docs/design/periodo-3/F-DSF-OPC/historico-do-desafio.md §8).
/// O contrato devolve só o período, o snapshot e o resultado de cada janela; nome da janela,
/// grupo, linha de pausa, marca de mudança, rodapé e vazio são compostos aqui. Todo número
/// aparece com unidade e nunca há porcentagem.
library;

import '../livros/formatos.dart';
import 'desafios_service.dart';
import 'textos.dart';

const List<String> _diasDaSemana = <String>[
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
  'domingo',
];

String _capitalizar(String texto) =>
    texto.isEmpty ? texto : '${texto[0].toUpperCase()}${texto.substring(1)}';

/// `1º` no primeiro dia do mês, como na copy do vazio; os outros dias sem ordinal.
String _dia(DateTime data) => data.day == 1 ? '1º' : '${data.day}';

/// Nome da janela na linha: `Quinta, 3 de setembro`, `14 a 20 de setembro`,
/// `31 de agosto a 6 de setembro`, `Agosto de 2026`, `2025`.
String nomeDaJanelaEncerrada(JanelaEncerrada janela) {
  final inicio = janela.inicio;
  final fim = janela.fim;
  return switch (janela.periodicidade) {
    JanelaDesafio.diaria =>
      '${_capitalizar(_diasDaSemana[inicio.weekday - 1])}, ${inicio.day} de '
          '${nomeDoMes(inicio.month)}',
    JanelaDesafio.semanal =>
      inicio.month == fim.month
          ? '${inicio.day} a ${fim.day} de ${nomeDoMes(fim.month)}'
          : '${inicio.day} de ${nomeDoMes(inicio.month)} a ${fim.day} de ${nomeDoMes(fim.month)}',
    JanelaDesafio.mensal => '${_capitalizar(nomeDoMes(inicio.month))} de ${inicio.year}',
    JanelaDesafio.anual => '${inicio.year}',
  };
}

/// Cabeçalho do grupo (proposta do prompt §3): diárias e semanais por mês, pelo dia em que a
/// janela começa (`Agosto de 2026`); mensais por ano (`2026`); anuais sem grupo (`null`).
String? grupoDaJanela(JanelaEncerrada janela) => switch (janela.periodicidade) {
  JanelaDesafio.diaria || JanelaDesafio.semanal =>
    '${_capitalizar(nomeDoMes(janela.inicio.month))} de ${janela.inicio.year}',
  JanelaDesafio.mensal => '${janela.inicio.year}',
  JanelaDesafio.anual => null,
};

/// `170 de 150 minutos`: a unidade concorda com o alvo da própria janela.
String textoDoAcumuladoDaJanela(JanelaEncerrada janela) =>
    '${janela.acumulado} de ${janela.valorAlvo} ${nomeDaUnidade(janela.unidade, janela.valorAlvo)}';

String textoDoResultado(JanelaEncerrada janela) => janela.cumprida ? 'Cumprido' : 'Não cumprido';

/// `Desafio pausado nesta semana` ou `Desafio pausado em parte desta semana`; `null` sem pausa.
String? textoDaPausaDaJanela(JanelaEncerrada janela) {
  final (inteira, parcial) = switch (janela.periodicidade) {
    JanelaDesafio.diaria => ('neste dia', 'deste dia'),
    JanelaDesafio.semanal => ('nesta semana', 'desta semana'),
    JanelaDesafio.mensal => ('neste mês', 'deste mês'),
    JanelaDesafio.anual => ('neste ano', 'deste ano'),
  };
  return switch (janela.pausa) {
    PausaDaJanela.inteira => 'Desafio pausado $inteira',
    PausaDaJanela.parcial => 'Desafio pausado em parte $parcial',
    PausaDaJanela.nenhuma => null,
  };
}

/// O que o leitor de tela lê em cada janela, como uma frase (prompt §9).
String semanticaDaJanela(JanelaEncerrada janela) {
  final pausa = textoDaPausaDaJanela(janela);
  return '${nomeDaJanelaEncerrada(janela)}. ${textoDoAcumuladoDaJanela(janela)}. '
      '${textoDoResultado(janela)}.${pausa == null ? '' : ' $pausa.'}';
}

String _nomeDoPeriodo(JanelaDesafio janela) => switch (janela) {
  JanelaDesafio.diaria => 'diário',
  JanelaDesafio.semanal => 'semanal',
  JanelaDesafio.mensal => 'mensal',
  JanelaDesafio.anual => 'anual',
};

String _nomeDaUnidadeNoPlural(UnidadeDesafio unidade) => nomeDaUnidade(unidade, 2);

/// Marca de mudança entre a janela [nova] e a vizinha mais antiga [antiga], uma linha por
/// mudança, na ordem unidade, período, meta. Vazia quando o snapshot é o mesmo. A meta é escrita
/// com a unidade e o período da janela nova: `Meta alterada: de 120 para 150 minutos por semana`.
List<String> mudancasEntre(JanelaEncerrada nova, JanelaEncerrada antiga) => <String>[
  if (nova.unidade != antiga.unidade)
    'Unidade alterada: de ${_nomeDaUnidadeNoPlural(antiga.unidade)} para '
        '${_nomeDaUnidadeNoPlural(nova.unidade)}',
  if (nova.periodicidade != antiga.periodicidade)
    'Período alterado: de ${_nomeDoPeriodo(antiga.periodicidade)} para '
        '${_nomeDoPeriodo(nova.periodicidade)}',
  if (nova.valorAlvo != antiga.valorAlvo)
    'Meta alterada: de ${antiga.valorAlvo} para '
        '${tituloDoDesafio(nova.unidade, nova.periodicidade, nova.valorAlvo)}',
];

/// Linha de baixo do header: `Histórico` ou `Histórico · Pausado desde 15 de setembro`.
String subtituloDoHistorico(Desafio desafio) =>
    desafio.pausado ? 'Histórico · ${textoDePausadoDesde(desafio)}' : 'Histórico';

/// Rodapé de criação, depois da última janela. A segunda frase vem da janela de criação, a mais
/// antiga da lista; a diária não tem.
String rodapeDeCriacao(DateTime criadoEm, JanelaDesafio janelaDaCriacao) {
  final criado = 'Desafio criado em ${formatarData(criadoEm)}.';
  return switch (janelaDaCriacao) {
    JanelaDesafio.diaria => criado,
    JanelaDesafio.semanal =>
      '$criado A primeira semana conta o que você registrou desde o início dela.',
    JanelaDesafio.mensal =>
      '$criado O primeiro mês conta o que você registrou desde o início dele.',
    JanelaDesafio.anual => '$criado O primeiro ano conta o que você registrou desde o início dele.',
  };
}

/// Título do vazio: ainda não existe janela encerrada (diferente de uma janela vazia).
String tituloSemJanelaEncerrada(JanelaDesafio janela) => switch (janela) {
  JanelaDesafio.diaria => 'Nenhum dia encerrado ainda',
  JanelaDesafio.semanal => 'Nenhuma semana encerrada ainda',
  JanelaDesafio.mensal => 'Nenhum mês encerrado ainda',
  JanelaDesafio.anual => 'Nenhum ano encerrado ainda',
};

/// Texto do vazio: quando a janela corrente fecha, pelo dia seguinte ao fim dela.
String textoSemJanelaEncerrada(Desafio desafio) {
  final corrente = desafio.janelaCorrente;
  final fim = corrente.fim;
  final seguinte = DateTime(fim.year, fim.month, fim.day + 1);
  return switch (desafio.janela) {
    JanelaDesafio.diaria => 'Hoje aparece aqui a partir de amanhã.',
    JanelaDesafio.semanal =>
      'Esta semana aparece aqui a partir de ${_diasDaSemana[seguinte.weekday - 1]}-feira, '
          '${_dia(seguinte)} de ${nomeDoMes(seguinte.month)}.',
    JanelaDesafio.mensal =>
      '${_capitalizar(nomeDoMes(corrente.inicio.month))} aparece aqui a partir de '
          '${_dia(seguinte)} de ${nomeDoMes(seguinte.month)}.',
    JanelaDesafio.anual =>
      'Cada ano entra aqui quando termina. ${corrente.inicio.year} aparece a partir de '
          '${_dia(seguinte)} de ${nomeDoMes(seguinte.month)} de ${seguinte.year}.',
  };
}

const String textoDoErroDoHistorico =
    'Não foi possível carregar o histórico deste desafio. Tente de novo em instantes.';
const String textoSemConexaoNoHistorico =
    'Você está sem conexão. O histórico aparece quando a conexão voltar.';
const String textoSemConexaoAoCarregarMais = 'Sem conexão para carregar janelas mais antigas.';
const String textoDoErroAoCarregarMais = 'Não foi possível carregar janelas mais antigas.';
const String textoMaisJanelasCarregadas = 'Mais janelas carregadas';
const String textoDeServicoIniciando = 'O serviço está iniciando. Isso pode levar alguns segundos.';

/// Rótulo acessível do item do menu (desafios.md P3 §8).
String rotuloDoItemDeHistorico(Desafio desafio) => 'Ver histórico do desafio ${tituloDe(desafio)}';
