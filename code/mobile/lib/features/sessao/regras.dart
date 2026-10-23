import '../progresso/regras.dart';
import '../progresso/textos.dart';
import 'sessao_de_leitura.dart';
import 'textos.dart';

const int _minutoMinimo = 1;
const int _milissegundosPorSegundo = 1000;

int minutosDaSessao(Duration tempo) {
  final limitado = tempo > duracaoMaximaDaSessao ? duracaoMaximaDaSessao : tempo;
  final minutos =
      (limitado.inSeconds + Duration.secondsPerMinute ~/ 2) ~/ Duration.secondsPerMinute;
  return minutos.clamp(_minutoMinimo, minutosMaximos);
}

bool atingiuOLimite(Duration tempo) => tempo >= duracaoMaximaDaSessao;

String rotuloDoTempoDaSessao(Duration tempo) =>
    atingiuOLimite(tempo) ? TextosDoEncerramento.limite : rotuloMinutos(minutosDaSessao(tempo));

String _doisDigitos(int valor) => valor.toString().padLeft(2, '0');

String formatarCronometro(Duration tempo) {
  final positivo = tempo.isNegative ? Duration.zero : tempo;
  final minutos = positivo.inMinutes.remainder(Duration.minutesPerHour);
  final segundos = positivo.inSeconds.remainder(Duration.secondsPerMinute);
  return '${positivo.inHours}:${_doisDigitos(minutos)}:${_doisDigitos(segundos)}';
}

String formatarContagem(Duration restante) {
  final segundosArredondados = restante.isNegative
      ? 0
      : (restante.inMilliseconds + _milissegundosPorSegundo - 1) ~/ _milissegundosPorSegundo;
  final minutos = segundosArredondados ~/ Duration.secondsPerMinute;
  return '$minutos:${_doisDigitos(segundosArredondados % Duration.secondsPerMinute)}';
}

String? validarPaginaDaSessao(int base, int totalPaginas, int? pagina) {
  if (pagina == null) {
    return TextosDoEncerramento.erroPaginaAusente;
  }
  if (pagina < base) {
    return TextosDoEncerramento.erroPaginaBaixa(base);
  }
  if (pagina > totalPaginas) {
    return TextosDoRegistro.erroPaginaAlta(totalPaginas);
  }
  return null;
}
