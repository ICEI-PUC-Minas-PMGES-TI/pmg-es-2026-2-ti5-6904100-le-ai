import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/folha_inferior.dart';
import '../listas/widgets_de_lista.dart';
import 'frases.dart';
import 'leitura_service.dart';

/// O livro do formulário: título, autor e capa do card, e o total de páginas para validar.
class LivroDaFrase {
  final String id;
  final String titulo;
  final String? autor;
  final String? capaUrl;
  final int paginas;

  const LivroDaFrase({
    required this.id,
    required this.titulo,
    this.autor,
    this.capaUrl,
    required this.paginas,
  });
}

/// O que a folha devolve: a frase salva, ou o pedido de ver as frases (cota estourada).
sealed class ResultadoDaFrase {
  const ResultadoDaFrase();
}

class FraseSalva extends ResultadoDaFrase {
  final Frase frase;
  const FraseSalva(this.frase);
}

class VerMinhasFrases extends ResultadoDaFrase {
  const VerMinhasFrases();
}

/// Abre o formulário de nova frase (adicionar-frase.md) pelo navegador raiz, como o registro de
/// progresso: o scrim cobre a barra inferior e a folha enxerga o teclado.
Future<ResultadoDaFrase?> abrirAdicionarFrase(
  BuildContext context, {
  required LeituraService leitura,
  required LivroDaFrase livro,
  required int minhasFrases,
  int limite = 10,
}) {
  return mostrarFolhaInferior<ResultadoDaFrase>(
    Navigator.of(context, rootNavigator: true).context,
    builder: (context) => FolhaAdicionarFrase(
      leitura: leitura,
      livro: livro,
      minhasFrases: minhasFrases,
      limite: limite,
    ),
  );
}

enum _Etapa { formulario, descarte, limite }

/// Formulário de frase, igual a `AdicionarFrase.vue`: trecho de até 500 caracteres e página
/// obrigatória (RN-11), validados ao tocar em `Salvar frase`, que nunca trava. O contador conta
/// code points e passa a `rubi` acima de 500, sem cortar o texto. A mesma chave de idempotência
/// vale enquanto trecho e página não mudam. Com o trecho escrito, sair pede o descarte na própria
/// folha; com a cota estourada no servidor, os campos travam e as ações trocam.
class FolhaAdicionarFrase extends StatefulWidget {
  final LeituraService leitura;
  final LivroDaFrase livro;
  final int minhasFrases;
  final int limite;

  const FolhaAdicionarFrase({
    super.key,
    required this.leitura,
    required this.livro,
    required this.minhasFrases,
    this.limite = 10,
  });

  @override
  State<FolhaAdicionarFrase> createState() => _FolhaAdicionarFraseState();
}

class _FolhaAdicionarFraseState extends State<FolhaAdicionarFrase> {
  final TextEditingController _trecho = TextEditingController();
  final TextEditingController _pagina = TextEditingController();
  final FocusNode _focoDoTrecho = FocusNode();
  final FocusNode _focoDaPagina = FocusNode();
  _Etapa _etapa = _Etapa.formulario;
  bool _tentou = false;
  bool _salvando = false;
  String? _erroEnvio;
  String? _erroServidorTrecho;
  String? _erroServidorPagina;
  ({String corpo, String valor})? _chave;

  @override
  void initState() {
    super.initState();
    _trecho.addListener(_aoEditar);
    _pagina.addListener(_aoEditar);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _focoDoTrecho.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _trecho.dispose();
    _pagina.dispose();
    _focoDoTrecho.dispose();
    _focoDaPagina.dispose();
    super.dispose();
  }

  void _aoEditar() => setState(() {
    _erroEnvio = null;
    _erroServidorTrecho = null;
    _erroServidorPagina = null;
  });

  String? get _erroTrecho => _erroServidorTrecho ?? (_tentou ? erroDoTrecho(_trecho.text) : null);
  String? get _erroPagina =>
      _erroServidorPagina ?? (_tentou ? erroDaPagina(_pagina.text, widget.livro.paginas) : null);

