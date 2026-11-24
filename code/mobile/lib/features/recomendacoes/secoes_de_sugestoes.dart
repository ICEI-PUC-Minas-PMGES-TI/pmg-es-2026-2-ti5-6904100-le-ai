import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/aviso.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/folha_de_acoes.dart';
import '../feed/social_service.dart';
import 'descarte_de_recomendacoes.dart';
import 'item_recomendacao.dart';

const String _descartar = 'descartar';

// Padding horizontal do `TextButton`: descontado para o rótulo do botão textual alinhar com o
// texto da seção, como no desenho (descobrir.md do Período 3, §5).
const double _paddingDoBotaoTextual = 12;

enum _Estado { carregando, pronta, erro }

class _Secao {
  List<Sugestao> itens = const <Sugestao>[];
  int? proximoOffset;
  bool carregandoMais = false;
  bool falhouMais = false;
}

/// Seções `Quem você segue leu` e `Do seu gosto` da aterrissagem do Descobrir (F-REC-ALG,
/// RF-REC-08..12), descobrir.md do Período 3.
///
/// - Uma chamada traz as duas seções; se ela falha, o banner aparece sem título de seção (§5.10).
///   As recebidas são outra chamada e não dependem desta.
/// - Seção vazia some por inteiro (§5, RF-REC-14).
/// - `Mostrar mais` acrescenta a página seguinte pelo `proximoOffset` do servidor. Cada descarte
///   desloca os seguintes uma posição para trás, por isso o offset guardado desce um a cada
///   descarte confirmado: sem isso, a página seguinte pularia um livro.
/// - Descarte pelo `DotsThree`, sem confirmação, item a 50% até o servidor responder, aviso sem
///   `Desfazer` (§5.5 a §5.7).
class SecoesDeSugestoes extends StatefulWidget {
  final SocialService social;
  final Future<void> Function(String livroId) aoAbrirLivro;

  const SecoesDeSugestoes({super.key, required this.social, required this.aoAbrirLivro});

  @override
  State<SecoesDeSugestoes> createState() => _SecoesDeSugestoesState();
}

class _SecoesDeSugestoesState extends State<SecoesDeSugestoes> {
  _Estado _estado = _Estado.carregando;
  final Map<SecaoDeSugestao, _Secao> _secoes = <SecaoDeSugestao, _Secao>{
    for (final secao in SecaoDeSugestao.values) secao: _Secao(),
  };
  final Set<String> _emDescarte = <String>{};

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar() async {
    setState(() => _estado = _Estado.carregando);
    try {
      final resposta = await widget.social.listarSugestoes();
      if (!mounted) {
        return;
      }
      setState(() {
        for (final secao in SecaoDeSugestao.values) {
          final pagina = resposta.secoes[secao] ?? PaginaDeSugestoes.vazia;
          _secoes[secao] = _Secao()
            ..itens = pagina.itens
            ..proximoOffset = pagina.proximoOffset;
        }
        _estado = _Estado.pronta;
      });
    } on ApiException {
      if (mounted) {
        setState(() => _estado = _Estado.erro);
      }
    }
  }

  Future<void> _mostrarMais(SecaoDeSugestao secao) async {
    final atual = _secoes[secao]!;
    final offset = atual.proximoOffset;
    if (offset == null || atual.carregandoMais) {
      return;
    }
    setState(() {
      atual.carregandoMais = true;
      atual.falhouMais = false;
    });
    try {
      final pagina = (await widget.social.listarSugestoes(secao: secao, offset: offset)).secoes[secao];
      if (!mounted) {
        return;
      }
      final vistos = atual.itens.map((s) => s.livro.id).toSet();
      setState(() {
        atual.itens = <Sugestao>[
          ...atual.itens,
          ...?pagina?.itens.where((s) => !vistos.contains(s.livro.id)),
        ];
        atual.proximoOffset = pagina?.proximoOffset;
        atual.carregandoMais = false;
      });
    } on ApiException {
      if (mounted) {
        setState(() {
          atual.carregandoMais = false;
          atual.falhouMais = true;
        });
      }
    }
  }

