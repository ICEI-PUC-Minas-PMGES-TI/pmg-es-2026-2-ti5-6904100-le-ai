import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../core/session/session_controller.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_senha.dart';
import '../../design/widgets/estado_terminal.dart';
import '../auth/auth_service.dart';
import 'aviso_de_sessoes.dart';
import 'validacao_de_senha.dart';

/// Alterar senha (RF-AUT-05). Estrutura e cópia de docs/design/periodo-1/F-AUT/alterar-senha.md
/// §4, mesma lógica da web (`AlterarSenhaView.vue`).
///
/// O servidor devolve `422` tanto para senha atual errada quanto para senha nova comum, com o
/// mesmo código: o que separa os dois é a mensagem, e só a da política fala em senha comum.
/// Senha atual errada vira banner com o campo limpo (§4.2); política vira erro no campo novo.
class AlterarSenhaPage extends StatefulWidget {
  final AuthService authService;
  final SessionController sessionController;
  final VoidCallback? aoVoltar;

  const AlterarSenhaPage({
    super.key,
    required this.authService,
    required this.sessionController,
    this.aoVoltar,
  });

  @override
  State<AlterarSenhaPage> createState() => _AlterarSenhaPageState();
}

class _AlterarSenhaPageState extends State<AlterarSenhaPage> {
  final _atualController = TextEditingController();
  final _novaController = TextEditingController();
  final _confirmacaoController = TextEditingController();
  final _chave = ChaveDaIntencao();

  bool _bordaDeErroAtual = false;
  String? _erroNova;
  String? _erroConfirmacao;
  String? _bannerErro;
  bool _salvando = false;
  bool _alterada = false;

  @override
  void dispose() {
    _atualController.dispose();
    _novaController.dispose();
    _confirmacaoController.dispose();
    super.dispose();
  }

  void _tratarErro(ApiException erro) {
    if (erro.status == 422 && erro.message.contains('comum')) {
      _erroNova = erro.message;
    } else if (erro.status == 422) {
      _bannerErro = erro.message;
      _bordaDeErroAtual = true;
      _atualController.clear();
    } else if (erro.status == 400) {
      _erroNova = erro.message;
    } else {
      _bannerErro = erro.message;
    }
  }

  Future<void> _salvar() async {
    setState(() {
      _bordaDeErroAtual = false;
      _bannerErro = null;
      _erroNova = null;
      _erroConfirmacao = null;
    });
    if (_atualController.text.isEmpty) {
      setState(() {
        _bordaDeErroAtual = true;
        _bannerErro = 'Informe sua senha atual.';
      });
      return;
    }
    final erros = validarSenhaNova(_novaController.text, _confirmacaoController.text);
    if (erros.nova != null || erros.confirmacao != null) {
      setState(() {
        _erroNova = erros.nova;
        _erroConfirmacao = erros.confirmacao;
      });
      return;
    }

    final atual = _atualController.text;
    final nova = _novaController.text;
    setState(() => _salvando = true);
    try {
      final sessao = await widget.authService.alterarSenha(
        senhaAtual: atual,
        novaSenha: nova,
        idempotencyKey: _chave.para('$atual\u0000$nova', ApiClient.newIdempotencyKey),
      );
      if (sessao != null) {
        await widget.sessionController.entrar(
          sessao.accessToken,
          refreshToken: sessao.refreshToken,
        );
      }
      if (mounted) {
        setState(() => _alterada = true);
      }
    } on ApiException catch (erro) {
      if (mounted) {
        setState(() => _tratarErro(erro));
      }
    } finally {
      if (mounted) {
        setState(() => _salvando = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: 'Alterar senha', aoVoltar: widget.aoVoltar),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space5,
              DesignTokens.space6,
              DesignTokens.space5,
              DesignTokens.space10,
            ),
            child: _alterada
                ? EstadoTerminal(
                    icone: PhosphorIconsRegular.checkCircle,
                    titulo: 'Senha alterada',
                    paragrafos: const <String>[
                      'Sua senha foi trocada. Encerramos a sessão nos outros aparelhos, e aqui '
                          'você continua conectado.',
                    ],
                    acoes: <Widget>[
                      BotaoPrimario(texto: 'Voltar para configurações', onPressed: widget.aoVoltar),
                    ],
                  )
                : _formulario(theme),
          ),
        ),
      ],
    );
  }

  Widget _formulario(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (_bannerErro != null) ...<Widget>[
          BannerAviso(variante: VarianteAviso.erro, mensagem: _bannerErro!),
          const SizedBox(height: DesignTokens.space6),
        ],
        AnimatedOpacity(
          opacity: _salvando ? 0.6 : 1,
          duration: DesignTokens.durFast,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              CampoSenha(
                controller: _atualController,
                label: 'Senha atual',
                autofillHints: const <String>[AutofillHints.password],
                bordaDeErro: _bordaDeErroAtual,
                enabled: !_salvando,
                onChanged: (_) {
                  if (_bordaDeErroAtual) {
                    setState(() => _bordaDeErroAtual = false);
                  }
                },
              ),
              // Separa provar quem você é de escolher a senha nova (§4).
              const SizedBox(height: DesignTokens.space8),
              Divider(height: 1, thickness: 1, color: theme.divider),
              const SizedBox(height: DesignTokens.space8),
              CampoSenha(
                controller: _novaController,
                label: 'Nova senha',
                autofillHints: const <String>[AutofillHints.newPassword],
                erro: _erroNova,
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
                enabled: !_salvando,
                onChanged: (_) {
                  if (_erroConfirmacao != null) {
                    setState(() => _erroConfirmacao = null);
                  }
                },
              ),
              const SizedBox(height: DesignTokens.space4),
              AvisoDeSessoes(theme: theme),
            ],
          ),
        ),
        const SizedBox(height: DesignTokens.space8),
        BotaoPrimario(
          texto: _salvando ? 'Salvando' : 'Salvar nova senha',
          carregando: _salvando,
          onPressed: _erroNova != null ? null : _salvar,
        ),
        if (_salvando) ...<Widget>[
          const SizedBox(height: DesignTokens.space3),
          Text(
            'O servidor está iniciando. Isso pode levar alguns segundos.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
        ],
        const SizedBox(height: DesignTokens.space4),
        BotaoTextual(
          texto: 'Cancelar',
          neutro: true,
          larguraTotal: true,
          onPressed: _salvando ? null : widget.aoVoltar,
        ),
      ],
    );
  }
}
