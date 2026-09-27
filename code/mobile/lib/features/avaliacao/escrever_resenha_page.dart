import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/dialogo_confirmacao.dart';
import '../../design/widgets/estrelas_de_nota.dart';
import '../../design/widgets/toggle_spoiler.dart';
import '../livros/formatos.dart';
import 'avaliacao_controller.dart';
import 'painel_de_nota.dart';

const int limiteDaResenha = 5000;
const int avisoDaResenha = 4750;

/// Caracteres Unicode (code points), como o `char_length` do banco e o servidor contam. Emoji de
/// um code point conta 1; emoji composto (👍🏽, ❤️) conta mais.
int contarCaracteres(String texto) => texto.runes.length;

/// `4.847`, com ponto de milhar (escrever-resenha.md §3).
String _milhar(int valor) {
  final texto = valor.toString();
  final grupos = <String>[];
  for (var fim = texto.length; fim > 0; fim -= 3) {
    grupos.insert(0, texto.substring(fim - 3 < 0 ? 0 : fim - 3, fim));
  }
  return grupos.join('.');
}

/// `1 caractere`, `126 caracteres`: todo número com unidade, no singular quando é um.
String _caracteres(int valor) => valor == 1 ? '1 caractere' : '${_milhar(valor)} caracteres';

/// Abre o editor acima do shell, sem a barra inferior (escrever-resenha.md §4: o editor é um
/// fluxo com salvamento e a saída é pelo `X`). Usa o navegador raiz, então não precisa de rota
/// declarada no `GoRouter`.
Future<void> abrirEditorDeResenha(
  BuildContext context, {
  required AvaliacaoController avaliacao,
  required LivroAvaliado livro,
}) {
  return Navigator.of(context, rootNavigator: true).push<void>(
    MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (_) => EscreverResenhaPage(avaliacao: avaliacao, livro: livro),
    ),
  );
}

/// Editor de resenha (RF-AVA-02..04, a partir de `escrever-resenha.html`).
///
/// - Texto puro em Newsreader, sem borda: Markdown é do Período 2.
/// - O texto nunca é cortado nem bloqueado na digitação; acima de 5.000 caracteres só a
///   publicação fica bloqueada, e o autor decide o que tirar.
/// - O contador é permanente, com três faixas: `grafite`, `ambar` a partir de 4.750 e `rubi`
///   acima de 5.000. O leitor de tela ouve só quando a faixa muda.
/// - Fechar com texto não salvo pede confirmação; nada é descartado em silêncio.
class EscreverResenhaPage extends StatefulWidget {
  final AvaliacaoController avaliacao;
  final LivroAvaliado livro;

  const EscreverResenhaPage({super.key, required this.avaliacao, required this.livro});

  @override
  State<EscreverResenhaPage> createState() => _EscreverResenhaPageState();
}

enum _Faixa { normal, aviso, excedido }

class _EscreverResenhaPageState extends State<EscreverResenhaPage> {
  late final TextEditingController _texto = TextEditingController(
    text: widget.avaliacao.resenha?.texto ?? '',
  );
  late bool _spoiler = widget.avaliacao.resenha?.spoiler ?? false;
  bool _enviando = false;
  String? _erro;
  late _Faixa _faixa = _faixaDe(contarCaracteres(_texto.text));

  bool get _editando => widget.avaliacao.resenha != null;

  bool get _sujo {
    final original = widget.avaliacao.resenha;
    return _texto.text != (original?.texto ?? '') || _spoiler != (original?.spoiler ?? false);
  }

  @override
  void initState() {
    super.initState();
    _texto.addListener(_aoDigitar);
  }

  @override
  void dispose() {
    _texto.dispose();
    super.dispose();
  }

  _Faixa _faixaDe(int total) => total > limiteDaResenha
      ? _Faixa.excedido
      : total >= avisoDaResenha
      ? _Faixa.aviso
      : _Faixa.normal;

  void _aoDigitar() {
    final faixa = _faixaDe(contarCaracteres(_texto.text));
    if (faixa != _faixa) {
      _faixa = faixa;
      final total = contarCaracteres(_texto.text);
      SemanticsService.sendAnnouncement(
        View.of(context),
        faixa == _Faixa.excedido
            ? 'Passou do limite em ${_caracteres(total - limiteDaResenha)}.'
            : faixa == _Faixa.aviso
            ? 'Perto do limite de 5.000 caracteres.'
            : 'Dentro do limite.',
        Directionality.of(context),
      );
    }
    setState(() {});
  }

