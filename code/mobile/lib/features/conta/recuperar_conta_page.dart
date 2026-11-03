import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../core/session/acesso_de_recuperacao.dart';
import '../../core/session/session_controller.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import 'exclusao_service.dart';
import 'widgets_de_exclusao.dart';

enum _Estado { pendente, erro, expirado, recuperada }

/// Recuperar conta (F-CONTA-2, RN-23.3 e 23.4). Estrutura e cópia de
/// docs/design/periodo-2/F-CONTA-2/recuperar-conta.md §4, mesma lógica da web
/// (`RecuperarContaView.vue`). Fora do shell: o acesso de recuperação só cancela a exclusão. Ele
/// vive em memória no [SessionController], e a guarda de rota só abre esta tela com ele.
class RecuperarContaPage extends StatefulWidget {
  final SessionController sessionController;
  final ExclusaoService servico;
  final VoidCallback aoIrParaLogin;

  const RecuperarContaPage({
    super.key,
    required this.sessionController,
    required this.servico,
    required this.aoIrParaLogin,
  });

  @override
  State<RecuperarContaPage> createState() => _RecuperarContaPageState();
}

class _RecuperarContaPageState extends State<RecuperarContaPage> {
  // Lido uma vez: o acesso é descartado ao recuperar e ao expirar, e a tela continua aberta.
  late final AcessoDeRecuperacao? _acesso = widget.sessionController.recuperacao;
  final String _chave = ApiClient.newIdempotencyKey();

  _Estado _estado = _Estado.pendente;
  bool _cancelando = false;

  Future<void> _cancelar() async {
    final acesso = _acesso;
    if (acesso == null) {
      return;
    }
    setState(() => _cancelando = true);
    try {
      // A mesma chave em toda tentativa: repetir depois de um erro não cria dois pedidos.
      await widget.servico.cancelar(accessToken: acesso.accessToken, idempotencyKey: _chave);
      widget.sessionController.descartarRecuperacao();
      _mudar(_Estado.recuperada);
    } on ApiException catch (erro) {
      if (erro.status == 401) {
        widget.sessionController.descartarRecuperacao();
        _mudar(_Estado.expirado);
      } else {
        _mudar(_Estado.erro);
      }
    } finally {
      if (mounted) {
        setState(() => _cancelando = false);
      }
    }
  }

  void _mudar(_Estado estado) {
    if (mounted) {
      setState(() => _estado = estado);
    }
  }

  /// Sair não pede confirmação: a exclusão já estava agendada (§9).
  void _irParaOLogin() {
    widget.sessionController.descartarRecuperacao();
    widget.aoIrParaLogin();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final acesso = _acesso;
    return TelaForaDoShell(
      aoVoltarDoSistema: _cancelando ? () {} : _irParaOLogin,
      // Sem acesso a guarda nem abre a tela; o caso fica só com a marca.
      filhos: _estado == _Estado.recuperada
          ? _recuperada(theme)
          : acesso == null
          ? const <Widget>[]
          : _pendente(theme, acesso),
    );
  }

