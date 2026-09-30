import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/cartao_progresso.dart';
import '../../design/widgets/dialogo_confirmacao.dart';
import '../../design/widgets/folha_inferior.dart';
import 'acao_leitura_controller.dart';
import 'acoes_disponiveis.dart';
import 'cartao_estante.dart';
import 'datas_de_leitura.dart';
import 'estante_service.dart';
import 'textos.dart';

const double _larguraDaCapa = 60;
const double _alturaDaCapa = 90;
const double _alturaDaAcao = 56;
const int _anosDeHistorico = 100;

class LivroDaAcao {
  final String livroId;
  final LivroDaEstante livro;
  final StatusEstante? status;
  final String? leituraId;

  const LivroDaAcao({
    required this.livroId,
    required this.livro,
    required this.status,
    this.leituraId,
  });

  factory LivroDaAcao.doItem(ItemEstante item) => LivroDaAcao(
    livroId: item.livroId,
    livro: item.livro,
    status: item.status,
    leituraId: item.leituraParaAcoes,
  );
}

Future<EstadoDeLeitura?> abrirAcoesDeLeitura(
  BuildContext context, {
  required EstanteService servico,
  required LivroDaAcao livro,
  ValueChanged<Leitura>? aoRegistrarProgresso,
  ValueChanged<Leitura>? aoVerAtualizacoes,
  DateTime Function() agora = DateTime.now,
}) {
  return mostrarFolhaInferior<EstadoDeLeitura>(
    context,
    builder: (context) => FolhaDeAcoesDeLeitura(
      servico: servico,
      livro: livro,
      aoRegistrarProgresso: aoRegistrarProgresso,
      aoVerAtualizacoes: aoVerAtualizacoes,
      agora: agora,
    ),
  );
}

class FolhaDeAcoesDeLeitura extends StatefulWidget {
  final EstanteService servico;
  final LivroDaAcao livro;
  final ValueChanged<Leitura>? aoRegistrarProgresso;
  final ValueChanged<Leitura>? aoVerAtualizacoes;
  final DateTime Function() agora;

  const FolhaDeAcoesDeLeitura({
    super.key,
    required this.servico,
    required this.livro,
    this.aoRegistrarProgresso,
    this.aoVerAtualizacoes,
    this.agora = DateTime.now,
  });

  @override
  State<FolhaDeAcoesDeLeitura> createState() => _FolhaDeAcoesDeLeituraState();
}

class _FolhaDeAcoesDeLeituraState extends State<FolhaDeAcoesDeLeitura> {
  late final AcaoLeituraController _acao = AcaoLeituraController(widget.servico);
  Leitura? _leitura;
  bool _carregandoLeitura = false;
  bool _falhouLeitura = false;
  AcaoDisponivel? _passoDeData;

  @override
  void initState() {
    super.initState();
    _acao.addListener(_aoMudar);
    _carregarLeitura();
  }

  @override
  void dispose() {
    _acao
      ..removeListener(_aoMudar)
      ..dispose();
    super.dispose();
  }

  void _aoMudar() => setState(() {});

  Future<void> _carregarLeitura() async {
    final leituraId = widget.livro.leituraId;
    if (leituraId == null) {
      return;
    }
    setState(() {
      _carregandoLeitura = true;
      _falhouLeitura = false;
    });
    try {
      final leitura = await widget.servico.detalharLeitura(leituraId);
      if (mounted) {
        setState(() => _leitura = leitura);
      }
    } on ApiException {
      if (mounted) {
        setState(() => _falhouLeitura = true);
      }
    } finally {
      if (mounted) {
        setState(() => _carregandoLeitura = false);
      }
    }
  }

  EstadoDeLeitura get _estado => EstadoDeLeitura(status: widget.livro.status, leitura: _leitura);

  PedidoDeAcao? _pedidoDe(IdAcao id, [String? data]) {
    final livroId = widget.livro.livroId;
    final leituraId = _leitura?.id;
    final hoje = dataIso(diaLocal(widget.agora()));
    switch (id) {
      case IdAcao.adicionarQueroLer:
      case IdAcao.removerDaEstante:
        return PedidoDeAcao(acao: id, livroId: livroId);
      case IdAcao.iniciarLeitura:
      case IdAcao.iniciarReleitura:
        return PedidoDeAcao(acao: id, livroId: livroId, data: data ?? hoje);
      case IdAcao.finalizarLeitura:
      case IdAcao.finalizarReleitura:
        return leituraId == null
            ? null
            : PedidoDeAcao(
                acao: id,
                livroId: livroId,
                leituraId: leituraId,
                data: data ?? hoje,
                fusoHorarioDispositivo: fusoHorarioDoDispositivo(widget.agora()),
              );
      case IdAcao.abandonarLeitura:
      case IdAcao.abandonarReleitura:
      case IdAcao.retomarLeitura:
        return leituraId == null
            ? null
            : PedidoDeAcao(acao: id, livroId: livroId, leituraId: leituraId);
      case IdAcao.registrarProgresso:
      case IdAcao.verAtualizacoes:
        return null;
    }
  }

