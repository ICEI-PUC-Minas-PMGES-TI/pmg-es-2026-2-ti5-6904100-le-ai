import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/cartao_progresso.dart';
import '../../design/widgets/dialogo_confirmacao.dart';
import '../../design/widgets/estado_vazio.dart';
import '../estante/cartao_estante.dart';
import '../estante/datas_de_leitura.dart';
import '../estante/estante_service.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/perfil_service.dart';
import '../perfil/widgets_de_perfil.dart';
import 'fila_de_progresso.dart';
import 'progresso_service.dart';
import 'registrar_progresso.dart';
import 'registro_progresso_controller.dart';
import 'regras.dart';
import 'rotas_progresso.dart';
import 'textos.dart';

const double _larguraDaCapa = 60;
const double _alturaDaCapa = 90;
const double _alvoDeToque = 48;
const double _iconeDaAcao = 20;
const double _iconeDoAviso = 16;
const double _distanciaParaCarregarMais = 300;
const int _linhasDoEsqueleto = 5;

class ProgressoPage extends StatefulWidget {
  final String leituraId;
  final DependenciasDeProgresso progresso;
  final EstanteService estante;
  final VoidCallback aoVoltar;
  final DateTime Function()? agora;

  const ProgressoPage({
    super.key,
    required this.leituraId,
    required this.progresso,
    required this.estante,
    required this.aoVoltar,
    this.agora,
  });

  @override
  State<ProgressoPage> createState() => _ProgressoPageState();
}

class _ProgressoPageState extends State<ProgressoPage> {
  late final ListaPaginada<Progresso> _lista = ListaPaginada<Progresso>(_buscar, (item) => item.id);
  late final RegistroProgressoController _exclusao = RegistroProgressoController(
    widget.progresso.servico,
  );
  ResumoProgresso? _resumo;
  bool _somenteLeitura = true;
  Leitura? _leitura;
  LivroDaEstante? _livro;
  String? _aviso;
  String? _erroDeExclusao;
  int _pendentesConhecidos = 0;

  FilaDeProgresso get _fila => widget.progresso.fila;

  @override
  void initState() {
    super.initState();
    _lista.addListener(_aoMudar);
    _fila.addListener(_aoMudarFila);
    _lista.carregar();
    _carregarLivro();
    _iniciarFila();
  }

  @override
  void dispose() {
    _fila.removeListener(_aoMudarFila);
    _lista
      ..removeListener(_aoMudar)
      ..dispose();
    _exclusao.dispose();
    super.dispose();
  }

  void _aoMudar() => setState(() {});

  Future<void> _iniciarFila() async {
    await _fila.carregar();
    if (!mounted) {
      return;
    }
    _pendentesConhecidos = _fila.pendentesDe(widget.leituraId).length;
    unawaited(_fila.sincronizar());
  }

  void _aoMudarFila() {
    final pendentes = _fila.pendentesDe(widget.leituraId).length;
    final enviou = pendentes < _pendentesConhecidos;
    _pendentesConhecidos = pendentes;
    setState(() {});
    if (enviou) {
      _lista.carregar();
    }
  }

  Future<Pagina<Progresso>> _buscar(int pagina) async {
    final resposta = await widget.progresso.servico.listar(
      widget.leituraId,
      pagina: pagina + 1,
      limite: tamanhoDaPagina,
    );
    _resumo = resposta.resumo;
    _somenteLeitura = resposta.somenteLeitura;
    return Pagina<Progresso>(
      itens: resposta.itens,
      pagina: pagina,
      totalElementos: resposta.totalItens,
      totalPaginas: resposta.totalPaginas,
    );
  }

  Future<void> _carregarLivro() async {
    try {
      final leitura = await widget.estante.detalharLeitura(widget.leituraId);
      final item = await widget.estante.itemDaEstante(leitura.livroId);
      if (mounted) {
        setState(() {
          _leitura = leitura;
          _livro = item?.livro;
        });
      }
    } on ApiException {
      if (mounted) {
        setState(() => _livro = null);
      }
    }
  }

