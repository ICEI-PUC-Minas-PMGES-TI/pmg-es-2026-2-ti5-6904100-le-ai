import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/recarga_em_sequencia.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/estado_vazio.dart';
import '../perfil/widgets_de_identidade.dart';
import '../perfil/widgets_de_perfil.dart';
import 'cartao_estante.dart';
import 'estante_service.dart';
import 'lista_da_estante.dart';
import 'textos.dart';

const double _distanciaParaCarregarMais = 300;

/// Estante de um perfil (`GET /perfis/{id}/estante`, F-EST), em grade só leitura e paginada pela
/// rolagem. No perfil de outro leitor, `403` avisa [aoMudarRestricao] e `404` esconde a seção. No
/// próprio perfil, [acaoDoTitulo] traz o "Ver tudo" e [vazio] substitui a seção inteira quando não há
/// livros ou o `leitura` responde `404`, para manter o CTA "Buscar livros". [aoMudarLivrosLidos]
/// recebe o contador `livros lidos` do perfil, derivado da estante e por isso nulo quando ela está
/// restrita ou indisponível. Cada aviso de [alteracoes] recarrega a grade.
class EstanteDePerfil extends StatefulWidget {
  final EstanteService servico;
  final String usuarioId;
  final String primeiroNome;
  final ValueChanged<bool>? aoMudarRestricao;
  final ValueChanged<int?>? aoMudarLivrosLidos;
  final Widget? acaoDoTitulo;
  final Widget? vazio;

  /// Escritas que mudam esta estante. No próprio perfil, os avisos da estante e do progresso: a aba
  /// Perfil fica montada no `indexedStack`, e o que muda em outra aba só chega por eles, como na
  /// `EstantePage`. No perfil de outro leitor fica nulo, porque as escritas são de quem olha.
  final Listenable? alteracoes;

  const EstanteDePerfil({
    super.key,
    required this.servico,
    required this.usuarioId,
    required this.primeiroNome,
    this.aoMudarRestricao,
    this.aoMudarLivrosLidos,
    this.acaoDoTitulo,
    this.vazio,
    this.alteracoes,
  });

  @override
  State<EstanteDePerfil> createState() => _EstanteDePerfilState();
}

class _EstanteDePerfilState extends State<EstanteDePerfil> {
  late final ListaDaEstante _lista = ListaDaEstante(
    (pagina) => widget.servico.listarEstantePerfil(widget.usuarioId, FiltroEstante(pagina: pagina)),
  );
  bool _restritaAvisada = false;
  int? _livrosLidosAvisados;
  ScrollPosition? _rolagem;

  late final RecargaEmSequencia _recarga = RecargaEmSequencia(() async {
    if (mounted) {
      await _lista.carregar();
    }
  });

  @override
  void initState() {
    super.initState();
    _lista.addListener(_aoMudar);
    _lista.carregar();
    widget.alteracoes?.addListener(_aoAlterar);
  }

  @override
  void didUpdateWidget(EstanteDePerfil antigo) {
    super.didUpdateWidget(antigo);
    if (antigo.alteracoes != widget.alteracoes) {
      antigo.alteracoes?.removeListener(_aoAlterar);
      widget.alteracoes?.addListener(_aoAlterar);
    }
  }

  void _aoAlterar() => _recarga.pedir();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final rolagem = Scrollable.maybeOf(context)?.position;
    if (rolagem == _rolagem) {
      return;
    }
    _rolagem?.removeListener(_aoRolar);
    _rolagem = rolagem?..addListener(_aoRolar);
  }

  void _aoRolar() {
    final rolagem = _rolagem;
    if (rolagem != null && rolagem.extentAfter < _distanciaParaCarregarMais) {
      _lista.carregarMais();
    }
  }

  @override
  void dispose() {
    widget.alteracoes?.removeListener(_aoAlterar);
    _rolagem?.removeListener(_aoRolar);
    _lista
      ..removeListener(_aoMudar)
      ..dispose();
    super.dispose();
  }

  void _aoMudar() {
    if (_lista.restrita != _restritaAvisada) {
      _restritaAvisada = _lista.restrita;
      widget.aoMudarRestricao?.call(_lista.restrita);
    }
    final livrosLidos = _lista.restrita || _lista.indisponivel ? null : _lista.livrosLidos;
    if (livrosLidos != _livrosLidosAvisados) {
      _livrosLidosAvisados = livrosLidos;
      widget.aoMudarLivrosLidos?.call(livrosLidos);
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final vazio = widget.vazio;
    final semLivros = !_lista.carregando && !_lista.falhou && _lista.itens.isEmpty;
    if (vazio != null && (_lista.indisponivel || semLivros)) {
      return vazio;
    }
    if (_lista.restrita || _lista.indisponivel) {
      return const SizedBox.shrink();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        TituloDaSecao(TextosDaEstanteDePerfil.titulo, acao: widget.acaoDoTitulo),
        const SizedBox(height: DesignTokens.space4),
        ..._conteudo(),
      ],
    );
  }

  List<Widget> _conteudo() {
    if (_lista.carregando) {
      return const <Widget>[EsqueletoDaEstante()];
    }
    if (_lista.falhou) {
      return <Widget>[
        const BannerAviso(
          variante: VarianteAviso.erro,
          mensagem: TextosDaEstanteDePerfil.erroTexto,
        ),
        const SizedBox(height: DesignTokens.space2),
        Align(
          alignment: Alignment.centerLeft,
          child: BotaoTextual(texto: TextosDaEstante.erroBotao, onPressed: _lista.carregar),
        ),
      ];
    }
    if (_lista.itens.isEmpty) {
      return <Widget>[
        EstadoVazio(
          icone: PhosphorIconsRegular.books,
          titulo: textoEstanteDePerfilVazia(widget.primeiroNome),
        ),
      ];
    }
    return <Widget>[
      GradeDaEstante(
        filhos: <Widget>[
          for (final item in _lista.itens)
            CartaoEstante(key: ValueKey<String>(item.livroId), item: item),
        ],
      ),
      FimDaLista(
        temMais: _lista.temMais,
        carregandoMais: _lista.carregandoMais,
        falhou: _lista.falhouMais,
        aoCarregar: _lista.carregarMais,
      ),
    ];
  }
}
