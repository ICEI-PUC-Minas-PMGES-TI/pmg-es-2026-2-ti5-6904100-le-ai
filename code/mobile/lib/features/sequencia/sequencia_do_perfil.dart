import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../core/network/recarga_em_sequencia.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/cartao_de_sequencia.dart';
import 'sequencia_service.dart';

/// Bloco "Sequência diária" do Meu perfil (F-GAM, RF-GAM-02; meu-perfil.md §4.1 A): só no perfil
/// próprio e só no mobile. Carrega à parte da página, com skeleton próprio de 104px; falha mostra
/// o banner do bloco com "Tentar de novo" sem derrubar o resto do perfil.
///
/// [alteracoes] é o `ProgressoService.alteracoes`: cada progresso registrado ou excluído, inclusive
/// os da fila offline, recarrega o bloco em silêncio. O registro chega à sequência pelo consumo
/// assíncrono de `progresso.registrado` no servidor, então a recarga espera [atrasoDaRecarga]
/// antes de pedir; a exclusão já recalcula na hora e só aparece um pouco depois.
class SequenciaDoPerfil extends StatefulWidget {
  final SequenciaService servico;
  final ValueListenable<int>? alteracoes;
  final Duration atrasoDaRecarga;

  const SequenciaDoPerfil({
    super.key,
    required this.servico,
    this.alteracoes,
    this.atrasoDaRecarga = const Duration(seconds: 3),
  });

  @override
  State<SequenciaDoPerfil> createState() => _SequenciaDoPerfilState();
}

enum _Carga { carregando, pronta, erro }

class _SequenciaDoPerfilState extends State<SequenciaDoPerfil> {
  _Carga _carga = _Carga.carregando;
  Sequencia? _sequencia;
  Timer? _agendada;
  late final RecargaEmSequencia _recarga = RecargaEmSequencia(() => _carregar(silencioso: true));

  @override
  void initState() {
    super.initState();
    widget.alteracoes?.addListener(_aoAlterar);
    _carregar();
  }

  @override
  void didUpdateWidget(SequenciaDoPerfil antigo) {
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

  /// Vários registros seguidos (fila offline) viram uma recarga só, depois do último.
  void _aoAlterar() {
    _agendada?.cancel();
    _agendada = Timer(widget.atrasoDaRecarga, () {
      if (mounted) {
        unawaited(_recarga.pedir());
      }
    });
  }

  Future<void> _carregar({bool silencioso = false}) async {
    if (!silencioso || _carga != _Carga.pronta) {
      setState(() => _carga = _Carga.carregando);
    }
    try {
      final sequencia = await widget.servico.obterMinha();
      if (mounted) {
        setState(() {
          _sequencia = sequencia;
          _carga = _Carga.pronta;
        });
      }
    } on ApiException {
      // Recarga silenciosa que falha mantém o que já estava na tela.
      if (mounted && !(silencioso && _sequencia != null)) {
        setState(() => _carga = _Carga.erro);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sequencia = _sequencia;
    switch (_carga) {
      case _Carga.carregando:
        return const SkeletonDeSequencia();
      case _Carga.erro:
        return BannerAviso(
          variante: VarianteAviso.erro,
          triangulo: true,
          mensagem:
              'Não foi possível carregar sua sequência. Verifique sua conexão e tente de novo.',
          acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
        );
      case _Carga.pronta:
        return CartaoDeSequencia(atual: sequencia!.atual, recorde: sequencia.maior);
    }
  }
}