  Future<void> _tentarDeNovo() async {
    await Future.wait(<Future<void>>[_lista.carregar(), if (_leitura == null) _carregarLivro()]);
  }

  String? get _idDoUltimo {
    for (final item in _lista.itens) {
      if (ehUltimo(_lista.itens, item.id)) {
        return item.id;
      }
    }
    return null;
  }

  LeituraDoRegistro _leituraDoRegistro(ResumoProgresso resumo) => LeituraDoRegistro(
    leituraId: widget.leituraId,
    titulo: _livro?.titulo ?? '',
    autor: _livro?.autor,
    capaUrl: _livro?.capaUrl,
    paginaAtual: resumo.paginaAtual,
    totalPaginas: resumo.totalPaginas,
  );

  Future<void> _abrirRegistro({CorrecaoDoPendente? correcao}) async {
    final resumo = _resumo;
    if (resumo == null) {
      return;
    }
    final resultado = await abrirRegistroDeProgresso(
      context,
      servico: widget.progresso.servico,
      fila: _fila,
      leitura: _leituraDoRegistro(resumo),
      correcao: correcao,
      agora: widget.agora,
    );
    if (!mounted || resultado == null) {
      return;
    }
    if (resultado is ProgressoSalvo) {
      setState(() {
        _resumo = resultado.resultado.resumo;
        _aviso = null;
      });
      await _lista.carregar();
    }
  }

  Future<void> _descartarPendente(RegistroPendente pendente) async {
    final confirmado = await confirmarNoModal(
      context,
      titulo: TextosDasAtualizacoes.descarteTitulo,
      texto: TextosDasAtualizacoes.descarteTexto(pendente.pagina),
      acao: TextosDasAtualizacoes.pendenteDescartar,
      cancelar: TextosDasAtualizacoes.botaoCancelar,
    );
    if (!confirmado || !mounted) {
      return;
    }
    await _fila.descartar(pendente.chave);
  }

  void _corrigirPendente(RegistroPendente pendente) {
    final pendentes = _fila.pendentesDe(widget.leituraId);
    final indice = pendentes.indexWhere((item) => item.chave == pendente.chave);
    final anterior = indice > 0 ? pendentes[indice - 1].pagina : _resumo?.paginaAtual ?? 0;
    _abrirRegistro(correcao: CorrecaoDoPendente(pendente, paginaAnterior: anterior));
  }

  Future<void> _pedirExclusao(Progresso item) async {
    final resumo = _resumo;
    final ultimo = _idDoUltimo;
    final alcance = resumo == null
        ? null
        : alcanceDaExclusao(_lista.itens, item.id, resumo.totalPaginas);
    if (alcance == null || ultimo == null) {
      return;
    }
    final texto = <String>[
      if (alcance.quantidade > 1) TextosDasAtualizacoes.confirmacaoAlcance(alcance.quantidade),
      TextosDasAtualizacoes.confirmacaoTexto(
        alcance.paginaResultante,
        alcance.percentualResultante,
      ),
    ].join(' ');
    setState(() => _erroDeExclusao = null);
    final confirmado = await confirmarNoModal(
      context,
      titulo: TextosDasAtualizacoes.confirmacaoTitulo,
      texto: texto,
      acao: TextosDasAtualizacoes.confirmacaoBotao,
      cancelar: TextosDasAtualizacoes.botaoCancelar,
    );
    if (!confirmado || !mounted) {
      return;
    }
    final resultado = await _exclusao.excluirTrecho(item.id, ultimoProgressoIdConfirmado: ultimo);
    if (!mounted) {
      return;
    }
    if (resultado != null) {
      setState(() {
        _resumo = resultado.resumo;
        _aviso = null;
      });
      await _lista.carregar();
      return;
    }
    if (_exclusao.precisaRecarregar) {
      setState(() => _aviso = TextosDoRegistro.erroListaDesatualizada);
      await _lista.carregar();
      return;
    }
    setState(() => _erroDeExclusao = _exclusao.erro);
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.axis == Axis.vertical &&
        notificacao.metrics.extentAfter < _distanciaParaCarregarMais) {
      _lista.carregarMais();
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final resumo = _resumo;
    final podeRegistrar = resumo != null && !_somenteLeitura;
    return Column(
      children: <Widget>[
        CabecalhoTela(
          titulo: TextosDasAtualizacoes.titulo,
          aoVoltar: widget.aoVoltar,
          acoes: <Widget>[
            if (podeRegistrar)
              IconButton(
                tooltip: TextosDoRegistro.titulo,
                onPressed: _abrirRegistro,
                icon: Icon(PhosphorIconsRegular.plusCircle, color: theme.colorScheme.onSurface),
              ),
          ],
        ),
        Expanded(
          child: NotificationListener<ScrollNotification>(
            onNotification: _pertoDoFim,
            child: ListView(
              padding: const EdgeInsets.only(bottom: DesignTokens.space10),
              children: _corpo(theme),
            ),
          ),
        ),
      ],
    );
  }

