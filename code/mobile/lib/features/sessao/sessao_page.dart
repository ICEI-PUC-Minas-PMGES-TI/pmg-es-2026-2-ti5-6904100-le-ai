import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/folha_de_acoes.dart';
import '../../design/widgets/folha_inferior.dart';
import 'encerrar_sessao.dart';
import 'regras.dart';
import 'sessao_controller.dart';
import 'sessao_de_leitura.dart';
import 'textos.dart';

const double _tamanhoDoCronometro = 72;

class SessaoPage extends StatefulWidget {
  final SessaoController sessao;

  const SessaoPage({super.key, required this.sessao});

  @override
  State<SessaoPage> createState() => _SessaoPageState();
}

class _SessaoPageState extends State<SessaoPage> with RelogioDaSessao<SessaoPage> {
  @override
  SessaoController get sessao => widget.sessao;

  Future<void> _escolherPausa() async {
    final escolhida = await escolherNaFolha(
      context,
      <AcaoDaFolha>[
        for (final duracao in duracoesDePausa)
          AcaoDaFolha(
            valor: '${duracao.inMinutes}',
            icone: PhosphorIconsRegular.timer,
            rotulo: TextosDoModoDeFoco.opcaoDePausa(duracao),
          ),
      ],
      cabecalho: const _CabecalhoDaPausa(),
      cancelar: TextosDoModoDeFoco.voltar,
      semMovimento: true,
    );
    final minutos = escolhida == null ? null : int.tryParse(escolhida);
    if (minutos != null) {
      await sessao.pausar(Duration(minutes: minutos));
    }
  }

  Future<void> _cancelar() async {
    final confirmado = await confirmarAcaoDestrutiva(
      context,
      titulo: TextosDoModoDeFoco.tituloDoCancelamento,
      texto: TextosDoModoDeFoco.textoDoCancelamento(minutosDaSessao(sessao.tempoLido)),
      acao: TextosDoModoDeFoco.descartar,
      cancelar: TextosDoModoDeFoco.continuarLendo,
      semMovimento: true,
    );
    if (confirmado) {
      await sessao.descartar();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final atual = sessao.sessao;
    final pausada = sessao.situacao == SituacaoDaSessao.pausada;
    final restante = sessao.pausaRestante;
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: theme.pageBackground,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space5,
              0,
              DesignTokens.space5,
              DesignTokens.space6,
            ),
            child: atual == null
                ? const SizedBox.shrink()
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      Expanded(
                        child: Center(
                          child: SingleChildScrollView(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: <Widget>[
                                Text(
                                  atual.leitura.titulo,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.center,
                                  style: theme.textTheme.titleLarge,
                                ),
                                if (atual.leitura.autor != null) ...<Widget>[
                                  const SizedBox(height: DesignTokens.space2),
                                  Text(
                                    atual.leitura.autor!,
                                    textAlign: TextAlign.center,
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      color: theme.secondaryText,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: DesignTokens.space12),
                                _Cronometro(tempo: sessao.tempoLido, parado: pausada),
                                if (pausada && restante != null) ...<Widget>[
                                  const SizedBox(height: DesignTokens.space4),
                                  _LinhaDaPausa(restante: restante),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                      ...pausada ? _acoesPausada() : _acoesRodando(),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  List<Widget> _acoesRodando() => <Widget>[
    BotaoTextual(
      texto: TextosDoModoDeFoco.pausar,
      icone: PhosphorIconsRegular.pause,
      larguraTotal: true,
      onPressed: _escolherPausa,
    ),
    const SizedBox(height: DesignTokens.space3),
    BotaoPrimario(
      texto: TextosDoModoDeFoco.encerrar,
      onPressed: () => abrirEncerramentoDaSessao(context, sessao),
    ),
    const SizedBox(height: DesignTokens.space3),
    BotaoTextual(
      texto: TextosDoModoDeFoco.cancelar,
      neutro: true,
      larguraTotal: true,
      onPressed: _cancelar,
    ),
  ];

  List<Widget> _acoesPausada() => <Widget>[
    BotaoTextual(
      texto: TextosDoModoDeFoco.encerrar,
      icone: PhosphorIconsRegular.stop,
      larguraTotal: true,
      onPressed: () => abrirEncerramentoDaSessao(context, sessao),
    ),
    const SizedBox(height: DesignTokens.space3),
    BotaoPrimario(
      texto: TextosDoModoDeFoco.retomar,
      icone: PhosphorIconsRegular.play,
      onPressed: sessao.retomar,
    ),
    const SizedBox(height: DesignTokens.space3),
    BotaoTextual(
      texto: TextosDoModoDeFoco.cancelar,
      neutro: true,
      larguraTotal: true,
      onPressed: _cancelar,
    ),
  ];
}

class _Cronometro extends StatelessWidget {
  final Duration tempo;
  final bool parado;

  const _Cronometro({required this.tempo, required this.parado});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      label: TextosDoModoDeFoco.rotuloDoCronometro(tempo),
      excludeSemantics: true,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          formatarCronometro(tempo),
          maxLines: 1,
          style: theme.numInline.copyWith(
            fontSize: _tamanhoDoCronometro,
            height: 1,
            color: parado ? theme.secondaryText : theme.colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
}

class _LinhaDaPausa extends StatelessWidget {
  final Duration restante;

  const _LinhaDaPausa({required this.restante});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text.rich(
      TextSpan(
        text: TextosDoModoDeFoco.pausaTerminaEm,
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
        children: <InlineSpan>[TextSpan(text: formatarContagem(restante), style: theme.numInline)],
      ),
      textAlign: TextAlign.center,
    );
  }
}

class _CabecalhoDaPausa extends StatelessWidget {
  const _CabecalhoDaPausa();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(TextosDoModoDeFoco.tituloDaPausa, style: theme.textTheme.titleMedium),
        const SizedBox(height: DesignTokens.space2),
        Text(
          TextosDoModoDeFoco.textoDaPausa,
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
        ),
      ],
    );
  }
}
