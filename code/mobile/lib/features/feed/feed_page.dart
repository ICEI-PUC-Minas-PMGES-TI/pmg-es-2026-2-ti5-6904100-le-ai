import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/estado_vazio.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/perfil_service.dart';
import '../perfil/widgets_de_perfil.dart';
import 'curtidas_otimistas.dart';
import 'folha_comentarios.dart';
import 'item_atividade.dart';
import 'social_service.dart';

/// Feed (RF-SOC-09..12), a partir de docs/design/periodo-1/F-FEED/feed.md §4, com a mesma
/// lógica da web (`FeedView.vue`): lista cronológica paginada por rolagem, curtir otimista (o item
/// muda no toque e o último toque vale, ver [CurtidasOtimistas]) e comentários em bottom sheet.
class FeedPage extends StatefulWidget {
  final SocialService social;
  final PerfilService perfil;
  final void Function(String username) aoAbrirAutor;
  final void Function(Atividade atividade) aoAbrirLivro;
  final VoidCallback aoBuscarLeitor;
  final VoidCallback aoVerEstante;

  const FeedPage({
    super.key,
    required this.social,
    required this.perfil,
    required this.aoAbrirAutor,
    required this.aoAbrirLivro,
    required this.aoBuscarLeitor,
    required this.aoVerEstante,
  });

  @override
  State<FeedPage> createState() => _FeedPageState();
}