  Future<void> _salvar(IdAcao id, [String? data]) async {
    final pedido = _pedidoDe(id, data);
    if (pedido == null) {
      return;
    }
    final novo = await _acao.executar(pedido);
    if (novo != null && mounted) {
      Navigator.of(context).pop(novo);
    }
  }

  Future<void> _confirmar(AcaoDisponivel acao) async {
    final (String titulo, String texto) = switch (acao.id) {
      IdAcao.abandonarLeitura => (
        ConfirmacaoAbandonarLeitura.titulo,
        ConfirmacaoAbandonarLeitura.texto(_leitura?.paginaAtual ?? 0),
      ),
      IdAcao.abandonarReleitura => (
        ConfirmacaoAbandonarReleitura.titulo,
        ConfirmacaoAbandonarReleitura.texto,
      ),
      _ => (ConfirmacaoRemover.titulo, ConfirmacaoRemover.texto),
    };
    _acao.limparErro();
    final confirmado = await confirmarNoModal(
      context,
      titulo: titulo,
      texto: texto,
      acao: acao.rotulo,
      cancelar: AcoesDeLeitura.cancelar,
    );
    if (confirmado && mounted) {
      await _salvar(acao.id);
    }
  }

  void _escolher(AcaoDisponivel acao) {
    switch (acao.passo) {
      case PassoDaAcao.externo:
        final leitura = _leitura;
        final destino = _acaoExterna(acao.id);
        if (leitura == null || destino == null) {
          return;
        }
        Navigator.of(context).pop();
        destino(leitura);
      case PassoDaAcao.direto:
        _salvar(acao.id);
      case PassoDaAcao.confirmacao:
        _confirmar(acao);
      case PassoDaAcao.data:
        _acao.limparErro();
        setState(() => _passoDeData = acao);
    }
  }

