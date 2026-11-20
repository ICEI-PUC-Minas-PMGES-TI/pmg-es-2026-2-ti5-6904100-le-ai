import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import '../perfil/rotas_perfil.dart';
import '../progresso/fila_de_progresso.dart';
import 'calendario_da_sequencia_page.dart';
import 'sequencia_service.dart';

/// O calendário mora sob a aba Perfil (calendario-de-sequencia.md §1): empilhado sobre o Meu
/// perfil, com `Perfil` ativo na barra inferior.
const String rotaCalendarioDaSequencia = '/perfil/sequencia';

/// Sub-rota `sequencia` de `/perfil`. [fila] alimenta a linha de registros não enviados do estado
/// sem conexão; [alteracoes] é o `ProgressoService.alteracoes`.
GoRoute rotaDoCalendarioDaSequencia(
  SequenciaService servico, {
  FilaDeProgresso? fila,
  ValueListenable<int>? alteracoes,
}) => GoRoute(
  path: 'sequencia',
  builder: (context, state) => CalendarioDaSequenciaPage(
    servico: servico,
    fila: fila,
    alteracoes: alteracoes,
    aoVoltar: () => context.canPop() ? context.pop() : context.go(rotaPerfilRaiz),
  ),
);
