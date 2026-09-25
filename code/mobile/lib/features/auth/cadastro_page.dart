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

/// Cadastro (RF-AUT-01). Estrutura e cópia de docs/design/periodo-0/P0-NAV/cadastro.md §4. Os
/// ícones nos campos vêm do protótipo de F-AUT (desenho aprovado) e a validação ao sair do
/// campo, do teste de aceite de 25/09; divergências do prompt registradas em feature-F-AUT.md.
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

  /// Chamado ao tocar em "Política de privacidade" (RNF-SEC-42). Quem chama empilha a tela da
  /// política sobre esta, para o formulário continuar preenchido na volta.
  final VoidCallback? aoAbrirPolitica;

  const CadastroPage({
    super.key,
    required this.authService,
    required this.sessionController,
    this.aoCadastrar,
    this.aoIrParaLogin,
    this.aoAbrirPolitica,
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

  /// Validação ao sair do campo (pedida no teste de aceite de 25/09): o erro aparece quando o
  /// campo perde o foco, não só no envio. Depois de tocado, o campo revalida a cada digitação,
  /// para o erro sumir assim que é corrigido. O botão continua ativo (cadastro.md §4.1).
  final _focoEmail = FocusNode();
  final _focoUsername = FocusNode();
  final _focoDisplayName = FocusNode();
  final _focoSenha = FocusNode();
  final Set<_Campo> _tocados = <_Campo>{};

  @override
  void initState() {
    super.initState();
    void aoPerderFoco(FocusNode foco, _Campo campo) {
      foco.addListener(() {
        if (!foco.hasFocus && mounted) {
          _tocados.add(campo);
          setState(() => _aplicar(campo));
        }
      });
    }

    aoPerderFoco(_focoEmail, _Campo.email);
    aoPerderFoco(_focoUsername, _Campo.username);
    aoPerderFoco(_focoDisplayName, _Campo.displayName);
    aoPerderFoco(_focoSenha, _Campo.senha);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _usernameController.dispose();
    _displayNameController.dispose();
    _dataNascimentoController.dispose();
    _senhaController.dispose();
    _focoEmail.dispose();
    _focoUsername.dispose();
    _focoDisplayName.dispose();
    _focoSenha.dispose();
    super.dispose();
  }

  /// Revalida, a cada digitação, só o campo que já foi tocado.
  void _aoDigitar(_Campo campo) {
    if (_tocados.contains(campo)) {
      setState(() => _aplicar(campo));
    }
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
    if (!mounted) {
      return;
    }
    // Fechar o seletor é o "sair do campo" da data: escolhida ou cancelada, ela é validada.
    _tocados.add(_Campo.dataNascimento);
    setState(() {
      if (selecionada != null) {
        _dataNascimento = selecionada;
        _dataNascimentoController.text = _dataParaExibicao(selecionada);
      }
      _aplicar(_Campo.dataNascimento);
    });
  }

  String? _validar(_Campo campo) {
    switch (campo) {
      case _Campo.email:
        final aparado = _emailController.text.trim();
        if (aparado.isEmpty) {
          return 'Informe seu e-mail.';
        }
        return aparado.length > 254 || !_emailRegex.hasMatch(aparado)
            ? 'Informe um e-mail válido.'
            : null;
      case _Campo.username:
        final aparado = _usernameController.text.trim();
        if (aparado.isEmpty) {
          return 'Escolha um nome de usuário.';
        }
        return _usernameRegex.hasMatch(aparado)
            ? null
            : 'Use de 3 a 30 caracteres, sem espaço: letras, números, ponto ou traço baixo.';
      case _Campo.displayName:
        final aparado = _displayNameController.text.trim();
        if (aparado.isEmpty) {
          return 'Informe seu nome de exibição.';
        }
        return aparado.length > 60 ? 'Use no máximo 60 caracteres.' : null;
      case _Campo.dataNascimento:
        if (_dataNascimento == null) {
          return 'Informe sua data de nascimento.';
        }
        return _maiorDeIdade(_dataNascimento!)
            ? null
            : 'É necessário ter 18 anos ou mais para criar uma conta.';
      case _Campo.senha:
        final senha = _senhaController.text;
        if (senha.isEmpty) {
          return 'Escolha uma senha.';
        }
        if (senha.length < 8) {
          return 'Use pelo menos 8 caracteres.';
        }
        return senha.length > 72 ? 'A senha pode ter no máximo 72 caracteres.' : null;
    }
  }

  /// Grava o erro do campo no estado. Chamado dentro de um `setState`.
  void _aplicar(_Campo campo) {
    final erro = _validar(campo);
    switch (campo) {
      case _Campo.email:
        _erroEmail = erro;
      case _Campo.username:
        _erroUsername = erro;
      case _Campo.displayName:
        _erroDisplayName = erro;
      case _Campo.dataNascimento:
        _erroDataNascimento = erro;
      case _Campo.senha:
        _erroSenha = erro;
    }
  }

  bool _validarCliente() {
    _tocados.addAll(_Campo.values);
    setState(() {
      for (final campo in _Campo.values) {
        _aplicar(campo);
      }
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

  /// A chave é da intenção (RNF-ERR-04): o mesmo formulário reenviado repete a chave, e um
  /// cadastro que deu certo no servidor mas perdeu a resposta volta como replay, não como `409`.
  /// Qualquer campo alterado é outra intenção e ganha chave nova.
  String? _ultimoCorpo;
  String? _ultimaChave;

  String _chaveDaIntencao(String corpo) {
    if (_ultimoCorpo != corpo || _ultimaChave == null) {
      _ultimoCorpo = corpo;
      _ultimaChave = ApiClient.newIdempotencyKey();
    }
    return _ultimaChave!;
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
      final email = _emailController.text.trim();
      final username = _usernameController.text.trim();
      final displayName = _displayNameController.text.trim();
      final dataNascimento = _dataParaIso(_dataNascimento!);
      final usuarioCriado = await widget.authService.cadastrar(
        email: email,
        username: username,
        displayName: displayName,
        dataNascimento: dataNascimento,
        senha: _senhaController.text,
        idempotencyKey: _chaveDaIntencao(
          <String>[email, username, displayName, dataNascimento, _senhaController.text]
              .join('\u0000'),
        ),
      );
      // O cadastro não emite token (RF-AUT-03 é do login). Entrar na sequência é o que faz a
      // tela "sair autenticada", como o prompt pede (cadastro.md §1), sem pedir a senha de
      // novo.
      final sessao = await widget.authService.entrar(
        identificador: usuarioCriado.username,
        senha: _senhaController.text,
      );
      await widget.sessionController.entrar(
        sessao.accessToken,
        refreshToken: sessao.refreshToken,
      );
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
                        icone: PhosphorIconsRegular.envelopeSimple,
                        focusNode: _focoEmail,
                        onChanged: (_) => _aoDigitar(_Campo.email),
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
                        icone: PhosphorIconsRegular.at,
                        focusNode: _focoUsername,
                        onChanged: (_) => _aoDigitar(_Campo.username),
                        erro: _erroUsername,
                        bordaDeErro: _bordaDeErroUsername,
                        enabled: !_enviando,
                      ),
                      const SizedBox(height: DesignTokens.space5),
                      CampoTexto(
                        controller: _displayNameController,
                        label: 'Nome de exibição',
                        autofillHints: const <String>[AutofillHints.name],
                        icone: PhosphorIconsRegular.user,
                        focusNode: _focoDisplayName,
                        onChanged: (_) => _aoDigitar(_Campo.displayName),
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
                        comIcone: true,
                        focusNode: _focoSenha,
                        onChanged: (_) => _aoDigitar(_Campo.senha),
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
              // RNF-SEC-42 (edição de F-AUT, cadastro.md §4): informação, não aceite. Sem checkbox.
              const SizedBox(height: DesignTokens.space5),
              IgnorePointer(
                ignoring: _enviando,
                child: AnimatedOpacity(
                  opacity: _enviando ? 0.6 : 1,
                  duration: DesignTokens.durFast,
                  child: Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: <Widget>[
                      Text(
                        'Coletamos o mínimo de dados para manter sua conta. Veja o que guardamos e '
                        'por quanto tempo na ',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                      ),
                      TextButton(
                        onPressed: widget.aoAbrirPolitica,
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: const Size(48, 48),
                        ),
                        child: Text(
                          'Política de privacidade',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.primaryAccent,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
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

/// Campos do formulário de cadastro, para validar um de cada vez ao sair dele.
enum _Campo { email, username, displayName, dataNascimento, senha }
