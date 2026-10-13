import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../core/network/recarga_em_sequencia.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import 'estatisticas_service.dart';
import 'formatos.dart';
import 'textos.dart';

/// O que o bloco mostra: os totais do ano e se o leitor não tem o que mostrar (a frase no lugar
/// dos cards).
typedef ResultadoDoBloco = ({TotaisEstatistica totais, bool vazio});

/// Bloco `Estatísticas do ano` dos perfis (F-STA, RF-STA-01): os três totais do ano corrente, os
/// mesmos do painel, numa faixa de cards que rola e sangra pela borda direita (artboard
/// `Sequência, estatísticas e desafios (rolada)` de meu-perfil; `Estatísticas e estante (rolada)`
/// do perfil de outro leitor). Só o próprio perfil tem `Ver estatísticas` ([aoVerEstatisticas]).
///
/// Carrega à parte da página; a falha mostra o banner do bloco sem derrubar o resto. Um 403 ou 404
/// do `leitura` (perfil privado sem seguimento, conta ausente) esconde o bloco: a página já trata
/// a privacidade e o perfil não encontrado. Os avisos de [alteracoes] recarregam em silêncio
/// depois de [atrasoDaRecarga], porque o servidor recompõe de forma assíncrona.
class EstatisticasDoPerfil extends StatefulWidget {
  final Future<ResultadoDoBloco> Function() carregar;
  final int ano;
  final String textoVazio;
  final String textoErro;
  final VoidCallback? aoVerEstatisticas;
  final Listenable? alteracoes;
  final Duration atrasoDaRecarga;

  const EstatisticasDoPerfil({
    super.key,
    required this.carregar,
    required this.ano,
    required this.textoVazio,
    required this.textoErro,
    this.aoVerEstatisticas,
    this.alteracoes,
    this.atrasoDaRecarga = const Duration(seconds: 3),
  });

  @override
  State<EstatisticasDoPerfil> createState() => _EstatisticasDoPerfilState();
}

enum _Carga { carregando, pronta, vazia, erro, oculta }

class _EstatisticasDoPerfilState extends State<EstatisticasDoPerfil> {
  /// Largura mínima dos cards da faixa (meu-perfil.md §4.1).
  static const double _larguraDoCard = 136;

  _Carga _carga = _Carga.carregando;
  TotaisEstatistica? _totais;
  Timer? _agendada;
  late final RecargaEmSequencia _recarga = RecargaEmSequencia(() => _carregar(silencioso: true));

  @override
  void initState() {
    super.initState();
    widget.alteracoes?.addListener(_aoAlterar);
    _carregar();
  }

  @override
  void didUpdateWidget(EstatisticasDoPerfil antigo) {
    super.didUpdateWidget(antigo);
    if (antigo.alteracoes != widget.alteracoes) {
      antigo.alteracoes?.removeListener(_aoAlterar);
      widget.alteracoes?.addListener(_aoAlterar);
    }
  }

  @override
  void dispose() {
    _agendada?.cancel();
    widget.alteracoes?.removeListener(_aoAlterar);
    super.dispose();
  }

  void _aoAlterar() {
    _agendada?.cancel();
    _agendada = Timer(widget.atrasoDaRecarga, () {
      if (mounted) {
        unawaited(_recarga.pedir());
      }
    });
  }

  bool get _comDados => _carga == _Carga.pronta || _carga == _Carga.vazia;

