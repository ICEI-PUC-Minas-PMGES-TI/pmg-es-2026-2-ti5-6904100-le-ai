import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/estado_vazio.dart';
import '../livros/acervo_service.dart';
import 'busca_de_livros_controller.dart';
import 'widgets_da_busca.dart';

/// Aba Descobrir (RF-ACV-01, RF-ACV-02), a partir do protótipo `descobrir.html`.
///
/// É raiz de aba: o header de 72px com o título e o sino é o do shell, sem divisor, e esta tela
/// começa pela segunda linha do header, o campo de busca. Campo, faixa de assuntos e contagem
/// ficam fixos; só a lista rola.
///
/// A aterrissagem é magra no Período 1, por decisão (descobrir.md §4.6): o campo, sem foco
/// automático, e os assuntos, nada mais.
class DescobrirPage extends StatefulWidget {
  final AcervoService servico;
  final ValueChanged<String> aoAbrirLivro;
  final VoidCallback aoCadastrarPorIsbn;
  final VoidCallback aoCadastrarPessoal;

  const DescobrirPage({
    super.key,
    required this.servico,
    required this.aoAbrirLivro,
    required this.aoCadastrarPorIsbn,
    required this.aoCadastrarPessoal,
  });

  @override
  State<DescobrirPage> createState() => _DescobrirPageState();
}

class _DescobrirPageState extends State<DescobrirPage> {
  late final BuscaDeLivrosController _busca = BuscaDeLivrosController(widget.servico);
  final _consulta = TextEditingController();
  final _rolagem = ScrollController();
  bool _cargaAgendada = false;

  @override
  void initState() {
    super.initState();
    _busca.carregarAssuntos();
  }

  @override
  void dispose() {
    _busca.dispose();
    _consulta.dispose();
    _rolagem.dispose();
    super.dispose();
  }

  void _limpar() {
    _consulta.clear();
    _busca.limparConsulta();
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    _talvezCarregarMais(notificacao.metrics);
    return false;
  }

