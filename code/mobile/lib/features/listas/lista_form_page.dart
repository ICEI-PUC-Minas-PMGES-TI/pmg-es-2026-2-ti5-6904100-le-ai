import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_destrutivo.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/faixa_informativa.dart';
import '../../design/widgets/folha_inferior.dart';
import '../perfil/perfil_service.dart';
import 'listas_service.dart';
import 'textos.dart';
import 'widgets_de_lista.dart';

/// Livro que entra na lista criada pela página dele (criar-lista.md §4.3).
class LivroDeOrigem {
  final String id;
  final String titulo;
  final String? autor;
  final String? capaUrl;
  final bool pessoal;

  const LivroDeOrigem({
    required this.id,
    required this.titulo,
    required this.autor,
    required this.capaUrl,
    required this.pessoal,
  });
}

/// O que o formulário devolve a quem abriu: a lista criada ou salva, ou a exclusão.
class ResultadoDoFormulario {
  final Lista? lista;
  final bool excluida;

  const ResultadoDoFormulario.salva(Lista this.lista) : excluida = false;

  const ResultadoDoFormulario.excluida() : lista = null, excluida = true;
}

/// Abre o formulário em tela cheia pelo navegador raiz: ele cobre a barra inferior e não tem sino
/// (criar-lista.md §4). Fechar sem salvar devolve `null`.
Future<ResultadoDoFormulario?> abrirFormularioDeLista(
  BuildContext context, {
  required ListasService servico,
  Future<Privacidade> Function()? obterPrivacidade,
  Lista? lista,
  LivroDeOrigem? livro,
}) {
  return Navigator.of(context, rootNavigator: true).push<ResultadoDoFormulario>(
    MaterialPageRoute<ResultadoDoFormulario>(
      fullscreenDialog: true,
      builder: (context) => Scaffold(
        body: ListaFormPage(
          servico: servico,
          obterPrivacidade: obterPrivacidade,
          lista: lista,
          livro: livro,
        ),
      ),
    ),
  );
}

/// Criar e editar lista (docs/design/periodo-2/F-LST/criar-lista.md, RF-LST-01/03), com a lógica
/// do `FormularioDeLista.vue` da web. Um título obrigatório e uma descrição opcional, os dois
/// texto puro; a faixa diz quem vai ver a lista, sem chave de visibilidade (RN-08). Na edição, a
/// zona de exclusão no fim, confirmada pela folha destrutiva (§4.8).
///
/// Com [livro], é a criação a partir da página do livro: o livro entra na posição 1 na mesma
/// transação (`POST /listas` com `livroId`).
///
/// Reenviar a mesma intenção (mesmo corpo) repete a `Idempotency-Key` (RNF-ERR-04): se a primeira
/// tiver chegado, não nasce uma segunda lista.
class ListaFormPage extends StatefulWidget {
  final ListasService servico;
  final Future<Privacidade> Function()? obterPrivacidade;

  /// Sem lista, cria; com ela, edita.
  final Lista? lista;
  final LivroDeOrigem? livro;

  const ListaFormPage({
    super.key,
    required this.servico,
    this.obterPrivacidade,
    this.lista,
    this.livro,
  });

  @override
  State<ListaFormPage> createState() => _ListaFormPageState();
}

class _ListaFormPageState extends State<ListaFormPage> {
  late final TextEditingController _titulo = TextEditingController(text: widget.lista?.titulo);
  late final TextEditingController _descricao = TextEditingController(
    text: widget.lista?.descricao,
  );
  final FocusNode _focoDoTitulo = FocusNode();

  Privacidade? _privacidade;
  bool _tituloTocado = false;
  bool _tentouEnviar = false;
  bool _enviando = false;
  bool _demorando = false;
  String? _erroDoServidor;
  Map<String, String> _errosDosCampos = const <String, String>{};
  bool _excluindo = false;
  String? _erroDaExclusao;

  ({String corpo, String valor})? _chave;
  String? _chaveDaExclusao;
  Timer? _relogio;

  bool get _edicao => widget.lista != null;

