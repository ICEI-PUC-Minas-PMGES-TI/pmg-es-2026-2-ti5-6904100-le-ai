import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/estado_vazio.dart';
import '../feed/social_service.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/textos.dart';
import '../perfil/widgets_de_perfil.dart';
import 'descarte_de_recomendacoes.dart';
import 'item_recomendacao.dart';

class RecomendacoesRecebidasPage extends StatefulWidget {
  final SocialService social;
  final VoidCallback aoVoltar;
  final Future<void> Function(String livroId) aoAbrirLivro;
  final ValueChanged<String> aoAbrirPerfil;

  const RecomendacoesRecebidasPage({
    super.key,
    required this.social,
    required this.aoVoltar,
    required this.aoAbrirLivro,
    required this.aoAbrirPerfil,
  });

  @override
  State<RecomendacoesRecebidasPage> createState() => _RecomendacoesRecebidasPageState();
}

class _RecomendacoesRecebidasPageState extends State<RecomendacoesRecebidasPage>
    with DescarteDeRecomendacoes {
  late final ListaPaginada<RecomendacaoRecebida> _lista = ListaPaginada<RecomendacaoRecebida>(
    (pagina) => widget.social.listarRecebidas(pagina),
    (recomendacao) => recomendacao.id,
  );

  @override
  SocialService get social => widget.social;

  @override
  void aoAbrirPerfilDoRemetente(String username) => widget.aoAbrirPerfil(username);

  @override
  void aoDescartada(String id) => _lista.retirar(id);

  @override
  void initState() {
    super.initState();
    _lista.addListener(_redesenhar);
    _lista.carregar();
  }

  @override
  void dispose() {
    _lista.dispose();
    super.dispose();
  }

  void _redesenhar() {
    if (mounted) {
      setState(() {});
    }
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.extentAfter < 300) {
      _lista.carregarMais();
    }
    return false;
  }

  Future<void> _abrirLivro(RecomendacaoRecebida recomendacao) async {
    await widget.aoAbrirLivro(recomendacao.livro.id);
    if (mounted) {
      await _lista.carregar();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: 'Recomendações', aoVoltar: widget.aoVoltar),
        Expanded(
          child: NotificationListener<ScrollNotification>(
            onNotification: _pertoDoFim,
            child: _conteudo(theme),
          ),
        ),
      ],
    );
  }

  Widget _conteudo(ThemeData theme) {
    Widget divisor() => Divider(height: 1, thickness: 1, color: theme.divider);
    if (_lista.carregando) {
      return EntradaSuave(
        child: ListView(
          physics: const NeverScrollableScrollPhysics(),
          children: <Widget>[
            for (var i = 0; i < 3; i++) ...<Widget>[
              if (i > 0) divisor(),
              const SkeletonDeRecomendacao(),
            ],
          ],
        ),
      );
    }
    if (_lista.falhou) {
      return ListView(
        padding: const EdgeInsets.all(DesignTokens.space5),
        children: <Widget>[
          BannerAviso(
            variante: VarianteAviso.erro,
            triangulo: true,
            mensagem:
                'Não foi possível carregar suas recomendações. Verifique sua conexão e tente de '
                'novo.',
            acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _lista.carregar),
          ),
        ],
      );
    }
    if (_lista.itens.isEmpty) {
      return CustomScrollView(
        slivers: <Widget>[
          SliverFillRemaining(
            hasScrollBody: false,
            child: Padding(
              padding: const EdgeInsets.all(DesignTokens.space5),
              child: Center(
                child: EstadoVazio(
                  icone: PhosphorIconsRegular.paperPlaneTilt,
                  solto: true,
                  titulo: 'Nenhuma recomendação agora',
                  texto:
                      'Quando um leitor que você segue e que segue você recomendar um livro, ele '
                      'aparece aqui.',
                  rodape: BotaoPrimario(texto: 'Voltar para Descobrir', onPressed: widget.aoVoltar),
                ),
              ),
            ),
          ),
        ],
      );
    }
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final itens = _lista.itens;
    return ListView.separated(
      itemCount: itens.length + 2,
      separatorBuilder: (_, indice) => indice == 0 ? const SizedBox.shrink() : divisor(),
      itemBuilder: (context, indice) {
        if (indice == 0) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space5,
              DesignTokens.space2,
              DesignTokens.space5,
              0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Recomendações saem daqui depois de 90 dias ou quando você põe o livro na '
                  'estante.',
                  style: legenda,
                ),
                const SizedBox(height: DesignTokens.space4),
                Semantics(
                  liveRegion: true,
                  child: Text(
                    contagem(_lista.total, 'recomendação', 'recomendações'),
                    style: legenda,
                  ),
                ),
              ],
            ),
          );
        }
        if (indice == itens.length + 1) {
          return FimDaLista(
            temMais: _lista.temMais,
            carregandoMais: _lista.carregandoMais,
            falhou: _lista.falhouMais,
            aoCarregar: _lista.carregarMais,
            esqueleto: const SkeletonDeRecomendacao(),
          );
        }
        final recomendacao = itens[indice - 1];
        return ItemEmDescarte(
          key: ValueKey<String>(recomendacao.id),
          descartando: estaEmDescarte(recomendacao.id),
          child: ItemRecomendacao(
            recomendacao: recomendacao,
            completa: true,
            aoAbrir: () => _abrirLivro(recomendacao),
            acao: BotaoDeMenuDaRecomendacao(
              recomendacao: recomendacao,
              aoTocar: () => abrirMenuDaRecomendacao(recomendacao),
            ),
          ),
        );
      },
    );
  }
}
