import '../../core/network/api_client.dart';

/// Estatísticas do leitor no `leitura` (F-STA, RF-STA-01/02/03, `docs/api/leitura.yaml`, tag
/// `estatisticas`). Só leitura: os baldes mensais são recompostos no servidor pelo consumo de
/// `progresso.registrado` e `leitura.finalizada` e pelas escritas de nota.

/// Um ano de calendário ou toda a conta.
sealed class PeriodoEstatisticas {
  const PeriodoEstatisticas();

  /// Valor de `?periodo=`: `2026` ou `acumulado`.
  String get valor;

  /// `?periodo=` da rota: um ano de quatro dígitos ou `acumulado`; o resto é o ano corrente.
  static PeriodoEstatisticas daRota(String? valor, int anoCorrente) {
    if (valor == 'acumulado') {
      return const PeriodoAcumulado();
    }
    if (valor != null && RegExp(r'^[1-9]\d{3}$').hasMatch(valor)) {
      return PeriodoAno(int.parse(valor));
    }
    return PeriodoAno(anoCorrente);
  }
}

final class PeriodoAno extends PeriodoEstatisticas {
  final int ano;

  const PeriodoAno(this.ano);

  @override
  String get valor => '$ano';

  @override
  bool operator ==(Object other) => other is PeriodoAno && other.ano == ano;

  @override
  int get hashCode => ano.hashCode;
}

final class PeriodoAcumulado extends PeriodoEstatisticas {
  const PeriodoAcumulado();

  @override
  String get valor => 'acumulado';

  @override
  bool operator ==(Object other) => other is PeriodoAcumulado;

  @override
  int get hashCode => 0;
}

class TotaisEstatistica {
  final int livrosConcluidos;
  final int paginasLidas;
  final int minutosLidos;

  const TotaisEstatistica({
    required this.livrosConcluidos,
    required this.paginasLidas,
    required this.minutosLidos,
  });

  factory TotaisEstatistica.fromJson(Map<String, dynamic> json) => TotaisEstatistica(
    livrosConcluidos: _inteiro(json, 'livrosConcluidos'),
    paginasLidas: _inteiro(json, 'paginasLidas'),
    minutosLidos: _inteiro(json, 'minutosLidos'),
  );

  bool get zerados => livrosConcluidos == 0 && paginasLidas == 0 && minutosLidos == 0;
}

/// Média com o que a compõe; [valor] nulo quando falta denominador (RF-STA-02).
class MediaEstatistica {
  final double? valor;
  final int quantidade;

  const MediaEstatistica({required this.valor, required this.quantidade});
}

class AnoComRegistro {
  final int ano;
  final int livrosConcluidos;

  const AnoComRegistro({required this.ano, required this.livrosConcluidos});
}

/// `Estatisticas` do contrato (`GET /me/estatisticas`).
class Estatisticas {
  /// Nulo no acumulado.
  final int? ano;

  /// Anos com progresso ou leitura concluída, do mais recente ao mais antigo.
  final List<AnoComRegistro> anos;

  /// Primeiro progresso ou fim de leitura concluída, como dia local; nulo sem registro.
  final DateTime? primeiroRegistro;
  final TotaisEstatistica totais;
  final MediaEstatistica paginasPorDia;
  final MediaEstatistica diasPorLivro;
  final MediaEstatistica notaMedia;

  /// Nula quando o período não tem nota.
  final DistribuicaoNotas? distribuicaoNotas;

  const Estatisticas({
    required this.ano,
    required this.anos,
    required this.primeiroRegistro,
    required this.totais,
    required this.paginasPorDia,
    required this.diasPorLivro,
    required this.notaMedia,
    required this.distribuicaoNotas,
  });

  /// Leitor sem nenhum registro de leitura: o painel e o bloco do perfil viram o vazio.
  bool get semRegistro => anos.isEmpty && primeiroRegistro == null;