  String _chaveDaIntencao(String corpo) {
    final atual = _chave;
    if (atual != null && atual.corpo == corpo) {
      return atual.valor;
    }
    final nova = ApiClient.newIdempotencyKey();
    _chave = (corpo: corpo, valor: nova);
    return nova;
  }

  Future<void> _salvar() async {
    if (_salvando || _etapa != _Etapa.formulario) {
      return;
    }
    setState(() => _tentou = true);
    if (erroDoTrecho(_trecho.text) != null) {
      _focoDoTrecho.requestFocus();
      return;
    }
    if (erroDaPagina(_pagina.text, widget.livro.paginas) != null) {
      _focoDaPagina.requestFocus();
      return;
    }
    final pagina = int.parse(_pagina.text.trim());
    setState(() {
      _salvando = true;
      _erroEnvio = null;
    });
    try {
      final frase = await widget.leitura.criarFrase(
        widget.livro.id,
        texto: _trecho.text,
        pagina: pagina,
        idempotencyKey: _chaveDaIntencao('$pagina|${_trecho.text}'),
      );
      if (mounted) {
        Navigator.of(context).pop(FraseSalva(frase));
      }
    } on ApiException catch (erro) {
      if (!mounted) return;
      setState(() {
        if (erro.codigo == 'LIMITE_DE_FRASES') {
          _etapa = _Etapa.limite;
        } else if (erro.status == 422 && erro.campos.isNotEmpty) {
          _erroServidorTrecho = erro.campos['texto'];
          _erroServidorPagina = erro.campos['pagina'];
        } else {
          _erroEnvio = TextosDasFrases.erroEnvio;
        }
      });
    } finally {
      if (mounted) {
        setState(() => _salvando = false);
      }
    }
  }

  bool get _pedeDescarte => _etapa == _Etapa.formulario && _trecho.text.trim().isNotEmpty;

