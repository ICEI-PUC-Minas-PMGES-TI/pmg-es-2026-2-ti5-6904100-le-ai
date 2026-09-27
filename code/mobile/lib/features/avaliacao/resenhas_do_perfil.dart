import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bloco_de_spoiler.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/cartao_progresso.dart';
import '../../design/widgets/estrelas_de_nota.dart';
import '../livros/formatos.dart';
import 'leitura_service.dart';

const int _porPagina = 5;

/// Resenhas de um perfil (RF-SOC-02, composição de F-AVA), no lugar do vazio da seção
/// "Resenhas" do perfil (meu-perfil.md §4): capa de 40 por 60, título, autor, estrelas de 16px com
/// o valor e o trecho de três linhas em Newsreader. "Ver mais resenhas" traz a página seguinte, no
/// lugar de uma página "Ver todas" separada.
///
/// A autorização de RN-08 é do servidor. Com spoiler, quem não é o autor vê o bloco oculto e
/// revela por ação (RF-AVA-03).
class ResenhasDoPerfil extends StatefulWidget {
  final LeituraService leitura;
  final String usuarioId;
  final bool proprio;

  /// Texto do vazio, o mesmo que a seção já mostrava.
  final String textoVazio;
  final ValueChanged<LivroDaResenha> aoAbrirLivro;

  const ResenhasDoPerfil({
    super.key,
    required this.leitura,
    required this.usuarioId,
    required this.proprio,
    required this.textoVazio,
    required this.aoAbrirLivro,
  });

  @override
  State<ResenhasDoPerfil> createState() => _ResenhasDoPerfilState();
}

enum _Carga { carregando, pronta, erro }

class _ResenhasDoPerfilState extends State<ResenhasDoPerfil> {
  _Carga _carga = _Carga.carregando;
  final List<ResenhaDoPerfil> _itens = <ResenhaDoPerfil>[];
  int _pagina = 0;
  bool _temMais = false;
  bool _carregandoMais = false;

  @override
  void initState() {
    super.initState();
    widget.leitura.alteracoes.addListener(_aoAlterar);
    _carregar();
  }

  @override
  void didUpdateWidget(ResenhasDoPerfil antigo) {
    super.didUpdateWidget(antigo);
    if (antigo.leitura != widget.leitura) {
      antigo.leitura.alteracoes.removeListener(_aoAlterar);
      widget.leitura.alteracoes.addListener(_aoAlterar);
    }
  }

  @override
  void dispose() {
    widget.leitura.alteracoes.removeListener(_aoAlterar);
    super.dispose();
  }

  /// Nota ou resenha mudou em outra tela: a aba do perfil continua montada, então recarrega sem
  /// voltar ao skeleton, para a lista não piscar.
  void _aoAlterar() => _carregar(silencioso: true);

