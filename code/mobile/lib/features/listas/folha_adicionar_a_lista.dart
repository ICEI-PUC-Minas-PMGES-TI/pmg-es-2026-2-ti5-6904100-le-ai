import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/faixa_informativa.dart';
import '../../design/widgets/folha_inferior.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/perfil_service.dart';
import '../perfil/widgets_de_perfil.dart';
import 'lista_form_page.dart';
import 'listas_service.dart';
import 'textos.dart';
import 'widgets_de_lista.dart';

/// `Adicionar à lista` (docs/design/periodo-2/F-LST/adicionar-a-lista.md, RF-LST-02/05): o único
/// caminho de um livro para dentro de uma lista. Abre pelo navegador raiz, para o scrim cobrir a
/// barra inferior.
///
/// `Criar lista` fecha o sheet e abre o formulário com o livro, que cria a lista já com ele; de
/// volta à página, o aviso confirma e oferece `Ver lista` (§4.9), que chama [aoVerLista].
Future<void> abrirAdicionarALista(
  BuildContext context, {
  required ListasService servico,
  required LivroDeOrigem livro,
  Future<Privacidade> Function()? obterPrivacidade,
  ValueChanged<String>? aoVerLista,
}) async {
  final raiz = Navigator.of(context, rootNavigator: true).context;
  final escolha = await mostrarFolhaInferior<String>(
    raiz,
    builder: (context) => FolhaAdicionarALista(servico: servico, livro: livro),
  );
  if (escolha != 'criar' || !context.mounted) {
    return;
  }
  final resultado = await abrirFormularioDeLista(
    context,
    servico: servico,
    obterPrivacidade: obterPrivacidade,
    livro: livro,
  );
  final lista = resultado?.lista;
  if (lista == null || !context.mounted) {
    return;
  }
  mostrarAvisoDeLista(
    context,
    texto: '${livro.titulo} entrou na lista ${lista.titulo}.',
    acao: aoVerLista == null ? null : 'Ver lista',
    aoAcionar: aoVerLista == null ? null : () => aoVerLista(lista.id),
  );
}

enum _Andamento { adicionando, removendo, falhouAdicionar, falhouRemover }

/// O conteúdo do sheet. Cada toque numa lista é uma operação completa, sem `Salvar`: a marca muda
/// de forma e peso (`CheckCircle` cheio ou `PlusCircle`) na hora e volta se o servidor recusar.
/// Depois de uma falha, tocar reenvia a mesma mudança com a mesma chave (RNF-ERR-04).
class FolhaAdicionarALista extends StatefulWidget {
  final ListasService servico;
  final LivroDeOrigem livro;

  const FolhaAdicionarALista({super.key, required this.servico, required this.livro});

  @override
  State<FolhaAdicionarALista> createState() => _FolhaAdicionarAListaState();
}

class _FolhaAdicionarAListaState extends State<FolhaAdicionarALista> {
  final ScrollController _rolagem = ScrollController();
  late final ListaPaginada<ListaResumo> _listas = ListaPaginada<ListaResumo>(
    (pagina) => widget.servico.listarMinhas(pagina, livroId: widget.livro.id),
    (lista) => lista.id,
  );

  /// Marca e contagem locais, por lista: a verdade do servidor depois de cada toque.
  final Map<String, bool> _contem = <String, bool>{};
  final Map<String, int> _quantidades = <String, int>{};
  final Map<String, _Andamento> _andamento = <String, _Andamento>{};
  final Map<String, ({bool contem, String valor})> _chaves =
      <String, ({bool contem, String valor})>{};

  @override
  void initState() {
    super.initState();
    _rolagem.addListener(() {
      if (_rolagem.hasClients && _rolagem.position.extentAfter < 200) {
        _listas.carregarMais();
      }
    });
    _listas.carregar();
  }

  @override
  void dispose() {
    _rolagem.dispose();
    _listas.dispose();
    super.dispose();
  }

  bool _marcada(ListaResumo lista) => _contem[lista.id] ?? lista.contemLivro;

