import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/aviso.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/folha_de_acoes.dart';
import '../feed/social_service.dart';
import 'item_recomendacao.dart';

const String _verPerfil = 'perfil';
const String _descartar = 'descartar';
const double _opacidadeDescartando = 0.5;

/// Menu `DotsThree` de uma recomendação recebida e o descarte (RF-REC-15), iguais na seção do
/// Descobrir e na lista completa.
mixin DescarteDeRecomendacoes<T extends StatefulWidget> on State<T> {
  final Set<String> _emDescarte = <String>{};
  final Map<String, String> _chavesDeDescarte = <String, String>{};

  SocialService get social;

  void aoAbrirPerfilDoRemetente(String username);

  /// Chamado quando o servidor confirma o descarte, ou diz que a recomendação já saiu.
  void aoDescartada(String id);

  bool estaEmDescarte(String id) => _emDescarte.contains(id);

  Future<void> abrirMenuDaRecomendacao(RecomendacaoRecebida recomendacao) async {
    final remetente = recomendacao.remetente.nomeExibicao;
    final escolha = await escolherNaFolha(context, <AcaoDaFolha>[
      AcaoDaFolha(
        valor: _verPerfil,
        icone: PhosphorIconsRegular.userCircle,
        rotulo: 'Ver perfil de $remetente',
      ),
      const AcaoDaFolha(
        valor: _descartar,
        icone: PhosphorIconsRegular.xCircle,
        rotulo: 'Descartar recomendação',
        detalhe: 'Quem recomendou não fica sabendo.',
      ),
    ], cabecalho: _CabecalhoDoMenu(recomendacao: recomendacao));
    if (!mounted) {
      return;
    }
    switch (escolha) {
      case _verPerfil:
        aoAbrirPerfilDoRemetente(recomendacao.remetente.username);
      case _descartar:
        await descartarRecomendacao(recomendacao);
    }
  }

  Future<void> descartarRecomendacao(RecomendacaoRecebida recomendacao) async {
    final id = recomendacao.id;
    if (_emDescarte.contains(id)) {
      return;
    }
    final chave = _chavesDeDescarte.putIfAbsent(id, ApiClient.newIdempotencyKey);
    setState(() => _emDescarte.add(id));
    try {
      await social.descartarRecomendacao(id, idempotencyKey: chave);
      _chavesDeDescarte.remove(id);
      aoDescartada(id);
      if (mounted) {
        mostrarAviso(context, 'Recomendação descartada.');
      }
    } on ApiException catch (erro) {
      if (erro.status == 404) {
        // Já saiu por outra via (estante, expiração): não há o que descartar.
        _chavesDeDescarte.remove(id);
        aoDescartada(id);
      } else if (mounted) {
        mostrarAviso(
          context,
          'Não foi possível descartar a recomendação. Verifique sua conexão e tente de novo.',
          erro: true,
          rotuloDaAcao: 'Tentar de novo',
          aoAgir: () => descartarRecomendacao(recomendacao),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _emDescarte.remove(id));
      }
    }
  }
}

class ItemEmDescarte extends StatelessWidget {
  final bool descartando;
  final Widget child;

  const ItemEmDescarte({super.key, required this.descartando, required this.child});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: descartando,
      child: AnimatedOpacity(
        opacity: descartando ? _opacidadeDescartando : 1,
        duration: DesignTokens.durBase,
        child: child,
      ),
    );
  }
}

class BotaoDeMenuDaRecomendacao extends StatelessWidget {
  final RecomendacaoRecebida recomendacao;
  final VoidCallback aoTocar;

  const BotaoDeMenuDaRecomendacao({super.key, required this.recomendacao, required this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      button: true,
      label:
          'Mais ações para ${recomendacao.livro.titulo}, recomendado por '
          '${recomendacao.remetente.nomeExibicao}',
      excludeSemantics: true,
      onTap: aoTocar,
      child: GestureDetector(
        onTap: aoTocar,
        behavior: HitTestBehavior.opaque,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Align(
            alignment: Alignment.topRight,
            child: Icon(PhosphorIconsRegular.dotsThree, size: 20, color: theme.secondaryText),
          ),
        ),
      ),
    );
  }
}

class _CabecalhoDoMenu extends StatelessWidget {
  final RecomendacaoRecebida recomendacao;

  const _CabecalhoDoMenu({required this.recomendacao});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final livro = recomendacao.livro;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        CapaLivro(
          url: livro.capaUrl,
          largura: larguraDaCapaRecomendada,
          altura: alturaDaCapaRecomendada,
          titulo: livro.titulo,
          autor: livro.autor,
        ),
        const SizedBox(width: DesignTokens.space4),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(livro.titulo, style: theme.textTheme.titleSmall),
              Text(
                '${recomendacao.remetente.nomeExibicao} te recomendou',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