  ValueChanged<Leitura>? _acaoExterna(IdAcao id) {
    final leitura = _leitura;
    switch (id) {
      case IdAcao.registrarProgresso:
        return leitura?.totalPaginas == null ? null : widget.aoRegistrarProgresso;
      case IdAcao.verAtualizacoes:
        return widget.aoVerAtualizacoes;
      default:
        return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final passo = _passoDeData;
    if (passo != null) {
      final leitura = _leitura;
      return _FormularioDeData(
        key: ValueKey<IdAcao>(passo.id),
        acao: passo,
        hoje: diaLocal(widget.agora()),
        salvando: _acao.salvando,
        erro: _acao.erro,
        aviso: passo.id.finaliza && leitura != null
            ? textoProximaConclusao(leitura.vezesLido + 1)
            : null,
        aoConfirmar: (data) => _salvar(passo.id, data),
        aoVoltar: () {
          _acao.limparErro();
          setState(() => _passoDeData = null);
        },
        aoCancelar: () => Navigator.of(context).pop(),
      );
    }
    return _lista(Theme.of(context));
  }

  Widget _lista(ThemeData theme) {
    final acoes = acoesDisponiveis(
      _estado,
    ).where((acao) => acao.passo != PassoDaAcao.externo || _acaoExterna(acao.id) != null).toList();
    final leitura = _leitura;
    final status = widget.livro.status;
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          _cabecalho(theme),
          Divider(height: DesignTokens.space5 * 2, color: theme.divider),
          if (_acao.erro != null) ...<Widget>[
            BannerAviso(variante: VarianteAviso.erro, mensagem: _acao.erro!),
            const SizedBox(height: DesignTokens.space2),
          ],
          if (_carregandoLeitura)
            const ExcludeSemantics(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: DesignTokens.space4),
                child: Column(
                  children: <Widget>[
                    BarraSkeleton(altura: 20, fracaoDaLargura: 0.6),
                    SizedBox(height: DesignTokens.space5),
                    BarraSkeleton(altura: 20, fracaoDaLargura: 0.45),
                  ],
                ),
              ),
            )
          else if (_falhouLeitura) ...<Widget>[
            const BannerAviso(variante: VarianteAviso.erro, mensagem: TextosDeAcao.erroAoCarregar),
            BotaoTextual(texto: TextosDaEstante.erroBotao, onPressed: _carregarLeitura),
          ] else
            for (final acao in acoes) ...<Widget>[
              if (acao.tom == TomDaAcao.destrutiva)
                Divider(height: DesignTokens.space4, color: theme.divider),
              _LinhaDeAcao(
                acao: acao,
                salvandoEsta: _acao.acaoEmCurso == acao.id,
                habilitada: !_acao.salvando,
                aoTocar: () => _escolher(acao),
              ),
            ],
          if (status == StatusEstante.abandonado &&
              leitura != null &&
              leitura.retomavel) ...<Widget>[
            const SizedBox(height: DesignTokens.space2),
            Text(
              textoRetomada(leitura.paginaAtual),
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          ],
        ],
      ),
    );
  }

  Widget _cabecalho(ThemeData theme) {
    final livro = widget.livro.livro;
    final status = widget.livro.status;
    final leitura = _leitura;
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final totalPaginas = leitura?.totalPaginas;
    Widget? detalhe;
    if (leitura != null && status != null && status.emAndamento && totalPaginas != null) {
      final percentual = (leitura.percentualConcluido ?? 0).roundToDouble();
      detalhe = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          BarraDeProgresso(percentual: percentual, rotulo: '${percentual.toInt()}%'),
          const SizedBox(height: DesignTokens.space1),
          Text(textoPaginaDe(leitura.paginaAtual, totalPaginas), style: legenda),
        ],
      );
    } else if (leitura != null && status == StatusEstante.lido && leitura.dataFim != null) {
      detalhe = Text(
        textoConcluido(dataIsoPorExtenso(leitura.dataFim!), leitura.vezesLido),
        style: legenda,
      );
    } else if (leitura != null && status == StatusEstante.abandonado && totalPaginas != null) {
      detalhe = Text(textoParouNaPagina(leitura.paginaAtual, totalPaginas), style: legenda);
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        CapaLivro(url: livro.capaUrl, largura: _larguraDaCapa, altura: _alturaDaCapa),
        const SizedBox(width: DesignTokens.space4),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                livro.titulo,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleSmall,
              ),
              if (livro.autor != null) ...<Widget>[
                const SizedBox(height: DesignTokens.space1),
                Text(livro.autor!, style: legenda),
              ],
              if (detalhe != null) ...<Widget>[
                const SizedBox(height: DesignTokens.space2),
                detalhe,
              ],
            ],
          ),
        ),
        if (status != null) ...<Widget>[
          const SizedBox(width: DesignTokens.space2),
          PillStatus(status: status),
        ],
      ],
    );
  }
}

class _LinhaDeAcao extends StatelessWidget {
  final AcaoDisponivel acao;
  final bool salvandoEsta;
  final bool habilitada;
  final VoidCallback aoTocar;

  const _LinhaDeAcao({
    required this.acao,
    required this.salvandoEsta,
    required this.habilitada,
    required this.aoTocar,
  });

