import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/faixa_informativa.dart';
import '../../design/widgets/folha_inferior.dart';
import '../progresso/regras.dart';
import '../progresso/registrar_progresso.dart';
import '../progresso/textos.dart';
import 'regras.dart';
import 'sessao_controller.dart';
import 'textos.dart';

const Duration _intervaloDoRelogio = Duration(seconds: 1);
const double _larguraDaCapa = 60;
const double _alturaDaCapa = 90;
const double _iconeDaLinha = 20;
const double _iconeDoDerivado = 16;

mixin RelogioDaSessao<T extends StatefulWidget> on State<T> {
  SessaoController get sessao;

  Timer? _relogio;

  @override
  void initState() {
    super.initState();
    sessao.addListener(_redesenhar);
    _relogio = Timer.periodic(_intervaloDoRelogio, (_) {
      sessao.reavaliar();
      _redesenhar();
    });
  }

  @override
  void dispose() {
    _relogio?.cancel();
    sessao.removeListener(_redesenhar);
    super.dispose();
  }

  void _redesenhar() {
    if (mounted) {
      setState(() {});
    }
  }
}

mixin EncerramentoDaSessao<T extends StatefulWidget> on State<T> {
  SessaoController get sessao;

  final TextEditingController pagina = TextEditingController();
  final FocusNode focoDaPagina = FocusNode();
  String? _erroLocal;

  String? get erroDaPagina => _erroLocal ?? sessao.erroDaPagina;

  @override
  void initState() {
    super.initState();
    sessao.limparErro();
    sessao.addListener(_aoMudar);
    pagina.addListener(_aoDigitar);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        focoDaPagina.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    sessao.removeListener(_aoMudar);
    pagina.dispose();
    focoDaPagina.dispose();
    super.dispose();
  }

  void _aoMudar() {
    if (mounted) {
      setState(() {});
    }
  }

  void _aoDigitar() => setState(() => _erroLocal = null);

  Future<bool> salvarEncerramento() async {
    final leitura = sessao.sessao?.leitura;
    if (leitura == null) {
      return false;
    }
    final valor = inteiroDoCampo(pagina.text);
    final erro = validarPaginaDaSessao(sessao.paginaBase, leitura.totalPaginas, valor);
    setState(() => _erroLocal = erro);
    if (erro != null || valor == null) {
      return false;
    }
    return sessao.encerrar(valor);
  }

  String rotuloDoSalvar(String padrao) {
    if (sessao.salvando) {
      return TextosDoRegistro.botaoSalvando;
    }
    return inteiroDoCampo(pagina.text) == sessao.paginaBase
        ? TextosDoEncerramento.encerrarSemRegistrar
        : padrao;
  }
}

class CartaoDoLivroDaSessao extends StatelessWidget {
  final LeituraDoRegistro leitura;
  final int paginaBase;

  const CartaoDoLivroDaSessao({super.key, required this.leitura, required this.paginaBase});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        CapaLivro(url: leitura.capaUrl, largura: _larguraDaCapa, altura: _alturaDaCapa),
        const SizedBox(width: DesignTokens.space4),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                leitura.titulo,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium,
              ),
              if (leitura.autor != null) Text(leitura.autor!, style: legenda),
              const SizedBox(height: DesignTokens.space1),
              Text(rotuloPaginaDeTotal(paginaBase, leitura.totalPaginas), style: legenda),
            ],
          ),
        ),
      ],
    );
  }
}

class LinhaDoTempoDaSessao extends StatelessWidget {
  final Duration tempo;

