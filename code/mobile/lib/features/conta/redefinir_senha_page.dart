import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../core/session/session_controller.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_senha.dart';
import '../../design/widgets/estado_terminal.dart';
import '../../design/widgets/logo_leai.dart';
import '../auth/auth_service.dart';
import 'aviso_de_sessoes.dart';
import 'validacao_de_senha.dart';

enum _Estado { formulario, sucesso, linkInvalido }

/// Redefinir senha pelo link do e-mail (RF-AUT-04). Estrutura e cópia de
/// docs/design/periodo-1/F-AUT/redefinir-senha.md §4, mesma lógica da web
/// (`RedefinirSenhaView.vue`).
///
/// O [token] vem do fragmento do link (`/redefinir-senha#token=...`), entregue pelo router.
/// Sem token, vencido, usado ou adulterado é o mesmo estado de tela inteira (§4.6). Nada da conta
/// aparece.
class RedefinirSenhaPage extends StatefulWidget {
  final String? token;
  final AuthService authService;
  final SessionController sessionController;
  final VoidCallback? aoIrParaLogin;
  final VoidCallback? aoPedirNovoLink;

  const RedefinirSenhaPage({
    super.key,
    required this.token,
    required this.authService,
    required this.sessionController,
    this.aoIrParaLogin,
    this.aoPedirNovoLink,
  });

  @override
  State<RedefinirSenhaPage> createState() => _RedefinirSenhaPageState();
}

class _RedefinirSenhaPageState extends State<RedefinirSenhaPage> {
  final _novaController = TextEditingController();
  final _confirmacaoController = TextEditingController();
  final _chave = ChaveDaIntencao();

  late _Estado _estado;
  String? _erroNova;
  String? _erroConfirmacao;
  String? _bannerErro;
  bool _salvando = false;

  @override
  void initState() {
    super.initState();
    final token = widget.token;
    _estado = token == null || token.trim().isEmpty ? _Estado.linkInvalido : _Estado.formulario;
  }

  @override
  void dispose() {
    _novaController.dispose();
    _confirmacaoController.dispose();
    super.dispose();
  }

  Future<void> _salvar() async {
    final erros = validarSenhaNova(_novaController.text, _confirmacaoController.text);
    setState(() {
      _erroNova = erros.nova;
      _erroConfirmacao = erros.confirmacao;
      _bannerErro = null;
    });
    if (erros.nova != null || erros.confirmacao != null) {
      return;
    }

    final token = widget.token!;
    final nova = _novaController.text;
    setState(() => _salvando = true);
    try {
      await widget.authService.redefinirSenha(
        token: token,
        novaSenha: nova,
        idempotencyKey: _chave.para('$token\u0000$nova', ApiClient.newIdempotencyKey),
      );
      // O servidor revogou todas as renovações da conta. Se o aparelho tinha sessão, ela não
      // renova mais; limpar agora evita que o login mande direto para dentro.
      if (widget.sessionController.estaAutenticado) {
        await widget.sessionController.sair();
      }
      if (mounted) {
        setState(() => _estado = _Estado.sucesso);
      }
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      setState(() {
        if (erro.status == 410) {
          _estado = _Estado.linkInvalido;
        } else if (erro.status == 400) {
          // A mensagem é a da política do servidor (curta ou comum), que é a do protótipo.
          _erroNova = erro.message;
        } else {
          _bannerErro = erro.message;
        }
      });
    } finally {
      if (mounted) {
        setState(() => _salvando = false);
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
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const SizedBox(height: DesignTokens.space12),
              const Align(alignment: Alignment.centerLeft, child: LogoLeAi(altura: 24)),
              const SizedBox(height: DesignTokens.space10),
              ...switch (_estado) {
                _Estado.sucesso => <Widget>[
                  EstadoTerminal(
                    icone: PhosphorIconsRegular.checkCircle,
                    titulo: 'Senha alterada',
                    paragrafos: const <String>[
                      'Você já pode entrar com a senha nova. Por segurança, encerramos a sessão '
                          'nos outros aparelhos.',
                    ],
                    acoes: <Widget>[BotaoPrimario(texto: 'Entrar', onPressed: widget.aoIrParaLogin)],
                  ),
                ],
                _Estado.linkInvalido => <Widget>[
                  EstadoTerminal(
                    icone: PhosphorIconsRegular.clockCounterClockwise,
                    alerta: true,
                    titulo: 'Este link não vale mais',
                    paragrafos: const <String>[
                      'O link de recuperação vale por 1 hora e só pode ser usado uma vez. Peça '
                          'um link novo para continuar.',
                    ],
                    acoes: <Widget>[
                      BotaoPrimario(texto: 'Pedir novo link', onPressed: widget.aoPedirNovoLink),
                      BotaoTextual(
                        texto: 'Voltar para entrar',
                        larguraTotal: true,
                        onPressed: widget.aoIrParaLogin,
                      ),
                    ],
                  ),
                ],
                _Estado.formulario => _formulario(theme),
              },
              const SizedBox(height: DesignTokens.space10),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _formulario(ThemeData theme) {
    return <Widget>[
      Text('Criar uma senha nova', style: theme.displayTitle),
      const SizedBox(height: DesignTokens.space4),
      Text(
        'Escolha a senha que você vai usar para entrar.',
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
      ),
      const SizedBox(height: DesignTokens.space8),
      if (_bannerErro != null) ...<Widget>[
        BannerAviso(variante: VarianteAviso.erro, mensagem: _bannerErro!),
        const SizedBox(height: DesignTokens.space6),
      ],
      AnimatedOpacity(
        opacity: _salvando ? 0.5 : 1,
        duration: DesignTokens.durFast,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            CampoSenha(
              controller: _novaController,
              label: 'Nova senha',
              autofillHints: const <String>[AutofillHints.newPassword],
              erro: _erroNova,
              erroAntesDoHelper: true,
              helper: 'Mínimo de 8 caracteres. Evite senhas comuns, como sequências e o seu nome.',
              enabled: !_salvando,
              onChanged: (_) {
                if (_erroNova != null) {
                  setState(() => _erroNova = null);
                }
              },
            ),
            const SizedBox(height: DesignTokens.space5),
            CampoSenha(
              controller: _confirmacaoController,
              label: 'Confirmar nova senha',
              autofillHints: const <String>[AutofillHints.newPassword],
              erro: _erroConfirmacao,
              erroAntesDoHelper: true,
              enabled: !_salvando,
              onChanged: (_) {
                if (_erroConfirmacao != null) {
                  setState(() => _erroConfirmacao = null);
                }
              },
            ),
          ],
        ),
      ),
      // Depois da confirmação e fora do esmaecido do envio, como no protótipo.
      const SizedBox(height: DesignTokens.space4),
      AvisoDeSessoes(theme: theme),
      const SizedBox(height: DesignTokens.space8),
      BotaoPrimario(
        texto: _salvando ? 'Salvando' : 'Salvar senha',
        carregando: _salvando,
        carregandoEsmaecido: true,
        // Com erro de política o botão fica desabilitado até a pessoa mexer na senha (§4.2).
        onPressed: _erroNova != null ? null : _salvar,
      ),
      if (_salvando) ...<Widget>[
        const SizedBox(height: DesignTokens.space3),
        SizedBox(
          width: double.infinity,
          child: Text(
            'O servidor está iniciando. Isso pode levar alguns segundos.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
        ),
      ],
    ];
  }
}
