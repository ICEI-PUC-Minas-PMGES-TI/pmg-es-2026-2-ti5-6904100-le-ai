import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import 'perfil_service.dart';
import 'widgets_de_perfil.dart';

/// Meu perfil (RF-SOC-01, RF-SOC-04), a partir de docs/design/periodo-1/F-PERFIL/meu-perfil.md
/// §4: identidade centralizada, chip de privacidade, biografia em até três linhas, `Editar
/// perfil` e os contadores numa linha com divisor. O header (título `Perfil` e engrenagem) é do
/// shell.
///
/// **Sem estante, resenhas e o contador `livros lidos`**: vêm de `leitura`
/// (`listarEstantePerfil`, `listarResenhasPerfil`), ainda `planned`. Desenhar o vazio diria "você
/// não tem livros" a quem tem. Entram com F-EST e F-AVA, como na web.
class PerfilPage extends StatefulWidget {
  final PerfilService servico;

  /// Abre a edição; ao voltar, o perfil é relido.
  final Future<void> Function()? aoEditar;

  const PerfilPage({super.key, required this.servico, this.aoEditar});

  @override
  State<PerfilPage> createState() => _PerfilPageState();
}

class _PerfilPageState extends State<PerfilPage> {
  Perfil? _perfil;
  bool _carregando = true;
  bool _falhou = false;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar() async {
    setState(() {
      _carregando = true;
      _falhou = false;
    });
    try {
      final perfil = await widget.servico.obterMeuPerfil();
      if (mounted) {
        setState(() {
          _perfil = perfil;
          _carregando = false;
        });
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _carregando = false;
          _falhou = true;
        });
      }
    }
  }

  Future<void> _editar() async {
    await widget.aoEditar?.call();
    if (mounted) {
      await _carregar();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final perfil = _perfil;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space6,
        DesignTokens.space5,
        DesignTokens.space10,
      ),
      child: _carregando && perfil == null
          ? const SkeletonDeIdentidade()
          : _falhou || perfil == null
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const BannerAviso(
                  variante: VarianteAviso.erro,
                  mensagem: 'Não foi possível carregar seu perfil. Verifique sua conexão e tente de novo.',
                ),
                const SizedBox(height: DesignTokens.space2),
                BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
              ],
            )
          : Column(
              children: <Widget>[
                AvatarLeitor(url: perfil.avatarUrl, tamanho: 96),
                const SizedBox(height: DesignTokens.space4),
                Text(perfil.displayName, style: theme.displayTitle, textAlign: TextAlign.center),
                const SizedBox(height: DesignTokens.space1),
                Text(
                  '@${perfil.username}',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
                ),
                const SizedBox(height: DesignTokens.space3),
                ChipPrivacidade(privacidade: perfil.privacidade),
                if (perfil.privacidade == Privacidade.privado) ...<Widget>[
                  const SizedBox(height: DesignTokens.space2),
                  Text(
                    'Só quem você aceita vê sua estante e suas resenhas.',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (perfil.biografia != null) ...<Widget>[
                  const SizedBox(height: DesignTokens.space4),
                  Text(
                    perfil.biografia!,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                  ),
                ],
                const SizedBox(height: DesignTokens.space5),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 240),
                  child: SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: OutlinedButton(
                      onPressed: widget.aoEditar == null ? null : _editar,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: theme.colorScheme.onSurface,
                        side: BorderSide(color: theme.divider),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(DesignTokens.radius),
                        ),
                        textStyle: theme.textTheme.labelLarge,
                      ),
                      child: const Text('Editar perfil'),
                    ),
                  ),
                ),
                const SizedBox(height: DesignTokens.space6),
                LinhaDeContadores(
                  contadores: <ContadorDePerfil>[
                    ContadorDePerfil(
                      valor: perfil.seguidores,
                      rotulo: perfil.seguidores == 1 ? 'seguidor' : 'seguidores',
                    ),
                    ContadorDePerfil(valor: perfil.seguidos, rotulo: 'seguindo'),
                  ],
                ),
              ],
            ),
    );
  }
}