  List<Widget> _recuperada(ThemeData theme) {
    final texto = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    return <Widget>[
      const SizedBox(height: DesignTokens.space16),
      Semantics(
        liveRegion: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            ExcludeSemantics(
              child: Icon(PhosphorIconsRegular.checkCircle, size: 32, color: theme.primaryAccent),
            ),
            const SizedBox(height: DesignTokens.space5),
            Semantics(
              header: true,
              child: Text('Conta recuperada', style: theme.textTheme.headlineSmall),
            ),
            const SizedBox(height: DesignTokens.space4),
            Text(
              'A exclusão foi cancelada. Seu perfil e tudo o que você registrou voltaram a aparecer '
              'para os outros leitores, do jeito que estavam.',
              style: texto,
            ),
            const SizedBox(height: DesignTokens.space4),
            Text('Entre de novo para continuar.', style: texto),
          ],
        ),
      ),
      const SizedBox(height: DesignTokens.space8),
      BotaoPrimario(texto: 'Entrar', onPressed: _irParaOLogin),
    ];
  }

  List<Widget> _pendente(ThemeData theme, AcessoDeRecuperacao acesso) {
    final texto = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    final caption = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final dataDaRemocao = dataPorExtenso(acesso.exclusaoPrevistaEm);
    final dias = diasAte(acesso.exclusaoPrevistaEm);
    return <Widget>[
      const SizedBox(height: DesignTokens.space12),
      Semantics(
        header: true,
        child: Text('Sua conta está em exclusão', style: theme.displayTitle),
      ),
      const SizedBox(height: DesignTokens.space3),
      Text('${acesso.nomeExibicao} · @${acesso.username}', style: texto),
      const SizedBox(height: DesignTokens.space6),
      BlocoDaData(data: dataDaRemocao, apoio: textoDosDias(dias)),
      // A faixa `ambar` aparece só quando falta 1 dia (§4.2).
      if (dias == 1) ...<Widget>[
        const SizedBox(height: DesignTokens.space5),
        Container(
          padding: const EdgeInsets.all(DesignTokens.space4),
          decoration: BoxDecoration(
            color: theme.warningTint,
            borderRadius: BorderRadius.circular(DesignTokens.radius),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              ExcludeSemantics(
                child: Icon(PhosphorIconsRegular.warning, size: 20, color: theme.warningColor),
              ),
              const SizedBox(width: DesignTokens.space3),
              Expanded(
                child: Text(
                  'Depois de $dataDaRemocao não será mais possível recuperar a conta.',
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ],
          ),
        ),
      ],
      const SizedBox(height: DesignTokens.space6),
      Text(
        'Nada foi apagado ainda. Enquanto a exclusão estiver pendente, seu perfil, sua estante e '
        'suas resenhas ficam ocultos para os outros leitores.',
        style: texto,
      ),
      const SizedBox(height: DesignTokens.space4),
      Text('Cancele para que tudo volte como estava.', style: texto),
      if (_estado == _Estado.erro) ...<Widget>[
        const SizedBox(height: DesignTokens.space8),
        const BannerAviso(
          variante: VarianteAviso.erro,
          mensagem:
              'Não foi possível cancelar a exclusão. Ela continua agendada. Verifique sua conexão '
              'e tente de novo.',
        ),
      ] else if (_estado == _Estado.expirado) ...<Widget>[
        const SizedBox(height: DesignTokens.space8),
        const BannerAviso(
          variante: VarianteAviso.alerta,
          mensagem: 'Seu acesso para cancelar expirou. Entre de novo para cancelar a exclusão.',
        ),
      ],
      SizedBox(height: _estado == _Estado.pendente ? DesignTokens.space8 : DesignTokens.space5),
      // Com o acesso expirado, sair e entrar de novo são o mesmo caminho: um botão só (§4.5).
      if (_estado == _Estado.expirado)
        BotaoPrimario(texto: 'Entrar de novo', onPressed: _irParaOLogin)
      else ...<Widget>[
        BotaoPrimario(
          texto: _cancelando ? 'Cancelando' : 'Cancelar exclusão',
          carregando: _cancelando,
          carregandoEsmaecido: true,
          onPressed: _cancelar,
        ),
        if (_cancelando) ...<Widget>[
          const SizedBox(height: DesignTokens.space3),
          Text(
            'O servidor está iniciando. Isso pode levar alguns segundos.',
            textAlign: TextAlign.center,
            style: caption,
          ),
        ],
        const SizedBox(height: DesignTokens.space5),
        IgnorePointer(
          ignoring: _cancelando,
          child: AnimatedOpacity(
            opacity: _cancelando ? 0.5 : 1,
            duration: DesignTokens.durFast,
            child: Column(
              children: <Widget>[
                BotaoTextual(texto: 'Sair', neutro: true, onPressed: _irParaOLogin),
                const SizedBox(height: DesignTokens.space2),
                Text(
                  'Se você sair, a exclusão continua agendada.',
                  textAlign: TextAlign.center,
                  style: caption,
                ),
              ],
            ),
          ),
        ),
      ],
    ];
  }
}