class _FeedPageState extends State<FeedPage> {
  late final ListaPaginada<Atividade> _lista = ListaPaginada<Atividade>(
    widget.social.listarFeed,
    (atividade) => atividade.id,
  );
  late final CurtidasOtimistas _curtidas = CurtidasOtimistas(
    widget.social,
    atual: (id) {
      for (final item in _lista.itens) {
        if (item.id == id) {
          return item;
        }
      }
      return null;
    },
    substituir: _lista.substituir,
    aoFalhar: (erro) {
      if (mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(erro.message)));
      }
    },
  );

  /// `Atividade` não diz se o leitor segue alguém; o perfil só é buscado quando a lista vem vazia.
  bool? _segueAlguem;

  @override
  void initState() {
    super.initState();
    _lista.addListener(_redesenhar);
    _carregar();
  }

  @override
  void dispose() {
    _curtidas.descartarPendentes();
    _lista.dispose();
    super.dispose();
  }

  void _redesenhar() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _carregar() async {
    _curtidas.descartarPendentes();
    await _lista.carregar();
    if (_lista.falhou || _lista.itens.isNotEmpty) {
      return;
    }
    bool segue;
    try {
      segue = (await widget.perfil.obterMeuPerfil()).seguidos > 0;
    } on ApiException {
      segue = true;
    }
    if (mounted) {
      setState(() => _segueAlguem = segue);
    }
  }

  Future<void> _abrirComentarios(Atividade atividade) async {
    await mostrarComentarios(
      context,
      social: widget.social,
      perfil: widget.perfil,
      atividade: atividade,
      aoComentar: () => _alterarTotalDeComentarios(atividade, 1),
      aoExcluir: (quantidade) => _alterarTotalDeComentarios(atividade, -quantidade),
      aoAbrirPerfil: widget.aoAbrirAutor,
    );
  }

  void _alterarTotalDeComentarios(Atividade atividade, int delta) {
    final atual = _lista.itens.firstWhere(
      (item) => item.id == atividade.id,
      orElse: () => atividade,
    );
    _lista.substituir(atual.copiar(totalComentarios: atual.totalComentarios + delta));
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.extentAfter < 600) {
      _lista.carregarMais();
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    if (_lista.carregando) {
      return const _SkeletonDoFeed(
        key: ValueKey<String>('skeleton-do-feed'),
        itens: 3,
      );
    }
    if (_lista.falhou) {
      return ListView(
        padding: const EdgeInsets.all(DesignTokens.space5),
        children: <Widget>[
          BannerAviso(
            variante: VarianteAviso.erro,
            triangulo: true,
            mensagem: 'Não foi possível carregar seu feed. Verifique sua conexão e tente de novo.',
            acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
          ),
        ],
      );
    }
    if (_lista.itens.isEmpty) {
      return _segueAlguem == null ? const SizedBox.shrink() : _vazio();
    }
    final itens = _lista.itens;
    return RefreshIndicator(
      onRefresh: _carregar,
      child: NotificationListener<ScrollNotification>(
        onNotification: _pertoDoFim,
        child: ListView.builder(
          itemCount: itens.length + 1,
          itemBuilder: (context, indice) {
            if (indice == itens.length) {
              return Semantics(
                liveRegion: true,
                child: FimDaLista(
                  temMais: _lista.temMais && _lista.falhouMais,
                  carregandoMais: _lista.carregandoMais,
                  falhou: _lista.falhouMais,
                  aoCarregar: _lista.carregarMais,
                  esqueleto: const _SkeletonDoFeed(itens: 1, rolavel: false),
                ),
              );
            }
            final atividade = itens[indice];
            return ItemAtividade(
              key: ValueKey<String>(atividade.id),
              atividade: atividade,
              aoCurtir: () => _curtidas.alternar(atividade),
              aoDescurtir: () => _curtidas.alternar(atividade),
              aoComentar: () => _abrirComentarios(atividade),
              aoAbrirAutor: () => widget.aoAbrirAutor(atividade.autor.username),
              aoAbrirLivro: () => widget.aoAbrirLivro(atividade),
            );
          },
        ),
      ),
    );
  }

  Widget _vazio() {
    final segue = _segueAlguem!;
    return CustomScrollView(
      slivers: <Widget>[
        SliverFillRemaining(
          hasScrollBody: false,
          child: Padding(
            padding: const EdgeInsets.all(DesignTokens.space5),
            child: Center(
              child: EstadoVazio(
                solto: true,
                icone: segue ? PhosphorIconsRegular.clock : PhosphorIconsRegular.newspaper,
                titulo: segue ? 'Nada por aqui ainda' : 'Comece seguindo leitores',
                texto: segue
                    ? 'Quando quem você segue começar, terminar ou resenhar um livro, aparece aqui.'
                    : 'As atividades de quem você segue aparecem aqui, da mais recente para a mais '
                          'antiga.',
                rodape: segue
                    ? BotaoTextual(texto: 'Ver minha estante', onPressed: widget.aoVerEstante)
                    : BotaoPrimario(
                        texto: 'Buscar por nome de usuário',
                        larguraTotal: false,
                        onPressed: widget.aoBuscarLeitor,
                      ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Skeleton estático do item (feed.md §4.6): círculo de 40px, duas barras, capa de 80 por 120px
/// com duas barras ao lado e os dois botões de ação. Um único fade de entrada, sem shimmer.
class _SkeletonDoFeed extends StatelessWidget {
  final int itens;
  final bool rolavel;

  const _SkeletonDoFeed({super.key, required this.itens, this.rolavel = true});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget barra(double largura, double altura) => Container(
      width: largura,
      height: altura,
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
      ),
    );
    Widget pill() => Container(
      width: 64,
      height: 32,
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
      ),
    );
    final item = Container(
      padding: const EdgeInsets.all(DesignTokens.space5),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.divider))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: theme.elevatedSurface, shape: BoxShape.circle),
              ),
              const SizedBox(width: DesignTokens.space3),
              barra(140, 17),
            ],
          ),
          const SizedBox(height: DesignTokens.space2),
          barra(180, 15),
          const SizedBox(height: DesignTokens.space3),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Container(width: 80, height: 120, color: theme.coverPlaceholder),
              const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    barra(double.infinity, 15),
                    const SizedBox(height: DesignTokens.space2),
                    barra(120, 15),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.space4),
          Row(children: <Widget>[pill(), const SizedBox(width: DesignTokens.space3), pill()]),
        ],
      ),
    );
    final conteudo = <Widget>[for (var i = 0; i < itens; i++) item];
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: DesignTokens.durBase,
      curve: DesignTokens.easeOut,
      builder: (context, opacidade, filho) => Opacity(opacity: opacidade, child: filho),
      child: Semantics(
        label: 'Carregando',
        child: rolavel
            ? ListView(physics: const NeverScrollableScrollPhysics(), children: conteudo)
            : Column(children: conteudo),
      ),
    );
  }
}