  int _quantidade(ListaResumo lista) => _quantidades[lista.id] ?? lista.quantidadeLivros;

  /// A chave é da intenção: o mesmo alvo (pôr ou tirar) repetido reaproveita a anterior.
  String _chaveDe(String listaId, bool querContem) {
    final anterior = _chaves[listaId];
    if (anterior != null && anterior.contem == querContem) {
      return anterior.valor;
    }
    final valor = ApiClient.newIdempotencyKey();
    _chaves[listaId] = (contem: querContem, valor: valor);
    return valor;
  }

  Future<void> _alternar(ListaResumo lista) async {
    final estado = _andamento[lista.id];
    if (estado == _Andamento.adicionando || estado == _Andamento.removendo) {
      return;
    }
    final adicionar = switch (estado) {
      _Andamento.falhouAdicionar => true,
      _Andamento.falhouRemover => false,
      _ => !_marcada(lista),
    };
    final antesContem = _marcada(lista);
    final antesQuantidade = _quantidade(lista);
    setState(() {
      _contem[lista.id] = adicionar;
      _andamento[lista.id] = adicionar ? _Andamento.adicionando : _Andamento.removendo;
    });
    try {
      if (adicionar) {
        await widget.servico.adicionar(
          lista.id,
          widget.livro.id,
          idempotencyKey: _chaveDe(lista.id, true),
        );
      } else {
        await widget.servico.remover(
          lista.id,
          widget.livro.id,
          idempotencyKey: _chaveDe(lista.id, false),
        );
      }
      _chaves.remove(lista.id);
      if (mounted) {
        setState(() {
          _quantidades[lista.id] = adicionar
              ? (antesContem ? antesQuantidade : antesQuantidade + 1)
              : (antesContem && antesQuantidade > 0 ? antesQuantidade - 1 : antesQuantidade);
          _andamento.remove(lista.id);
        });
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _contem[lista.id] = antesContem;
          _andamento[lista.id] = adicionar ? _Andamento.falhouAdicionar : _Andamento.falhouRemover;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final livro = widget.livro;
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.85),
      child: ListenableBuilder(
        listenable: _listas,
        builder: (context, _) => Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text('Adicionar à lista', style: theme.textTheme.titleMedium),
            const SizedBox(height: DesignTokens.space4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                CapaDeItem(url: livro.capaUrl, titulo: livro.titulo, pessoal: livro.pessoal),
                const SizedBox(width: DesignTokens.space3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(livro.titulo, style: theme.textTheme.labelLarge),
                      if (livro.autor != null) Text(livro.autor!, style: legenda),
                    ],
                  ),
                ),
              ],
            ),
            if (livro.pessoal) ...<Widget>[
              const SizedBox(height: DesignTokens.space2),
              const FaixaInformativa(
                mensagem:
                    'Livro pessoal: quem puder ver a lista vê este livro em modo consulta, sem '
                    'poder adicioná-lo à estante.',
              ),
            ] else if (_listas.carregando || _listas.itens.isNotEmpty) ...<Widget>[
              const SizedBox(height: DesignTokens.space2),
              Text('O livro entra no fim de cada lista que você marcar.', style: legenda),
            ],
            const SizedBox(height: DesignTokens.space4),
            Divider(height: 1, color: theme.divider),
            Flexible(
              child: ListView(
                controller: _rolagem,
                shrinkWrap: true,
                children: <Widget>[
                  _linhaCriar(theme),
                  ..._conteudo(theme),
                ],
              ),
            ),
            const SizedBox(height: DesignTokens.space4),
            BotaoTextual(
              texto: 'Fechar',
              neutro: true,
              larguraTotal: true,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _linhaCriar(ThemeData theme) {
    return Semantics(
      button: true,
      child: InkWell(
        onTap: () => Navigator.of(context).pop('criar'),
        child: SizedBox(
          height: 56,
          child: Row(
            children: <Widget>[
              Icon(PhosphorIconsRegular.plus, size: 20, color: theme.primaryAccent),
              const SizedBox(width: DesignTokens.space4),
              Text(
                'Criar lista',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.primaryAccent,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _conteudo(ThemeData theme) {
    final divisor = Divider(height: 1, color: theme.divider);
    if (_listas.carregando) {
      return <Widget>[
        EntradaSuave(
          child: Column(
            children: <Widget>[
              for (var i = 0; i < 4; i++) ...<Widget>[divisor, const _SkeletonDeLinha()],
            ],
          ),
        ),
      ];
    }
    if (_listas.falhou) {
      return <Widget>[
        divisor,
        const SizedBox(height: DesignTokens.space4),
        BannerAviso(
          variante: VarianteAviso.erro,
          triangulo: true,
          mensagem: 'Não foi possível carregar suas listas. Verifique sua conexão e tente de novo.',
          acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _listas.carregar),
        ),
      ];
    }
    if (_listas.itens.isEmpty) {
      return <Widget>[
        divisor,
        const SizedBox(height: DesignTokens.space4),
        Text(
          'Você ainda não tem listas. Crie a primeira e este livro já entra nela.',
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
        ),
      ];
    }
    return <Widget>[
      for (final lista in _listas.itens) ...<Widget>[divisor, _linhaDeLista(theme, lista)],
      FimDaLista(
        temMais: _listas.temMais,
        carregandoMais: _listas.carregandoMais,
        falhou: _listas.falhouMais,
        aoCarregar: _listas.carregarMais,
        esqueleto: const Column(
          children: <Widget>[_SkeletonDeLinha(), _SkeletonDeLinha(), _SkeletonDeLinha()],
        ),
      ),
    ];
  }

  Widget _linhaDeLista(ThemeData theme, ListaResumo lista) {
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final estado = _andamento[lista.id];
    final marcada = _marcada(lista);
    final emAndamento = estado == _Andamento.adicionando || estado == _Andamento.removendo;
    final String rodape = switch (estado) {
      _Andamento.adicionando => 'Adicionando',
      _Andamento.removendo => 'Removendo',
      _ => contagemDeLivros(_quantidade(lista)),
    };
    final String? falha = switch (estado) {
      _Andamento.falhouAdicionar => 'Não foi possível adicionar. Toque para tentar de novo.',
      _Andamento.falhouRemover => 'Não foi possível remover. Toque para tentar de novo.',
      _ => null,
    };
    return Semantics(
      button: true,
      toggled: marcada,
      child: InkWell(
        onTap: emAndamento ? null : () => _alternar(lista),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 64),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: DesignTokens.space2),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Text(
                        lista.titulo,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelLarge,
                      ),
                      Text(rodape, style: legenda),
                      if (falha != null)
                        Semantics(
                          liveRegion: true,
                          child: Text(
                            falha,
                            style: legenda?.copyWith(color: theme.colorScheme.error),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: DesignTokens.space4),
                AnimatedSwitcher(
                  duration: MediaQuery.of(context).disableAnimations
                      ? Duration.zero
                      : DesignTokens.durFast,
                  child: marcada
                      ? Icon(
                          PhosphorIconsFill.checkCircle,
                          key: const ValueKey<bool>(true),
                          size: 24,
                          color: theme.primaryAccent,
                        )
                      : Icon(
                          PhosphorIconsRegular.plusCircle,
                          key: const ValueKey<bool>(false),
                          size: 24,
                          color: theme.secondaryText,
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Skeleton da linha de lista do sheet: barras `linha` de 60% e 25% e o círculo da marca.
class _SkeletonDeLinha extends StatelessWidget {
  const _SkeletonDeLinha();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget barra(double altura, double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: theme.divider,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
    return ExcludeSemantics(
      child: SizedBox(
        height: 64,
        child: Row(
          children: <Widget>[
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  barra(16, 0.6),
                  const SizedBox(height: DesignTokens.space2),
                  barra(12, 0.25),
                ],
              ),
            ),
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(color: theme.divider, shape: BoxShape.circle),
            ),
          ],
        ),
      ),
    );
  }
}