  Future<void> _abrirMenu(SecaoDeSugestao secao, Sugestao sugestao) async {
    final escolha = await escolherNaFolha(context, const <AcaoDaFolha>[
      AcaoDaFolha(
        valor: _descartar,
        icone: PhosphorIconsRegular.xCircle,
        rotulo: 'Descartar sugestão',
        detalhe: 'Este livro não volta a aparecer nas sugestões.',
      ),
    ], cabecalho: _CabecalhoDoMenu(sugestao: sugestao));
    if (escolha == _descartar && mounted) {
      await _descartarSugestao(secao, sugestao);
    }
  }

  Future<void> _descartarSugestao(SecaoDeSugestao secao, Sugestao sugestao) async {
    final livroId = sugestao.livro.id;
    if (_emDescarte.contains(livroId)) {
      return;
    }
    setState(() => _emDescarte.add(livroId));
    try {
      await widget.social.descartarSugestao(livroId);
      if (!mounted) {
        return;
      }
      _retirarDasSecoes(livroId);
      mostrarAviso(context, 'Sugestão descartada.');
    } on ApiException catch (erro) {
      if (erro.status == 404) {
        // Livro pessoal, inativo ou que deixou de existir: não há o que descartar, e ele já não
        // vem do servidor. Sai da tela como nas recebidas, sem aviso e sem `Tentar de novo`.
        if (mounted) {
          _retirarDasSecoes(livroId);
        }
      } else if (mounted) {
        mostrarAviso(
          context,
          'Não foi possível descartar a sugestão. Verifique sua conexão e tente de novo.',
          erro: true,
          rotuloDaAcao: 'Tentar de novo',
          aoAgir: () => _descartarSugestao(secao, sugestao),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _emDescarte.remove(livroId));
      }
    }
  }

  /// O descarte vale para as duas seções (o mesmo livro pode vir em `seguidos` e em `gosto`): o
  /// livro sai de cada seção que o tinha, e o offset de cada uma delas desce um, porque o servidor
  /// também o tirou de lá.
  void _retirarDasSecoes(String livroId) {
    setState(() {
      for (final atual in _secoes.values) {
        final antes = atual.itens.length;
        atual.itens = atual.itens.where((s) => s.livro.id != livroId).toList();
        final offset = atual.proximoOffset;
        if (atual.itens.length < antes && offset != null) {
          atual.proximoOffset = offset > 0 ? offset - 1 : 0;
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    switch (_estado) {
      case _Estado.carregando:
        return EntradaSuave(
          child: Padding(
            padding: const EdgeInsets.only(top: DesignTokens.space6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                _titulo(theme, SecaoDeSugestao.seguidos),
                const SizedBox(height: DesignTokens.space3),
                Semantics(label: 'Carregando sugestões', child: const SkeletonDeRecomendacao()),
              ],
            ),
          ),
        );
      case _Estado.erro:
        return Padding(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space6,
            DesignTokens.space5,
            0,
          ),
          child: BannerAviso(
            variante: VarianteAviso.erro,
            triangulo: true,
            mensagem: 'Não foi possível carregar as sugestões. Verifique sua conexão e tente de novo.',
            acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
          ),
        );
      case _Estado.pronta:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            for (final secao in SecaoDeSugestao.values)
              if (_secoes[secao]!.itens.isNotEmpty) _secao(theme, secao),
          ],
        );
    }
  }