  List<Widget> _corpo(ThemeData theme) {
    final resumo = _resumo;
    if (resumo == null && _lista.falhou) {
      return <Widget>[
        Padding(
          padding: const EdgeInsets.all(DesignTokens.space5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const BannerAviso(
                variante: VarianteAviso.erro,
                mensagem: TextosDasAtualizacoes.erroTexto,
                triangulo: true,
              ),
              BotaoTextual(texto: TextosDasAtualizacoes.erroBotao, onPressed: _tentarDeNovo),
            ],
          ),
        ),
      ];
    }
    if (resumo == null) {
      return const <Widget>[_Esqueleto()];
    }
    final pendentes = _fila.pendentesDe(widget.leituraId);
    final vazio = _lista.itens.isEmpty && pendentes.isEmpty;
    final margem = const EdgeInsets.symmetric(horizontal: DesignTokens.space5);
    return <Widget>[
      Padding(
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          DesignTokens.space4,
          DesignTokens.space5,
          DesignTokens.space6,
        ),
        child: _BlocoDeResumo(
          resumo: resumo,
          livro: _livro,
          dataInicio: _leitura?.dataInicio,
          registros: _lista.total,
        ),
      ),
      Divider(height: 1, color: theme.divider),
      const SizedBox(height: DesignTokens.space6),
      Padding(
        padding: margem,
        child: Semantics(
          header: true,
          child: Text(TextosDasAtualizacoes.tituloSecao, style: theme.textTheme.titleLarge),
        ),
      ),
      const SizedBox(height: DesignTokens.space4),
      if (_aviso != null)
        Padding(
          padding: margem.copyWith(bottom: DesignTokens.space4),
          child: BannerAviso(variante: VarianteAviso.alerta, mensagem: _aviso!),
        ),
      if (_erroDeExclusao != null)
        Padding(
          padding: margem.copyWith(bottom: DesignTokens.space4),
          child: BannerAviso(variante: VarianteAviso.erro, mensagem: _erroDeExclusao!),
        ),
      if (vazio)
        EstadoVazio(
          icone: PhosphorIconsRegular.clock,
          solto: true,
          titulo: TextosDasAtualizacoes.vazioTitulo,
          texto: TextosDasAtualizacoes.vazioTexto,
          rodape: _somenteLeitura
              ? null
              : BotaoPrimario(
                  texto: TextosDasAtualizacoes.vazioBotao,
                  larguraTotal: false,
                  onPressed: _abrirRegistro,
                ),
        )
      else ...<Widget>[
        for (final pendente in pendentes.reversed)
          _LinhaPendente(
            pendente: pendente,
            aoCorrigir: () => _corrigirPendente(pendente),
            aoDescartar: () => _descartarPendente(pendente),
          ),
        for (final item in _lista.itens)
          _LinhaDeProgresso(
            item: item,
            avisoDeRitmo: precisaDeAvisoDeRitmo(_lista.itens, item.id),
            excluivel: !_somenteLeitura,
            aoExcluir: () => _pedirExclusao(item),
          ),
        Padding(
          padding: margem,
          child: FimDaLista(
            temMais: _lista.temMais,
            carregandoMais: _lista.carregandoMais,
            falhou: _lista.falhouMais,
            aoCarregar: _lista.carregarMais,
          ),
        ),
      ],
    ];
  }
}

