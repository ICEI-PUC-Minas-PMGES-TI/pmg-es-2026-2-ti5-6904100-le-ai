import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_destrutivo.dart';
import '../../design/widgets/botao_textual.dart';
import '../../core/network/api_client.dart';
import '../../design/widgets/linha_de_interruptor.dart';
import '../auth/auth_service.dart';
import '../perfil/perfil_service.dart';

/// Configurações (RF-AUT-06, acesso a RF-AUT-05 e RNF-SEC-42). Estrutura e cópia de
/// docs/design/periodo-1/F-AUT/configuracoes.md §4.
///
/// O bloco de identificação vem do `GET /me` (§4.5): enquanto carrega, e se falhar, fica o
/// skeleton de três barras, e o resto da tela continua utilizável, inclusive sair. O e-mail vem
/// no mesmo `GET /me`, que só o devolve ao próprio dono (decisão de 25/09/2026).
///
/// Sair sempre funciona do lado do aparelho (§4.3): quem recebe [aoSair] revoga no servidor como
/// melhor esforço e limpa a sessão; a guarda de rota leva ao login sozinha.
class ConfiguracoesPage extends StatefulWidget {
  final AuthService authService;

  /// F-REC-ALG: lê e grava o opt-out das sugestões. Sem ele, a linha fica no skeleton.
  final PerfilService? perfilService;
  final Future<void> Function() aoSair;
  final VoidCallback? aoVoltar;
  final VoidCallback? aoAlterarSenha;
  final VoidCallback? aoAbrirNotificacoes;
  final VoidCallback? aoAbrirPolitica;

  /// `Excluir conta` (F-CONTA-2), última linha do grupo `Privacidade e dados`.
  final VoidCallback? aoExcluirConta;

  const ConfiguracoesPage({
    super.key,
    required this.authService,
    this.perfilService,
    required this.aoSair,
    this.aoVoltar,
    this.aoAlterarSenha,
    this.aoAbrirNotificacoes,
    this.aoAbrirPolitica,
    this.aoExcluirConta,
  });

  static const String versaoDoApp = '1.0.0';

  @override
  State<ConfiguracoesPage> createState() => _ConfiguracoesPageState();
}

class _ConfiguracoesPageState extends State<ConfiguracoesPage> {
  UsuarioResposta? _usuario;
  bool _saindo = false;

  // F-REC-ALG: a tela pergunta pelo sim (`Usar minhas leituras em sugestões`) e o contrato guarda
  // o não (`optOutRecomendacao`). Nulo até `GET /me/perfil` responder, e se a leitura falhar.
  bool? _usarLeituras;
  bool _salvandoPreferencia = false;
  bool _falhouPreferencia = false;
  ({bool valor, String chave})? _gravacaoPendente;

  @override
  void initState() {
    super.initState();
    _carregarUsuario();
    _carregarPreferencia();
  }

  Future<void> _carregarPreferencia() async {
    final servico = widget.perfilService;
    if (servico == null) {
      return;
    }
    try {
      final perfil = await servico.obterMeuPerfil();
      if (mounted) {
        setState(() => _usarLeituras = perfil.optOutRecomendacao != true);
      }
    } on Object {
      // A linha mantém o skeleton do `switch` e não responde, sem erro desenhado (§4.5).
    }
  }

