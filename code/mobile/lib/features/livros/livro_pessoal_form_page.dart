import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/area_upload_capa.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_destrutivo.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/cartao_progresso.dart';
import '../../design/widgets/folha_inferior.dart';
import 'acervo_service.dart';
import 'capa.dart';

const int _limiteDaSinopse = 4000;
const int _avisoDaSinopse = 3800;

/// Cadastro e edição de livro pessoal (RF-ACV-08, RF-ACV-09). Estrutura e cópia de
/// docs/design/periodo-1/F-ACV-CADASTRO/cadastro-pessoal.md §4 e §8.
///
/// **Não existe campo de ISBN**, nem de editora, série ou assunto (RN-02, RN-03, RF-ACV-22 é
/// do Período 3): o formulário é título, autor, páginas, sinopse e capa.
class LivroPessoalFormPage extends StatefulWidget {
  final AcervoService servico;
  final SeletorDeImagem seletor;
  final EnviadorDeCapa enviador;

  /// Presente na edição: a tela carrega o livro e ganha a zona de exclusão.
  final String? livroId;

  final VoidCallback? aoCancelar;
  final void Function(LivroPessoal livro)? aoSalvar;
  final VoidCallback? aoExcluir;

  const LivroPessoalFormPage({
    super.key,
    required this.servico,
    required this.seletor,
    required this.enviador,
    this.livroId,
    this.aoCancelar,
    this.aoSalvar,
    this.aoExcluir,
  });

  @override
  State<LivroPessoalFormPage> createState() => _LivroPessoalFormPageState();
}

class _LivroPessoalFormPageState extends State<LivroPessoalFormPage> {
  final _titulo = TextEditingController();
  final _autor = TextEditingController();
  final _paginas = TextEditingController();
  final _sinopse = TextEditingController();

  bool get _edicao => widget.livroId != null;

  bool _carregando = false;
  String? _erroDeCarga;
  String _tituloOriginal = '';

  EstadoDaCapa _estadoDaCapa = EstadoDaCapa.vazia;
  Uint8List? _bytesDaCapa;
  String? _capaUrl;
  double _progressoDaCapa = 0;
  String? _erroDaCapa;

  final Map<String, String> _erros = <String, String>{};
  final Set<String> _tocados = <String>{};
  String? _banner;

  bool _salvando = false;
  bool _excluindo = false;
  bool _coldStart = false;
  Timer? _coldStartTimer;

  // A chave acompanha a intenção: reenviar o mesmo formulário depois de uma falha reaproveita a
  // chave e o servidor devolve a resposta original; mudar o conteúdo gera outra (RNF-ERR-04).
  String? _chave;
  String? _conteudoDaChave;

  @override
  void initState() {
    super.initState();
    for (final campo in <String, TextEditingController>{
      'titulo': _titulo,
      'autor': _autor,
      'paginas': _paginas,
      'sinopse': _sinopse,
    }.entries) {
      campo.value.addListener(() => _aoEditar(campo.key));
    }
    if (_edicao) {
      _carregar();
    }
  }

  @override
  void dispose() {
    _coldStartTimer?.cancel();
    _titulo.dispose();
    _autor.dispose();
    _paginas.dispose();
    _sinopse.dispose();
    super.dispose();
  }

  Future<void> _carregar() async {
    setState(() {
      _carregando = true;
      _erroDeCarga = null;
    });
    try {
      final livro = await widget.servico.obterLivroPessoal(widget.livroId!);
      if (!mounted) {
        return;
      }
      setState(() {
        _titulo.text = livro.titulo;
        _autor.text = livro.autor;
        _paginas.text = '${livro.paginas}';
        _sinopse.text = livro.sinopse ?? '';
        _capaUrl = livro.capaUrl;
        _estadoDaCapa = livro.capaUrl == null ? EstadoDaCapa.vazia : EstadoDaCapa.preenchida;
        _tituloOriginal = livro.titulo;
        _erros.clear();
        _carregando = false;
      });
    } on ApiException catch (erro) {
      if (mounted) {
        setState(() {
          _carregando = false;
          _erroDeCarga = erro.message;
        });
      }
    }
  }

  void _aoEditar(String campo) {
    setState(() {
      _banner = null;
      final vazio = _controllerDe(campo).text.trim().isEmpty;
      if (!vazio) {
        _tocados.add(campo);
        _erros.remove(campo);
      } else if (_tocados.contains(campo)) {
        // Campo obrigatório que a pessoa esvaziou: o erro aparece no campo, sem banner (§4.5).
        final mensagem = _mensagemDeObrigatorio(campo);
        if (mensagem != null) {
          _erros[campo] = mensagem;
        }
      }
    });
  }

  TextEditingController _controllerDe(String campo) => switch (campo) {
    'titulo' => _titulo,
    'autor' => _autor,
    'paginas' => _paginas,
    _ => _sinopse,
  };

  String? _mensagemDeObrigatorio(String campo) => switch (campo) {
    'titulo' => 'Informe o título do livro.',
    'autor' => 'Informe quem escreveu.',
    'paginas' => 'Informe quantas páginas o livro tem.',
    _ => null,
  };

