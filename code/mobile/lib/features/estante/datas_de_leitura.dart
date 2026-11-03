import '../livros/formatos.dart';

const String _fusoUtc = 'Etc/UTC';

String fusoHorarioDoDispositivo([DateTime? agora]) {
  final deslocamento = (agora ?? DateTime.now()).timeZoneOffset;
  if (deslocamento == Duration.zero || deslocamento.inMinutes % Duration.minutesPerHour != 0) {
    return _fusoUtc;
  }
  final horas = deslocamento.inHours;
  final sinalIana = horas > 0 ? '-' : '+';
  return 'Etc/GMT$sinalIana${horas.abs()}';
}

DateTime diaLocal(DateTime instante) => DateTime(instante.year, instante.month, instante.day);

String dataIso(DateTime dia) {
  final mes = dia.month.toString().padLeft(2, '0');
  final diaDoMes = dia.day.toString().padLeft(2, '0');
  return '${dia.year}-$mes-$diaDoMes';
}

int duracaoEmDias(String inicio, String fim) {
  DateTime dia(String iso) {
    final partes = iso.split('-').map(int.parse).toList();
    return DateTime.utc(partes[0], partes[1], partes[2]);
  }

  return dia(fim).difference(dia(inicio)).inDays + 1;
}

String textoDuracaoEmDias(int dias) => '$dias ${dias == 1 ? 'dia' : 'dias'}';

String dataIsoPorExtenso(String iso) {
  final partes = iso.split('-').map(int.parse).toList();
  return formatarData(DateTime(partes[0], partes[1], partes[2]));
}