  Future<void> _publicar() async {
    setState(() {
      _enviando = true;
      _erro = null;
    });
    try {
      await widget.avaliacao.salvarResenha(_texto.text, spoiler: _spoiler);
      if (mounted) {
        Navigator.of(context).pop();
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _enviando = false;
          _erro = 'Não foi possível publicar sua resenha. O texto continua aqui. Tente de novo.';
        });
      }
    }
  }

  Future<void> _excluir() async {
    final confirmado = await confirmarNoModal(
      context,
      titulo: 'Excluir sua resenha?',
      texto:
          'O texto será apagado e sai da página do livro e do seu perfil. Sua nota continua '
          'registrada.',
      acao: 'Excluir resenha',
    );
    if (!confirmado || !mounted) {
      return;
    }
    setState(() {
      _enviando = true;
      _erro = null;
    });
    try {
      await widget.avaliacao.excluirResenha();
      if (mounted) {
        Navigator.of(context).pop();
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _enviando = false;
          _erro = 'Não foi possível excluir sua resenha. Tente de novo.';
        });
      }
    }
  }

  /// Fechar com texto não salvo pede confirmação (escrever-resenha.md §9).
  Future<void> _fechar() async {
    if (!_sujo) {
      Navigator.of(context).pop();
      return;
    }
    final descartar = await confirmarNoModal(
      context,
      titulo: 'Descartar a resenha?',
      texto: 'O que você escreveu aqui não foi salvo e será perdido.',
      acao: 'Descartar',
      cancelar: 'Continuar escrevendo',
    );
    if (descartar && mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = contarCaracteres(_texto.text);
    final podePublicar = !_enviando && _texto.text.trim().isNotEmpty && total <= limiteDaResenha;
    final corDoContador = switch (_faixa) {
      _Faixa.excedido => theme.colorScheme.error,
      _Faixa.aviso => theme.warningColor,
      _Faixa.normal => theme.secondaryText,
    };
    final rotuloDaAcao = _enviando ? 'Publicando' : (_editando ? 'Salvar' : 'Publicar');

    return PopScope(
      canPop: !_sujo || _enviando,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _fechar();
        }
      },
      child: Scaffold(
        backgroundColor: theme.pageBackground,
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              SizedBox(
                height: 72,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space2),
                  child: Row(
                    children: <Widget>[
                      IconButton(
                        tooltip: 'Fechar',
                        onPressed: _enviando ? null : _fechar,
                        icon: Icon(PhosphorIconsRegular.x, size: 24, color: theme.colorScheme.onSurface),
                      ),
                      Expanded(
                        child: Text(
                          'Resenha',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.titleLarge,
                        ),
                      ),
                      TextButton(
                        onPressed: podePublicar ? _publicar : null,
                        style: TextButton.styleFrom(
                          minimumSize: const Size(48, 48),
                          foregroundColor: theme.primaryAccent,
                          disabledForegroundColor: theme.tertiaryText,
                          textStyle: theme.textTheme.labelLarge,
                        ),
                        child: Text(rotuloDaAcao),
                      ),
                    ],
                  ),
                ),
              ),
              Divider(height: 1, color: theme.divider),
              _CabecalhoDoLivro(
                avaliacao: widget.avaliacao,
                livro: widget.livro,
                aoDarNota: _enviando
                    ? null
                    : () => abrirPainelDeNota(context, avaliacao: widget.avaliacao, livro: widget.livro),
              ),
              Divider(height: 1, color: theme.divider),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    DesignTokens.space5,
                    DesignTokens.space5,
                    DesignTokens.space5,
                    0,
                  ),
                  child: TextField(
                    controller: _texto,
                    readOnly: _enviando,
                    expands: true,
                    maxLines: null,
                    keyboardType: TextInputType.multiline,
                    textCapitalization: TextCapitalization.sentences,
                    cursorColor: theme.primaryAccent,
                    style: theme.editorialBody,
                    decoration: InputDecoration.collapsed(
                      hintText:
                          'Escreva sobre o livro. O que ficou, o que incomodou, para quem você '
                          'indicaria.',
                      hintStyle: theme.editorialBody.copyWith(color: theme.tertiaryText),
                    ),
                  ),
                ),
              ),
              if (_erro != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    DesignTokens.space5,
                    0,
                    DesignTokens.space5,
                    DesignTokens.space3,
                  ),
                  child: BannerAviso(variante: VarianteAviso.erro, mensagem: _erro!),
                )
              else if (_faixa == _Faixa.excedido)
                _LinhaDeAviso(
                  texto:
                      'Sua resenha passou do limite em ${_caracteres(total - limiteDaResenha)}. '
                      'Corte um trecho para publicar.',
                  cor: theme.colorScheme.error,
                )
              else if (_spoiler)
                _LinhaDeAviso(
                  texto:
                      'Sua resenha será exibida oculta. Quem quiser ler precisa tocar para revelar.',
                  cor: theme.warningColor,
                ),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: theme.elevatedSurface,
                  border: Border(top: BorderSide(color: theme.divider)),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
                  // Altura mínima, não fixa: com a fonte do sistema aumentada a barra cresce e o
                  // contador quebra linha, sem ser cortado (escrever-resenha.md §9).
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 56),
                    child: Row(
                      children: <Widget>[
                        Flexible(
                          child: ToggleSpoiler(
                            ligado: _spoiler,
                            aoMudar: _enviando ? null : (valor) => setState(() => _spoiler = valor),
                          ),
                        ),
                        const SizedBox(width: DesignTokens.space3),
                        Expanded(
                          child: Text(
                            '${_milhar(total)} de 5.000 caracteres',
                            textAlign: TextAlign.right,
                            style: theme.numInline.copyWith(
                              fontSize: theme.textTheme.bodySmall?.fontSize,
                              color: corDoContador,
                            ),
                          ),
                        ),
                        if (_editando)
                          IconButton(
                            tooltip: 'Excluir resenha',
                            onPressed: _enviando ? null : _excluir,
                            icon: Icon(
                              PhosphorIconsRegular.trash,
                              size: 20,
                              color: theme.colorScheme.error,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LinhaDeAviso extends StatelessWidget {
  final String texto;
  final Color cor;

  const _LinhaDeAviso({required this.texto, required this.cor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        0,
        DesignTokens.space5,
        DesignTokens.space2,
      ),
      child: Text(texto, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: cor)),
    );
  }
}

/// Card compacto com a nota do leitor, ou `Sem nota` e `Dar nota`, e a data quando é edição.
class _CabecalhoDoLivro extends StatelessWidget {
  final AvaliacaoController avaliacao;
  final LivroAvaliado livro;
  final VoidCallback? aoDarNota;

  const _CabecalhoDoLivro({required this.avaliacao, required this.livro, required this.aoDarNota});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListenableBuilder(
      listenable: avaliacao,
      builder: (context, _) {
        final nota = avaliacao.nota?.valor;
        final resenha = avaliacao.resenha;
        return Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.space5,
            vertical: DesignTokens.space4,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  CapaLivro(
                    url: livro.capaUrl,
                    largura: 60,
                    altura: 90,
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
                          style: theme.textTheme.titleSmall,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (livro.autor != null)
                          Text(
                            livro.autor!,
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                          ),
                        const SizedBox(height: DesignTokens.space1),
                        if (nota != null)
                          Semantics(
                            label: 'Sua nota: ${formatarNota(nota)} de 5',
                            excludeSemantics: true,
                            child: Row(
                              children: <Widget>[
                                EstrelasDeNota(valor: nota, tamanho: 16),
                                const SizedBox(width: DesignTokens.space2),
                                Text(formatarNota(nota), style: theme.numInline),
                              ],
                            ),
                          )
                        else
                          Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: <Widget>[
                              Text(
                                'Sem nota',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.tertiaryText,
                                ),
                              ),
                              BotaoTextual(texto: 'Dar nota', onPressed: aoDarNota),
                            ],
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              if (resenha != null) ...<Widget>[
                const SizedBox(height: DesignTokens.space3),
                Text(
                  'Publicada em ${formatarData(resenha.criadoEm)}',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
