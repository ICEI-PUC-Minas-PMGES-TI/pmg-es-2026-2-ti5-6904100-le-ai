import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/folha_inferior.dart';
import 'fila_de_progresso.dart';
import 'progresso_service.dart';
import 'regras.dart';
import 'registro_progresso_controller.dart';
import 'textos.dart';

const double _larguraDaCapa = 60;
const double _alturaDaCapa = 90;
const double _iconeDerivado = 16;
const int _minutosPorHora = 60;

class LeituraDoRegistro {
  final String leituraId;
  final String titulo;
  final String? autor;
  final String? capaUrl;
  final int paginaAtual;
  final int totalPaginas;

  const LeituraDoRegistro({
    required this.leituraId,
    required this.titulo,
    this.autor,
    this.capaUrl,
    required this.paginaAtual,
    required this.totalPaginas,
  });
}

class CorrecaoDoPendente {
  final String chave;
  final int pagina;
  final int minutos;
  final int paginaAnterior;

  CorrecaoDoPendente(RegistroPendente pendente, {required this.paginaAnterior})
    : chave = pendente.chave,
      pagina = pendente.pagina,
      minutos = pendente.minutos ?? 0;
}

Future<ResultadoDoRegistro?> abrirRegistroDeProgresso(
  BuildContext context, {
  required ProgressoService servico,
  required LeituraDoRegistro leitura,
  FilaDeProgresso? fila,
  CorrecaoDoPendente? correcao,
  DateTime Function()? agora,
}) {
  // Pelo navegador raiz, como o painel de nota: o scrim cobre a viewport inteira, barra inferior
  // incluída ("Anatomia do bottom sheet"), e a folha enxerga o teclado. Dentro da aba, o
  // `Scaffold` do shell consumia a altura do teclado e a folha ficava espremida entre o cabeçalho
  // e a barra, sem lugar para o botão de salvar.
  return mostrarFolhaInferior<ResultadoDoRegistro>(
    Navigator.of(context, rootNavigator: true).context,
    builder: (context) => FolhaDeRegistroDeProgresso(
      servico: servico,
      leitura: leitura,
      fila: fila,
      correcao: correcao,
      agora: agora,
    ),
  );
}

class FolhaDeRegistroDeProgresso extends StatefulWidget {
  final ProgressoService servico;
  final LeituraDoRegistro leitura;
  final FilaDeProgresso? fila;
  final CorrecaoDoPendente? correcao;
  final DateTime Function()? agora;

  const FolhaDeRegistroDeProgresso({
    super.key,
    required this.servico,
    required this.leitura,
    this.fila,
    this.correcao,
    this.agora,
  });

  @override
  State<FolhaDeRegistroDeProgresso> createState() => _FolhaDeRegistroDeProgressoState();
}

class _FolhaDeRegistroDeProgressoState extends State<FolhaDeRegistroDeProgresso> {
  late final RegistroProgressoController _controller = RegistroProgressoController(
    widget.servico,
    fila: widget.fila,
    agora: widget.agora,
  );
  final TextEditingController _pagina = TextEditingController();
  final TextEditingController _horas = TextEditingController();
  final TextEditingController _minutos = TextEditingController();
  final FocusNode _focoDaPagina = FocusNode();
  String? _erroPagina;
  String? _erroTempo;

  int get _paginaBase {
    final correcao = widget.correcao;
    if (correcao != null) {
      return correcao.paginaAnterior;
    }
    final local = widget.fila?.paginaLocal(widget.leitura.leituraId);
    final atual = widget.leitura.paginaAtual;
    return local != null && local > atual ? local : atual;
  }

