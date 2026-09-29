import 'estante_service.dart';
import 'textos.dart';

class EstadoDeLeitura {
  final StatusEstante? status;
  final Leitura? leitura;

  const EstadoDeLeitura({required this.status, this.leitura});
}

enum IdAcao {
  adicionarQueroLer(AcoesDeLeitura.adicionarQueroLer, PassoDaAcao.direto),
  iniciarLeitura(AcoesDeLeitura.iniciarLeitura, PassoDaAcao.data),
  registrarProgresso(AcoesDeLeitura.registrarProgresso, PassoDaAcao.externo),
  verAtualizacoes(AcoesDeLeitura.verAtualizacoes, PassoDaAcao.externo),
  finalizarLeitura(AcoesDeLeitura.finalizarLeitura, PassoDaAcao.data),
  finalizarReleitura(AcoesDeLeitura.finalizarReleitura, PassoDaAcao.data),
  iniciarReleitura(AcoesDeLeitura.iniciarReleitura, PassoDaAcao.data),
  retomarLeitura(AcoesDeLeitura.retomarLeitura, PassoDaAcao.direto),
  abandonarLeitura(AcoesDeLeitura.abandonarLeitura, PassoDaAcao.confirmacao),
  abandonarReleitura(AcoesDeLeitura.abandonarReleitura, PassoDaAcao.confirmacao),
  removerDaEstante(AcoesDeLeitura.removerDaEstante, PassoDaAcao.confirmacao);

  final String rotulo;
  final PassoDaAcao passo;

  const IdAcao(this.rotulo, this.passo);

  bool get finaliza => this == finalizarLeitura || this == finalizarReleitura;
}

enum TomDaAcao { principal, neutra, destrutiva }

enum PassoDaAcao { data, confirmacao, direto, externo }

class AcaoDisponivel {
  final IdAcao id;
  final TomDaAcao tom;

  const AcaoDisponivel(this.id, this.tom);

  String get rotulo => id.rotulo;
  PassoDaAcao get passo => id.passo;
}

List<AcaoDisponivel> _emAndamento(IdAcao finalizar, IdAcao abandonar, Leitura? leitura) {
  return <AcaoDisponivel>[
    const AcaoDisponivel(IdAcao.registrarProgresso, TomDaAcao.principal),
    if (leitura != null) ...<AcaoDisponivel>[
      const AcaoDisponivel(IdAcao.verAtualizacoes, TomDaAcao.neutra),
      AcaoDisponivel(finalizar, TomDaAcao.neutra),
      AcaoDisponivel(abandonar, TomDaAcao.destrutiva),
    ],
  ];
}

List<AcaoDisponivel> acoesDisponiveis(EstadoDeLeitura estado) {
  switch (estado.status) {
    case null:
      return const <AcaoDisponivel>[
        AcaoDisponivel(IdAcao.adicionarQueroLer, TomDaAcao.principal),
        AcaoDisponivel(IdAcao.iniciarLeitura, TomDaAcao.neutra),
      ];
    case StatusEstante.queroLer:
      return const <AcaoDisponivel>[
        AcaoDisponivel(IdAcao.iniciarLeitura, TomDaAcao.principal),
        AcaoDisponivel(IdAcao.removerDaEstante, TomDaAcao.destrutiva),
      ];
    case StatusEstante.lendo:
      return _emAndamento(IdAcao.finalizarLeitura, IdAcao.abandonarLeitura, estado.leitura);
    case StatusEstante.relendo:
      return _emAndamento(IdAcao.finalizarReleitura, IdAcao.abandonarReleitura, estado.leitura);
    case StatusEstante.lido:
      return const <AcaoDisponivel>[AcaoDisponivel(IdAcao.iniciarReleitura, TomDaAcao.principal)];
    case StatusEstante.abandonado:
      return estado.leitura?.retomavel ?? false
          ? const <AcaoDisponivel>[AcaoDisponivel(IdAcao.retomarLeitura, TomDaAcao.principal)]
          : const <AcaoDisponivel>[];
  }
}