class _BlocoDeResumo extends StatelessWidget {
  final ResumoProgresso resumo;
  final LivroDaEstante? livro;
  final String? dataInicio;
  final int registros;

  const _BlocoDeResumo({
    required this.resumo,
    required this.livro,
    required this.dataInicio,
    required this.registros,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final percentual = resumo.percentualConcluido.roundToDouble();
    final iniciada = resumo.paginaAtual == 0;
    final inicio = dataInicio;
    final detalhe = iniciada
        ? (inicio == null
              ? TextosDasAtualizacoes.iniciada
              : TextosDasAtualizacoes.iniciadaEm(dataIsoPorExtenso(inicio)))
        : rotuloPaginaDeTotal(resumo.paginaAtual, resumo.totalPaginas);
    final autor = livro?.autor;
    return Semantics(
      liveRegion: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              CapaLivro(url: livro?.capaUrl, largura: _larguraDaCapa, altura: _alturaDaCapa),
              const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      livro?.titulo ?? '',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall,
                    ),
                    if (autor != null) Text(autor, style: legenda),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.space4),
          BarraDeProgresso(
            percentual: percentual,
            rotulo: iniciada ? TextosDasAtualizacoes.iniciada : '${percentual.toInt()}%',
          ),
          const SizedBox(height: DesignTokens.space1),
          Text(detalhe, style: legenda),
          const SizedBox(height: DesignTokens.space4),
          IntrinsicHeight(
            child: Row(
              children: <Widget>[
                _Valor(
                  valor: rotuloPaginas(resumo.paginaAtual),
                  rotulo: TextosDasAtualizacoes.rotuloLidas,
                ),
                VerticalDivider(width: 1, thickness: 1, color: theme.divider),
                _Valor(
                  valor: rotuloDuracao(resumo.minutosTotais),
                  rotulo: TextosDasAtualizacoes.rotuloTempo,
                ),
                VerticalDivider(width: 1, thickness: 1, color: theme.divider),
                _Valor(
                  valor: rotuloRegistros(registros),
                  rotulo: TextosDasAtualizacoes.rotuloRegistros,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Valor extends StatelessWidget {
  final String valor;
  final String rotulo;

  const _Valor({required this.valor, required this.rotulo});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Column(
        children: <Widget>[
          Text(
            valor,
            textAlign: TextAlign.center,
            style: theme.numInline.copyWith(color: theme.colorScheme.onSurface),
          ),
          Text(
            rotulo,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
        ],
      ),
    );
  }
}

class _LinhaDeProgresso extends StatelessWidget {
  final Progresso item;
  final bool avisoDeRitmo;
  final bool excluivel;
  final VoidCallback aoExcluir;

  const _LinhaDeProgresso({
    required this.item,
    required this.avisoDeRitmo,
    required this.excluivel,
    required this.aoExcluir,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall;
    return _Linha(
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    TextosDasAtualizacoes.itemPagina(item.pagina),
                    style: theme.numInline.copyWith(color: theme.colorScheme.onSurface),
                  ),
                  Text(
                    dataIsoPorExtenso(item.dataLocal),
                    style: legenda?.copyWith(color: theme.tertiaryText),
                  ),
                ],
              ),
            ),
            const SizedBox(width: DesignTokens.space3),
            Expanded(
              child: Text(
                TextosDasAtualizacoes.itemDetalhe(item.paginasLidas, item.minutos),
                style: legenda?.copyWith(color: theme.secondaryText),
              ),
            ),
            if (excluivel)
              _AcaoDaLinha(
                icone: PhosphorIconsRegular.trash,
                rotulo: TextosDasAtualizacoes.rotuloExcluir(item.pagina),
                cor: avisoDeRitmo ? theme.warningColor : theme.secondaryText,
                aoTocar: aoExcluir,
              ),
          ],
        ),
        if (avisoDeRitmo)
          _LinhaDeAviso(
            icone: PhosphorIconsRegular.warning,
            cor: theme.warningColor,
            texto: TextosDasAtualizacoes.avisoRitmo(
              item.paginasLidas,
              item.minutos,
              item.paginaAnterior,
            ),
          ),
      ],
    );
  }
}

