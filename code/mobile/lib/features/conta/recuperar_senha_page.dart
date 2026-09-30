import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/estado_terminal.dart';
import '../auth/auth_service.dart';

/// Recuperar senha (RF-AUT-04). Estrutura e cópia de docs/design/periodo-1/F-AUT/recuperar-senha.md
/// §4, com a mesma lógica da web (`RecuperarSenhaView.vue`).
///
/// **Anti-enumeração (RNF-SEC-28).** O servidor responde o mesmo `202` exista ou não a conta, e
/// a tela mostra para ele a mesma confirmação neutra, com o e-mail que a pessoa digitou. Os outros
/// desfechos também não dependem da conta: `429` é alerta de limite, `400` é formato, e falha de
/// rede é erro de verdade, que não vira confirmação porque a pessoa esperaria um e-mail que não
/// saiu.
class RecuperarSenhaPage extends StatefulWidget {
  final AuthService authService;
  final VoidCallback? aoVoltarParaLogin;

  const RecuperarSenhaPage({super.key, required this.authService, this.aoVoltarParaLogin});

  @override
  State<RecuperarSenhaPage> createState() => _RecuperarSenhaPageState();
}

class _RecuperarSenhaPageState extends State<RecuperarSenhaPage> {
  static const String _erroDeFormato = 'Digite um e-mail completo, como nome@provedor.com.';
  static final RegExp _formatoDeEmail = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  final _emailController = TextEditingController();
  final _foco = FocusNode();

  String? _erroEmail;
  String? _bannerErro;
  bool _limiteExcedido = false;
  bool _enviando = false;
  String? _enviadoPara;

  @override
  void initState() {
    super.initState();
    // Formato, não existência: validado ao sair do campo, sem consultar o servidor (§4.2).
    _foco.addListener(() {
      if (!_foco.hasFocus && _emailController.text.trim().isNotEmpty) {
        setState(_validarFormato);
      }
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _foco.dispose();
    super.dispose();
  }

  bool _validarFormato() {
    _erroEmail = _formatoDeEmail.hasMatch(_emailController.text.trim()) ? null : _erroDeFormato;
    return _erroEmail == null;
  }

  void _aoDigitar(String _) {
    if (_erroEmail != null || _limiteExcedido || _bannerErro != null) {
      setState(() {
        _erroEmail = null;
        _limiteExcedido = false;
        _bannerErro = null;
      });
    }
  }

  Future<void> _enviar() async {
    if (!_validarFormato()) {
      setState(() {});
      return;
    }
    final digitado = _emailController.text.trim();
    setState(() {
      _bannerErro = null;
      _enviando = true;
    });
    try {
      await widget.authService.solicitarRecuperacao(digitado);
      if (mounted) {
        setState(() => _enviadoPara = digitado);
      }
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      setState(() {
        if (erro.status == 429) {
          _limiteExcedido = true;
        } else if (erro.status == 400) {
          _erroEmail = _erroDeFormato;
        } else {
          _bannerErro = erro.message;
        }
      });
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
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const SizedBox(height: DesignTokens.space6),
              // A seta compensa o padding lateral, como no protótipo (margem -12, ícone à esquerda
              // da caixa): fica perto da borda e o alvo de 48 continua inteiro.
              Align(
                alignment: Alignment.centerLeft,
                child: Transform.translate(
                  offset: const Offset(-DesignTokens.space3, 0),
                  child: IconButton(
                    onPressed: widget.aoVoltarParaLogin,
                    tooltip: 'Voltar para entrar',
                    constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                    padding: EdgeInsets.zero,
                    alignment: Alignment.centerLeft,
                    icon: Icon(PhosphorIconsRegular.arrowLeft, size: 24, color: theme.textTheme.bodyMedium?.color),
                  ),
                ),
              ),
              const SizedBox(height: DesignTokens.space10),
              if (_enviadoPara != null)
                EstadoTerminal(
                  icone: PhosphorIconsRegular.envelopeSimple,
                  titulo: 'Verifique seu e-mail',
                  paragrafos: <String>[
                    'Se existir uma conta com $_enviadoPara, enviamos um link para criar uma senha '
                        'nova. O link vale por 1 hora.',
                    'Não chegou? Confira a caixa de spam antes de pedir outro link.',
                  ],
                  acoes: <Widget>[
                    BotaoPrimario(texto: 'Voltar para entrar', onPressed: widget.aoVoltarParaLogin),
                    BotaoTextual(
                      texto: 'Enviar de novo',
                      larguraTotal: true,
                      // Devolve o formulário com o e-mail preenchido (§4.4).
                      onPressed: () => setState(() => _enviadoPara = null),
                    ),
                  ],
                )
              else
                ..._formulario(theme),
              const SizedBox(height: DesignTokens.space10),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _formulario(ThemeData theme) {
    return <Widget>[
      Text('Recuperar senha', style: theme.displayTitle),
      const SizedBox(height: DesignTokens.space4),
      Text(
        'Informe o e-mail da sua conta. Se existir uma conta com ele, você recebe um link para '
        'criar uma senha nova.',
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
      ),
      const SizedBox(height: DesignTokens.space8),
      if (_limiteExcedido) ...<Widget>[
        const BannerAviso(
          variante: VarianteAviso.alerta,
          mensagem: 'Muitas solicitações. Tente de novo em alguns minutos.',
        ),
        const SizedBox(height: DesignTokens.space6),
      ] else if (_bannerErro != null) ...<Widget>[
        BannerAviso(variante: VarianteAviso.erro, mensagem: _bannerErro!),
        const SizedBox(height: DesignTokens.space6),
      ],
      AnimatedOpacity(
        opacity: _enviando ? 0.5 : 1,
        duration: DesignTokens.durFast,
        child: CampoTexto(
          controller: _emailController,
          focusNode: _foco,
          label: 'E-mail',
          keyboardType: TextInputType.emailAddress,
          autofillHints: const <String>[AutofillHints.email],
          erro: _erroEmail,
          erroAntesDoHelper: true,
          helper: 'O link vale por 1 hora e só pode ser usado uma vez.',
          enabled: !_enviando,
          onChanged: _aoDigitar,
        ),
      ),
      const SizedBox(height: DesignTokens.space8),
      BotaoPrimario(
        texto: _enviando ? 'Enviando' : 'Enviar link',
        carregando: _enviando,
        carregandoEsmaecido: true,
        onPressed: _erroEmail != null || _limiteExcedido ? null : _enviar,
      ),
      if (_enviando) ...<Widget>[
        const SizedBox(height: DesignTokens.space3),
        SizedBox(
          width: double.infinity,
          child: Text(
            'O servidor está iniciando. Isso pode levar alguns segundos.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
        ),
      ] else ...<Widget>[
        // Some durante o envio, como no protótipo (Recuperar senha · Enviando).
        const SizedBox(height: DesignTokens.space5),
        BotaoTextual(texto: 'Voltar para entrar', larguraTotal: true, onPressed: widget.aoVoltarParaLogin),
      ],
    ];
  }
}
