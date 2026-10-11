import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/folha_inferior.dart';
import '../listas/widgets_de_lista.dart';
import '../livros/acervo_service.dart';
import 'adicionar_frase.dart';
import 'frase_citada.dart';
import 'frases.dart';
import 'leitura_service.dart';

/// Lista completa de frases de um livro (frases-do-livro.md, F-AVA-2, RF-AVA-07), igual a
/// `FrasesDoLivroView.vue`: bloco do livro com a cota e `Adicionar frase`, e as frases de todos
/// os leitores (RN-08 no servidor), mais recentes primeiro, por rolagem. Só a frase de quem olha
/// tem `Trash`, com confirmação; a exclusão é anunciada, sem toast nem desfazer. No limite de 10,
/// a explicação ocupa o lugar do botão, sem ser erro. O livro pessoal só serve ao dono (404).
class FrasesDoLivroPage extends StatefulWidget {
  final LeituraService leitura;
  final AcervoService acervo;
  final String livroId;
  final bool pessoal;
  final VoidCallback aoVoltar;

  const FrasesDoLivroPage({
    super.key,
    required this.leitura,
    required this.acervo,
    required this.livroId,
    required this.pessoal,
    required this.aoVoltar,
  });

  @override
  State<FrasesDoLivroPage> createState() => _FrasesDoLivroPageState();
}

enum _Carga { carregando, pronta, erro }

class _FrasesDoLivroPageState extends State<FrasesDoLivroPage> {
  final ScrollController _rolagem = ScrollController();
  _Carga _carga = _Carga.carregando;
  LivroDaFrase? _livro;
  final List<Frase> _frases = <Frase>[];
  int _total = 0;
  int _minhas = 0;
  int _limite = 10;
  int _pagina = 0;
  int _totalPaginas = 0;
  bool _carregandoMais = false;
  bool _falhouMais = false;

  @override
  void initState() {
    super.initState();
    _rolagem.addListener(_aoRolar);
    _carregar();
  }

  @override
  void dispose() {
    _rolagem.dispose();
    super.dispose();
  }

  Future<LivroDaFrase> _carregarLivro() async {
    if (widget.pessoal) {
      final livro = await widget.acervo.obterLivroPessoal(widget.livroId);
      return LivroDaFrase(
        id: livro.id,
        titulo: livro.titulo,
        autor: livro.autor,
        capaUrl: livro.capaUrl,
        paginas: livro.paginas,
      );
    }
    final livro = (await widget.acervo.obterLivroOficial(widget.livroId)).resumo;
    return LivroDaFrase(
      id: livro.id,
      titulo: livro.titulo,
      autor: livro.autores.isEmpty ? null : livro.autores.map((autor) => autor.nome).join(', '),
      capaUrl: livro.capaUrl,
      paginas: livro.paginas,
    );
  }

  Future<void> _carregar() async {
    setState(() => _carga = _Carga.carregando);
    try {
      final (livro, primeira) = await (
        _carregarLivro(),
        widget.leitura.listarFrases(widget.livroId),
      ).wait;
      if (!mounted) return;
      setState(() {
        _livro = livro;
        _frases
          ..clear()
          ..addAll(primeira.itens);
        _total = primeira.totalItens;
        _minhas = primeira.minhasFrases;
        _limite = primeira.limitePorLivro;
        _pagina = 1;
        _totalPaginas = primeira.totalPaginas;
        _carga = _Carga.pronta;
      });
    } on Object {
      if (mounted) {
        setState(() => _carga = _Carga.erro);
      }
    }
  }

  void _aoRolar() {
    if (_rolagem.position.extentAfter < 400) {
      _carregarMais();
    }
  }