  static const Map<IdAcao, IconData> _icones = <IdAcao, IconData>{
    IdAcao.adicionarQueroLer: PhosphorIconsRegular.bookmarkSimple,
    IdAcao.iniciarLeitura: PhosphorIconsRegular.bookOpen,
    IdAcao.registrarProgresso: PhosphorIconsRegular.plusCircle,
    IdAcao.verAtualizacoes: PhosphorIconsRegular.listBullets,
    IdAcao.finalizarLeitura: PhosphorIconsRegular.checkCircle,
    IdAcao.finalizarReleitura: PhosphorIconsRegular.checkCircle,
    IdAcao.iniciarReleitura: PhosphorIconsRegular.arrowsClockwise,
    IdAcao.retomarLeitura: PhosphorIconsRegular.play,
    IdAcao.abandonarLeitura: PhosphorIconsRegular.pauseCircle,
    IdAcao.abandonarReleitura: PhosphorIconsRegular.pauseCircle,
    IdAcao.removerDaEstante: PhosphorIconsRegular.trash,
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = switch (acao.tom) {
      TomDaAcao.principal => theme.primaryAccent,
      TomDaAcao.neutra => theme.colorScheme.onSurface,
      TomDaAcao.destrutiva => theme.colorScheme.error,
    };
    final abrePasso = acao.passo == PassoDaAcao.data || acao.passo == PassoDaAcao.externo;
    return Semantics(
      button: true,
      enabled: habilitada,
      child: InkWell(
        onTap: habilitada ? aoTocar : null,
        splashFactory: NoSplash.splashFactory,
        child: Opacity(
          opacity: habilitada || salvandoEsta ? 1 : 0.6,
          child: SizedBox(
            height: _alturaDaAcao,
            child: Row(
              children: <Widget>[
                Icon(_icones[acao.id], size: 24, color: cor),
                const SizedBox(width: DesignTokens.space4),
                Expanded(
                  child: Text(
                    salvandoEsta ? AcoesDeLeitura.salvando : acao.rotulo,
                    style: theme.textTheme.titleSmall?.copyWith(color: cor),
                  ),
                ),
                if (abrePasso)
                  Icon(PhosphorIconsRegular.caretRight, size: 20, color: theme.tertiaryText),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FormularioDeData extends StatefulWidget {
  final AcaoDisponivel acao;
  final DateTime hoje;
  final bool salvando;
  final String? erro;
  final String? aviso;
  final ValueChanged<String> aoConfirmar;
  final VoidCallback aoVoltar;
  final VoidCallback aoCancelar;

  const _FormularioDeData({
    super.key,
    required this.acao,
    required this.hoje,
    required this.salvando,
    required this.erro,
    required this.aviso,
    required this.aoConfirmar,
    required this.aoVoltar,
    required this.aoCancelar,
  });

  @override
  State<_FormularioDeData> createState() => _FormularioDeDataState();
}

class _FormularioDeDataState extends State<_FormularioDeData> {
  late DateTime _data = widget.hoje;
  late final TextEditingController _campo = TextEditingController(text: formatarDia(widget.hoje));
  String? _erroDoCampo;

  @override
  void dispose() {
    _campo.dispose();
    super.dispose();
  }

  static String formatarDia(DateTime dia) => dataIsoPorExtenso(dataIso(dia));

  Future<void> _escolherData() async {
    final escolhida = await showDatePicker(
      context: context,
      initialDate: _data,
      firstDate: DateTime(widget.hoje.year - _anosDeHistorico),
      lastDate: widget.hoje,
      helpText: widget.acao.id.finaliza
          ? TextosDeAcao.rotuloDataFim
          : TextosDeAcao.rotuloDataInicio,
    );
    if (escolhida == null || !mounted) {
      return;
    }
    setState(() {
      _data = diaLocal(escolhida);
      _campo.text = formatarDia(_data);
      _erroDoCampo = null;
    });
  }

  void _confirmar() {
    if (_data.isAfter(widget.hoje)) {
      setState(() => _erroDoCampo = ErrosDeAcao.dataNoFuturo);
      return;
    }
    widget.aoConfirmar(dataIso(_data));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final finaliza = widget.acao.id.finaliza;
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Align(
            alignment: Alignment.centerLeft,
            child: IconButton(
              tooltip: rotuloVoltarAcoes,
              onPressed: widget.salvando ? null : widget.aoVoltar,
              icon: Icon(PhosphorIconsRegular.arrowLeft, size: 20, color: theme.secondaryText),
            ),
          ),
          const SizedBox(height: DesignTokens.space2),
          Text(widget.acao.rotulo, style: theme.textTheme.titleLarge),
          const SizedBox(height: DesignTokens.space5),
          CampoTexto(
            controller: _campo,
            label: finaliza ? TextosDeAcao.rotuloDataFim : TextosDeAcao.rotuloDataInicio,
            helper: finaliza ? TextosDeAcao.ajudaDataFim : TextosDeAcao.ajudaDataInicio,
            erro: _erroDoCampo,
            readOnly: true,
            enabled: !widget.salvando,
            onTap: _escolherData,
            trailing: Icon(PhosphorIconsRegular.calendar, size: 20, color: theme.secondaryText),
          ),
          if (widget.aviso != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space5),
            Row(
              children: <Widget>[
                Icon(PhosphorIconsRegular.check, size: 16, color: theme.primaryAccent),
                const SizedBox(width: DesignTokens.space2),
                Expanded(
                  child: Text(
                    widget.aviso!,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: DesignTokens.space6),
          BotaoPrimario(
            texto: widget.salvando ? AcoesDeLeitura.salvando : widget.acao.rotulo,
            carregando: widget.salvando,
            onPressed: _confirmar,
          ),
          const SizedBox(height: DesignTokens.space3),
          BotaoTextual(
            texto: AcoesDeLeitura.cancelar,
            larguraTotal: true,
            onPressed: widget.salvando ? null : widget.aoCancelar,
          ),
          if (widget.erro != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space2),
            BannerAviso(variante: VarianteAviso.erro, mensagem: widget.erro!),
          ],
        ],
      ),
    );
  }
}