class _LinhaPendente extends StatelessWidget {
  final RegistroPendente pendente;
  final VoidCallback aoCorrigir;
  final VoidCallback aoDescartar;

  const _LinhaPendente({
    required this.pendente,
    required this.aoCorrigir,
    required this.aoDescartar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pausa = pendente.pausa;
    final minutos = pendente.minutos;
    return _Linha(
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                TextosDasAtualizacoes.itemPagina(pendente.pagina),
                style: theme.numInline.copyWith(color: theme.colorScheme.onSurface),
              ),
            ),
            if (minutos != null && minutos > 0)
              Text(
                rotuloDuracao(minutos),
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
          ],
        ),
        if (pausa == null)
          _LinhaDeAviso(
            icone: PhosphorIconsRegular.cloudArrowUp,
            cor: theme.warningColor,
            texto: TextosDoRegistro.avisoOffline,
          )
        else ...<Widget>[
          _LinhaDeAviso(
            icone: PhosphorIconsRegular.warning,
            cor: theme.colorScheme.error,
            texto: pausa,
          ),
          Wrap(
            spacing: DesignTokens.space4,
            children: <Widget>[
              BotaoTextual(texto: TextosDasAtualizacoes.pendenteCorrigir, onPressed: aoCorrigir),
              BotaoTextual(
                texto: TextosDasAtualizacoes.pendenteDescartar,
                destrutivo: true,
                onPressed: aoDescartar,
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _Linha extends StatelessWidget {
  final List<Widget> children;

  const _Linha({required this.children});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Theme.of(context).divider)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: DesignTokens.space5,
          vertical: DesignTokens.space4,
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
      ),
    );
  }
}

class _LinhaDeAviso extends StatelessWidget {
  final IconData icone;
  final Color cor;
  final String texto;

  const _LinhaDeAviso({required this.icone, required this.cor, required this.texto});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: DesignTokens.space2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icone, size: _iconeDoAviso, color: cor),
          const SizedBox(width: DesignTokens.space2),
          Expanded(
            child: Text(texto, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cor)),
          ),
        ],
      ),
    );
  }
}

class _AcaoDaLinha extends StatelessWidget {
  final IconData icone;
  final String rotulo;
  final Color cor;
  final VoidCallback aoTocar;

  const _AcaoDaLinha({
    required this.icone,
    required this.rotulo,
    required this.cor,
    required this.aoTocar,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: rotulo,
      onPressed: aoTocar,
      constraints: const BoxConstraints.tightFor(width: _alvoDeToque, height: _alvoDeToque),
      icon: Icon(icone, size: _iconeDaAcao, color: cor),
    );
  }
}

class _Esqueleto extends StatelessWidget {
  const _Esqueleto();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      label: TextosDasAtualizacoes.titulo,
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.all(DesignTokens.space5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Container(
                    width: _larguraDaCapa,
                    height: _alturaDaCapa,
                    color: theme.coverPlaceholder,
                  ),
                  const SizedBox(width: DesignTokens.space4),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        BarraSkeleton(altura: 16, fracaoDaLargura: 0.7),
                        SizedBox(height: DesignTokens.space2),
                        BarraSkeleton(altura: 14, fracaoDaLargura: 0.45),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: DesignTokens.space4),
              const BarraSkeleton(altura: 6, fracaoDaLargura: 1),
              const SizedBox(height: DesignTokens.space4),
              const BarraSkeleton(altura: 16, fracaoDaLargura: 1),
              const SizedBox(height: DesignTokens.space8),
              for (var linha = 0; linha < _linhasDoEsqueleto; linha++) ...<Widget>[
                const BarraSkeleton(altura: 18, fracaoDaLargura: 0.3),
                const SizedBox(height: DesignTokens.space2),
                const BarraSkeleton(altura: 13, fracaoDaLargura: 0.25),
                const SizedBox(height: DesignTokens.space5),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