  /// Página seguinte no fim da lista, sem mexer no que já está na tela (§4.8).
  Future<void> _carregarMais() async {
    if (_carregandoMais || _pagina >= _totalPaginas || _falhouMais) return;
    setState(() => _carregandoMais = true);
    try {
      final seguinte = await widget.leitura.listarFrases(widget.livroId, page: _pagina + 1);
      if (!mounted) return;
      final vistos = _frases.map((frase) => frase.id).toSet();
      setState(() {
        _frases.addAll(seguinte.itens.where((frase) => !vistos.contains(frase.id)));
        _pagina += 1;
        _totalPaginas = seguinte.totalPaginas;
      });
    } on Exception {
      if (mounted) {
        setState(() => _falhouMais = true);
      }
    } finally {
      if (mounted) {
        setState(() => _carregandoMais = false);
      }
    }
  }

  Future<void> _adicionar() async {
    final livro = _livro;
    if (livro == null) return;
    final resultado = await abrirAdicionarFrase(
      context,
      leitura: widget.leitura,
      livro: livro,
      minhasFrases: _minhas,
      limite: _limite,
    );
    if (resultado case FraseSalva(:final frase) when mounted) {
      setState(() {
        _frases.insert(0, frase);
        _total += 1;
        _minhas += 1;
      });
    }
  }

  Future<void> _excluir(Frase frase) async {
    final chave = ApiClient.newIdempotencyKey();
    // Pelo navegador raiz: o scrim cobre também a barra inferior (frases-do-livro.md §4.2).
    final excluida = await mostrarFolhaInferior<bool>(
      Navigator.of(context, rootNavigator: true).context,
      builder: (contexto) => _ConfirmarExclusao(
        frase: frase,
        excluir: () => widget.leitura.excluirFrase(frase.id, idempotencyKey: chave),
      ),
    );
    if (excluida != true || !mounted) return;
    setState(() {
      _frases.removeWhere((item) => item.id == frase.id);
      _total = _total > 0 ? _total - 1 : 0;
      _minhas = _minhas > 0 ? _minhas - 1 : 0;
    });
    SemanticsService.sendAnnouncement(
      View.of(context),
      'Frase excluída. ${rotuloDeFrases(_total)}.',
      Directionality.of(context),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: TextosDasFrases.titulo, aoVoltar: widget.aoVoltar),
        Expanded(
          child: switch (_carga) {
            _Carga.carregando => const Center(child: SizedBox.shrink()),
            _Carga.erro => Padding(
              padding: const EdgeInsets.all(DesignTokens.space5),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const BannerAviso(variante: VarianteAviso.erro, mensagem: TextosDasFrases.erroCarga),
                  BotaoTextual(texto: TextosDasFrases.tentarDeNovo, onPressed: _carregar),
                ],
              ),
            ),
            _Carga.pronta => _lista(context),
          },
        ),
      ],
    );
  }

  Widget _lista(BuildContext context) {
    final theme = Theme.of(context);
    final livro = _livro!;
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return RefreshIndicator(
      onRefresh: _carregar,
      child: ListView(
        controller: _rolagem,
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          DesignTokens.space2,
          DesignTokens.space5,
          DesignTokens.space12,
        ),
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              CapaLivro(
                url: livro.capaUrl,
                largura: 48,
                altura: 72,
                titulo: livro.titulo,
                autor: livro.autor,
              ),
              const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(livro.titulo, style: theme.textTheme.titleMedium),
                    if (livro.autor != null) Text(livro.autor!, style: legenda),
                    Text(rotuloDeFrases(_total), style: legenda),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.space4),
          Text(linhaDaCota(_minhas, _limite), style: legenda),
          const SizedBox(height: DesignTokens.space3),
          if (_minhas >= _limite)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Icon(PhosphorIconsRegular.info, size: 16, color: theme.secondaryText),
                const SizedBox(width: DesignTokens.space2),
                Expanded(child: Text(TextosDasFrases.limite, style: legenda)),
              ],
            )
          else if (_total > 0)
            BotaoSecundarioDeLista(
              texto: TextosDasFrases.adicionar,
              icone: PhosphorIconsRegular.plus,
              aoTocar: _adicionar,
            ),
          const SizedBox(height: DesignTokens.space5),
          Divider(height: 1, color: theme.divider),
          if (_frases.isEmpty) ...<Widget>[
            const SizedBox(height: DesignTokens.space10),
            Icon(PhosphorIconsRegular.quotes, size: 32, color: theme.tertiaryText),
            const SizedBox(height: DesignTokens.space6),
            Text(TextosDasFrases.vazioTitulo, style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: DesignTokens.space3),
            Text(
              TextosDasFrases.vazioTexto,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: DesignTokens.space6),
            BotaoPrimario(texto: TextosDasFrases.vazioBotao, onPressed: _adicionar),
          ],
          for (final frase in _frases) ...<Widget>[
            Padding(
              key: ValueKey<String>('frase-${frase.id}'),
              padding: const EdgeInsets.symmetric(vertical: DesignTokens.space5),
              child: FraseCitada(frase: frase, aoExcluir: () => _excluir(frase)),
            ),
            Divider(height: 1, color: theme.divider),
          ],
          if (_carregandoMais)
            Padding(
              padding: const EdgeInsets.only(top: DesignTokens.space5),
              child: Container(height: 17, color: theme.coverPlaceholder),
            ),
          if (_falhouMais)
            BotaoTextual(
              texto: TextosDasFrases.tentarDeNovo,
              onPressed: () {
                setState(() => _falhouMais = false);
                _carregarMais();
              },
            ),
        ],
      ),
    );
  }
}