  Future<void> _carregar({bool silencioso = false}) async {
    if (!silencioso || _carga != _Carga.pronta) {
      setState(() => _carga = _Carga.carregando);
    }
    try {
      final pagina = await widget.leitura.listarResenhasPerfil(
        widget.usuarioId,
        limite: _porPagina,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _itens
          ..clear()
          ..addAll(pagina.itens);
        _pagina = 1;
        _temMais = pagina.temMais;
        _carga = _Carga.pronta;
      });
    } on ApiException {
      if (mounted) {
        setState(() => _carga = _Carga.erro);
      }
    } on FormatException {
      if (mounted) {
        setState(() => _carga = _Carga.erro);
      }
    }
  }

  Future<void> _carregarMais() async {
    setState(() => _carregandoMais = true);
    try {
      final pagina = await widget.leitura.listarResenhasPerfil(
        widget.usuarioId,
        page: _pagina + 1,
        limite: _porPagina,
      );
      if (!mounted) {
        return;
      }
      final vistos = _itens.map((item) => item.resenha.id).toSet();
      setState(() {
        _itens.addAll(pagina.itens.where((item) => !vistos.contains(item.resenha.id)));
        _pagina += 1;
        _temMais = pagina.temMais;
      });
    } on ApiException {
      // Fica na página atual; o botão continua disponível para tentar de novo.
    } on FormatException {
      // Idem.
    } finally {
      if (mounted) {
        setState(() => _carregandoMais = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textoMudo = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    switch (_carga) {
      case _Carga.carregando:
        return const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            BarraSkeleton(altura: 18, fracaoDaLargura: 0.7),
            SizedBox(height: DesignTokens.space3),
            BarraSkeleton(altura: 18, fracaoDaLargura: 0.5),
          ],
        );
      case _Carga.erro:
        return Column(
          children: <Widget>[
            Text(
              'Não foi possível carregar as resenhas.',
              style: textoMudo,
              textAlign: TextAlign.center,
            ),
            BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
          ],
        );
      case _Carga.pronta:
        if (_itens.isEmpty) {
          return Text(widget.textoVazio, style: textoMudo, textAlign: TextAlign.center);
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            for (final (indice, item) in _itens.indexed) ...<Widget>[
              if (indice > 0) Divider(height: 1, color: theme.divider),
              _CardDaResenha(
                key: ValueKey<String>(item.resenha.id),
                item: item,
                proprio: widget.proprio,
                aoAbrir: () => widget.aoAbrirLivro(item.livro),
              ),
            ],
            if (_temMais)
              Align(
                alignment: Alignment.centerLeft,
                child: BotaoTextual(
                  texto: 'Ver mais resenhas',
                  onPressed: _carregandoMais ? null : _carregarMais,
                ),
              ),
          ],
        );
    }
  }
}

class _CardDaResenha extends StatefulWidget {
  final ResenhaDoPerfil item;
  final bool proprio;
  final VoidCallback aoAbrir;

  const _CardDaResenha({
    super.key,
    required this.item,
    required this.proprio,
    required this.aoAbrir,
  });

  @override
  State<_CardDaResenha> createState() => _CardDaResenhaState();
}

class _CardDaResenhaState extends State<_CardDaResenha> {
  bool _revelada = false;

  Widget _trecho(ThemeData theme, ResenhaDoPerfil item) => Text(
    item.resenha.texto,
    maxLines: 3,
    overflow: TextOverflow.ellipsis,
    style: theme.editorialBody.copyWith(
      fontSize: theme.textTheme.bodyMedium?.fontSize,
      color: theme.secondaryText,
    ),
  );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final item = widget.item;
    final oculta = item.resenha.spoiler && !widget.proprio && !_revelada;
    final nota = item.nota;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Semantics(
            button: true,
            label: 'Abrir ${item.livro.titulo}',
            child: InkWell(
              onTap: widget.aoAbrir,
              splashFactory: NoSplash.splashFactory,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  CapaLivro(
                    url: item.livro.capaUrl,
                    largura: 40,
                    altura: 60,
                    titulo: item.livro.titulo,
                    autor: item.livro.autor,
                  ),
                  const SizedBox(width: DesignTokens.space3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          item.livro.titulo,
                          style: theme.textTheme.titleMedium,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (item.livro.autor != null)
                          Text(
                            item.livro.autor!,
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                          ),
                        if (nota != null) ...<Widget>[
                          const SizedBox(height: DesignTokens.space1),
                          Semantics(
                            label: '${formatarNota(nota)} de 5',
                            excludeSemantics: true,
                            child: Row(
                              children: <Widget>[
                                EstrelasDeNota(valor: nota, tamanho: 16),
                                const SizedBox(width: DesignTokens.space2),
                                Text(
                                  formatarNota(nota),
                                  style: theme.numInline.copyWith(
                                    fontSize: theme.textTheme.bodySmall?.fontSize,
                                    color: theme.secondaryText,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: DesignTokens.space3),
          if (oculta)
            BlocoDeSpoiler(aoRevelar: () => setState(() => _revelada = true))
          else if (_revelada)
            TextoRevelado(child: _trecho(theme, item))
          else
            _trecho(theme, item),
        ],
      ),
    );
  }
}