  Future<void> _carregar({bool silencioso = false}) async {
    if (!silencioso || !_comDados) {
      setState(() => _carga = _Carga.carregando);
    }
    try {
      final resultado = await widget.carregar();
      if (mounted) {
        setState(() {
          _totais = resultado.totais;
          _carga = resultado.vazio ? _Carga.vazia : _Carga.pronta;
        });
      }
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      if (erro.status == 403 || erro.status == 404) {
        setState(() => _carga = _Carga.oculta);
      } else if (!(silencioso && _comDados)) {
        // Recarga silenciosa que falha mantém o que já estava na tela.
        setState(() => _carga = _Carga.erro);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_carga == _Carga.oculta) {
      return const SizedBox.shrink();
    }
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    // Sem registro ou com erro, o cabeçalho perde a linha do ano e o `Ver estatísticas` (§4.6/4.7).
    final comConteudo = _carga == _Carga.pronta || _carga == _Carga.carregando;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            Expanded(
              child: Semantics(
                header: true,
                child: Text(TextosDoBloco.titulo, style: theme.textTheme.headlineSmall),
              ),
            ),
            if (widget.aoVerEstatisticas != null && _carga == _Carga.pronta)
              TextButton(
                onPressed: widget.aoVerEstatisticas,
                style: TextButton.styleFrom(
                  foregroundColor: theme.primaryAccent,
                  minimumSize: const Size(48, 48),
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space1),
                  textStyle: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                child: const Text(TextosDoBloco.verEstatisticas),
              ),
          ],
        ),
        if (comConteudo) Text(TextosDoBloco.ateHoje(widget.ano), style: legenda),
        const SizedBox(height: DesignTokens.space3),
        ...switch (_carga) {
          _Carga.carregando => <Widget>[
            EntradaSuave(
              child: Semantics(
                label: TextosDoBloco.carregando,
                child: ExcludeSemantics(
                  child: _faixa(<Widget>[for (var i = 0; i < 3; i++) _cardVazio()]),
                ),
              ),
            ),
          ],
          _Carga.erro => <Widget>[
            BannerAviso(
              variante: VarianteAviso.erro,
              triangulo: true,
              mensagem: widget.textoErro,
              acao: BotaoTextual(texto: TextosDasEstatisticas.tentarDeNovo, onPressed: _carregar),
            ),
          ],
          _Carga.vazia => <Widget>[
            Text(
              widget.textoVazio,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
            ),
          ],
          _Carga.pronta => <Widget>[_faixa(_cards(_totais!))],
          _Carga.oculta => const <Widget>[],
        },
      ],
    );
  }

  /// Faixa que rola e sangra pela borda direita: o terceiro card fica cortado no celular.
  Widget _faixa(List<Widget> cards) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    clipBehavior: Clip.none,
    child: IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          for (var i = 0; i < cards.length; i++) ...<Widget>[
            if (i > 0) const SizedBox(width: DesignTokens.space3),
            cards[i],
          ],
        ],
      ),
    ),
  );

  List<Widget> _cards(TotaisEstatistica totais) => <Widget>[
    _card(TextosDasEstatisticas.livrosConcluidos, <ParteDoTempo>[
      (
        numero: formatarMilhar(totais.livrosConcluidos),
        unidade: totais.livrosConcluidos == 1 ? 'livro' : 'livros',
      ),
    ], '${TextosDasEstatisticas.livrosConcluidos}: ${rotuloLivros(totais.livrosConcluidos)}'),
    _card(TextosDasEstatisticas.paginasLidas, <ParteDoTempo>[
      (
        numero: formatarMilhar(totais.paginasLidas),
        unidade: totais.paginasLidas == 1 ? 'página' : 'páginas',
      ),
    ], '${TextosDasEstatisticas.paginasLidas}: ${rotuloPaginas(totais.paginasLidas)}'),
    _card(
      TextosDasEstatisticas.tempoDeLeitura,
      partesDoTempo(totais.minutosLidos),
      '${TextosDasEstatisticas.tempoDeLeitura}: ${rotuloDoTempo(totais.minutosLidos)}',
    ),
  ];

  Widget _card(String rotulo, List<ParteDoTempo> partes, String leitura) {
    final theme = Theme.of(context);
    return Semantics(
      container: true,
      label: leitura,
      excludeSemantics: true,
      child: Container(
        constraints: const BoxConstraints(minWidth: _larguraDoCard),
        padding: const EdgeInsets.all(DesignTokens.space4),
        decoration: BoxDecoration(
          color: theme.elevatedSurface,
          borderRadius: BorderRadius.circular(DesignTokens.radius),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(rotulo, style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText)),
            const SizedBox(height: DesignTokens.space1),
            Text.rich(
              TextSpan(
                children: <InlineSpan>[
                  for (var i = 0; i < partes.length; i++) ...<InlineSpan>[
                    if (i > 0) const TextSpan(text: ' '),
                    TextSpan(
                      text: partes[i].numero,
                      style: theme.numDisplay.copyWith(color: theme.colorScheme.onSurface),
                    ),
                    TextSpan(
                      text: ' ${partes[i].unidade}',
                      style: theme.textTheme.labelLarge?.copyWith(color: theme.secondaryText),
                    ),
                  ],
                ],
              ),
              softWrap: false,
            ),
          ],
        ),
      ),
    );
  }

  /// Retângulo de 136 por 88 do skeleton (meu-perfil.md §4.9).
  Widget _cardVazio() => Container(
    width: _larguraDoCard,
    height: 88,
    decoration: BoxDecoration(
      color: Theme.of(context).coverPlaceholder,
      borderRadius: BorderRadius.circular(DesignTokens.radius),
    ),
  );
}