  int? get _paginasValidas {
    final valor = int.tryParse(_paginas.text.trim());
    return valor != null && valor > 0 ? valor : null;
  }

  bool get _podeSalvar =>
      _titulo.text.trim().isNotEmpty &&
      _autor.text.trim().isNotEmpty &&
      _paginas.text.trim().isNotEmpty &&
      _estadoDaCapa != EstadoDaCapa.enviando &&
      !_salvando &&
      !_excluindo &&
      _sinopse.text.length <= _limiteDaSinopse;

  Future<void> _escolherCapa() async {
    final imagem = await widget.seletor.escolher();
    if (imagem == null || !mounted) {
      return;
    }
    final recusa = await validarCapa(imagem.bytes);
    if (!mounted) {
      return;
    }
    if (recusa != null) {
      // O erro é da imagem, não do formulário: nada do que foi digitado se perde (§4.4).
      setState(() {
        _estadoDaCapa = EstadoDaCapa.erro;
        _erroDaCapa = recusa;
        _bytesDaCapa = null;
        _capaUrl = null;
      });
      return;
    }

    setState(() {
      _estadoDaCapa = EstadoDaCapa.enviando;
      _bytesDaCapa = imagem.bytes;
      _progressoDaCapa = 0;
      _erroDaCapa = null;
    });
    try {
      final url = await widget.enviador.enviar(
        imagem,
        aoProgredir: (progresso) {
          if (mounted) {
            setState(() => _progressoDaCapa = progresso);
          }
        },
      );
      if (mounted) {
        setState(() {
          _capaUrl = url;
          _estadoDaCapa = EstadoDaCapa.preenchida;
        });
      }
    } on FalhaNoEnvioDaCapa {
      if (mounted) {
        setState(() {
          _estadoDaCapa = EstadoDaCapa.erro;
          _erroDaCapa = 'Não foi possível enviar a capa. Tente de novo.';
          _bytesDaCapa = null;
          _capaUrl = null;
        });
      }
    }
  }

  void _removerCapa() {
    setState(() {
      _estadoDaCapa = EstadoDaCapa.vazia;
      _bytesDaCapa = null;
      _capaUrl = null;
      _erroDaCapa = null;
    });
  }