  Widget _titulo(ThemeData theme, SecaoDeSugestao secao) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
    child: Semantics(
      header: true,
      child: Text(secao.titulo, style: theme.textTheme.titleLarge),
    ),
  );

  Widget _secao(ThemeData theme, SecaoDeSugestao secao) {
    final atual = _secoes[secao]!;
    Widget divisor() => Divider(height: 1, thickness: 1, color: theme.divider);
    return Padding(
      padding: const EdgeInsets.only(top: DesignTokens.space6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          _titulo(theme, secao),
          const SizedBox(height: DesignTokens.space3),
          for (final (indice, sugestao) in atual.itens.indexed) ...<Widget>[
            if (indice > 0) divisor(),
            ItemEmDescarte(
              key: ValueKey<String>('${secao.valor}-${sugestao.livro.id}'),
              descartando: _emDescarte.contains(sugestao.livro.id),
              child: ItemSugestao(
                sugestao: sugestao,
                aoAbrir: () => widget.aoAbrirLivro(sugestao.livro.id),
                aoAbrirMenu: () => _abrirMenu(secao, sugestao),
              ),
            ),
          ],
          if (atual.carregandoMais)
            EntradaSuave(
              child: Column(
                children: <Widget>[
                  divisor(),
                  const SkeletonDeRecomendacao(),
                  divisor(),
                  const SkeletonDeRecomendacao(),
                ],
              ),
            )
          else if (atual.falhouMais)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                DesignTokens.space5,
                DesignTokens.space3,
                DesignTokens.space5,
                0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Não foi possível carregar mais sugestões.',
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                  ),
                  Transform.translate(
                    offset: const Offset(-_paddingDoBotaoTextual, 0),
                    child: BotaoTextual(texto: 'Tentar de novo', onPressed: () => _mostrarMais(secao)),
                  ),
                ],
              ),
            )
          else if (atual.proximoOffset != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(
                DesignTokens.space5 - _paddingDoBotaoTextual,
                DesignTokens.space3,
                0,
                0,
              ),
              child: Align(
                alignment: Alignment.centerLeft,
                child: BotaoTextual(texto: 'Mostrar mais', onPressed: () => _mostrarMais(secao)),
              ),
            ),
        ],
      ),
    );
  }
}

/// Item de sugestão (descobrir.md do Período 3, §5): o item de recomendação recebida com a linha
/// de motivo no lugar da atribuição e o `DotsThree` à direita. O motivo diz quantos leram, nunca
/// quem (RN-08).
class ItemSugestao extends StatelessWidget {
  final Sugestao sugestao;
  final VoidCallback aoAbrir;
  final VoidCallback aoAbrirMenu;

  const ItemSugestao({
    super.key,
    required this.sugestao,
    required this.aoAbrir,
    required this.aoAbrirMenu,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final livro = sugestao.livro;
    final deQuem = livro.autor.isEmpty ? '${livro.titulo}.' : '${livro.titulo}, de ${livro.autor}.';
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space5,
        vertical: DesignTokens.space4,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            child: Semantics(
              button: true,
              label: '$deQuem ${sugestao.motivo}.',
              excludeSemantics: true,
              onTap: aoAbrir,
              child: GestureDetector(
                onTap: aoAbrir,
                behavior: HitTestBehavior.opaque,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    CapaLivro(
                      url: livro.capaUrl,
                      largura: larguraDaCapaRecomendada,
                      altura: alturaDaCapaRecomendada,
                      titulo: livro.titulo,
                      autor: livro.autor,
                    ),
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
                          if (livro.autor.isNotEmpty)
                            Text(
                              livro.autor,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.secondaryText,
                              ),
                            ),
                          const SizedBox(height: DesignTokens.space2),
                          Text(
                            sugestao.motivo,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Semantics(
            button: true,
            label: 'Mais ações para ${livro.titulo}',
            excludeSemantics: true,
            onTap: aoAbrirMenu,
            child: GestureDetector(
              onTap: aoAbrirMenu,
              behavior: HitTestBehavior.opaque,
              child: SizedBox(
                width: 48,
                height: 48,
                child: Align(
                  alignment: Alignment.topRight,
                  child: Icon(
                    PhosphorIconsRegular.dotsThree,
                    size: 20,
                    color: theme.secondaryText,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CabecalhoDoMenu extends StatelessWidget {
  final Sugestao sugestao;

  const _CabecalhoDoMenu({required this.sugestao});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final livro = sugestao.livro;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        CapaLivro(
          url: livro.capaUrl,
          largura: larguraDaCapaRecomendada,
          altura: alturaDaCapaRecomendada,
          titulo: livro.titulo,
          autor: livro.autor,
        ),
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
              Text(
                sugestao.motivo,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