  factory Estatisticas.fromJson(Map<String, dynamic> json) {
    final anos = json['anos'];
    final medias = json['medias'];
    final totais = json['totais'];
    if (anos is! List || medias is! Map<String, dynamic> || totais is! Map<String, dynamic>) {
      throw const FormatException('Estatísticas sem anos, totais ou médias.');
    }
    final paginasPorDia = _objeto(medias, 'paginasPorDia');
    final diasPorLivro = _objeto(medias, 'diasPorLivro');
    final notaMedia = _objeto(medias, 'notaMedia');
    return Estatisticas(
      ano: _inteiroOuNulo(json['ano']),
      anos: <AnoComRegistro>[
        for (final item in anos)
          if (item is Map<String, dynamic>)
            AnoComRegistro(
              ano: _inteiro(item, 'ano'),
              livrosConcluidos: _inteiro(item, 'livrosConcluidos'),
            )
          else
            throw const FormatException('Ano do seletor fora do contrato.'),
      ],
      primeiroRegistro: lerDia(json['primeiroRegistro']),
      totais: TotaisEstatistica.fromJson(totais),
      paginasPorDia: MediaEstatistica(
        valor: _decimal(paginasPorDia['valor']),
        quantidade: _inteiro(paginasPorDia, 'diasComLeitura'),
      ),
      diasPorLivro: MediaEstatistica(
        valor: _decimal(diasPorLivro['valor']),
        quantidade: _inteiro(diasPorLivro, 'leiturasConcluidas'),
      ),
      notaMedia: MediaEstatistica(
        valor: _decimal(notaMedia['valor']),
        quantidade: _inteiro(notaMedia, 'quantidade'),
      ),
      distribuicaoNotas: DistribuicaoNotas.deJson(json['distribuicaoNotas']),
    );
  }
}

class FaixaDeNota {
  final double valor;
  final int quantidade;

  const FaixaDeNota({required this.valor, required this.quantidade});
}

/// `DistribuicaoNotas` do contrato (RF-STA-04): sempre as onze notas da escala, em ordem
/// crescente; o contrato devolve `null` no lugar quando o período não tem nota.
class DistribuicaoNotas {
  static const int _faixasDaEscala = 11;

  final int total;
  final List<FaixaDeNota> faixas;

  const DistribuicaoNotas({required this.total, required this.faixas});

  static DistribuicaoNotas? deJson(Object? valor) {
    if (valor == null) {
      return null;
    }
    if (valor is! Map<String, dynamic>) {
      throw const FormatException('Distribuição de notas fora do contrato.');
    }
    final faixas = valor['faixas'];
    if (faixas is! List || faixas.length != _faixasDaEscala) {
      throw const FormatException('Distribuição sem as onze faixas.');
    }
    return DistribuicaoNotas(
      total: _inteiro(valor, 'total'),
      faixas: <FaixaDeNota>[
        for (final faixa in faixas)
          if (faixa is Map<String, dynamic>)
            FaixaDeNota(valor: _decimal(faixa['valor'])!, quantidade: _inteiro(faixa, 'quantidade'))
          else
            throw const FormatException('Faixa fora do contrato.'),
      ],
    );
  }
}

/// Um mês (série do ano) ou um ano (série do acumulado).
class PontoEstatistica {
  final int ano;

  /// 1 a 12 na série mensal; nulo na série anual.
  final int? mes;
  final int paginasLidas;
  final int livrosConcluidos;

  const PontoEstatistica({
    required this.ano,
    required this.mes,
    required this.paginasLidas,
    required this.livrosConcluidos,
  });

  factory PontoEstatistica.fromJson(Map<String, dynamic> json) => PontoEstatistica(
    ano: _inteiro(json, 'ano'),
    mes: _inteiroOuNulo(json['mes']),
    paginasLidas: _inteiro(json, 'paginasLidas'),
    livrosConcluidos: _inteiro(json, 'livrosConcluidos'),
  );
}

/// `GraficosEstatisticas` do contrato: um ponto por mês num ano, um por ano no acumulado.
class GraficosEstatisticas {
  final List<PontoEstatistica> pontos;

  const GraficosEstatisticas({required this.pontos});