  const LinhaDoTempoDaSessao({super.key, required this.tempo});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: <Widget>[
        Icon(PhosphorIconsRegular.timer, size: _iconeDaLinha, color: theme.secondaryText),
        const SizedBox(width: DesignTokens.space2),
        Expanded(
          child: Text(
            atingiuOLimite(tempo)
                ? TextosDoEncerramento.tempoNoLimite
                : TextosDoEncerramento.tempoDeLeitura(minutosDaSessao(tempo)),
            style: theme.textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }
}

class CamposDoEncerramento extends StatelessWidget {
  final TextEditingController pagina;
  final FocusNode foco;
  final int paginaBase;
  final int totalPaginas;
  final Duration tempo;
  final String? erro;
  final bool salvando;

  const CamposDoEncerramento({
    super.key,
    required this.pagina,
    required this.foco,
    required this.paginaBase,
    required this.totalPaginas,
    required this.tempo,
    required this.erro,
    required this.salvando,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final valor = inteiroDoCampo(pagina.text);
    final rotuloDoTempo = rotuloDoTempoDaSessao(tempo);
    final lidas = valor != null && valor <= totalPaginas ? paginasLidas(paginaBase, valor) : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        CampoTexto(
          controller: pagina,
          label: TextosDoRegistro.rotuloPagina,
          focusNode: foco,
          keyboardType: TextInputType.number,
          inputFormatters: <TextInputFormatter>[FilteringTextInputFormatter.digitsOnly],
          readOnly: salvando,
          estiloDoTexto: theme.numInline,
          erro: erro,
          erroAntesDoHelper: true,
          helper: TextosDoEncerramento.ajudaPagina(paginaBase, totalPaginas),
        ),
        if (erro == null && valor == paginaBase) ...<Widget>[
          const SizedBox(height: DesignTokens.space4),
          FaixaInformativa(mensagem: TextosDoEncerramento.mesmaPagina(paginaBase, rotuloDoTempo)),
        ] else if (erro == null && lidas != null) ...<Widget>[
          const SizedBox(height: DesignTokens.space4),
          Row(
            children: <Widget>[
              Icon(
                PhosphorIconsRegular.calculator,
                size: _iconeDoDerivado,
                color: theme.tertiaryText,
              ),
              const SizedBox(width: DesignTokens.space2),
              Expanded(
                child: Text(
                  TextosDoEncerramento.derivado(lidas, rotuloDoTempo),
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class ErroDeEnvioDaSessao extends StatelessWidget {
  final String mensagem;

  const ErroDeEnvioDaSessao({super.key, required this.mensagem});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: DesignTokens.space2),
      child: Text(
        mensagem,
        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
      ),
    );
  }
}

Future<void> abrirEncerramentoDaSessao(BuildContext context, SessaoController sessao) {
  return mostrarFolhaInferior<void>(
    Navigator.of(context, rootNavigator: true).context,
    semMovimento: true,
    builder: (context) => FolhaDeEncerramento(sessao: sessao),
  );
}

class FolhaDeEncerramento extends StatefulWidget {
  final SessaoController sessao;

  const FolhaDeEncerramento({super.key, required this.sessao});

  @override
  State<FolhaDeEncerramento> createState() => _FolhaDeEncerramentoState();
}

class _FolhaDeEncerramentoState extends State<FolhaDeEncerramento>
    with RelogioDaSessao<FolhaDeEncerramento>, EncerramentoDaSessao<FolhaDeEncerramento> {
  @override
  SessaoController get sessao => widget.sessao;

  Future<void> _salvar() async {
    final encerrada = await salvarEncerramento();
    if (encerrada && mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final atual = sessao.sessao;
    if (atual == null) {
      return const SizedBox.shrink();
    }
    final salvando = sessao.salvando;
    final erroDeEnvio = sessao.erroDeEnvio;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Semantics(
              header: true,
              child: Text(TextosDoEncerramento.titulo, style: theme.textTheme.titleLarge),
            ),
            const SizedBox(height: DesignTokens.space4),
            CartaoDoLivroDaSessao(leitura: atual.leitura, paginaBase: sessao.paginaBase),
            const SizedBox(height: DesignTokens.space4),
            LinhaDoTempoDaSessao(tempo: sessao.tempoRegistravel),
            Divider(height: DesignTokens.space4 * 2, color: theme.divider),
            CamposDoEncerramento(
              pagina: pagina,
              foco: focoDaPagina,
              paginaBase: sessao.paginaBase,
              totalPaginas: atual.leitura.totalPaginas,
              tempo: sessao.tempoRegistravel,
              erro: erroDaPagina,
              salvando: salvando,
            ),
            const SizedBox(height: DesignTokens.space6),
            BotaoPrimario(
              texto: rotuloDoSalvar(TextosDoEncerramento.salvarEEncerrar),
              carregando: salvando,
              onPressed: _salvar,
            ),
            if (erroDeEnvio != null) ErroDeEnvioDaSessao(mensagem: erroDeEnvio),
            if (!salvando) ...<Widget>[
              const SizedBox(height: DesignTokens.space3),
              BotaoTextual(
                texto: TextosDoEncerramento.voltarASessao,
                larguraTotal: true,
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
