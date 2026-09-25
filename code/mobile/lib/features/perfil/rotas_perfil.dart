import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../livros/capa.dart';
import 'avatar.dart';
import 'editar_perfil_page.dart';
import 'perfil_service.dart';

const String rotaPerfilRaiz = '/perfil';
const String rotaEditarPerfil = '/perfil/editar';

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

/// Sub-rotas da aba Perfil de F-PERFIL. As de F-AUT (configurações) continuam em `router.dart`.
List<RouteBase> rotasDoPerfil(DependenciasDePerfil deps) => <RouteBase>[
  GoRoute(
    path: 'editar',
    builder: (context, state) => EditarPerfilPage(
      servico: deps.servico,
      seletor: deps.seletor,
      enviador: deps.enviador,
      aoSair: () => context.canPop() ? context.pop() : context.go(rotaPerfilRaiz),
    ),
  ),
];