  @override
  void initState() {
    super.initState();
    final correcao = widget.correcao;
    if (correcao != null) {
      _pagina.text = '${correcao.pagina}';
      if (correcao.minutos > 0) {
        _horas.text = '${correcao.minutos ~/ _minutosPorHora}';
        _minutos.text = '${correcao.minutos % _minutosPorHora}';
      }
    }
    _controller.addListener(_aoMudar);
    _pagina.addListener(_aoMudarPagina);
    _horas.addListener(_aoMudarTempo);
    _minutos.addListener(_aoMudarTempo);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _focoDaPagina.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_aoMudar)
      ..dispose();
    _pagina.dispose();
    _horas.dispose();
    _minutos.dispose();
    _focoDaPagina.dispose();
    super.dispose();
  }

  void _aoMudar() => setState(() {});

  void _aoMudarPagina() {
    setState(() => _erroPagina = null);
  }

  void _aoMudarTempo() {
    if (_erroTempo != null) {
      setState(() => _erroTempo = null);
    }
  }

  Future<void> _salvar() async {
    final pagina = inteiroDoCampo(_pagina.text);
    final tempo = validarTempo(_horas.text, _minutos.text);
    final erroPagina = validarPagina(_paginaBase, widget.leitura.totalPaginas, pagina);
    setState(() {
      _erroPagina = erroPagina;
      _erroTempo = tempo.erro;
    });
    if (erroPagina != null || tempo.erro != null || pagina == null) {
      return;
    }
    final correcao = widget.correcao;
    if (correcao != null) {
      await widget.fila?.corrigir(correcao.chave, pagina: pagina, minutos: tempo.minutos);
      if (mounted) {
        Navigator.of(context).pop();
      }
      return;
    }
    final resultado = await _controller.registrar(
      widget.leitura.leituraId,
      pagina: pagina,
      minutos: tempo.minutos,
    );
    if (resultado != null && mounted) {
      Navigator.of(context).pop(resultado);
    }
  }

  void _cancelar() {
    if (!_controller.salvando) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final salvando = _controller.salvando;
    final base = _paginaBase;
    final total = widget.leitura.totalPaginas;
    final valorPagina = inteiroDoCampo(_pagina.text);
    final lidas = valorPagina != null && valorPagina <= total
        ? paginasLidas(base, valorPagina)
        : null;
    final erroPagina = _erroPagina ?? _controller.errosDosCampos['pagina'];
    final erroTempo = _erroTempo ?? _controller.errosDosCampos['minutos'];
    final ajuda = TextosDoRegistro.ajudaPagina(base + 1, total);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Semantics(
              header: true,
              child: Text(TextosDoRegistro.titulo, style: theme.textTheme.titleLarge),
            ),
            const SizedBox(height: DesignTokens.space4),
            _cartaoDoLivro(theme, legenda, base),
            Divider(height: DesignTokens.space5 * 2, color: theme.divider),
            CampoTexto(
              controller: _pagina,
              label: TextosDoRegistro.rotuloPagina,
              focusNode: _focoDaPagina,
              keyboardType: TextInputType.number,
              inputFormatters: <TextInputFormatter>[FilteringTextInputFormatter.digitsOnly],
              enabled: !salvando,
              estiloDoTexto: theme.numInline,
              erro: erroPagina,
              erroAntesDoHelper: true,
              helper: ajuda,
            ),
            const SizedBox(height: DesignTokens.space5),
            _campoDeTempo(theme, salvando, erroTempo),
            if (lidas != null) ...<Widget>[
              const SizedBox(height: DesignTokens.space4),
              Semantics(
                liveRegion: true,
                child: Row(
                  children: <Widget>[
                    Icon(
                      PhosphorIconsRegular.calculator,
                      size: _iconeDerivado,
                      color: theme.tertiaryText,
                    ),
                    const SizedBox(width: DesignTokens.space2),
                    Expanded(child: Text(TextosDoRegistro.derivado(lidas), style: legenda)),
                  ],
                ),
              ),
            ],
            const SizedBox(height: DesignTokens.space6),
            BotaoPrimario(
              texto: salvando ? TextosDoRegistro.botaoSalvando : TextosDoRegistro.botaoSalvar,
              onPressed: _salvar,
              carregando: salvando,
              carregandoEsmaecido: true,
            ),
            if (_controller.erro != null) ...<Widget>[
              const SizedBox(height: DesignTokens.space2),
              Text(
                _controller.erro!,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
              ),
            ],
            const SizedBox(height: DesignTokens.space2),
            BotaoTextual(
              texto: TextosDoRegistro.botaoCancelar,
              larguraTotal: true,
              onPressed: salvando ? null : _cancelar,
            ),
          ],
        ),
      ),
    );
  }

  Widget _cartaoDoLivro(ThemeData theme, TextStyle? legenda, int base) {
    final leitura = widget.leitura;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        CapaLivro(url: leitura.capaUrl, largura: _larguraDaCapa, altura: _alturaDaCapa),
        const SizedBox(width: DesignTokens.space4),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                leitura.titulo,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleSmall,
              ),
              if (leitura.autor != null) Text(leitura.autor!, style: legenda),
              const SizedBox(height: DesignTokens.space1),
              Text(rotuloPaginaDeTotal(base, leitura.totalPaginas), style: legenda),
            ],
          ),
        ),
      ],
    );
  }

  Widget _campoDeTempo(ThemeData theme, bool salvando, String? erro) {
    Widget subcampo(TextEditingController controller, String sufixo, String rotulo) {
      return Expanded(
        child: Semantics(
          label: rotulo,
          child: CampoTexto(
            controller: controller,
            label: '',
            keyboardType: TextInputType.number,
            inputFormatters: <TextInputFormatter>[FilteringTextInputFormatter.digitsOnly],
            enabled: !salvando,
            estiloDoTexto: theme.numInline,
            bordaDeErro: erro != null,
            trailing: Padding(
              padding: const EdgeInsets.only(right: DesignTokens.space4),
              child: Text(
                sufixo,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
              ),
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(TextosDoRegistro.rotuloTempo, style: theme.textTheme.labelMedium),
        const SizedBox(height: DesignTokens.space2),
        Row(
          children: <Widget>[
            subcampo(
              _horas,
              TextosDoRegistro.sufixoHoras,
              '${TextosDoRegistro.rotuloTempo}, ${TextosDoRegistro.sufixoHoras}',
            ),
            const SizedBox(width: DesignTokens.space3),
            subcampo(
              _minutos,
              TextosDoRegistro.sufixoMinutos,
              '${TextosDoRegistro.rotuloTempo}, ${TextosDoRegistro.sufixoMinutos}',
            ),
          ],
        ),
        if (erro != null) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          Text(erro, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error)),
        ],
        const SizedBox(height: DesignTokens.space2),
        Text(
          TextosDoRegistro.ajudaTempo,
          style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
        ),
      ],
    );
  }
}
