import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import 'leitura_service.dart';
import 'reacoes.dart';

/// Linha de reações da resenha (F-AVA-2, pagina-do-livro.md §4.2 e §9), igual a
/// `ReacoesDaResenha.vue`. Dois botões com a contagem de cada um sempre à parte (RF-AVA-08):
/// nunca saldo nem percentual, e zero aparece como `0 descurtidas`. Só um fica ativo; tocar no
/// outro troca, tocar no ativo retira. O ativo muda o peso do ícone (`fill`), não só a cor.
///
/// Sem [leitura] (ou com [somenteLeitura]) é a variante da resenha do próprio leitor: ícones de
/// 16px e as contagens em `caption`, sem botão.
class ReacoesDaResenha extends StatefulWidget {
  final String resenhaId;
  final EstadoDasReacoes reacoes;
  final LeituraService? leitura;
  final bool somenteLeitura;

  /// Via de RN-15 quando a resenha é do dono de um livro pessoal aberto por terceiro.
  final ViaDeAcesso? via;

  const ReacoesDaResenha({
    super.key,
    required this.resenhaId,
    required this.reacoes,
    this.leitura,
    this.somenteLeitura = false,
    this.via,
  });

  @override
  State<ReacoesDaResenha> createState() => _ReacoesDaResenhaState();
}

class _ReacoesDaResenhaState extends State<ReacoesDaResenha> {
  ReacoesOtimistas? _reacoes;

  bool get _somenteLeitura => widget.somenteLeitura || widget.leitura == null;

  @override
  void initState() {
    super.initState();
    final leitura = widget.leitura;
    if (!_somenteLeitura && leitura != null) {
      _reacoes = ReacoesOtimistas(
        resenhaId: widget.resenhaId,
        inicial: widget.reacoes,
        via: widget.via,
        reagir: leitura.reagir,
        remover: leitura.removerReacao,
      )..addListener(_aoMudar);
    }
  }

  @override
  void didUpdateWidget(ReacoesDaResenha antigo) {
    super.didUpdateWidget(antigo);
    if (antigo.reacoes != widget.reacoes) {
      _reacoes?.redefinir(widget.reacoes);
    }
  }

  @override
  void dispose() {
    _reacoes?.removeListener(_aoMudar);
    _reacoes?.dispose();
    super.dispose();
  }

  void _aoMudar() {
    final erro = _reacoes?.erro;
    if (erro != null) {
      _reacoes?.erroMostrado();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(erro)));
    }
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final estado = _reacoes?.estado ?? widget.reacoes;
    if (_somenteLeitura) {
      final estilo = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
      return Wrap(
        spacing: DesignTokens.space4,
        runSpacing: DesignTokens.space1,
        children: <Widget>[
          for (final tipo in TipoDeReacao.values)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(_icone(tipo, ativo: false), size: 16, color: theme.secondaryText),
                const SizedBox(width: DesignTokens.space1),
                Text(rotuloDaContagem(estado.total(tipo), tipo), style: estilo),
              ],
            ),
        ],
      );
    }
    return Wrap(
      spacing: DesignTokens.space4,
      children: <Widget>[
        for (final tipo in TipoDeReacao.values)
          _BotaoDeReacao(
            tipo: tipo,
            total: estado.total(tipo),
            ativo: estado.minhaReacao == tipo,
            aoTocar: () => _reacoes?.tocar(tipo),
          ),
      ],
    );
  }
}

IconData _icone(TipoDeReacao tipo, {required bool ativo}) {
  if (tipo == TipoDeReacao.curtida) {
    return ativo ? PhosphorIconsFill.thumbsUp : PhosphorIconsRegular.thumbsUp;
  }
  return ativo ? PhosphorIconsFill.thumbsDown : PhosphorIconsRegular.thumbsDown;
}

class _BotaoDeReacao extends StatelessWidget {
  final TipoDeReacao tipo;
  final int total;
  final bool ativo;
  final VoidCallback aoTocar;

  const _BotaoDeReacao({
    required this.tipo,
    required this.total,
    required this.ativo,
    required this.aoTocar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = ativo ? theme.primaryAccent : theme.secondaryText;
    final rotulo = rotuloDaContagem(total, tipo);
    final acao = tipo == TipoDeReacao.curtida ? 'Curtir resenha' : 'Descurtir resenha';
    return Semantics(
      button: true,
      toggled: ativo,
      label: '$acao, $rotulo',
      excludeSemantics: true,
      child: InkWell(
        key: ValueKey<String>('reacao-${tipo.contrato}'),
        borderRadius: BorderRadius.circular(DesignTokens.radius),
        onTap: aoTocar,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: DesignTokens.space3,
              vertical: DesignTokens.space2,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(_icone(tipo, ativo: ativo), size: 20, color: cor),
                const SizedBox(width: DesignTokens.space2),
                Text(
                  rotulo,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: cor,
                    fontWeight: ativo ? FontWeight.w600 : null,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
