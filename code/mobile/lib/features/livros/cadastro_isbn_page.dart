import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/cartao_progresso.dart';
import '../../design/widgets/faixa_informativa.dart';
import 'acervo_service.dart';
import 'cadastro_isbn_controller.dart';

/// Cadastro por ISBN (RF-ACV-05, RF-ACV-07). Estrutura e cópia de
/// docs/design/periodo-1/F-ACV-CADASTRO/cadastro-por-isbn.md §4 e §8.
///
/// A tela não conhece rota nenhuma: quem navega é quem a monta, pelos callbacks.
class CadastroIsbnPage extends StatefulWidget {
  final AcervoService servico;
  final VoidCallback? aoVoltar;

  /// O ISBN não existe em nenhuma fonte. Devolve `true` quando a pessoa escolheu conferir o
  /// ISBN, e a tela volta à aterrissagem com o campo preenchido.
  final Future<bool?> Function(String isbn)? aoNaoEncontrar;
  final void Function(String livroId)? aoAbrirLivro;
  final VoidCallback? aoCadastrarPessoal;

  /// Injetável para o teste controlar o tempo das consultas.
  final CadastroIsbnController Function(AcervoService servico)? criarController;

  const CadastroIsbnPage({
    super.key,
    required this.servico,
    this.aoVoltar,
    this.aoNaoEncontrar,
    this.aoAbrirLivro,
    this.aoCadastrarPessoal,
    this.criarController,
  });

  @override
  State<CadastroIsbnPage> createState() => _CadastroIsbnPageState();
}

