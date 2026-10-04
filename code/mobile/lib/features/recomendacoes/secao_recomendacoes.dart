import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../feed/social_service.dart';
import 'item_recomendacao.dart';

const int _visiveisNaSecao = 3;

enum _EstadoDaSecao { carregando, pronta, erro }

class SecaoRecomendacoes extends StatefulWidget {
  final SocialService social;
  final Future<void> Function(String livroId) aoAbrirLivro;
  final Future<void> Function() aoVerTodas;

  const SecaoRecomendacoes({
    super.key,
    required this.social,
    required this.aoAbrirLivro,
    required this.aoVerTodas,
  });

  @override
  State<SecaoRecomendacoes> createState() => _SecaoRecomendacoesState();
}

class _SecaoRecomendacoesState extends State<SecaoRecomendacoes> {
  _EstadoDaSecao _estado = _EstadoDaSecao.carregando;
  List<RecomendacaoRecebida> _recomendacoes = const <RecomendacaoRecebida>[];

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar({bool silencioso = false}) async {
    if (!silencioso) {
      setState(() => _estado = _EstadoDaSecao.carregando);
    }
    try {
      final pagina = await widget.social.listarRecebidas(0, tamanho: _visiveisNaSecao);
      if (mounted) {
        setState(() {
          _recomendacoes = pagina.itens;
          _estado = _EstadoDaSecao.pronta;
        });
      }
    } on ApiException {
      if (mounted && !silencioso) {
        setState(() => _estado = _EstadoDaSecao.erro);
      }
    }
  }

  // A estante e o descarte mudam a lista lá fora (RN-22.10, RN-22.11): recarrega na volta, sem
  // esqueleto, para a seção não piscar.
  Future<void> _voltandoDe(Future<void> navegacao) async {
    await navegacao;
    if (mounted) {
      await _carregar(silencioso: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final comItens = _estado == _EstadoDaSecao.pronta && _recomendacoes.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text('Recomendações recebidas', style: theme.textTheme.titleLarge),
                ),
              ),
              if (comItens)
                BotaoTextual(texto: 'Ver todas', onPressed: () => _voltandoDe(widget.aoVerTodas())),
            ],
          ),
        ),
        ..._conteudo(theme),
      ],
    );
  }

  List<Widget> _conteudo(ThemeData theme) {
    Widget divisor() => Divider(height: 1, thickness: 1, color: theme.divider);
    switch (_estado) {
      case _EstadoDaSecao.carregando:
        return <Widget>[
          const SizedBox(height: DesignTokens.space3),
          EntradaSuave(
            child: Semantics(
              label: 'Carregando recomendações',
              child: Column(
                children: <Widget>[
                  for (var i = 0; i < _visiveisNaSecao; i++) ...<Widget>[
                    if (i > 0) divisor(),
                    const SkeletonDeRecomendacao(),
                  ],
                ],
              ),
            ),
          ),
        ];
      case _EstadoDaSecao.erro:
        return <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space5,
              DesignTokens.space3,
              DesignTokens.space5,
              0,
            ),
            child: BannerAviso(
              variante: VarianteAviso.erro,
              triangulo: true,
              mensagem:
                  'Não foi possível carregar suas recomendações. Verifique sua conexão e tente '
                  'de novo.',
              acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
            ),
          ),
        ];
      case _EstadoDaSecao.pronta:
        if (_recomendacoes.isEmpty) {
          return <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(
                DesignTokens.space5,
                DesignTokens.space2,
                DesignTokens.space5,
                0,
              ),
              child: Text(
                'Livros que outros leitores recomendarem para você aparecem aqui.',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
              ),
            ),
          ];
        }
        return <Widget>[
          const SizedBox(height: DesignTokens.space3),
          for (final (indice, recomendacao) in _recomendacoes.indexed) ...<Widget>[
            if (indice > 0) divisor(),
            ItemRecomendacao(
              recomendacao: recomendacao,
              aoAbrir: () => _voltandoDe(widget.aoAbrirLivro(recomendacao.livro.id)),
            ),
          ],
        ];
    }
  }
}
