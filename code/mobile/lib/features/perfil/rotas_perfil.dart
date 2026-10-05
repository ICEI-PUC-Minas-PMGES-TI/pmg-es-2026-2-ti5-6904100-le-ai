import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../estante/estante_service.dart';
import '../listas/rotas_listas.dart';
import '../livros/capa.dart';
import 'avatar.dart';
import 'buscar_leitor_page.dart';
import 'conexoes_page.dart';
import 'editar_perfil_page.dart';
import 'perfil_de_outro_page.dart';
import 'perfil_service.dart';
import 'solicitacoes_page.dart';

const String rotaPerfilRaiz = '/perfil';
const String rotaEditarPerfil = '/perfil/editar';
const String rotaBuscarLeitor = '/perfil/buscar';
const String rotaSolicitacoes = '/perfil/solicitacoes';

String rotaConexoes(AbaDeConexoes aba) =>
    '/perfil/conexoes?aba=${aba == AbaDeConexoes.seguidos ? 'seguidos' : 'seguidores'}';

/// Perfil de outro leitor, dentro da aba Perfil: chega da busca, das listas e da caixa.
String rotaPerfilDeOutro(String username) => '/perfil/leitores/${Uri.encodeComponent(username)}';

/// O que as telas de F-PERFIL precisam do mundo lá fora, no molde de `DependenciasDeLivros`:
/// construído uma vez e injetado no roteador; os testes montam o seu com clientes simulados.
class DependenciasDePerfil {
  final PerfilService servico;
  final SeletorDeImagem seletor;
  final EnviadorDeAvatar enviador;

  const DependenciasDePerfil({
    required this.servico,
    required this.seletor,
    required this.enviador,
  });

  factory DependenciasDePerfil.padrao({
    required String? Function() getToken,
    Future<bool> Function(String tokenQueFalhou)? renovarSessao,
  }) {
    return DependenciasDePerfil(
      servico: PerfilService(
        ApiClient(
          baseUrl: AppConfig.identidadeBaseUrl,
          getToken: getToken,
          renovarSessao: renovarSessao,
        ),
      ),
      seletor: SeletorDaGaleria(),
      enviador: EnviadorDeAvatarCloudinary(
        EnviadorCloudinary(
          cloudName: AppConfig.cloudinaryCloudName,
          uploadPreset: AppConfig.cloudinaryAvatarPreset,
        ),
      ),
    );
  }
}

void _voltar(BuildContext context) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(rotaPerfilRaiz);
  }
}

/// Sub-rotas da aba Perfil de F-PERFIL. As de F-AUT (configurações) continuam em `router.dart`.
///
/// [resenhasDeOutro] monta a lista de resenhas do perfil de outro leitor (F-AVA). Com [listas]
/// (F-LST), entram o índice e a lista do próprio leitor, a seção `Listas` do perfil de outro
/// leitor e as listas dele.
List<RouteBase> rotasDoPerfil(
  DependenciasDePerfil deps, {
  EstanteService? estante,
  Widget Function(BuildContext context, String usuarioId, String nome)? resenhasDeOutro,
  DependenciasDeListas? listas,
}) => <RouteBase>[
  if (listas != null) ...rotasDasMinhasListas(listas),
  GoRoute(
    path: 'editar',
    builder: (context, state) => EditarPerfilPage(
      servico: deps.servico,
      seletor: deps.seletor,
      enviador: deps.enviador,
      aoSair: () => _voltar(context),
      // `push`: a edição fica por baixo, com o que foi digitado, e volta com a seta.
      aoVerSeguidores: () => context.push(rotaConexoes(AbaDeConexoes.seguidores)),
    ),
  ),
  GoRoute(
    path: 'buscar',
    builder: (context, state) => BuscarLeitorPage(
      servico: deps.servico,
      aoVoltar: () => _voltar(context),
      aoAbrirPerfil: (username) => context.push(rotaPerfilDeOutro(username)),
    ),
  ),
  GoRoute(
    path: 'conexoes',
    builder: (context, state) => ConexoesPage(
      servico: deps.servico,
      abaInicial: state.uri.queryParameters['aba'] == 'seguidos'
          ? AbaDeConexoes.seguidos
          : AbaDeConexoes.seguidores,
      aoVoltar: () => _voltar(context),
      aoAbrirPerfil: (username) => context.push(rotaPerfilDeOutro(username)),
      aoBuscarLeitor: () => context.push(rotaBuscarLeitor),
    ),
  ),
  GoRoute(
    path: 'solicitacoes',
    builder: (context, state) => SolicitacoesPage(
      servico: deps.servico,
      aoVoltar: () => _voltar(context),
      aoAbrirPerfil: (username) => context.push(rotaPerfilDeOutro(username)),
      aoEditarPerfil: () => context.push(rotaEditarPerfil),
    ),
  ),
  GoRoute(
    path: 'leitores/:username',
    builder: (context, state) {
      final username = state.pathParameters['username']!;
      return PerfilDeOutroPage(
        // A chave pelo username faz a página recarregar se a rota trocar de leitor.
        key: ValueKey<String>('perfil-de-$username'),
        servico: deps.servico,
        username: username,
        aoVoltar: () => _voltar(context),
        aoAbrirProprioPerfil: () => context.go(rotaPerfilRaiz),
        aoBuscarLeitor: () => context.push(rotaBuscarLeitor),
        aoAbrirSolicitacoes: () => context.push(rotaSolicitacoes),
        estante: estante,
        resenhas: resenhasDeOutro == null
            ? null
            : (usuarioId, nome) => resenhasDeOutro(context, usuarioId, nome),
        listas: listas == null
            ? null
            : (usuarioId, nome) => secaoDasListasDoLeitor(
                context,
                listas,
                raiz: rotaPerfilRaiz,
                username: username,
                usuarioId: usuarioId,
                nome: nome,
              ),
      );
    },
    routes: <RouteBase>[
      if (listas != null) ...rotasDasListasDoLeitor(listas, raiz: rotaPerfilRaiz),
    ],
  ),
];