  /// Sem botão de salvar: o toque move o `switch` na hora e grava. Se falhar, ele volta e a linha
  /// diz o motivo; tentar de novo é tocar outra vez, com a mesma chave se o destino for o mesmo.
  Future<void> _alternarPreferencia() async {
    final servico = widget.perfilService;
    final anterior = _usarLeituras;
    if (servico == null || anterior == null || _salvandoPreferencia || _saindo) {
      return;
    }
    final novo = !anterior;
    final pendente = _gravacaoPendente;
    final chave = pendente != null && pendente.valor == novo
        ? pendente.chave
        : ApiClient.newIdempotencyKey();
    _gravacaoPendente = (valor: novo, chave: chave);
    setState(() {
      _usarLeituras = novo;
      _salvandoPreferencia = true;
    });
    try {
      final perfil = await servico.definirOptOutRecomendacao(!novo, idempotencyKey: chave);
      _gravacaoPendente = null;
      if (mounted) {
        setState(() {
          _usarLeituras = perfil.optOutRecomendacao != true;
          _falhouPreferencia = false;
        });
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _usarLeituras = anterior;
          _falhouPreferencia = true;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _salvandoPreferencia = false);
      }
    }
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
        CabecalhoTela(titulo: 'Configurações', aoVoltar: widget.aoVoltar, semDivisor: true),
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
                _Linha(rotulo: 'Notificações', aoTocar: widget.aoAbrirNotificacoes, theme: theme),
                _TituloDeGrupo(texto: 'Privacidade e dados', theme: theme),
                _LinhaDeSugestoes(
                  usar: _usarLeituras,
                  falhou: _falhouPreferencia,
                  salvando: _salvandoPreferencia,
                  desabilitada: _saindo,
                  aoAlternar: _alternarPreferencia,
                  theme: theme,
                ),
                _Linha(
                  rotulo: 'Política de privacidade',
                  aoTocar: widget.aoAbrirPolitica,
                  theme: theme,
                ),
                // Igual às outras linhas, sem `rubi` nem ícone de alerta (configuracoes.md).
                _Linha(rotulo: 'Excluir conta', aoTocar: widget.aoExcluirConta, theme: theme),
                const SizedBox(height: DesignTokens.space8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
                  child: BotaoDestrutivo(
                    texto: _saindo ? 'Saindo' : 'Sair da conta',
                    icone: PhosphorIconsRegular.signOut,
                    carregando: _saindo,
                    carregandoEsmaecido: true,
                    onPressed: _confirmarSaida,
                  ),
                ),
                if (_saindo) ...<Widget>[
                  const SizedBox(height: DesignTokens.space3),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
                    child: Text(
                      'O servidor está iniciando. Isso pode levar alguns segundos.',
                      textAlign: TextAlign.center,
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
            const SizedBox(height: DesignTokens.space2),
            _Barra(altura: 13, fracao: 0.55, theme: theme),
          ],
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(usuario.displayName, style: theme.textTheme.titleMedium),
        const SizedBox(height: 2),
        Text('@${usuario.username}', style: theme.textTheme.bodySmall),
        // E-mail em `caption` grafite, 4px abaixo do handle (protótipo, artboard padrão).
        if (usuario.email case final email?) ...<Widget>[
          const SizedBox(height: DesignTokens.space1),
          Text(email, style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText)),
        ],
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

/// Linha `Usar minhas leituras em sugestões` (F-REC-ALG, configuracoes.md do Período 3 §4): a
/// única linha com controle. Sem ícone, descrição sempre visível, o `switch` no lugar do
/// `CaretRight`. A linha inteira alterna. [usar] nulo é o carregamento: retângulo de 52 x 32px em
/// `capa-placeholder` no lugar do trilho, e a linha não responde. Saindo, trilho a 40%.
///
/// Para o leitor de tela (§4.5 e §9): sem estado lido, a linha não diz ligado nem desligado e fica
/// desabilitada; gravando, ela é anunciada como ocupada (`Salvando`) e desabilitada, sem a ação de
/// toque, enquanto o desenho não muda.
class _LinhaDeSugestoes extends StatelessWidget {
  final bool? usar;
  final bool falhou;
  final bool salvando;
  final bool desabilitada;
  final VoidCallback aoAlternar;
  final ThemeData theme;

  const _LinhaDeSugestoes({
    required this.usar,
    required this.falhou,
    required this.salvando,
    required this.desabilitada,
    required this.aoAlternar,
    required this.theme,
  });

  static const String _rotulo = 'Usar minhas leituras em sugestões';
  static const String _descricao =
      'Os livros que você lê ajudam a sugerir leituras para quem segue você. Seu perfil continua '
      'como está.';
  static const String _erro = 'Não foi possível salvar. Verifique sua conexão e tente de novo.';

  @override
  Widget build(BuildContext context) {
    final estado = usar;
    final ativa = estado != null && !desabilitada;
    final acionavel = ativa && !salvando;
    return Semantics(
      toggled: estado,
      enabled: acionavel,
      label: _rotulo,
      value: salvando ? 'Salvando' : null,
      hint: falhou ? '$_descricao $_erro' : _descricao,
      liveRegion: falhou,
      onTap: acionavel ? aoAlternar : null,
      excludeSemantics: true,
      child: InkWell(
        onTap: ativa ? aoAlternar : null,
        splashFactory: NoSplash.splashFactory,
        child: Container(
          constraints: const BoxConstraints(minHeight: 72),
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.space5,
            vertical: DesignTokens.space3,
          ),
          decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.divider))),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(_rotulo, style: theme.textTheme.bodyMedium),
                    const SizedBox(height: DesignTokens.space1),
                    Text(
                      _descricao,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    ),
                    if (falhou) ...<Widget>[
                      const SizedBox(height: DesignTokens.space2),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Icon(
                            PhosphorIconsRegular.warning,
                            size: 16,
                            color: theme.colorScheme.error,
                          ),
                          const SizedBox(width: DesignTokens.space1),
                          Expanded(
                            child: Text(
                              _erro,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.error,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: DesignTokens.space4),
              if (estado == null)
                Container(
                  key: const ValueKey<String>('skeleton-do-switch'),
                  width: 52,
                  height: 32,
                  decoration: BoxDecoration(
                    color: theme.coverPlaceholder,
                    borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
                  ),
                )
              else
                Opacity(
                  opacity: desabilitada ? 0.4 : 1,
                  child: TrilhoDeInterruptor(ligado: estado),
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
