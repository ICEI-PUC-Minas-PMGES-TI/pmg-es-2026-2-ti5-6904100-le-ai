import 'progresso_service.dart';
import 'textos.dart';

const double _percentualMaximo = 100;
const int minutosMaximos = 720;
const int _minutosPorHora = 60;
const int limiarRitmoPaginas = 40;

class TempoValidado {
  final int? minutos;
  final String? erro;

  const TempoValidado({this.minutos, this.erro});
}

class AlcanceDaExclusao {
  final int quantidade;
  final int paginaResultante;
  final double percentualResultante;

  const AlcanceDaExclusao({
    required this.quantidade,
    required this.paginaResultante,
    required this.percentualResultante,
  });
}

int? inteiroDoCampo(String texto) {
  final limpo = texto.trim();
  if (limpo.isEmpty) {
    return null;
  }
  return int.tryParse(limpo);
}

String? validarPagina(int paginaAtual, int totalPaginas, int? pagina) {
  if (pagina == null) {
    return TextosDoRegistro.erroPaginaAusente;
  }
  if (pagina <= paginaAtual) {
    return TextosDoRegistro.erroPaginaBaixa(paginaAtual);
  }
  if (pagina > totalPaginas) {
    return TextosDoRegistro.erroPaginaAlta(totalPaginas);
  }
  return null;
}

TempoValidado validarTempo(String horas, String minutos) {
  if (horas.trim().isEmpty && minutos.trim().isEmpty) {
    return const TempoValidado();
  }
  final valorHoras = horas.trim().isEmpty ? 0 : int.tryParse(horas.trim());
  final valorMinutos = minutos.trim().isEmpty ? 0 : int.tryParse(minutos.trim());
  if (valorHoras == null || valorMinutos == null || valorHoras < 0 || valorMinutos < 0) {
    return const TempoValidado(erro: TextosDoRegistro.erroTempoInvalido);
  }
  final total = valorHoras * _minutosPorHora + valorMinutos;
  if (total > minutosMaximos) {
    return const TempoValidado(erro: TextosDoRegistro.erroTempoMaximo);
  }
  return TempoValidado(minutos: total);
}

int? paginasLidas(int paginaAtual, int? pagina) =>
    pagina != null && pagina > paginaAtual ? pagina - paginaAtual : null;

double percentual(int paginaAtual, int totalPaginas) {
  if (totalPaginas <= 0) {
    return 0;
  }
  final valor = paginaAtual / totalPaginas * _percentualMaximo;
  return valor > _percentualMaximo ? _percentualMaximo : valor;
}

Progresso? _alvo(List<Progresso> itens, String progressoId) {
  for (final item in itens) {
    if (item.id == progressoId) {
      return item;
    }
  }
  return null;
}

AlcanceDaExclusao? alcanceDaExclusao(List<Progresso> itens, String progressoId, int totalPaginas) {
  final alvo = _alvo(itens, progressoId);
  if (alvo == null) {
    return null;
  }
  return AlcanceDaExclusao(
    quantidade: itens.where((item) => item.posicao >= alvo.posicao).length,
    paginaResultante: alvo.paginaAnterior,
    percentualResultante: percentual(alvo.paginaAnterior, totalPaginas),
  );
}

bool ehUltimo(List<Progresso> itens, String progressoId) {
  final alvo = _alvo(itens, progressoId);
  return alvo != null && itens.every((item) => item.posicao <= alvo.posicao);
}

bool precisaDeAvisoDeRitmo(List<Progresso> itens, String progressoId) {
  final alvo = _alvo(itens, progressoId);
  if (alvo == null) {
    return false;
  }
  final outros = itens.where((item) => item.id != progressoId).toList();
  final media = outros.isEmpty
      ? 0
      : outros.fold<int>(0, (soma, item) => soma + item.paginasLidas) / outros.length;
  return alvo.paginasLidas - media >= limiarRitmoPaginas;
}
