import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client.dart';
import '../estante/estante_service.dart';
import 'fila_de_progresso.dart';
import 'progresso_page.dart';
import 'progresso_service.dart';
import 'registrar_progresso.dart';
import 'registro_progresso_controller.dart';

class DependenciasDeProgresso {
  final ProgressoService servico;
  final FilaDeProgresso fila;

  const DependenciasDeProgresso({required this.servico, required this.fila});

  factory DependenciasDeProgresso.padrao(ApiClient client) {
    final servico = ProgressoService(client);
    return DependenciasDeProgresso(
      servico: servico,
      fila: FilaDeProgresso(servico, ArmazemDaFilaEmPreferencias()),
    );
  }
}

Future<ResultadoDoRegistro?> registrarProgressoDaLeitura(
  BuildContext context, {
  required DependenciasDeProgresso progresso,
  required Leitura leitura,
  required LivroDaEstante livro,
}) async {
  final totalPaginas = leitura.totalPaginas;
  if (totalPaginas == null) {
    return null;
  }
  return abrirRegistroDeProgresso(
    context,
    servico: progresso.servico,
    fila: progresso.fila,
    leitura: LeituraDoRegistro(
      leituraId: leitura.id,
      titulo: livro.titulo,
      autor: livro.autor,
      capaUrl: livro.capaUrl,
      paginaAtual: leitura.paginaAtual,
      totalPaginas: totalPaginas,
    ),
  );
}

String rotaProgressoDaLeitura(String leituraId) =>
    '/estante/leituras/${Uri.encodeComponent(leituraId)}/progresso';

GoRoute rotaDoProgresso(DependenciasDeProgresso deps, EstanteService estante) => GoRoute(
  path: 'leituras/:leituraId/progresso',
  builder: (context, state) => ProgressoPage(
    leituraId: state.pathParameters['leituraId']!,
    progresso: deps,
    estante: estante,
    aoVoltar: () => context.canPop() ? context.pop() : context.go('/estante'),
  ),
);
