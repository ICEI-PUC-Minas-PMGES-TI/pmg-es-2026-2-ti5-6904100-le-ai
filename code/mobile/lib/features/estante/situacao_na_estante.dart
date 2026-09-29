import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/cartao_progresso.dart';
import '../progresso/rotas_progresso.dart';
import 'acoes_leitura.dart';
import 'cartao_estante.dart';
import 'estante_service.dart';
import 'textos.dart';

const int _percentualMaximo = 100;

enum _Carga { carregando, pronta, falha }

class SituacaoNaEstante extends StatefulWidget {
  final EstanteService servico;
  final String livroId;
  final LivroDaEstante livro;
  final DependenciasDeProgresso? progresso;
  final ValueChanged<String>? aoVerAtualizacoes;

  const SituacaoNaEstante({
    super.key,
    required this.servico,
    required this.livroId,
    required this.livro,
    this.progresso,
    this.aoVerAtualizacoes,
  });

  @override
  State<SituacaoNaEstante> createState() => _SituacaoNaEstanteState();
}

class _SituacaoNaEstanteState extends State<SituacaoNaEstante> {
  _Carga _carga = _Carga.carregando;
  ItemEstante? _item;
  bool _abrindoProgresso = false;
  String? _erroDoProgresso;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar() async {
    setState(() => _carga = _Carga.carregando);
    try {
      final item = await widget.servico.itemDaEstante(widget.livroId);
      if (mounted) {
        setState(() {
          _item = item;
          _carga = _Carga.pronta;
        });
      }
    } on ApiException {
      if (mounted) {
        setState(() => _carga = _Carga.falha);
      }
    }
  }

  Future<void> _abrirAcoes() async {
    final item = _item;
    final progresso = widget.progresso;
    final aoVerAtualizacoes = widget.aoVerAtualizacoes;
    final novo = await abrirAcoesDeLeitura(
      context,
      servico: widget.servico,
      livro: LivroDaAcao(
        livroId: widget.livroId,
        livro: widget.livro,
        status: item?.status,
        leituraId: item?.leituraParaAcoes,
      ),
      aoRegistrarProgresso: progresso == null
          ? null
          : (leitura) => _registrarProgresso(progresso, leitura),
      aoVerAtualizacoes: aoVerAtualizacoes == null
          ? null
          : (leitura) => aoVerAtualizacoes(leitura.id),
    );
    if (novo != null && mounted) {
      await _carregar();
    }
  }

  Future<void> _registrarProgresso(DependenciasDeProgresso progresso, Leitura leitura) async {
    final resultado = await registrarProgressoDaLeitura(
      context,
      progresso: progresso,
      leitura: leitura,
      livro: widget.livro,
    );
    if (resultado != null && mounted) {
      await _carregar();
    }
  }

  Future<void> _registrarProgressoDaLeituraAberta(
    DependenciasDeProgresso progresso,
    String leituraId,
  ) async {
    setState(() {
      _abrindoProgresso = true;
      _erroDoProgresso = null;
    });
    try {
      final leitura = await widget.servico.detalharLeitura(leituraId);
      if (!mounted) {
        return;
      }
      setState(() => _abrindoProgresso = false);
      await _registrarProgresso(progresso, leitura);
    } on ApiException {
      if (mounted) {
        setState(() {
          _abrindoProgresso = false;
          _erroDoProgresso = TextosDeAcao.erroAoCarregar;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (_carga) {
      case _Carga.carregando:
        return const ExcludeSemantics(
          child: Column(
            children: <Widget>[
              BarraSkeleton(altura: 24, fracaoDaLargura: 0.3),
              SizedBox(height: DesignTokens.space3),
              BarraSkeleton(altura: 48, fracaoDaLargura: 1),
            ],
          ),
        );
      case _Carga.falha:
        return Column(
          children: <Widget>[
            const BannerAviso(variante: VarianteAviso.erro, mensagem: TextosDaEstante.erroSituacao),
            BotaoTextual(texto: TextosDaEstante.erroBotao, onPressed: _carregar),
          ],
        );
      case _Carga.pronta:
        return _pronta(Theme.of(context));
    }
  }

  Widget _pronta(ThemeData theme) {
    final item = _item;
    final progresso = widget.progresso;
    final leituraAberta = item != null && item.status.emAndamento
        ? item.leituraEmAndamentoId
        : null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (item != null) ...<Widget>[
          Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: DesignTokens.space3,
            runSpacing: DesignTokens.space2,
            children: <Widget>[
              PillStatus(status: item.status),
              if (item.vezesLido > 0)
                Text(
                  textoVezesLido(item.vezesLido),
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                ),
            ],
          ),
          if (item.status.emAndamento) ...<Widget>[
            const SizedBox(height: DesignTokens.space3),
            _progresso(item),
          ],
          const SizedBox(height: DesignTokens.space4),
        ],
        if (_erroDoProgresso != null) ...<Widget>[
          BannerAviso(variante: VarianteAviso.erro, mensagem: _erroDoProgresso!),
          const SizedBox(height: DesignTokens.space2),
        ],
        if (item == null)
          BotaoPrimario(texto: AcoesDeLeitura.adicionarAEstante, onPressed: _abrirAcoes)
        else if (leituraAberta != null && progresso != null)
          BotaoPrimario(
            texto: AcoesDeLeitura.registrarProgresso,
            carregando: _abrindoProgresso,
            onPressed: () => _registrarProgressoDaLeituraAberta(progresso, leituraAberta),
          ),
        if (item != null) BotaoTextual(texto: AcoesDeLeitura.abrir, onPressed: _abrirAcoes),
      ],
    );
  }

  Widget _progresso(ItemEstante item) {
    final percentual = (item.percentualConcluido ?? 0).clamp(0, _percentualMaximo).roundToDouble();
    final paginaAtual = item.paginaAtual;
    final totalPaginas = item.totalPaginas;
    final rotulo = paginaAtual != null && paginaAtual > 0 && totalPaginas != null
        ? textoPaginaDe(paginaAtual, totalPaginas)
        : TextosDaEstante.progressoIniciado;
    return BarraDeProgresso(
      percentual: percentual,
      rotulo: rotulo,
      semantica: 'Progresso de ${widget.livro.titulo}',
    );
  }
}