  @override
  void initState() {
    super.initState();
    _focoDoTitulo.addListener(() {
      if (!_focoDoTitulo.hasFocus && mounted) {
        setState(() => _tituloTocado = true);
      }
    });
    // §4.1: abrir a criação é começar a escrever.
    if (!_edicao) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _focoDoTitulo.requestFocus();
        }
      });
    }
    _carregarPrivacidade();
  }

  /// Sem resposta, a faixa some: melhor não dizer nada do que dizer errado.
  Future<void> _carregarPrivacidade() async {
    final obter = widget.obterPrivacidade;
    if (obter == null) {
      return;
    }
    try {
      final privacidade = await obter();
      if (mounted) {
        setState(() => _privacidade = privacidade);
      }
    } on ApiException {
      // A faixa fica fora.
    }
  }

  @override
  void dispose() {
    _relogio?.cancel();
    _titulo.dispose();
    _descricao.dispose();
    _focoDoTitulo.dispose();
    super.dispose();
  }

  String get _tituloLimpo => _titulo.text.trim();
  String? get _descricaoLimpa => _descricao.text.trim().isEmpty ? null : _descricao.text.trim();
  int get _tamanhoDoTitulo => caracteres(_titulo.text);
  int get _tamanhoDaDescricao => caracteres(_descricao.text);

  String? get _erroDoTitulo {
    final doServidor = _errosDosCampos['titulo'];
    if (doServidor != null) {
      return doServidor;
    }
    if (_tamanhoDoTitulo > limiteDoTitulo) {
      return 'Use até 80 caracteres no título.';
    }
    if ((_tituloTocado || _tentouEnviar) && _tituloLimpo.isEmpty) {
      return 'Dê um título para a lista.';
    }
    return null;
  }

  String? get _erroDaDescricao =>
      _errosDosCampos['descricao'] ??
      (_tamanhoDaDescricao > limiteDaDescricao ? 'Use até 300 caracteres na descrição.' : null);

  bool get _mudou {
    final lista = widget.lista;
    return lista == null || _tituloLimpo != lista.titulo || _descricaoLimpa != lista.descricao;
  }

  bool get _valido =>
      _tituloLimpo.isNotEmpty &&
      _tamanhoDoTitulo <= limiteDoTitulo &&
      _tamanhoDaDescricao <= limiteDaDescricao;

  String get _rotuloDoEnvio {
    if (_edicao) {
      return _enviando ? 'Salvando alterações' : 'Salvar alterações';
    }
    if (_enviando) {
      return 'Criando lista';
    }
    return widget.livro != null ? 'Criar lista com este livro' : 'Criar lista';
  }

  String _chaveDaIntencao(Map<String, Object?> corpo) {
    final serializado = corpo.toString();
    final chave = _chave;
    if (chave != null && chave.corpo == serializado) {
      return chave.valor;
    }
    final valor = ApiClient.newIdempotencyKey();
    _chave = (corpo: serializado, valor: valor);
    return valor;
  }

  void _fechar([ResultadoDoFormulario? resultado]) {
    if (_enviando || _excluindo) {
      return;
    }
    Navigator.of(context).pop(resultado);
  }

  Future<void> _enviar() async {
    setState(() {
      _tentouEnviar = true;
      _errosDosCampos = const <String, String>{};
    });
    if (!_valido || !_mudou || _enviando) {
      return;
    }
    setState(() {
      _enviando = true;
      _erroDoServidor = null;
      _demorando = false;
    });
    _relogio = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() => _demorando = true);
      }
    });
    try {
      final lista = widget.lista;
      final Lista salva;
      if (lista != null) {
        final corpo = <String, Object?>{
          if (_tituloLimpo != lista.titulo) 'titulo': _tituloLimpo,
          if (_descricaoLimpa != lista.descricao) 'descricao': _descricaoLimpa,
        };
        salva = await widget.servico.editar(
          lista.id,
          corpo,
          idempotencyKey: _chaveDaIntencao(corpo),
        );
      } else {
        final corpo = <String, Object?>{
          'titulo': _tituloLimpo,
          'descricao': _descricaoLimpa,
          'livroId': ?widget.livro?.id,
        };
        salva = await widget.servico.criar(
          titulo: _tituloLimpo,
          descricao: _descricaoLimpa,
          livroId: widget.livro?.id,
          idempotencyKey: _chaveDaIntencao(corpo),
        );
      }
      if (!mounted) {
        return;
      }
      _relogio?.cancel();
      setState(() => _enviando = false);
      _fechar(ResultadoDoFormulario.salva(salva));
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      setState(() {
        if (erro.status == 400) {
          _errosDosCampos = <String, String>{
            'titulo': ?erro.campos['titulo'],
            'descricao': ?erro.campos['descricao'],
          };
        }
        if (_errosDosCampos.isEmpty) {
          _erroDoServidor = _edicao
              ? 'Não foi possível salvar as alterações. Verifique sua conexão e tente de novo.'
              : erro.status == 422
              ? 'Este livro não pode entrar numa lista.'
              : 'Não foi possível criar a lista. Verifique sua conexão e tente de novo.';
        }
      });
    } finally {
      _relogio?.cancel();
      if (mounted) {
        setState(() {
          _enviando = false;
          _demorando = false;
        });
      }
    }
  }

  Future<void> _excluir() async {
    final lista = widget.lista;
    if (lista == null) {
      return;
    }
    // O título salvo, e não o editado e ainda não salvo (§4.8).
    final confirmado = await confirmarAcaoDestrutiva(
      context,
      titulo: 'Excluir a lista ${lista.titulo}?',
      texto: textoDaExclusao(lista.quantidadeLivros),
      acao: 'Excluir lista',
    );
    if (!confirmado || !mounted) {
      return;
    }
    setState(() {
      _excluindo = true;
      _erroDaExclusao = null;
    });
    _chaveDaExclusao ??= ApiClient.newIdempotencyKey();
    try {
      await widget.servico.excluir(lista.id, idempotencyKey: _chaveDaExclusao!);
      if (mounted) {
        setState(() => _excluindo = false);
        _fechar(const ResultadoDoFormulario.excluida());
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _excluindo = false;
          _erroDaExclusao =
              'Não foi possível excluir a lista. Verifique sua conexão e tente de novo.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final livro = widget.livro;
    final legenda = theme.textTheme.bodySmall;
    final contador = theme.numInline.copyWith(fontSize: legenda?.fontSize);

    Widget rodapeDoCampo({
      required String? erro,
      required String ajuda,
      required int tamanho,
      required int limite,
    }) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            child: Text(
              erro ?? ajuda,
              style: legenda?.copyWith(
                color: erro != null ? theme.colorScheme.error : theme.secondaryText,
              ),
            ),
          ),
          const SizedBox(width: DesignTokens.space4),
          Semantics(
            label: '$tamanho de $limite caracteres',
            excludeSemantics: true,
            child: Text(
              '$tamanho/$limite',
              style: contador.copyWith(
                color: tamanho > limite ? theme.colorScheme.error : theme.secondaryText,
              ),
            ),
          ),
        ],
      );
    }

    return Column(
      children: <Widget>[
        CabecalhoTela(
          titulo: _edicao ? 'Editar lista' : 'Nova lista',
          aoVoltar: _fechar,
          fechar: true,
          comSino: false,
          semDivisor: true,
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              DesignTokens.space5,
              DesignTokens.space4,
              DesignTokens.space5,
              DesignTokens.space8 + MediaQuery.paddingOf(context).bottom,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                if (livro != null) ...<Widget>[
                  Text('Este livro entra na lista', style: theme.textTheme.labelMedium),
                  const SizedBox(height: DesignTokens.space2),
                  Container(
                    padding: const EdgeInsets.all(DesignTokens.space5),
                    decoration: BoxDecoration(
                      color: theme.elevatedSurface,
                      borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        CapaDeItem(
                          url: livro.capaUrl,
                          titulo: livro.titulo,
                          pessoal: livro.pessoal,
                          largura: 60,
                          altura: 90,
                        ),
                        const SizedBox(width: DesignTokens.space4),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(livro.titulo, style: theme.textTheme.titleMedium),
                              if (livro.autor != null) ...<Widget>[
                                const SizedBox(height: DesignTokens.space1),
                                Text(
                                  livro.autor!,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: theme.secondaryText,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: DesignTokens.space6),
                ],
                CampoTexto(
                  controller: _titulo,
                  label: 'Título',
                  placeholder: 'Ex.: Para ler nas férias',
                  focusNode: _focoDoTitulo,
                  enabled: !_enviando,
                  bordaDeErro: _erroDoTitulo != null,
                  onChanged: (_) => setState(() {
                    _errosDosCampos = const <String, String>{};
                  }),
                ),
                const SizedBox(height: DesignTokens.space2),
                rodapeDoCampo(
                  erro: _erroDoTitulo,
                  ajuda: 'É o nome que aparece no seu perfil.',
                  tamanho: _tamanhoDoTitulo,
                  limite: limiteDoTitulo,
                ),
                const SizedBox(height: DesignTokens.space6),
                CampoTexto(
                  controller: _descricao,
                  label: 'Descrição (opcional)',
                  placeholder: 'O que junta estes livros?',
                  enabled: !_enviando,
                  bordaDeErro: _erroDaDescricao != null,
                  keyboardType: TextInputType.multiline,
                  // 120px de altura mínima, crescendo até 200px e depois rolando por dentro.
                  minLines: 5,
                  maxLines: 8,
                  onChanged: (_) => setState(() {
                    _errosDosCampos = const <String, String>{};
                  }),
                ),
                const SizedBox(height: DesignTokens.space2),
                rodapeDoCampo(
                  erro: _erroDaDescricao,
                  ajuda: 'Aparece abaixo do título, na página da lista.',
                  tamanho: _tamanhoDaDescricao,
                  limite: limiteDaDescricao,
                ),
                if (_privacidade != null) ...<Widget>[
                  const SizedBox(height: DesignTokens.space6),
                  FaixaInformativa(mensagem: visibilidadeDaLista(_privacidade!)),
                ],
                if (_erroDoServidor != null) ...<Widget>[
                  const SizedBox(height: DesignTokens.space6),
                  BannerAviso(
                    variante: VarianteAviso.erro,
                    triangulo: true,
                    mensagem: _erroDoServidor!,
                  ),
                ],
                const SizedBox(height: DesignTokens.space8),
                BotaoPrimario(
                  texto: _rotuloDoEnvio,
                  carregando: _enviando,
                  desabilitadoNeutro: true,
                  onPressed: _valido && _mudou && !_excluindo ? _enviar : null,
                ),
                if (_demorando) ...<Widget>[
                  const SizedBox(height: DesignTokens.space2),
                  Semantics(
                    liveRegion: true,
                    child: Text(
                      'O serviço está iniciando. Isso pode levar alguns segundos.',
                      textAlign: TextAlign.center,
                      style: legenda?.copyWith(color: theme.secondaryText),
                    ),
                  ),
                ],
                const SizedBox(height: DesignTokens.space3),
                BotaoTextual(
                  texto: 'Cancelar',
                  neutro: true,
                  larguraTotal: true,
                  onPressed: _enviando || _excluindo ? null : _fechar,
                ),
                if (_edicao) ...<Widget>[
                  const SizedBox(height: DesignTokens.space8),
                  Divider(height: 1, color: theme.divider),
                  const SizedBox(height: DesignTokens.space5),
                  Text(
                    'Excluir esta lista',
                    style: legenda?.copyWith(color: theme.secondaryText),
                  ),
                  const SizedBox(height: DesignTokens.space3),
                  BotaoDestrutivo(
                    texto: _excluindo ? 'Excluindo lista' : 'Excluir lista',
                    carregando: _excluindo,
                    onPressed: _enviando ? null : _excluir,
                  ),
                  if (_erroDaExclusao != null) ...<Widget>[
                    const SizedBox(height: DesignTokens.space3),
                    BannerAviso(
                      variante: VarianteAviso.erro,
                      triangulo: true,
                      mensagem: _erroDaExclusao!,
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}