  /// Pede a página seguinte quando o fim da lista está a menos de 300px.
  ///
  /// - **Depois de uma falha, só o botão tenta de novo.** Sem isso, trocar o skeleton do rodapé
  ///   pela mensagem de falha, mais baixa, corrige a rolagem, a correção notifica, e a página
  ///   seguinte é pedida de novo em laço, sem o leitor tocar em nada.
  /// - **A chamada vai para depois do quadro:** a notificação chega durante o layout, e o
  ///   `notifyListeners` do controller ali agendaria um build no meio do quadro.
  void _talvezCarregarMais(ScrollMetrics metricas) {
    if (metricas.extentAfter >= 300 ||
        _cargaAgendada ||
        !_busca.temMais ||
        _busca.carregandoMais ||
        _busca.falhouMais) {
      return;
    }
    _cargaAgendada = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _cargaAgendada = false;
      if (mounted) {
        _busca.carregarMais();
      }
    });
  }

  /// Lista que não enche a tela (edições agrupadas num card só) não rola, e sem rolagem não há
  /// notificação: depois de cada página, confere se o fim já está à vista.
  void _conferirFimVisivel() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _rolagem.hasClients) {
        _talvezCarregarMais(_rolagem.position);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _busca,
      builder: (context, _) {
        final theme = Theme.of(context);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
              child: CampoDeBuscaDeLivros(
                controlador: _consulta,
                aoMudar: _busca.alterarConsulta,
                aoLimpar: _limpar,
              ),
            ),
            const SizedBox(height: DesignTokens.space6),
            if (_busca.assuntos.isNotEmpty)
              FaixaDeAssuntos(
                assuntos: _busca.assuntos,
                ativo: _busca.assunto,
                aoAlternar: _busca.alternarAssunto,
              ),
            const SizedBox(height: DesignTokens.space2),
            if (_busca.estado == EstadoDaBusca.resultados) _contagem(theme),
            Expanded(child: _conteudo(theme)),
          ],
        );
      },
    );
  }

  /// Anunciada quando muda, para a troca de filtro não ser silenciosa (descobrir.md §9). Conta
  /// edições, que são livros pelo RN-01, e não grupos: o total de grupos só se saberia depois de
  /// carregar todas as páginas.
  Widget _contagem(ThemeData theme) {
    final total = _busca.totalItens;
    return Semantics(
      liveRegion: true,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          0,
          DesignTokens.space5,
          DesignTokens.space3,
        ),
        child: Text(
          total == 1 ? '1 livro encontrado' : '$total livros encontrados',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
        ),
      ),
    );
  }

  Widget _conteudo(ThemeData theme) {
    switch (_busca.estado) {
      case EstadoDaBusca.aterrissagem:
        return const SizedBox.shrink();
      case EstadoDaBusca.buscando:
        return EntradaSuave(child: _carregando(theme));
      case EstadoDaBusca.vazio:
        // Centrado no espaço que sobra e rolável quando não cabe (fonte ampliada, tela baixa).
        return LayoutBuilder(
          builder: (context, limites) => SingleChildScrollView(
            padding: const EdgeInsets.all(DesignTokens.space5),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: (limites.maxHeight - 2 * DesignTokens.space5).clamp(0, double.infinity),
              ),
              child: Center(
                child: EstadoVazio(
                  icone: PhosphorIconsRegular.magnifyingGlass,
                  solto: true,
                  titulo: 'Nenhum livro encontrado',
                  texto:
                      'Confira a grafia ou tente pelo ISBN. Se o livro não está no acervo, '
                      'você pode cadastrá-lo.',
                  rodape: Column(
                    children: <Widget>[
                      BotaoPrimario(
                        texto: 'Cadastrar por ISBN',
                        larguraTotal: true,
                        onPressed: widget.aoCadastrarPorIsbn,
                      ),
                      const SizedBox(height: DesignTokens.space3),
                      BotaoTextual(
                        texto: 'Cadastrar livro pessoal',
                        onPressed: widget.aoCadastrarPessoal,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      case EstadoDaBusca.erro:
        return ListView(
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space6,
            DesignTokens.space5,
            DesignTokens.space5,
          ),
          children: <Widget>[
            BannerAviso(
              variante: VarianteAviso.erro,
              triangulo: true,
              mensagem:
                  'Não foi possível carregar os resultados. Verifique sua conexão e tente de novo.',
              acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _busca.tentarDeNovo),
            ),
          ],
        );
      case EstadoDaBusca.resultados:
        return _resultados(theme);
    }
  }

  Widget _carregando(ThemeData theme) {
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space2,
        DesignTokens.space5,
        DesignTokens.space5,
      ),
      children: <Widget>[
        if (_busca.coldStart)
          Semantics(
            liveRegion: true,
            child: Text(
              'O servidor está iniciando. Isso pode levar alguns segundos.',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          ),
        for (var i = 0; i < 5; i++) ...<Widget>[
          if (i > 0) Divider(height: 1, thickness: 1, color: theme.divider),
          const SkeletonDeCardDeLivro(),
        ],
      ],
    );
  }

  Widget _resultados(ThemeData theme) {
    final grupos = _busca.grupos;
    _conferirFimVisivel();
    return NotificationListener<ScrollNotification>(
      onNotification: _pertoDoFim,
      child: ListView.separated(
        // Busca nova volta ao topo; a página seguinte da mesma busca, não.
        key: ValueKey<int>(_busca.geracao),
        controller: _rolagem,
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          0,
          DesignTokens.space5,
          DesignTokens.space5,
        ),
        itemCount: grupos.length + 1,
        separatorBuilder: (context, indice) => Divider(
          height: 1,
          thickness: 1,
          color: indice < grupos.length - 1 ? theme.divider : Colors.transparent,
        ),
        itemBuilder: (context, indice) {
          if (indice == grupos.length) {
            return _rodape(theme);
          }
          final grupo = grupos[indice];
          return CardDeLivroBusca(
            key: ValueKey<String>(grupo.principal.id),
            grupo: grupo,
            aoAbrir: widget.aoAbrirLivro,
          );
        },
      ),
    );
  }

  /// Sem "Carregar mais" e sem numeração no mobile (descobrir.md §4.1): a próxima página vem pela
  /// rolagem, e só a falha dela pede uma ação.
  Widget _rodape(ThemeData theme) {
    if (_busca.carregandoMais) {
      return const SkeletonDeCardDeLivro();
    }
    if (_busca.falhouMais) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
        child: Column(
          children: <Widget>[
            Text(
              'Não foi possível carregar mais resultados.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
            ),
            BotaoTextual(texto: 'Tentar de novo', onPressed: _busca.carregarMais),
          ],
        ),
      );
    }
    return const SizedBox.shrink();
  }
}