/// Confirmação de exclusão (frases-do-livro.md §4.2 e §4.4): mostra a frase que vai sair e, se a
/// exclusão falhar, mantém a folha aberta com o aviso; tentar de novo usa a mesma chave.
class _ConfirmarExclusao extends StatefulWidget {
  final Frase frase;
  final Future<void> Function() excluir;

  const _ConfirmarExclusao({required this.frase, required this.excluir});

  @override
  State<_ConfirmarExclusao> createState() => _ConfirmarExclusaoState();
}

class _ConfirmarExclusaoState extends State<_ConfirmarExclusao> {
  bool _excluindo = false;
  bool _falhou = false;

  Future<void> _confirmar() async {
    setState(() {
      _excluindo = true;
      _falhou = false;
    });
    try {
      await widget.excluir();
      if (mounted) Navigator.of(context).pop(true);
    } on Exception {
      if (mounted) {
        setState(() {
          _excluindo = false;
          _falhou = true;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(TextosDasFrases.excluirTitulo, style: theme.textTheme.titleMedium),
        const SizedBox(height: DesignTokens.space3),
        FraseCitada(frase: widget.frase, compacta: true),
        const SizedBox(height: DesignTokens.space4),
        Text(
          TextosDasFrases.excluirConsequencia,
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
        ),
        const SizedBox(height: DesignTokens.space6),
        OutlinedButton(
          key: const ValueKey<String>('confirmar-exclusao'),
          onPressed: _excluindo ? null : _confirmar,
          style: OutlinedButton.styleFrom(
            foregroundColor: theme.colorScheme.error,
            minimumSize: const Size.fromHeight(48),
            side: BorderSide(color: theme.colorScheme.error),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DesignTokens.radius)),
          ),
          child: const Text(TextosDasFrases.excluirBotao),
        ),
        const SizedBox(height: DesignTokens.space3),
        BotaoTextual(
          texto: TextosDasFrases.cancelar,
          neutro: true,
          larguraTotal: true,
          onPressed: _excluindo ? null : () => Navigator.of(context).pop(false),
        ),
        if (_falhou) ...<Widget>[
          const SizedBox(height: DesignTokens.space3),
          Semantics(
            liveRegion: true,
            child: Row(
              children: <Widget>[
                Icon(PhosphorIconsRegular.warning, size: 16, color: theme.colorScheme.error),
                const SizedBox(width: DesignTokens.space2),
                Expanded(
                  child: Text(
                    TextosDasFrases.excluirFalha,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