  void _pedirFechar() {
    if (_salvando) return;
    if (_pedeDescarte) {
      setState(() => _etapa = _Etapa.descarte);
      return;
    }
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_pedeDescarte && !_salvando,
      onPopInvokedWithResult: (saiu, _) {
        if (!saiu && _pedeDescarte) {
          setState(() => _etapa = _Etapa.descarte);
        }
      },
      child: _etapa == _Etapa.descarte ? _descarte(context) : _formulario(context),
    );
  }

  Widget _descarte(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(TextosDasFrases.descartarTitulo, style: theme.textTheme.titleMedium),
        const SizedBox(height: DesignTokens.space3),
        Text(
          TextosDasFrases.naoSeraGuardado,
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
        ),
        const SizedBox(height: DesignTokens.space6),
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(),
          style: OutlinedButton.styleFrom(
            foregroundColor: theme.colorScheme.error,
            minimumSize: const Size.fromHeight(48),
            side: BorderSide(color: theme.colorScheme.error),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DesignTokens.radius)),
          ),
          child: const Text(TextosDasFrases.descartar),
        ),
        const SizedBox(height: DesignTokens.space3),
        BotaoTextual(
          texto: TextosDasFrases.continuar,
          larguraTotal: true,
          onPressed: () => setState(() => _etapa = _Etapa.formulario),
        ),
      ],
    );
  }

  Widget _formulario(BuildContext context) {
    final theme = Theme.of(context);
    final travado = _salvando || _etapa == _Etapa.limite;
    final total = contarCaracteres(_trecho.text);
    final erroTrecho = _erroTrecho;
    final erroPagina = _erroPagina;
    final legenda = theme.textTheme.bodySmall;
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(TextosDasFrases.adicionar, style: theme.textTheme.titleLarge),
          const SizedBox(height: DesignTokens.space4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              CapaLivro(
                url: widget.livro.capaUrl,
                largura: 48,
                altura: 72,
                titulo: widget.livro.titulo,
                autor: widget.livro.autor,
              ),
              const SizedBox(width: DesignTokens.space4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(widget.livro.titulo, style: theme.textTheme.titleMedium, maxLines: 2),
                    if (widget.livro.autor != null)
                      Text(widget.livro.autor!, style: legenda?.copyWith(color: theme.secondaryText)),
                    Text(
                      linhaDaCota(widget.minhasFrases, widget.limite, noFormulario: true),
                      style: legenda?.copyWith(color: theme.secondaryText),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.space5),
          Divider(height: 1, color: theme.divider),
          const SizedBox(height: DesignTokens.space5),
          CampoTexto(
            key: const ValueKey<String>('campo-trecho'),
            controller: _trecho,
            focusNode: _focoDoTrecho,
            label: TextosDasFrases.rotuloTrecho,
            placeholder: TextosDasFrases.placeholderTrecho,
            minLines: 6,
            maxLines: 12,
            keyboardType: TextInputType.multiline,
            bordaDeErro: erroTrecho != null,
            enabled: !travado,
          ),
          const SizedBox(height: DesignTokens.space2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Text(
                  erroTrecho ?? TextosDasFrases.ajudaTrecho,
                  style: legenda?.copyWith(
                    color: erroTrecho != null ? theme.colorScheme.error : theme.secondaryText,
                  ),
                ),
              ),
              const SizedBox(width: DesignTokens.space4),
              Text(
                '$total/$limiteDoTrecho',
                key: const ValueKey<String>('contador-trecho'),
                style: theme.numInline.copyWith(
                  fontSize: legenda?.fontSize,
                  color: total > limiteDoTrecho ? theme.colorScheme.error : theme.secondaryText,
                ),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.space5),
          Align(
            alignment: Alignment.centerLeft,
            child: SizedBox(
              width: 200,
              child: CampoTexto(
                key: const ValueKey<String>('campo-pagina'),
                controller: _pagina,
                focusNode: _focoDaPagina,
                label: TextosDasFrases.rotuloPagina,
                keyboardType: TextInputType.number,
                inputFormatters: <TextInputFormatter>[FilteringTextInputFormatter.digitsOnly],
                estiloDoTexto: theme.numInline,
                helper: erroPagina == null ? TextosDasFrases.ajudaPagina(widget.livro.paginas) : null,
                erro: erroPagina,
                enabled: !travado,
              ),
            ),
          ),
          if (_etapa == _Etapa.limite) ...<Widget>[
            const SizedBox(height: DesignTokens.space5),
            const BannerAviso(variante: VarianteAviso.erro, mensagem: TextosDasFrases.limiteNoEnvio),
            const SizedBox(height: DesignTokens.space6),
            BotaoSecundarioDeLista(
              texto: TextosDasFrases.verMinhas,
              aoTocar: () => Navigator.of(context).pop(const VerMinhasFrases()),
            ),
            const SizedBox(height: DesignTokens.space2),
            BotaoTextual(
              texto: TextosDasFrases.fechar,
              larguraTotal: true,
              onPressed: () => Navigator.of(context).pop(),
            ),
            const SizedBox(height: DesignTokens.space3),
            Text(TextosDasFrases.naoSeraGuardado, style: legenda?.copyWith(color: theme.secondaryText)),
          ] else ...<Widget>[
            const SizedBox(height: DesignTokens.space6),
            BotaoPrimario(
              texto: _salvando ? TextosDasFrases.salvando : TextosDasFrases.salvar,
              onPressed: _salvando ? null : _salvar,
            ),
            const SizedBox(height: DesignTokens.space2),
            BotaoTextual(
              texto: TextosDasFrases.cancelar,
              larguraTotal: true,
              onPressed: _salvando ? null : _pedirFechar,
            ),
            if (_erroEnvio != null) ...<Widget>[
              const SizedBox(height: DesignTokens.space3),
              Semantics(
                liveRegion: true,
                child: Row(
                  children: <Widget>[
                    Icon(PhosphorIconsRegular.warning, size: 16, color: theme.colorScheme.error),
                    const SizedBox(width: DesignTokens.space2),
                    Expanded(
                      child: Text(_erroEnvio!, style: legenda?.copyWith(color: theme.colorScheme.error)),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
