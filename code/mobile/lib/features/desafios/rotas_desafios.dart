import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../perfil/rotas_perfil.dart';
import 'desafio_form_page.dart';
import 'desafios_do_perfil.dart';
import 'desafios_page.dart';
import 'desafios_service.dart';

/// Os desafios moram sob a aba Perfil (desafios.md §2): a lista, a criação e a edição ficam
/// empilhadas sobre ela, com `Perfil` ativo na barra inferior.
const String rotaDesafios = '/perfil/desafios';
const String rotaNovoDesafio = '$rotaDesafios/novo';

String rotaEditarDesafio(String id) => '$rotaDesafios/${Uri.encodeComponent(id)}/editar';

/// O que as telas de F-DSF precisam do mundo lá fora. Um único [servico] para o app inteiro: o
/// aviso de `alteracoes` é o que faz o bloco do perfil e a lista recarregarem depois de uma
/// escrita. [alteracoesDeLeitura] junta os avisos de progresso e de leitura (estante), que mexem
/// no acumulado.
class DependenciasDeDesafios {
  final DesafiosService servico;
  final Listenable? alteracoesDeLeitura;

  const DependenciasDeDesafios({required this.servico, this.alteracoesDeLeitura});

  factory DependenciasDeDesafios.comAvisos(
    DesafiosService servico,
    List<ValueListenable<int>> avisos,
  ) => DependenciasDeDesafios(
    servico: servico,
    alteracoesDeLeitura: avisos.isEmpty ? null : Listenable.merge(avisos),
  );
}

void _voltar(BuildContext context, String destino) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(destino);
  }
}

/// Lista, criação e edição, sob `/perfil`. A edição recebe o desafio por `extra`: o contrato não
/// tem `GET /desafios/{id}`, e quem edita sempre parte da lista. Sem ele (rota aberta direto),
/// volta para a lista.
List<RouteBase> rotasDosDesafios(DependenciasDeDesafios deps) => <RouteBase>[
  GoRoute(
    path: 'desafios',
    builder: (context, state) => DesafiosPage(
      servico: deps.servico,
      alteracoesDeLeitura: deps.alteracoesDeLeitura,
      aoVoltar: () => _voltar(context, rotaPerfilRaiz),
      aoCriar: () => context.push(rotaNovoDesafio),
      aoEditar: (desafio) => context.push(rotaEditarDesafio(desafio.id), extra: desafio),
    ),
    routes: <RouteBase>[
      GoRoute(
        path: 'novo',
        builder: (context, state) => DesafioFormPage(
          servico: deps.servico,
          aoConcluir: () => _voltar(context, rotaDesafios),
        ),
      ),
      GoRoute(
        path: ':id/editar',
        redirect: (context, state) => state.extra is Desafio ? null : rotaDesafios,
        builder: (context, state) {
          final desafio = state.extra! as Desafio;
          return DesafioFormPage(
            key: ValueKey<String>('editar-desafio-${desafio.id}'),
            servico: deps.servico,
            desafio: desafio,
            aoConcluir: () => _voltar(context, rotaDesafios),
          );
        },
      ),
    ],
  ),
];

/// Bloco `Desafios` do meu perfil. `Novo desafio` do vazio abre a criação sobre o perfil.
Widget secaoDosDesafios(BuildContext context, DependenciasDeDesafios deps) {
  return DesafiosDoPerfil(
    servico: deps.servico,
    alteracoesDeLeitura: deps.alteracoesDeLeitura,
    aoVerTodos: () => context.push(rotaDesafios),
    aoCriar: () => context.push(rotaNovoDesafio),
  );
}
