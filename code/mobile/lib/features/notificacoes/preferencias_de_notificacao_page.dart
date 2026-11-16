import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/linha_de_interruptor.dart';
import 'icone_da_notificacao.dart';
import 'preferencias_de_notificacao.dart';
import 'preferencias_de_notificacao_controller.dart';
import 'preferencias_de_notificacao_service.dart';
import 'servico_de_push.dart';

const String _textoDeAbertura =
    'Escolha o que você quer receber. Desligar um tipo vale para a lista do app e para as '
    'notificações no celular.';
const String _notaDeRodape = 'Desligar um tipo não apaga as notificações que você já recebeu.';
const String _erroAoSalvar = 'Não foi possível salvar. Verifique sua conexão e tente de novo.';
const String _erroAoCarregar =
    'Não foi possível carregar suas preferências. Verifique sua conexão e tente de novo.';
const String _tituloDoAvisoDePush = 'As notificações no celular estão desligadas';
const String _textoDoAvisoDePush =
    'Você continua recebendo na lista do app tudo o que estiver ligado aqui. Para receber também '
    'fora dele, permita as notificações do Lê Ai nos ajustes do Android.';
const String _rotuloDosAjustes = 'Abrir ajustes do Android';
const String _dicaDosAjustes = 'Sai do aplicativo';
const String _rotuloTentarDeNovo = 'Tentar de novo';

const int _linhasDoSkeleton = 5;
const double _alturaDaLinhaDoSkeleton = 72;
const double _larguraDoInterruptorNoSkeleton = 52;
const double _alturaDoInterruptorNoSkeleton = 32;
const double _iconeDoSkeleton = 24;
const double _alturaDoTituloDoSkeleton = 12;
const double _fracaoDoTituloDoSkeleton = 0.3;
const double _alturaDoNomeNoSkeleton = 15;
const double _fracaoDoNomeNoSkeleton = 0.55;
const double _alturaDaDescricaoNoSkeleton = 13;
const double _fracaoDaDescricaoNoSkeleton = 0.8;

class PreferenciasDeNotificacaoPage extends StatefulWidget {
  final PreferenciasDeNotificacaoService servico;
  final ServicoDePush? servicoDePush;
  final VoidCallback? aoVoltar;

  const PreferenciasDeNotificacaoPage({
    super.key,
    required this.servico,
    this.servicoDePush,
    this.aoVoltar,
  });

  @override
  State<PreferenciasDeNotificacaoPage> createState() => _PreferenciasDeNotificacaoPageState();
}

class _PreferenciasDeNotificacaoPageState extends State<PreferenciasDeNotificacaoPage>
    with WidgetsBindingObserver {
  late final PreferenciasDeNotificacaoController _controller =
      PreferenciasDeNotificacaoController(widget.servico, widget.servicoDePush);
  final ScrollController _rolagem = ScrollController();
  bool _rolada = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _rolagem.addListener(_aoRolar);
    _controller.addListener(_redesenhar);
    _controller.carregar();
    _controller.verificarPermissao();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _rolagem.dispose();
    _controller.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState estado) {
    if (estado == AppLifecycleState.resumed) {
      _controller.verificarPermissao();
    }
  }

  void _redesenhar() {
    if (mounted) {
      setState(() {});
    }
  }

  void _aoRolar() {
    final rolada = _rolagem.offset > 0;
    if (rolada != _rolada) {
      setState(() => _rolada = rolada);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: 'Notificações', aoVoltar: widget.aoVoltar, semDivisor: !_rolada),
        Expanded(
          child: SingleChildScrollView(
            controller: _rolagem,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                const _Abertura(),
                ..._corpo(),
              ],
            ),
          ),
        ),
      ],
    );
  }

  List<Widget> _corpo() {
    switch (_controller.estado) {
      case EstadoDasPreferencias.carregando:
        return const <Widget>[EntradaSuave(child: _SkeletonDasPreferencias())];
      case EstadoDasPreferencias.erro:
        return <Widget>[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
            child: BannerAviso(
              variante: VarianteAviso.erro,
              triangulo: true,
              mensagem: _erroAoCarregar,
              acao: BotaoTextual(texto: _rotuloTentarDeNovo, onPressed: _controller.carregar),
            ),
          ),
        ];
      case EstadoDasPreferencias.pronta:
        return <Widget>[
          if (_controller.pushNegado) _avisoDePush(),
          for (final secao in SecaoDePreferencias.values) _secao(secao),
          const _NotaDeRodape(),
        ];
    }
  }

  Widget _avisoDePush() {
    return Padding(
      padding: const EdgeInsets.only(
        left: DesignTokens.space5,
        right: DesignTokens.space5,
        bottom: DesignTokens.space6,
      ),
      child: BannerAviso(
        variante: VarianteAviso.alerta,
        icone: PhosphorIconsRegular.bellSlash,
        titulo: _tituloDoAvisoDePush,
        mensagem: _textoDoAvisoDePush,
        acao: Semantics(
          hint: _dicaDosAjustes,
          child: BotaoTextual(
            texto: _rotuloDosAjustes,
            icone: PhosphorIconsRegular.arrowSquareOut,
            onPressed: widget.servicoDePush?.abrirAjustesDeNotificacao,
          ),
        ),
      ),
    );
  }

  Widget _secao(SecaoDePreferencias secao) {
    final tipos = TipoPreferenciaNotificacao.daSecao(secao);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        _TituloDeSecao(texto: secao.titulo, primeira: secao == SecaoDePreferencias.values.first),
        for (final tipo in tipos)
          LinhaDeInterruptor(
            icone: _icone(tipo),
            titulo: tipo.rotulo,
            descricao: tipo.descricao,
            ligado: _controller.habilitada(tipo),
            erro: _controller.falhouAoSalvar(tipo) ? _erroAoSalvar : null,
            comDivisor: tipo != tipos.last,
            aoAlternar: () => _controller.alternar(tipo),
          ),
      ],
    );
  }

  IconData _icone(TipoPreferenciaNotificacao tipo) {
    final notificacao = tipo.notificacao;
    return notificacao == null
        ? PhosphorIconsRegular.flame
        : iconeDaNotificacao(notificacao);
  }
}