class _CadastroIsbnPageState extends State<CadastroIsbnPage> {
  final _campo = TextEditingController();
  late final CadastroIsbnController _controller =
      (widget.criarController ?? (servico) => CadastroIsbnController(servico: servico))(
        widget.servico,
      );
  bool _navegandoParaNaoEncontrado = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_aoMudar);
    _campo.addListener(() {
      _controller.campoAlterado();
      setState(() {});
    });
  }

  @override
  void dispose() {
    _controller.removeListener(_aoMudar);
    _controller.dispose();
    _campo.dispose();
    super.dispose();
  }

  void _aoMudar() {
    if (!mounted) {
      return;
    }
    setState(() {});
    if (_controller.fase == FaseDoCadastroIsbn.naoEncontrado && !_navegandoParaNaoEncontrado) {
      _navegandoParaNaoEncontrado = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _abrirNaoEncontrado());
    }
  }

  Future<void> _abrirNaoEncontrado() async {
    await widget.aoNaoEncontrar?.call(_controller.isbn ?? '');
    if (!mounted) {
      return;
    }
    _navegandoParaNaoEncontrado = false;
    // Volta à aterrissagem com o que foi digitado, pronto para correção (isbn-nao-encontrado.md
    // §4.1, "Conferir o ISBN").
    _controller.recomecar();
  }

  void _cadastrarOutro() {
    _campo.clear();
    _controller.recomecar();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fase = _controller.fase;
    final buscando = fase == FaseDoCadastroIsbn.buscando;
    final temResultado =
        fase == FaseDoCadastroIsbn.encontrado || fase == FaseDoCadastroIsbn.duplicata;

    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: 'Adicionar livro', aoVoltar: widget.aoVoltar),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const SizedBox(height: DesignTokens.space6),
                Text(
                  'Informe o ISBN de 13 dígitos impresso no livro, geralmente perto do código de barras.',
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                ),
                const SizedBox(height: DesignTokens.space6),
                CampoTexto(
                  controller: _campo,
                  label: 'ISBN',
                  placeholder: '978-85-359-1484-9',
                  keyboardType: TextInputType.number,
                  // Aceita colar com separadores; a normalização é do servidor, e o cliente não
                  // reescreve o que a pessoa digita (cadastro-por-isbn.md §9).
                  inputFormatters: <TextInputFormatter>[
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9\- ]')),
                    LengthLimitingTextInputFormatter(20),
                  ],
                  estiloDoTexto: theme.numInline,
                  enabled: !buscando && !temResultado,
                  erro: fase == FaseDoCadastroIsbn.invalido
                      ? 'Esse ISBN não confere. Verifique os 13 dígitos impressos no livro.'
                      : null,
                  helper: fase == FaseDoCadastroIsbn.invalido
                      ? null
                      : 'Só o ISBN. Links e títulos não funcionam aqui.',
                ),
                const SizedBox(height: DesignTokens.space6),
                // No indisponível o CTA é `Tentar de novo`, que reaproveita o pedido guardado.
                if (!temResultado && fase != FaseDoCadastroIsbn.indisponivel)
                  BotaoPrimario(
                    texto: buscando ? 'Buscando' : 'Buscar livro',
                    carregando: buscando,
                    onPressed:
                        _controller.podeEnviar(_campo.text) &&
                            fase != FaseDoCadastroIsbn.invalido
                        ? () => _controller.buscar(_campo.text)
                        : null,
                  ),
                ..._resultado(theme, fase),
                if (!temResultado && fase != FaseDoCadastroIsbn.indisponivel)
                  _saidaAlternativa(theme),
                const SizedBox(height: DesignTokens.space10),
              ],
            ),
          ),
        ),
      ],
    );
  }

  List<Widget> _resultado(ThemeData theme, FaseDoCadastroIsbn fase) {
    switch (fase) {
      case FaseDoCadastroIsbn.buscando:
        final mensagem = _controller.coldStart
            ? 'O serviço está iniciando. Isso pode levar alguns segundos.'
            : _controller.lento
            ? 'Ainda procurando. As fontes externas estão lentas agora.'
            : 'Procurando em nossas fontes. Isso pode levar alguns segundos.';
        return <Widget>[
          const SizedBox(height: DesignTokens.space5),
          CartaoProgresso(mensagem: mensagem),
        ];
      case FaseDoCadastroIsbn.encontrado:
        return _livro(
          theme,
          cabecalho: Semantics(
            liveRegion: true,
            child: Row(
              children: <Widget>[
                Icon(PhosphorIconsFill.checkCircle, size: 20, color: theme.primaryAccent),
                const SizedBox(width: DesignTokens.space2),
                Expanded(
                  child: Text(
                    'Livro adicionado ao acervo.',
                    style: theme.textTheme.labelLarge?.copyWith(color: theme.primaryAccent),
                  ),
                ),
              ],
            ),
          ),
        );
      case FaseDoCadastroIsbn.duplicata:
        return _livro(
          theme,
          cabecalho: const FaixaInformativa(mensagem: 'Este livro já está no acervo.'),
        );
      case FaseDoCadastroIsbn.indisponivel:
        return <Widget>[
          const BannerAviso(
            variante: VarianteAviso.alerta,
            mensagem: 'Não conseguimos consultar nossas fontes agora. Seu pedido foi guardado.',
          ),
          const SizedBox(height: DesignTokens.space4),
          BotaoPrimario(texto: 'Tentar de novo', onPressed: _controller.tentarDeNovo),
          const SizedBox(height: DesignTokens.space3),
          BotaoTextual(
            texto: 'Cadastrar livro pessoal',
            larguraTotal: true,
            onPressed: widget.aoCadastrarPessoal,
          ),
        ];
      case FaseDoCadastroIsbn.limitado:
      case FaseDoCadastroIsbn.semConexao:
        return <Widget>[
          const SizedBox(height: DesignTokens.space5),
          BannerAviso(
            variante: fase == FaseDoCadastroIsbn.limitado
                ? VarianteAviso.alerta
                : VarianteAviso.erro,
            mensagem: _controller.mensagemDoServidor ?? 'Não foi possível conectar ao serviço.',
          ),
        ];
      case FaseDoCadastroIsbn.ocioso:
      case FaseDoCadastroIsbn.invalido:
      case FaseDoCadastroIsbn.naoEncontrado:
        return const <Widget>[];
    }
  }

  /// Card do livro em variante de confirmação (§4.4 e §4.5). O `acervo` ainda não expõe
  /// `GET /livros/{id}` (F-ACV-BUSCA), então o card mostra o ISBN no lugar da ficha: é a
  /// divergência registrada no arquivo da feature.
  List<Widget> _livro(ThemeData theme, {required Widget cabecalho}) {
    final livroId = _controller.livroId;
    return <Widget>[
      const SizedBox(height: DesignTokens.space5),
      cabecalho,
      const SizedBox(height: DesignTokens.space4),
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(DesignTokens.space5),
        decoration: BoxDecoration(
          color: theme.elevatedSurface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const CapaLivro(largura: 60, altura: 90),
            const SizedBox(width: DesignTokens.space4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('ISBN', style: theme.textTheme.labelMedium),
                  const SizedBox(height: DesignTokens.space1),
                  Text(_controller.isbn ?? '', style: theme.numInline),
                ],
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: DesignTokens.space5),
      BotaoPrimario(
        texto: 'Abrir página do livro',
        onPressed: livroId == null ? null : () => widget.aoAbrirLivro?.call(livroId),
      ),
      const SizedBox(height: DesignTokens.space3),
      BotaoTextual(texto: 'Cadastrar outro ISBN', larguraTotal: true, onPressed: _cadastrarOutro),
    ];
  }

  /// A saída para o cadastro pessoal existe desde a aterrissagem, não só depois do erro
  /// (cadastro-por-isbn.md §10).
  Widget _saidaAlternativa(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(top: DesignTokens.space8),
      child: DecoratedBox(
        decoration: BoxDecoration(border: Border(top: BorderSide(color: theme.divider))),
        child: Padding(
          padding: const EdgeInsets.only(top: DesignTokens.space6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Não tem o ISBN em mãos?',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
              BotaoTextual(
                texto: 'Cadastrar livro pessoal',
                onPressed: widget.aoCadastrarPessoal,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
