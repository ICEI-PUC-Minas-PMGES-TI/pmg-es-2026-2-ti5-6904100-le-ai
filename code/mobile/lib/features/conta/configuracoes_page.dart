import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_destrutivo.dart';
import '../../design/widgets/botao_textual.dart';
import '../auth/auth_service.dart';

/// Configurações (RF-AUT-06, acesso a RF-AUT-05 e RNF-SEC-42). Estrutura e cópia de
/// docs/design/periodo-1/F-AUT/configuracoes.md §4.
///
/// O bloco de identificação vem do `GET /me` (§4.5): enquanto carrega, e se falhar, fica o
/// skeleton, e o resto da tela continua utilizável, inclusive sair. **Sem e-mail**, como na web:
/// nenhuma resposta do `identidade` expõe o e-mail.
///
/// Sair sempre funciona do lado do aparelho (§4.3): quem recebe [aoSair] revoga no servidor como
/// melhor esforço e limpa a sessão; a guarda de rota leva ao login sozinha.
class ConfiguracoesPage extends StatefulWidget {
  final AuthService authService;
  final Future<void> Function() aoSair;
  final VoidCallback? aoVoltar;
  final VoidCallback? aoAlterarSenha;
  final VoidCallback? aoAbrirPolitica;

  const ConfiguracoesPage({
    super.key,
    required this.authService,
    required this.aoSair,
    this.aoVoltar,
    this.aoAlterarSenha,
    this.aoAbrirPolitica,
  });

  static const String versaoDoApp = '1.0.0';

  @override
  State<ConfiguracoesPage> createState() => _ConfiguracoesPageState();
}

class _ConfiguracoesPageState extends State<ConfiguracoesPage> {
  UsuarioResposta? _usuario;
  bool _saindo = false;

  @override
  void initState() {
    super.initState();
    _carregarUsuario();
  }

  Future<void> _carregarUsuario() async {
    try {
      final usuario = await widget.authService.buscarUsuarioAtual();
      if (mounted) {
        setState(() => _usuario = usuario);
      }
    } on Object {
      // Qualquer falha, de rede ou de corpo fora do contrato, mantém o skeleton (§4.5): a tela
      // não depende do bloco para funcionar, e sair continua possível.
    }
  }

  Future<void> _confirmarSaida() async {
    final confirmado = await showDialog<bool>(
      context: context,
      builder: (context) => const _DialogoDeSaida(),
    );
    if (confirmado != true || !mounted) {
      return;
    }
    setState(() => _saindo = true);
    await widget.aoSair();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: 'Configurações', aoVoltar: widget.aoVoltar),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.only(top: DesignTokens.space6, bottom: DesignTokens.space10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
                  child: _identificacao(theme),
                ),
                const SizedBox(height: DesignTokens.space6),
                Divider(height: 1, thickness: 1, color: theme.divider),
                _TituloDeGrupo(texto: 'Conta', theme: theme),
                _Linha(rotulo: 'Alterar senha', aoTocar: widget.aoAlterarSenha, theme: theme),
                _TituloDeGrupo(texto: 'Privacidade e dados', theme: theme),
                _Linha(
                  rotulo: 'Política de privacidade',
                  aoTocar: widget.aoAbrirPolitica,
                  theme: theme,
                ),
                const SizedBox(height: DesignTokens.space8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
                  child: BotaoDestrutivo(
                    texto: _saindo ? 'Saindo' : 'Sair da conta',
                    icone: PhosphorIconsRegular.signOut,
                    carregando: _saindo,
                    onPressed: _confirmarSaida,
                  ),
                ),
                if (_saindo) ...<Widget>[
                  const SizedBox(height: DesignTokens.space3),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
                    child: Text(
                      'O servidor está iniciando. Isso pode levar alguns segundos.',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    ),
                  ),
                ],
                const SizedBox(height: DesignTokens.space6),
                Text(
                  'Lê Ai · versão ${ConfiguracoesPage.versaoDoApp}',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _identificacao(ThemeData theme) {
    final usuario = _usuario;
    if (usuario == null) {
      // Skeleton estático, sem shimmer (§4.5).
      return ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            _Barra(altura: 17, fracao: 0.45, theme: theme),
            const SizedBox(height: DesignTokens.space2),
            _Barra(altura: 13, fracao: 0.30, theme: theme),
          ],
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(usuario.displayName, style: theme.textTheme.titleMedium),
        Text('@${usuario.username}', style: theme.textTheme.bodySmall),
      ],
    );
  }
}

class _Barra extends StatelessWidget {
  final double altura;
  final double fracao;
  final ThemeData theme;

  const _Barra({required this.altura, required this.fracao, required this.theme});

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      widthFactor: fracao,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: theme.coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
  }
}

class _TituloDeGrupo extends StatelessWidget {
  final String texto;
  final ThemeData theme;

  const _TituloDeGrupo({required this.texto, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space4,
        DesignTokens.space5,
        DesignTokens.space3,
      ),
      child: Semantics(header: true, child: Text(texto, style: theme.textTheme.labelMedium)),
    );
  }
}

/// Linha de navegação de 56px com `CaretRight` (§4 "Grupos de linhas"). Não é preferência: não
/// tem `switch`.
class _Linha extends StatelessWidget {
  final String rotulo;
  final VoidCallback? aoTocar;
  final ThemeData theme;

  const _Linha({required this.rotulo, required this.aoTocar, required this.theme});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      child: InkWell(
        onTap: aoTocar,
        splashFactory: NoSplash.splashFactory,
        child: Container(
          height: 56,
          padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.divider))),
          child: Row(
            children: <Widget>[
              Expanded(child: Text(rotulo, style: theme.textTheme.bodyMedium)),
              ExcludeSemantics(
                child: Icon(PhosphorIconsRegular.caretRight, size: 20, color: theme.tertiaryText),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Modal centrado de confirmação (§4.2, RNF-USA-04): card de 320px, título, texto e os dois
/// botões empilhados, destrutivo em cima. O foco começa em "Cancelar" (§9).
class _DialogoDeSaida extends StatelessWidget {
  const _DialogoDeSaida();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Dialog(
      backgroundColor: theme.elevatedSurface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DesignTokens.radiusLg)),
      insetPadding: const EdgeInsets.symmetric(horizontal: DesignTokens.space6),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: Padding(
          padding: const EdgeInsets.all(DesignTokens.space6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text('Sair da conta?', style: theme.textTheme.titleLarge),
              const SizedBox(height: DesignTokens.space3),
              Text(
                'Você vai precisar entrar de novo neste aparelho. Seus livros, leituras e '
                'resenhas continuam salvos.',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
              ),
              const SizedBox(height: DesignTokens.space6),
              BotaoDestrutivo(texto: 'Sair', onPressed: () => Navigator.of(context).pop(true)),
              const SizedBox(height: DesignTokens.space3),
              Focus(
                autofocus: true,
                child: BotaoTextual(
                  texto: 'Cancelar',
                  neutro: true,
                  larguraTotal: true,
                  onPressed: () => Navigator.of(context).pop(false),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
