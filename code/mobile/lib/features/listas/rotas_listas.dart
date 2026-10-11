import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../perfil/perfil_service.dart';
import '../perfil/rotas_perfil.dart';
import 'lista_page.dart';
import 'listas_do_leitor_page.dart';
import 'listas_do_perfil.dart';
import 'listas_service.dart';

/// As listas do próprio leitor moram sob a aba Perfil; as de outro leitor, sob o perfil dele, na
/// aba de onde se chegou (`/perfil/leitores/:username` ou `/feed/leitores/:username`). A rota de
/// outro leitor guarda o username para o bloco de restrição: o 403 não diz de quem é a lista.
const String rotaMinhasListas = '/perfil/listas';

String rotaMinhaLista(String id) => '$rotaMinhasListas/${Uri.encodeComponent(id)}';

String rotaListasDoLeitor(String raiz, String username) =>
    '$raiz/leitores/${Uri.encodeComponent(username)}/listas';

String rotaListaDoLeitor(String raiz, String username, String id) =>
    '${rotaListasDoLeitor(raiz, username)}/${Uri.encodeComponent(id)}';

/// O que as telas de F-LST precisam do mundo lá fora, no molde de `DependenciasDeFeed`. Um único
/// [servico] para o app inteiro: o aviso de `alteracoes` é o que faz a seção do perfil e a lista
/// aberta recarregarem quando um livro entra pela página dele.
class DependenciasDeListas {
  final ListasService servico;

  /// Perfil do `identidade`: a privacidade do próprio leitor (linhas de visibilidade) e o nome do
  /// dono das listas de outro leitor.
  final PerfilService perfil;

  const DependenciasDeListas({required this.servico, required this.perfil});

  factory DependenciasDeListas.padrao({
    required PerfilService perfil,
    required String? Function() getToken,
    Future<bool> Function(String tokenQueFalhou)? renovarSessao,
  }) {
    return DependenciasDeListas(
      servico: ListasService(
        ApiClient(
          baseUrl: AppConfig.socialBaseUrl,
          getToken: getToken,
          renovarSessao: renovarSessao,
        ),
      ),
      perfil: perfil,
    );
  }

  /// A lista segue o perfil (RN-08), e o `social` não devolve a privacidade do dono.
  Future<Privacidade> minhaPrivacidade() async => (await perfil.obterMeuPerfil()).privacidade;
}

void _voltar(BuildContext context, String destino) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(destino);
  }
}

/// Página do livro a partir de um item. Livro pessoal visto por terceiro vai com `via=lista` e a
/// lista como referência (RN-15). **O dono vai sem via:** o `acervo` libera o dono sem olhar a via
/// (contorno de antes da etapa 3 da F-LST, que ficou por ser inofensivo). O livro oficial abre
/// na própria aba de origem, Perfil ou Feed (pagina-do-livro.md §4.1).
void _abrirLivro(
  BuildContext context,
  String raiz,
  LivroDaLista livro,
  String listaId,
  bool dono,
) {
  if (livro.pessoal) {
    final base = '$raiz/livro-pessoal/${Uri.encodeComponent(livro.id)}';
    context.push(
      dono ? base : '$base?via=lista&referenciaId=${Uri.encodeQueryComponent(listaId)}',
    );
  } else {
    context.push('$raiz/livro/${Uri.encodeComponent(livro.id)}');
  }
}

/// Índice e lista do próprio leitor, sob `/perfil`.
List<RouteBase> rotasDasMinhasListas(DependenciasDeListas deps) => <RouteBase>[
  GoRoute(
    path: 'listas',
    builder: (context, state) => ListasDoLeitorPage(
      servico: deps.servico,
      perfil: deps.perfil,
      aoVoltar: () => _voltar(context, rotaPerfilRaiz),
      aoAbrirLista: (id) => context.push(rotaMinhaLista(id)),
    ),
    routes: <RouteBase>[
      GoRoute(
        path: ':id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ListaPage(
            key: ValueKey<String>('lista-$id'),
            servico: deps.servico,
            perfil: deps.perfil,
            listaId: id,
            aoVoltar: () => _voltar(context, rotaMinhasListas),
            aoAbrirLivro: (livro, dono) => _abrirLivro(context, rotaPerfilRaiz, livro, id, dono),
            aoAbrirPerfil: (username) => context.push(rotaPerfilDeOutro(username)),
            aoBuscarLivros: () => context.go('/descobrir'),
          );
        },
      ),
    ],
  ),
];

/// Índice e lista de outro leitor, sob `leitores/:username` da aba [raiz].
List<RouteBase> rotasDasListasDoLeitor(DependenciasDeListas deps, {required String raiz}) {
  void abrirPerfil(BuildContext context, String username) =>
      context.go('$raiz/leitores/${Uri.encodeComponent(username)}');
  return <RouteBase>[
    GoRoute(
      path: 'listas',
      builder: (context, state) {
        final username = state.pathParameters['username']!;
        return ListasDoLeitorPage(
          key: ValueKey<String>('listas-de-$username'),
          servico: deps.servico,
          perfil: deps.perfil,
          username: username,
          aoVoltar: () => _voltar(context, '$raiz/leitores/${Uri.encodeComponent(username)}'),
          aoAbrirLista: (id) => context.push(rotaListaDoLeitor(raiz, username, id)),
          aoAbrirPerfil: (outro) => abrirPerfil(context, outro),
        );
      },
      routes: <RouteBase>[
        GoRoute(
          path: ':id',
          builder: (context, state) {
            final username = state.pathParameters['username']!;
            final id = state.pathParameters['id']!;
            return ListaPage(
              key: ValueKey<String>('lista-$id'),
              servico: deps.servico,
              perfil: deps.perfil,
              listaId: id,
              usernameDoDono: username,
              aoVoltar: () => _voltar(context, rotaListasDoLeitor(raiz, username)),
              aoAbrirLivro: (livro, dono) => _abrirLivro(context, raiz, livro, id, dono),
              aoAbrirPerfil: (outro) => abrirPerfil(context, outro),
              aoBuscarLivros: () => context.go('/descobrir'),
            );
          },
        ),
      ],
    ),
  ];
}

/// Seção `Listas` do meu perfil.
Widget secaoDasMinhasListas(BuildContext context, DependenciasDeListas deps, String usuarioId) {
  return ListasDoPerfil(
    key: ValueKey<String>('listas-do-perfil-$usuarioId'),
    servico: deps.servico,
    usuarioId: usuarioId,
    proprio: true,
    obterPrivacidade: deps.minhaPrivacidade,
    aoVerTodas: () => context.push(rotaMinhasListas),
    aoAbrirLista: (id) => context.push(rotaMinhaLista(id)),
  );
}

/// Seção `Listas` do perfil de outro leitor, na aba [raiz].
Widget secaoDasListasDoLeitor(
  BuildContext context,
  DependenciasDeListas deps, {
  required String raiz,
  required String username,
  required String usuarioId,
  required String nome,
}) {
  return ListasDoPerfil(
    key: ValueKey<String>('listas-do-perfil-$usuarioId'),
    servico: deps.servico,
    usuarioId: usuarioId,
    proprio: false,
    nome: nome,
    aoVerTodas: () => context.push(rotaListasDoLeitor(raiz, username)),
    aoAbrirLista: (id) => context.push(rotaListaDoLeitor(raiz, username, id)),
  );
}