class _Abertura extends StatelessWidget {
  const _Abertura();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space2,
        DesignTokens.space5,
        DesignTokens.space6,
      ),
      child: Text(
        _textoDeAbertura,
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
      ),
    );
  }
}

class _TituloDeSecao extends StatelessWidget {
  final String texto;
  final bool primeira;

  const _TituloDeSecao({required this.texto, required this.primeira});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        DesignTokens.space5,
        primeira ? 0 : DesignTokens.space6,
        DesignTokens.space5,
        DesignTokens.space3,
      ),
      child: Semantics(
        header: true,
        child: Text(texto, style: Theme.of(context).textTheme.labelMedium),
      ),
    );
  }
}

class _NotaDeRodape extends StatelessWidget {
  const _NotaDeRodape();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space6,
        DesignTokens.space5,
        DesignTokens.space8,
      ),
      child: Text(
        _notaDeRodape,
        style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
      ),
    );
  }
}

class _SkeletonDasPreferencias extends StatelessWidget {
  const _SkeletonDasPreferencias();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget peca({double? largura, required double altura, double raio = DesignTokens.radiusSm}) =>
        Container(
          width: largura,
          height: altura,
          decoration: BoxDecoration(
            color: theme.coverPlaceholder,
            borderRadius: BorderRadius.circular(raio),
          ),
        );
    Widget barra(double altura, double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: peca(altura: altura),
    );
    final linha = SizedBox(
      height: _alturaDaLinhaDoSkeleton,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: DesignTokens.space5,
          vertical: DesignTokens.space3,
        ),
        child: Row(
          children: <Widget>[
            peca(largura: _iconeDoSkeleton, altura: _iconeDoSkeleton),
            const SizedBox(width: DesignTokens.space4),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  barra(_alturaDoNomeNoSkeleton, _fracaoDoNomeNoSkeleton),
                  const SizedBox(height: DesignTokens.space1),
                  barra(_alturaDaDescricaoNoSkeleton, _fracaoDaDescricaoNoSkeleton),
                ],
              ),
            ),
            const SizedBox(width: DesignTokens.space4),
            peca(
              largura: _larguraDoInterruptorNoSkeleton,
              altura: _alturaDoInterruptorNoSkeleton,
              raio: DesignTokens.radiusFull,
            ),
          ],
        ),
      ),
    );
    return ExcludeSemantics(
      child: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space5,
              0,
              DesignTokens.space5,
              DesignTokens.space3,
            ),
            child: barra(_alturaDoTituloDoSkeleton, _fracaoDoTituloDoSkeleton),
          ),
          for (var item = 0; item < _linhasDoSkeleton; item++) linha,
        ],
      ),
    );
  }
}