  factory GraficosEstatisticas.fromJson(Map<String, dynamic> json) {
    final pontos = json['pontos'];
    if (pontos is! List) {
      throw const FormatException('Gráficos sem pontos.');
    }
    return GraficosEstatisticas(
      pontos: <PontoEstatistica>[
        for (final ponto in pontos)
          if (ponto is Map<String, dynamic>)
            PontoEstatistica.fromJson(ponto)
          else
            throw const FormatException('Ponto fora do contrato.'),
      ],
    );
  }
}

/// `EstatisticasPerfil`: totais e distribuição das notas do ano de um perfil autorizado (RN-08).
class EstatisticasPerfil {
  final int ano;
  final TotaisEstatistica totais;
  final DistribuicaoNotas? distribuicaoNotas;

  const EstatisticasPerfil({
    required this.ano,
    required this.totais,
    required this.distribuicaoNotas,
  });

  factory EstatisticasPerfil.fromJson(Map<String, dynamic> json) => EstatisticasPerfil(
    ano: _inteiro(json, 'ano'),
    totais: TotaisEstatistica.fromJson(json),
    distribuicaoNotas: DistribuicaoNotas.deJson(json['distribuicaoNotas']),
  );
}

class EstatisticasService {
  final ApiClient _api;

  EstatisticasService(this._api);

  /// Totais e médias do período (RF-STA-01/02).
  Future<Estatisticas> consultar(PeriodoEstatisticas periodo) async {
    final json = await _api.getJson('/me/estatisticas?periodo=${periodo.valor}');
    return _ler(() => Estatisticas.fromJson(json));
  }

  /// Séries dos gráficos (RF-STA-03).
  Future<GraficosEstatisticas> graficos(PeriodoEstatisticas periodo) async {
    final json = await _api.getJson('/me/estatisticas/graficos?periodo=${periodo.valor}');
    return _ler(() => GraficosEstatisticas.fromJson(json));
  }

  /// Totais do ano corrente de outro leitor. Perfil privado sem seguimento responde 403, e conta
  /// ausente 404: os dois chegam como [ApiException] com o status.
  Future<EstatisticasPerfil> doPerfil(String usuarioId) async {
    final json = await _api.getJson('/perfis/${Uri.encodeComponent(usuarioId)}/estatisticas');
    return _ler(() => EstatisticasPerfil.fromJson(json));
  }

  /// Resposta fora do contrato vira a mesma falha das demais (`invalidResponse`).
  static T _ler<T>(T Function() ler) {
    try {
      return ler();
    } on FormatException {
      throw _respostaInvalida;
    } on TypeError {
      throw _respostaInvalida;
    }
  }

  static const ApiException _respostaInvalida = ApiException(
    kind: ApiFailureKind.invalidResponse,
    correlationId: '',
    message: 'O serviço retornou uma resposta inválida.',
  );
}

/// `2023-11-12` como dia local, sem passar por UTC: o mês não pode virar o anterior.
DateTime? lerDia(Object? valor) {
  if (valor == null) {
    return null;
  }
  if (valor is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(valor)) {
    throw const FormatException('Data fora do formato AAAA-MM-DD.');
  }
  final partes = valor.split('-').map(int.parse).toList();
  return DateTime(partes[0], partes[1], partes[2]);
}

Map<String, dynamic> _objeto(Map<String, dynamic> json, String chave) {
  final valor = json[chave];
  if (valor is! Map<String, dynamic>) {
    throw FormatException('Campo $chave ausente.');
  }
  return valor;
}

int _inteiro(Map<String, dynamic> json, String chave) {
  final valor = json[chave];
  if (valor is! num) {
    throw FormatException('Campo $chave ausente.');
  }
  return valor.toInt();
}

int? _inteiroOuNulo(Object? valor) {
  if (valor == null) {
    return null;
  }
  if (valor is! num) {
    throw const FormatException('Número fora do contrato.');
  }
  return valor.toInt();
}

double? _decimal(Object? valor) {
  if (valor == null) {
    return null;
  }
  if (valor is! num) {
    throw const FormatException('Média fora do contrato.');
  }
  return valor.toDouble();
}
