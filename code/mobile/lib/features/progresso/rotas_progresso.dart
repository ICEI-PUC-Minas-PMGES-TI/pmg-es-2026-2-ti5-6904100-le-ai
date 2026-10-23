import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/api_client.dart';
import '../estante/estante_service.dart';
import '../sessao/armazem_da_sessao.dart';
import '../sessao/rotas_sessao.dart';
import '../sessao/sessao_controller.dart';
import 'fila_de_progresso.dart';
import 'progresso_page.dart';
import 'progresso_service.dart';
import 'registrar_progresso.dart';
import 'registro_progresso_controller.dart';

class DependenciasDeProgresso {
  final ProgressoService servico;
  final FilaDeProgresso fila;
  final SessaoController? sessao;

  const DependenciasDeProgresso({required this.servico, required this.fila, this.sessao});

  factory DependenciasDeProgresso.padrao(ApiClient client) {
    final servico = ProgressoService(client);
    final fila = FilaDeProgresso(servico, ArmazemDaFilaEmPreferencias());
    return DependenciasDeProgresso(
      servico: servico,
      fila: fila,
      sessao: SessaoController(ArmazemDaSessaoEmPreferencias(), servico, fila: fila),
    );
  }
}

LeituraDoRegistro? _leituraDoRegistro(Leitura leitura, LivroDaEstante livro) {
  final totalPaginas = leitura.totalPaginas;
  if (totalPaginas == null) {
    return null;
  }
  return LeituraDoRegistro(
    leituraId: leitura.id,
    titulo: livro.titulo,
    autor: livro.autor,
    capaUrl: livro.capaUrl,
    paginaAtual: leitura.paginaAtual,
    totalPaginas: totalPaginas,
  );
}

Future<ResultadoDoRegistro?> registrarProgressoDaLeitura(
  BuildContext context, {
  required DependenciasDeProgresso progresso,
  required Leitura leitura,
  required LivroDaEstante livro,
}) async {
  final doRegistro = _leituraDoRegistro(leitura, livro);
  if (doRegistro == null) {
    return null;
  }
  return abrirRegistroDeProgresso(
    context,
    servico: progresso.servico,
    fila: progresso.fila,
    leitura: doRegistro,
    aoIniciarSessao: aoIniciarSessaoDaLeitura(
      context,
      progresso: progresso,
      leitura: leitura,
      livro: livro,
    ),
  );
}

VoidCallback? aoIniciarSessaoDaLeitura(
  BuildContext context, {
  required DependenciasDeProgresso progresso,
  required Leitura leitura,
  required LivroDaEstante livro,
}) {
  final sessao = progresso.sessao;
  final doRegistro = _leituraDoRegistro(leitura, livro);
  if (sessao == null || doRegistro == null || !leitura.status.emAndamento) {
    return null;
  }
  return () => sessao.iniciar(doRegistro, status: leitura.status, origem: localAtual(context));
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
