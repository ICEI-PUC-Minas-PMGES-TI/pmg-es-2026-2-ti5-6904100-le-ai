import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

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

/// Cadastro (RF-AUT-01). Estrutura e cópia de docs/design/periodo-0/P0-NAV/cadastro.md §4.
///
/// Validação do cliente espelha exatamente a do servidor (mesmas regras e mensagens de
/// `CadastroRequisicao.java`, mesmo raciocínio da `CadastroView.vue`): reforço, não
/// substituição — o servidor segue validando de verdade, e um 400 que passar do cliente vira
/// banner com a mensagem crua, sem atribuir a um campo que a resposta não dá (o backend não
/// distingue qual campo falhou na validação de Bean Validation).
class CadastroPage extends StatefulWidget {
  final AuthService authService;
  final SessionController sessionController;

  /// Chamado depois que a sessão é iniciada com sucesso. Quem decide para onde navegar é o
  /// go_router (Etapa 13) — esta tela não conhece rota nenhuma.
  final VoidCallback? aoCadastrar;

  /// Chamado ao tocar em "Entrar", no rodapé.
  final VoidCallback? aoIrParaLogin;

  const CadastroPage({
    super.key,
    required this.authService,
    required this.sessionController,
    this.aoCadastrar,
    this.aoIrParaLogin,
  });

  @override
  State<CadastroPage> createState() => _CadastroPageState();
}

class _CadastroPageState extends State<CadastroPage> {
  static final RegExp _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
  static final RegExp _usernameRegex = RegExp(r'^[A-Za-z0-9._]{3,30}$');

  final _emailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _displayNameController = TextEditingController();
  final _dataNascimentoController = TextEditingController();
  final _senhaController = TextEditingController();

  DateTime? _dataNascimento;

  String? _erroEmail;
  String? _erroUsername;
  String? _erroDisplayName;
  String? _erroDataNascimento;
  String? _erroSenha;

  // Conflito de e-mail/username (409) explica o erro no banner; o campo só ganha a borda, sem
  // repetir a mensagem (login.md §4.2 vale aqui também).
  bool _bordaDeErroEmail = false;
  bool _bordaDeErroUsername = false;

  String? _bannerErro;
  bool _enviando = false;

  @override
  void dispose() {
    _emailController.dispose();
    _usernameController.dispose();
    _displayNameController.dispose();
    _dataNascimentoController.dispose();
    _senhaController.dispose();
    super.dispose();
  }

  /// Mesma regra do MaiorDeIdadeValidator do backend: diferença em anos, fronteira inclusiva.
  bool _maiorDeIdade(DateTime nascimento) {
    final hoje = DateTime.now();
    if (nascimento.isAfter(hoje)) {
      return false;
    }
    var idade = hoje.year - nascimento.year;
    final aniversarioJaPassou =
        hoje.month > nascimento.month ||
        (hoje.month == nascimento.month && hoje.day >= nascimento.day);
    if (!aniversarioJaPassou) {
      idade -= 1;
    }
    return idade >= 18;
  }

  String _dataParaIso(DateTime data) {
    final ano = data.year.toString().padLeft(4, '0');
    final mes = data.month.toString().padLeft(2, '0');
    final dia = data.day.toString().padLeft(2, '0');
    return '$ano-$mes-$dia';
  }

  String _dataParaExibicao(DateTime data) {
    final dia = data.day.toString().padLeft(2, '0');
    final mes = data.month.toString().padLeft(2, '0');
    return '$dia/$mes/${data.year}';
  }

  Future<void> _selecionarDataNascimento() async {
    final hoje = DateTime.now();
    final selecionada = await showDatePicker(
      context: context,
      initialDate:
          _dataNascimento ?? DateTime(hoje.year - 18, hoje.month, hoje.day),
      firstDate: DateTime(hoje.year - 120),
      lastDate: hoje,
      helpText: 'Data de nascimento',
      // Digitar é mais rápido que navegar um calendário quando o alvo é décadas atrás —
      // melhor para uma data de nascimento do que para "hoje" ou "próxima semana".
      initialEntryMode: DatePickerEntryMode.input,
    );
    if (selecionada != null) {
      setState(() {
        _dataNascimento = selecionada;
        _dataNascimentoController.text = _dataParaExibicao(selecionada);
      });
    }
  }

  bool _validarCliente() {
    final emailAparado = _emailController.text.trim();
    final usernameAparado = _usernameController.text.trim();
    final displayNameAparado = _displayNameController.text.trim();

    setState(() {
      _erroEmail = emailAparado.isEmpty
          ? 'Informe seu e-mail.'
          : (emailAparado.length > 254 || !_emailRegex.hasMatch(emailAparado))
          ? 'Informe um e-mail válido.'
          : null;

      _erroUsername = usernameAparado.isEmpty
          ? 'Escolha um nome de usuário.'
          : !_usernameRegex.hasMatch(usernameAparado)
          ? 'Use de 3 a 30 caracteres, sem espaço: letras, números, ponto ou traço baixo.'
          : null;

      _erroDisplayName = displayNameAparado.isEmpty
          ? 'Informe seu nome de exibição.'
          : displayNameAparado.length > 60
          ? 'Use no máximo 60 caracteres.'
          : null;

      _erroDataNascimento = _dataNascimento == null
          ? 'Informe sua data de nascimento.'
          : !_maiorDeIdade(_dataNascimento!)
          ? 'É necessário ter 18 anos ou mais para criar uma conta.'
          : null;

      _erroSenha = _senhaController.text.isEmpty
          ? 'Escolha uma senha.'
          : _senhaController.text.length < 8
          ? 'Use pelo menos 8 caracteres.'
          : _senhaController.text.length > 72
          ? 'A senha pode ter no máximo 72 caracteres.'
          : null;
    });

    return _erroEmail == null &&
        _erroUsername == null &&
        _erroDisplayName == null &&
        _erroDataNascimento == null &&
        _erroSenha == null;
  }

