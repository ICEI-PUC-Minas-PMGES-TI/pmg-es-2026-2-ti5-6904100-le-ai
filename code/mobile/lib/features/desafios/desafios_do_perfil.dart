import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../core/network/recarga_em_sequencia.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import 'desafios_service.dart';
import 'textos.dart';
import 'widgets_de_desafios.dart';

/// Bloco `Desafios` do Meu perfil (meu-perfil.md §4.1 B, F-DSF), só no perfil próprio e só no
/// mobile: os dois primeiros desafios ativos, na ordem da lista, em cards compactos que abrem a
/// lista; abaixo, `Mais N desafios`, contando os pausados. Pausados nunca aparecem como card.
///
/// Uma página de dois basta: os ativos vêm antes dos pausados, e `totalItens` conta todos. Sem
/// nenhum ativo e com pausados, o cabeçalho fica e a legenda diz quantos estão pausados (decisão
/// do dono de 09/10/2026; o protótipo não desenha o caso).
///
/// Carrega à parte da página; a falha mostra o banner do bloco sem derrubar o resto do perfil.
/// Os avisos de [alteracoesDeLeitura] recarregam em silêncio depois de [atrasoDaRecarga], porque
/// o acumulado chega pelo consumo assíncrono no servidor.
class DesafiosDoPerfil extends StatefulWidget {
  final DesafiosService servico;
  final Listenable? alteracoesDeLeitura;
  final Duration atrasoDaRecarga;
  final VoidCallback aoVerTodos;
  final VoidCallback aoCriar;

  const DesafiosDoPerfil({
    super.key,
    required this.servico,
    this.alteracoesDeLeitura,
    this.atrasoDaRecarga = const Duration(seconds: 3),
    required this.aoVerTodos,
    required this.aoCriar,
  });

  @override
  State<DesafiosDoPerfil> createState() => _DesafiosDoPerfilState();
}

enum _Carga { carregando, pronta, erro }

class _DesafiosDoPerfilState extends State<DesafiosDoPerfil> {
  static const int _quantos = 2;

  _Carga _carga = _Carga.carregando;
  List<Desafio> _ativos = const <Desafio>[];
  int _total = 0;
  Timer? _agendada;
  late final RecargaEmSequencia _recarga = RecargaEmSequencia(() => _carregar(silencioso: true));

  @override
  void initState() {
    super.initState();
    widget.servico.alteracoes.addListener(_recarregar);
    widget.alteracoesDeLeitura?.addListener(_aoRegistrarLeitura);
    _carregar();
  }

  @override
  void didUpdateWidget(DesafiosDoPerfil antigo) {
    super.didUpdateWidget(antigo);
    if (antigo.alteracoesDeLeitura != widget.alteracoesDeLeitura) {
      antigo.alteracoesDeLeitura?.removeListener(_aoRegistrarLeitura);
      widget.alteracoesDeLeitura?.addListener(_aoRegistrarLeitura);
    }
  }

  @override
  void dispose() {
    _agendada?.cancel();
    widget.servico.alteracoes.removeListener(_recarregar);
    widget.alteracoesDeLeitura?.removeListener(_aoRegistrarLeitura);
    super.dispose();
  }

  void _recarregar() => unawaited(_recarga.pedir());

  /// Vários registros seguidos (fila offline) viram uma recarga só, depois do último.
  void _aoRegistrarLeitura() {
    _agendada?.cancel();
    _agendada = Timer(widget.atrasoDaRecarga, () {
      if (mounted) {
        _recarregar();
      }
    });
  }

  Future<void> _carregar({bool silencioso = false}) async {
    if (!silencioso || _carga != _Carga.pronta) {
      setState(() => _carga = _Carga.carregando);
    }
    try {
      final pagina = await widget.servico.listar(limite: _quantos);
      if (mounted) {
        setState(() {
          _ativos = pagina.itens.where((desafio) => !desafio.pausado).take(_quantos).toList();
          _total = pagina.totalItens;
          _carga = _Carga.pronta;
        });
      }
    } on ApiException {
      // Recarga silenciosa que falha mantém o que já estava na tela.
      if (mounted && !(silencioso && _carga == _Carga.pronta)) {
        setState(() => _carga = _Carga.erro);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final vazio = _carga == _Carga.pronta && _total == 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Semantics(
                header: true,
                child: Text('Desafios', style: theme.textTheme.headlineSmall),
              ),
            ),
            if (_carga == _Carga.pronta && !vazio)
              TextButton(
                onPressed: widget.aoVerTodos,
                style: TextButton.styleFrom(
                  foregroundColor: theme.primaryAccent,
                  minimumSize: const Size(48, 48),
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space1),
                  textStyle: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                child: const Text('Ver todos'),
              ),
          ],
        ),
        const SizedBox(height: DesignTokens.space3),
        ...switch (_carga) {
          _Carga.carregando => <Widget>[
            const EntradaSuave(
              child: Column(
                children: <Widget>[
                  SkeletonDeDesafio(),
                  SizedBox(height: DesignTokens.space3),
                  SkeletonDeDesafio(),
                ],
              ),
            ),
          ],
          _Carga.erro => <Widget>[
            BannerAviso(
              variante: VarianteAviso.erro,
              triangulo: true,
              mensagem: 'Não foi possível carregar seus desafios. $textoDeFalhaDeRede',
              acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
            ),
          ],
          _Carga.pronta when vazio => <Widget>[
            Text(
              'Escolha um alvo curto, como páginas por dia ou livros por ano.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
            ),
            const SizedBox(height: DesignTokens.space3),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: widget.aoCriar,
                icon: const Icon(PhosphorIconsRegular.plus, size: 20),
                label: const Text('Novo desafio'),
                style: TextButton.styleFrom(
                  foregroundColor: theme.primaryAccent,
                  minimumSize: const Size(48, 48),
                  padding: EdgeInsets.zero,
                  textStyle: theme.textTheme.labelLarge,
                ),
              ),
            ),
          ],
          _Carga.pronta when _ativos.isEmpty => <Widget>[
            Text(contagemDePausados(_total), style: legenda),
          ],
          _Carga.pronta => <Widget>[
            for (var i = 0; i < _ativos.length; i++) ...<Widget>[
              if (i > 0) const SizedBox(height: DesignTokens.space3),
              CartaoCompactoDeDesafio(desafio: _ativos[i], aoTocar: widget.aoVerTodos),
            ],
            if (_total > _ativos.length) ...<Widget>[
              const SizedBox(height: DesignTokens.space2),
              Text(textoDeMaisDesafios(_total - _ativos.length), style: legenda),
            ],
          ],
        },
      ],
    );
  }
}