  Future<void> _salvar() async {
    final paginas = _paginasValidas;
    if (paginas == null) {
      setState(() => _erros['paginas'] = 'Informe quantas páginas o livro tem.');
      return;
    }
    final sinopse = _sinopse.text.trim();
    final dados = DadosLivroPessoal(
      titulo: _titulo.text.trim(),
      autor: _autor.text.trim(),
      paginas: paginas,
      sinopse: sinopse.isEmpty ? null : sinopse,
      capaUrl: _capaUrl,
    );
    final conteudo = jsonEncode(dados.paraJson(edicao: _edicao));
    if (_conteudoDaChave != conteudo) {
      _chave = ApiClient.newIdempotencyKey();
      _conteudoDaChave = conteudo;
    }

    setState(() {
      _salvando = true;
      _banner = null;
      _coldStart = false;
    });
    // Servidor demorando além de três segundos: a linha de cold start aparece (§4.6).
    _coldStartTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() => _coldStart = true);
      }
    });
    try {
      final livro = _edicao
          ? await widget.servico.atualizarLivroPessoal(
              widget.livroId!,
              dados,
              idempotencyKey: _chave!,
            )
          : await widget.servico.criarLivroPessoal(dados, idempotencyKey: _chave!);
      if (mounted) {
        widget.aoSalvar?.call(livro);
      }
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      setState(() {
        final campos = erro.campos;
        if (campos.isNotEmpty) {
          for (final MapEntry(:key, :value) in campos.entries) {
            if (key == 'capaUrl') {
              _estadoDaCapa = EstadoDaCapa.erro;
              _erroDaCapa = value;
            } else {
              _erros[key] = value;
            }
          }
        } else {
          _banner = erro.message;
        }
      });
    } finally {
      _coldStartTimer?.cancel();
      if (mounted) {
        setState(() {
          _salvando = false;
          _coldStart = false;
        });
      }
    }
  }

  Future<void> _excluir() async {
    final titulo = _tituloOriginal.isEmpty ? _titulo.text.trim() : _tituloOriginal;
    final confirmado = await confirmarAcaoDestrutiva(
      context,
      titulo: 'Excluir este livro?',
      texto:
          '$titulo sai da sua estante e sua nota e resenha dele são perdidas. Quem viu esse '
          'livro pelo seu feed deixa de conseguir abri-lo. Não dá para desfazer.',
      acao: 'Excluir livro',
    );
    if (!confirmado || !mounted) {
      return;
    }
    setState(() {
      _excluindo = true;
      _banner = null;
    });
    try {
      await widget.servico.excluirLivroPessoal(
        widget.livroId!,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
      if (mounted) {
        widget.aoExcluir?.call();
      }
    } on ApiException catch (erro) {
      if (mounted) {
        setState(() {
          _excluindo = false;
          _banner = erro.message;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bloqueado = _salvando || _excluindo;

    return Column(
      children: <Widget>[
        CabecalhoTela(
          titulo: _edicao ? 'Editar livro' : 'Novo livro pessoal',
          aoVoltar: widget.aoCancelar,
        ),
        Expanded(
          child: _carregando
              ? const Padding(
                  padding: EdgeInsets.all(DesignTokens.space5),
                  child: Column(
                    children: <Widget>[
                      BarraSkeleton(altura: 160, fracaoDaLargura: 0.32),
                      SizedBox(height: DesignTokens.space6),
                      BarraSkeleton(altura: 48, fracaoDaLargura: 1),
                      SizedBox(height: DesignTokens.space5),
                      BarraSkeleton(altura: 48, fracaoDaLargura: 1),
                    ],
                  ),
                )
              : _erroDeCarga != null
              ? Padding(
                  padding: const EdgeInsets.all(DesignTokens.space5),
                  child: Column(
                    children: <Widget>[
                      BannerAviso(variante: VarianteAviso.erro, mensagem: _erroDeCarga!),
                      const SizedBox(height: DesignTokens.space4),
                      BotaoPrimario(texto: 'Tentar de novo', onPressed: _carregar),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const SizedBox(height: DesignTokens.space6),
                      if (_banner != null) ...<Widget>[
                        BannerAviso(variante: VarianteAviso.erro, mensagem: _banner!),
                        const SizedBox(height: DesignTokens.space5),
                      ],
                      AreaUploadCapa(
                        estado: _estadoDaCapa,
                        bytes: _bytesDaCapa,
                        url: _capaUrl,
                        progresso: _progressoDaCapa,
                        erro: _erroDaCapa,
                        aoEscolher: bloqueado ? null : _escolherCapa,
                        aoRemover: bloqueado ? null : _removerCapa,
                      ),
                      const SizedBox(height: DesignTokens.space6),
                      CampoTexto(
                        controller: _titulo,
                        label: 'Título',
                        placeholder: 'Cartas de um sertanejo',
                        erro: _erros['titulo'],
                        enabled: !bloqueado,
                      ),
                      const SizedBox(height: DesignTokens.space5),
                      CampoTexto(
                        controller: _autor,
                        label: 'Autor',
                        placeholder: 'Marina Albuquerque',
                        erro: _erros['autor'],
                        enabled: !bloqueado,
                      ),
                      const SizedBox(height: DesignTokens.space5),
                      // A largura do campo comunica o tamanho da entrada esperada (§4.1).
                      SizedBox(
                        width: 160,
                        child: CampoTexto(
                          controller: _paginas,
                          label: 'Número de páginas',
                          keyboardType: TextInputType.number,
                          inputFormatters: <TextInputFormatter>[
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(5),
                          ],
                          estiloDoTexto: theme.numInline,
                          erro: _erros['paginas'],
                          enabled: !bloqueado,
                        ),
                      ),
                      if (_erros['paginas'] == null) ...<Widget>[
                        const SizedBox(height: DesignTokens.space2),
                        Text(
                          'Usamos as páginas para calcular seu progresso de leitura.',
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                        ),
                      ],
                      const SizedBox(height: DesignTokens.space5),
                      CampoTexto(
                        controller: _sinopse,
                        label: 'Sinopse',
                        helper: 'Opcional.',
                        minLines: 5,
                        maxLines: 10,
                        keyboardType: TextInputType.multiline,
                        erro: _erros['sinopse'],
                        enabled: !bloqueado,
                      ),
                      const SizedBox(height: DesignTokens.space1),
                      Align(
                        alignment: Alignment.centerRight,
                        child: Text(
                          '${_sinopse.text.length}/$_limiteDaSinopse',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: _sinopse.text.length > _avisoDaSinopse
                                ? theme.warningColor
                                : theme.tertiaryText,
                          ),
                        ),
                      ),
                      const SizedBox(height: DesignTokens.space8),
                      BotaoPrimario(
                        texto: _salvando
                            ? 'Salvando'
                            : _edicao
                            ? 'Salvar alterações'
                            : 'Salvar livro',
                        carregando: _salvando,
                        onPressed: _podeSalvar ? _salvar : null,
                      ),
                      if (_coldStart) ...<Widget>[
                        const SizedBox(height: DesignTokens.space3),
                        Text(
                          'O serviço está iniciando. Isso pode levar alguns segundos.',
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                        ),
                      ],
                      const SizedBox(height: DesignTokens.space3),
                      Center(
                        child: BotaoTextual(
                          texto: 'Cancelar',
                          neutro: true,
                          onPressed: bloqueado ? null : widget.aoCancelar,
                        ),
                      ),
                      if (_edicao) ...<Widget>[
                        const SizedBox(height: DesignTokens.space8),
                        Divider(height: 1, color: theme.divider),
                        const SizedBox(height: DesignTokens.space5),
                        Text(
                          'Excluir este livro',
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                        ),
                        const SizedBox(height: DesignTokens.space3),
                        BotaoDestrutivo(
                          texto: 'Excluir livro',
                          carregando: _excluindo,
                          onPressed: bloqueado ? null : _excluir,
                        ),
                      ],
                      const SizedBox(height: DesignTokens.space10),
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}
