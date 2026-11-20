import 'package:flutter/material.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import 'calendario.dart';

const double _alturaDaCelula = 48;
const double _diametro = 36;
const double _anel = 2;

/// Texto ampliado a partir do qual o cabeçalho vira uma letra (§9).
const double _escalaDoCabecalhoCurto = 1.3;

/// Cabeçalho `seg` a `dom` (§4, grade): 24px de altura, `caption` `grafite`. Com texto ampliado,
/// uma letra; o nome completo fica no rótulo acessível.
class CabecalhoDaSemana extends StatelessWidget {
  const CabecalhoDaSemana({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final curto = MediaQuery.textScalerOf(context).scale(10) / 10 >= _escalaDoCabecalhoCurto;
    final rotulos = curto ? diasDaSemanaLetra : diasDaSemanaCurtos;
    return SizedBox(
      height: 24,
      child: Row(
        children: <Widget>[
          for (var coluna = 0; coluna < 7; coluna++)
            Expanded(
              child: Semantics(
                header: true,
                label: diasDaSemanaCompletos[coluna],
                excludeSemantics: true,
                child: Center(
                  child: Text(
                    rotulos[coluna],
                    maxLines: 1,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Grade de um mês, somente leitura (§4, "Grade do mês"): dia com leitura é um círculo
/// preenchido, dia sem leitura é só o número, hoje é um anel. Nada recebe foco nem toque; o
/// leitor de tela lê o mês e o total e depois o rótulo de cada dia.
class GradeDoMes extends StatelessWidget {
  final CalendarioDaSequencia calendario;

  const GradeDoMes({super.key, required this.calendario});

  @override
  Widget build(BuildContext context) {
    final linhas = linhasDoMes(calendario);
    final mes = calendario.mes;
    return Semantics(
      container: true,
      label: '${mes.titulo}, ${totalDoMes(calendario.dias.length)}',
      explicitChildNodes: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const CabecalhoDaSemana(),
          const SizedBox(height: DesignTokens.space2),
          for (final linha in linhas)
            Row(
              children: <Widget>[
                for (final celula in linha)
                  Expanded(
                    child: celula.dia == null
                        ? const SizedBox(height: _alturaDaCelula)
                        : _Dia(mes: mes, celula: celula),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _Dia extends StatelessWidget {
  final Mes mes;
  final CelulaDoMes celula;

  const _Dia({required this.mes, required this.celula});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final situacao = celula.situacao!;
    final cor = switch (situacao) {
      SituacaoDoDia.comLeitura || SituacaoDoDia.hojeComLeitura => theme.pageBackground,
      SituacaoDoDia.semLeitura => theme.secondaryText,
      SituacaoDoDia.hojeSemLeitura => theme.colorScheme.onSurface,
      SituacaoDoDia.futuro => theme.tertiaryText,
    };
    return Semantics(
      label: rotuloDoDia(mes, celula.dia!, situacao),
      excludeSemantics: true,
      child: CustomPaint(
        key: ValueKey<String>('dia-${celula.dia}'),
        painter: PintorDoDia(
          situacao: situacao,
          ligadaAEsquerda: celula.ligadaAEsquerda,
          ligadaADireita: celula.ligadaADireita,
          corDoDia: theme.streakColor,
          corDaFaixa: theme.accentTint,
          corDoAnel: theme.colorScheme.onSurface,
          corDaFolga: theme.pageBackground,
        ),
        child: SizedBox(
          height: _alturaDaCelula,
          child: Center(
            child: Text(
              '${celula.dia}',
              maxLines: 1,
              style: theme.numInline.copyWith(
                color: cor,
                fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Faixa, círculo e anel de um dia. A faixa de 36px passa por trás dos círculos: cada célula pinta
/// a metade que encosta no vizinho com leitura, e o círculo arredonda as pontas da corrida.
class PintorDoDia extends CustomPainter {
  final SituacaoDoDia situacao;
  final bool ligadaAEsquerda;
  final bool ligadaADireita;
  final Color corDoDia;
  final Color corDaFaixa;
  final Color corDoAnel;
  final Color corDaFolga;

  const PintorDoDia({
    required this.situacao,
    required this.ligadaAEsquerda,
    required this.ligadaADireita,
    required this.corDoDia,
    required this.corDaFaixa,
    required this.corDoAnel,
    required this.corDaFolga,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final centro = size.center(Offset.zero);
    const raio = _diametro / 2;
    final faixa = Paint()..color = corDaFaixa;
    final topo = centro.dy - raio;
    if (ligadaAEsquerda) {
      canvas.drawRect(Rect.fromLTWH(0, topo, centro.dx, _diametro), faixa);
    }
    if (ligadaADireita) {
      canvas.drawRect(Rect.fromLTWH(centro.dx, topo, size.width - centro.dx, _diametro), faixa);
    }
    if (situacao.leu) {
      canvas.drawCircle(centro, raio, Paint()..color = corDoDia);
    }
    final anel = Paint()
      ..color = corDoAnel
      ..style = PaintingStyle.stroke
      ..strokeWidth = _anel;
    switch (situacao) {
      case SituacaoDoDia.hojeComLeitura:
        // Anel em volta do círculo, com 2px de folga em `papel` (`noite` no escuro).
        canvas.drawCircle(
          centro,
          raio + _anel,
          Paint()
            ..color = corDaFolga
            ..style = PaintingStyle.stroke
            ..strokeWidth = _anel,
        );
        canvas.drawCircle(centro, raio + _anel + _anel / 2 + 1, anel);
      case SituacaoDoDia.hojeSemLeitura:
        canvas.drawCircle(centro, raio - _anel / 2, anel);
      case SituacaoDoDia.comLeitura || SituacaoDoDia.semLeitura || SituacaoDoDia.futuro:
        break;
    }
  }

  @override
  bool shouldRepaint(PintorDoDia antigo) =>
      antigo.situacao != situacao ||
      antigo.ligadaAEsquerda != ligadaAEsquerda ||
      antigo.ligadaADireita != ligadaADireita ||
      antigo.corDoDia != corDoDia ||
      antigo.corDaFaixa != corDaFaixa ||
      antigo.corDoAnel != corDoAnel ||
      antigo.corDaFolga != corDaFolga;
}

/// Legenda de uma linha (§4, legenda): círculo de 12px e `Dia com leitura`; anel de 12px e `Hoje`.
class LegendaDoCalendario extends StatelessWidget {
  const LegendaDoCalendario({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final estilo = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    Widget amostra({required bool anel}) => Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: anel ? null : theme.streakColor,
        border: anel ? Border.all(color: theme.colorScheme.onSurface, width: _anel) : null,
      ),
    );
    return Wrap(
      spacing: DesignTokens.space6,
      runSpacing: DesignTokens.space2,
      children: <Widget>[
        Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            ExcludeSemantics(child: amostra(anel: false)),
            const SizedBox(width: DesignTokens.space2),
            Flexible(child: Text(TextosDoCalendario.legendaComLeitura, style: estilo)),
          ],
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            ExcludeSemantics(child: amostra(anel: true)),
            const SizedBox(width: DesignTokens.space2),
            Flexible(child: Text(TextosDoCalendario.legendaHoje, style: estilo)),
          ],
        ),
      ],
    );
  }
}

/// Grade skeleton (§4.6 e §4.7): cabeçalho real e cinco linhas de sete círculos de 36px em `linha`.
class GradeEsqueleto extends StatelessWidget {
  const GradeEsqueleto({super.key});

  @override
  Widget build(BuildContext context) {
    final cor = Theme.of(context).divider;
    return ExcludeSemantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const CabecalhoDaSemana(),
          const SizedBox(height: DesignTokens.space2),
          for (var linha = 0; linha < 5; linha++)
            Row(
              children: <Widget>[
                for (var coluna = 0; coluna < 7; coluna++)
                  Expanded(
                    child: SizedBox(
                      height: _alturaDaCelula,
                      child: Center(
                        child: Container(
                          width: _diametro,
                          height: _diametro,
                          decoration: BoxDecoration(color: cor, shape: BoxShape.circle),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
