/// Eixo Y dos gráficos de colunas (F-STA, RF-STA-03): marcas redondas em passos 1-2-5 e um
/// domínio que deixa ar acima da coluna mais alta para o rótulo direto. Espelha
/// `code/front/src/estatisticas/escala.ts`.
///
/// Exemplos do protótipo: 604 páginas → `0 200 400 600` (domínio ~650); 2 livros → `0 1 2 3`;
/// 5.150 páginas → `0 2.000 4.000 6.000`; 14 livros → `0 5 10 15`; 214 páginas → `0 100 200`.
library;

import 'dart:math' as math;

typedef Escala = ({List<int> marcas, double dominio});

const int _marcasDesejadas = 3;

/// Folga mínima entre a coluna mais alta e o topo, em fração do passo.
const double _folgaMinima = 0.1;

/// Acima disso, a última marca sobra demais e o eixo para na anterior.
const double _sobraMaxima = 0.5;

/// Ar acima da coluna mais alta quando o eixo para abaixo dela.
const double _arAcima = 1.08;

/// Potência de 10 da ordem de grandeza. A folga absorve o erro de `log`: `log10(1000)` sai
/// 2,9999…, e sem ela a base de 1.000 seria 100 e o passo seguinte não andaria.
double _base(double valor) => math.pow(10, (math.log(valor) / math.ln10 + 1e-9).floor()).toDouble();

/// O passo 1-2-5 mais próximo, em escala logarítmica.
double _passoRedondo(double alvo) {
  final base = _base(alvo);
  return <double>[1, 2, 5, 10]
      .map((m) => m * base)
      .reduce(
        (melhor, c) => (math.log(c / alvo)).abs() < (math.log(melhor / alvo)).abs() ? c : melhor,
      );
}

/// O passo 1-2-5 seguinte: 1 → 2 → 5 → 10.
int _proximoPasso(int passo) {
  final base = _base(passo.toDouble());
  final m = (passo / base).round();
  return ((m == 1
              ? 2
              : m == 2
              ? 5
              : 10) *
          base)
      .round();
}

({int topo, double dominio}) _topoEDominio(int maximo, int passo) {
  final topo = (maximo / passo).ceil() * passo;
  if (topo - maximo < passo * _folgaMinima) {
    return (topo: topo + passo, dominio: (topo + passo).toDouble());
  }
  if (topo - maximo > passo * _sobraMaxima) {
    return (topo: topo - passo, dominio: maximo * _arAcima);
  }
  return (topo: topo, dominio: topo.toDouble());
}

Escala escalaDoEixo(int maximo) {
  if (maximo <= 0) {
    return (marcas: <int>[0, 1], dominio: 1);
  }
  // Os valores são contagens: o passo nunca é fracionário.
  var passo = math.max(1, _passoRedondo(maximo / _marcasDesejadas).round());
  var eixo = _topoEDominio(maximo, passo);
  // Nunca mais de quatro marcas (0 e três acima): 939 páginas vira 0/500/1.000.
  while (eixo.topo / passo > _marcasDesejadas) {
    passo = _proximoPasso(passo);
    eixo = _topoEDominio(maximo, passo);
  }
  return (
    marcas: <int>[for (var marca = 0; marca <= eixo.topo; marca += passo) marca],
    dominio: eixo.dominio,
  );
}