  void _tratarErro(ApiException erro) {
    setState(() {
      if (erro.codigo == 'CONFLITO') {
        _bannerErro = erro.message;
        // O servidor tem três mensagens de conflito possíveis (username, e-mail, ou a
        // genérica de corrida no índice); só sabemos marcar o campo quando a mensagem
        // menciona um deles.
        if (erro.message.contains('usuário')) {
          _bordaDeErroUsername = true;
        } else if (erro.message.contains('e-mail')) {
          _bordaDeErroEmail = true;
        }
        return;
      }
      // REQUISICAO_INVALIDA (400) não distingue qual campo falhou; a validação do cliente
      // acima já cobre os casos que o protótipo nomeia (senha curta, menor de idade). Isto
      // aqui é o retentivo honesto para o que ela não previu.
      _bannerErro = erro.message;
    });
  }

  Future<void> _enviar() async {
    setState(() {
      _bannerErro = null;
      _bordaDeErroEmail = false;
      _bordaDeErroUsername = false;
    });
    if (!_validarCliente()) {
      return;
    }

    setState(() => _enviando = true);
    try {
      final usuarioCriado = await widget.authService.cadastrar(
        email: _emailController.text.trim(),
        username: _usernameController.text.trim(),
        displayName: _displayNameController.text.trim(),
        dataNascimento: _dataParaIso(_dataNascimento!),
        senha: _senhaController.text,
      );
      // O cadastro não emite token (RF-AUT-03 é do login). Entrar na sequência é o que faz a
      // tela "sair autenticada", como o prompt pede (cadastro.md §1), sem pedir a senha de
      // novo.
      final token = await widget.authService.entrar(
        identificador: usuarioCriado.username,
        senha: _senhaController.text,
      );
      await widget.sessionController.entrar(token.accessToken);
      if (!mounted) {
        return;
      }
      widget.aoCadastrar?.call();
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
              Text('Criar conta', style: theme.displayTitle),
              const SizedBox(height: DesignTokens.space8),
              if (_bannerErro != null) ...<Widget>[
                BannerAviso(
                  variante: VarianteAviso.erro,
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
                        controller: _emailController,
                        label: 'E-mail',
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const <String>[AutofillHints.email],
                        erro: _erroEmail,
                        bordaDeErro: _bordaDeErroEmail,
                        enabled: !_enviando,
                      ),
                      const SizedBox(height: DesignTokens.space5),
                      CampoTexto(
                        controller: _usernameController,
                        label: 'Nome de usuário',
                        autofillHints: const <String>[
                          AutofillHints.newUsername,
                        ],
                        erro: _erroUsername,
                        bordaDeErro: _bordaDeErroUsername,
                        enabled: !_enviando,
                      ),
                      const SizedBox(height: DesignTokens.space5),
                      CampoTexto(
                        controller: _displayNameController,
                        label: 'Nome de exibição',
                        autofillHints: const <String>[AutofillHints.name],
                        erro: _erroDisplayName,
                        enabled: !_enviando,
                      ),
                      const SizedBox(height: DesignTokens.space5),
                      CampoTexto(
                        controller: _dataNascimentoController,
                        label: 'Data de nascimento',
                        readOnly: true,
                        onTap: _enviando ? null : _selecionarDataNascimento,
                        erro: _erroDataNascimento,
                        enabled: !_enviando,
                        trailing: Icon(
                          PhosphorIconsRegular.calendarBlank,
                          size: 20,
                          color: theme.tertiaryText,
                        ),
                      ),
                      const SizedBox(height: DesignTokens.space5),
                      CampoSenha(
                        controller: _senhaController,
                        label: 'Senha',
                        helper: 'Mínimo de 8 caracteres',
                        erro: _erroSenha,
                        enabled: !_enviando,
                        autofillHints: const <String>[
                          AutofillHints.newPassword,
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: DesignTokens.space8),
              BotaoPrimario(
                texto: _enviando ? 'Criando conta' : 'Criar conta',
                carregando: _enviando,
                onPressed: _enviar,
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
                    'Já tem conta? ',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.secondaryText,
                    ),
                  ),
                  TextButton(
                    onPressed: widget.aoIrParaLogin,
                    // Só remove o padding interno do Material; o alvo de toque mínimo de 48px
                    // continua garantido pelo tapTargetSize padrão (invisível, não visual).
                    style: TextButton.styleFrom(padding: EdgeInsets.zero),
                    child: Text(
                      'Entrar',
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
