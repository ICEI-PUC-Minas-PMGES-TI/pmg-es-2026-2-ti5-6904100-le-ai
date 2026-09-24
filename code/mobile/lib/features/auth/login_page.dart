import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../core/session/session_controller.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/campo_senha.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/logo_leai.dart';
import 'auth_service.dart';

/// Login (RF-AUT-02/03). Estrutura e cópia de docs/design/periodo-0/P0-NAV/login.md §4.
class LoginPage extends StatefulWidget {
  final AuthService authService;
  final SessionController sessionController;

  /// Chamado depois que a sessão é iniciada com sucesso. Quem decide para onde navegar é o
  /// go_router (Etapa 13) — esta tela não conhece rota nenhuma.
  final VoidCallback? aoEntrar;

  /// Chamado ao tocar em "Criar conta", no rodapé.
  final VoidCallback? aoIrParaCadastro;

  const LoginPage({
    super.key,
    required this.authService,
    required this.sessionController,
    this.aoEntrar,
    this.aoIrParaCadastro,
  });

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _identificadorController = TextEditingController();
  final _senhaController = TextEditingController();

  String? _erroIdentificador;
  String? _erroSenha;

  // Credencial inválida (§4.2): os dois campos ganham a borda, sem legenda própria — o banner
  // já diz o que houve.
  bool _bordaDeErroCredencial = false;

  String? _bannerErro;

  // Bloqueio progressivo (§4.3) é alerta (ambar), não erro (rubi) — banner e botão diferentes.
  bool _bloqueado = false;
  bool _enviando = false;

  @override
  void initState() {
    super.initState();
    // O servidor não devolve quando o bloqueio expira (sem Retry-After), e o protótipo proíbe
    // contagem regressiva; editar qualquer campo é o sinal de que a pessoa quer tentar de
    // novo, e é o único jeito de sair do bloqueio sem reabrir a tela.
    _identificadorController.addListener(_liberarBloqueioAoEditar);
    _senhaController.addListener(_liberarBloqueioAoEditar);
  }

  @override
  void dispose() {
    _identificadorController.removeListener(_liberarBloqueioAoEditar);
    _senhaController.removeListener(_liberarBloqueioAoEditar);
    _identificadorController.dispose();
    _senhaController.dispose();
    super.dispose();
  }

  void _liberarBloqueioAoEditar() {
    if (_bloqueado) {
      setState(() {
        _bloqueado = false;
        _bannerErro = null;
      });
    }
  }

  bool _validarCliente() {
    setState(() {
      _erroIdentificador = _identificadorController.text.trim().isEmpty
          ? 'Informe seu e-mail ou nome de usuário.'
          : null;
      _erroSenha = _senhaController.text.isEmpty
          ? 'Informe sua senha.'
          : null;
    });
    return _erroIdentificador == null && _erroSenha == null;
  }

  void _tratarErro(ApiException erro) {
    setState(() {
      if (erro.codigo == 'MUITAS_REQUISICOES') {
        _bloqueado = true;
        _bannerErro = erro.message;
        return;
      }
      if (erro.codigo == 'NAO_AUTENTICADO') {
        _bordaDeErroCredencial = true;
        _bannerErro = erro.message;
        // Identificador fica; senha é limpa (login.md §4.2) — o mesmo padrão de qualquer
        // login que não revela qual dos dois campos era o errado.
        _senhaController.clear();
        return;
      }
      _bannerErro = erro.message;
    });
  }

  Future<void> _enviar() async {
    setState(() {
      _bannerErro = null;
      _bordaDeErroCredencial = false;
    });
    if (!_validarCliente()) {
      return;
    }

    setState(() => _enviando = true);
    try {
      final sessao = await widget.authService.entrar(
        identificador: _identificadorController.text.trim(),
        senha: _senhaController.text,
      );
      await widget.sessionController.entrar(
        sessao.accessToken,
        refreshToken: sessao.refreshToken,
      );
      if (!mounted) {
        return;
      }
      widget.aoEntrar?.call();
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      _tratarErro(erro);
    } finally {
      if (mounted) {
        setState(() => _enviando = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.pageBackground,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const SizedBox(height: DesignTokens.space10),
              const LogoLeAi(altura: 24),
              const SizedBox(height: DesignTokens.space10),
              Text('Entrar', style: theme.displayTitle),
              const SizedBox(height: DesignTokens.space8),
              if (_bannerErro != null) ...<Widget>[
                BannerAviso(
                  variante: _bloqueado ? VarianteAviso.alerta : VarianteAviso.erro,
                  mensagem: _bannerErro!,
                ),
                const SizedBox(height: DesignTokens.space6),
              ],
              IgnorePointer(
                ignoring: _enviando,
                child: AnimatedOpacity(
                  opacity: _enviando ? 0.6 : 1,
                  duration: DesignTokens.durFast,
                  child: Column(
                    children: <Widget>[
                      CampoTexto(
                        controller: _identificadorController,
                        label: 'E-mail ou nome de usuário',
                        autofillHints: const <String>[AutofillHints.username],
                        erro: _erroIdentificador,
                        bordaDeErro: _bordaDeErroCredencial,
                        enabled: !_enviando,
                      ),
                      const SizedBox(height: DesignTokens.space5),
                      CampoSenha(
                        controller: _senhaController,
                        label: 'Senha',
                        autofillHints: const <String>[
                          AutofillHints.password,
                        ],
                        erro: _erroSenha,
                        bordaDeErro: _bordaDeErroCredencial,
                        enabled: !_enviando,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: DesignTokens.space8),
              BotaoPrimario(
                texto: _enviando ? 'Entrando' : 'Entrar',
                carregando: _enviando,
                onPressed: _bloqueado ? null : _enviar,
              ),
              if (_enviando) ...<Widget>[
                const SizedBox(height: DesignTokens.space3),
                Text(
                  'O servidor está iniciando. Isso pode levar alguns segundos.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.secondaryText,
                  ),
                ),
              ],
              const SizedBox(height: DesignTokens.space5),
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                children: <Widget>[
                  Text(
                    'Ainda não tem conta? ',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.secondaryText,
                    ),
                  ),
                  TextButton(
                    onPressed: widget.aoIrParaCadastro,
                    style: TextButton.styleFrom(padding: EdgeInsets.zero),
                    child: Text(
                      'Criar conta',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.primaryAccent,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: DesignTokens.space10),
            ],
          ),
        ),
      ),
    );
  }
}
