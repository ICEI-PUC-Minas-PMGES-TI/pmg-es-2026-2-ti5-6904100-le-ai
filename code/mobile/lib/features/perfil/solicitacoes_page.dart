import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/dialogo_confirmacao.dart';
import '../../design/widgets/estado_vazio.dart';
import 'lista_paginada.dart';
import 'perfil_service.dart';
import 'textos.dart';
import 'widgets_de_perfil.dart';

const Duration _permanenciaDoAceito = Duration(milliseconds: 900);

/// Solicitações de seguir recebidas (RF-SOC-06), a partir de
/// docs/design/periodo-1/F-PERFIL/solicitacoes-de-seguir.md, com a mesma lógica da web
/// (`SolicitacoesView.vue`). Aceitar não pede confirmação: tem desfazer, que é remover a pessoa
/// dos seguidores. Recusar descarta o pedido e passa pelo modal (RNF-USA-04). O item aceito mostra
/// `Aceito` por um instante e sai da lista; a contagem já desconta na hora.
class SolicitacoesPage extends StatefulWidget {
  final PerfilService servico;
  final VoidCallback? aoVoltar;
  final void Function(String username) aoAbrirPerfil;
  final VoidCallback aoEditarPerfil;

  const SolicitacoesPage({
    super.key,
    required this.servico,
    this.aoVoltar,
    required this.aoAbrirPerfil,
    required this.aoEditarPerfil,
  });

  @override
  State<SolicitacoesPage> createState() => _SolicitacoesPageState();
}

class _SolicitacoesPageState extends State<SolicitacoesPage> {
  late final ListaPaginada<SolicitacaoSeguir> _pedidos = ListaPaginada<SolicitacaoSeguir>(
    (pagina) => widget.servico.listarSolicitacoes(pagina),
    (pedido) => pedido.id,
  );
  Privacidade? _privacidade;
  final Set<String> _aceitos = <String>{};
  final Set<String> _aceitando = <String>{};
  final Map<String, String> _erros = <String, String>{};
  final List<Timer> _timers = <Timer>[];

  @override
  void initState() {
    super.initState();
    _pedidos.addListener(_redesenhar);
    _pedidos.carregar();
    // Só escolhe o texto do vazio; sem ele fica a variante de perfil privado.
    widget.servico
        .obterMeuPerfil()
        .then((perfil) {
          if (mounted) {
            setState(() => _privacidade = perfil.privacidade);
          }
        })
        .catchError((Object _) {});
  }

  @override
  void dispose() {
    for (final timer in _timers) {
      timer.cancel();
    }
    _pedidos.dispose();
    super.dispose();
  }

  void _redesenhar() {
    if (mounted) {
      setState(() {});
    }
  }

  int get _pendentes {
    final restantes = _pedidos.total - _aceitos.length;
    return restantes < 0 ? 0 : restantes;
  }

  Future<void> _aceitar(SolicitacaoSeguir pedido) async {
    setState(() {
      _aceitando.add(pedido.id);
      _erros.remove(pedido.id);
    });
    try {
      await widget.servico.aceitarSolicitacao(
        pedido.id,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
      if (!mounted) {
        return;
      }
      setState(() => _aceitos.add(pedido.id));
      _timers.add(
        Timer(_permanenciaDoAceito, () {
          if (mounted) {
            _aceitos.remove(pedido.id);
            _pedidos.retirar(pedido.id);
          }
        }),
      );
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      if (erro.status == 404 || erro.status == 409) {
        // Já respondido em outra aba, ou a conta de quem pediu saiu: não há o que decidir.
        _pedidos.retirar(pedido.id);
      } else {
        setState(() => _erros[pedido.id] = erro.message);
      }
    } finally {
      if (mounted) {
        setState(() => _aceitando.remove(pedido.id));
      }
    }
  }

  Future<void> _recusar(SolicitacaoSeguir pedido) async {
    final confirmado = await confirmarNoModal(
      context,
      titulo: 'Recusar a solicitação de ${primeiroNome(pedido.solicitante.displayName)}?',
      texto: 'O pedido é descartado e a pessoa não recebe aviso. Ela pode pedir de novo depois.',
      acao: 'Recusar',
    );
    if (!confirmado || !mounted) {
      return;
    }
    try {
      await widget.servico.recusarSolicitacao(
        pedido.id,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
      _pedidos.retirar(pedido.id);
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      if (erro.status == 404 || erro.status == 409) {
        _pedidos.retirar(pedido.id);
      } else {
        setState(() => _erros[pedido.id] = erro.message);
      }
    }
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.extentAfter < 300) {
      _pedidos.carregarMais();
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: 'Solicitações', aoVoltar: widget.aoVoltar),
        Expanded(
          child: NotificationListener<ScrollNotification>(
            onNotification: _pertoDoFim,
            child: _conteudo(Theme.of(context)),
          ),
        ),
      ],
    );
  }

  Widget _conteudo(ThemeData theme) {
    const margem = EdgeInsets.symmetric(horizontal: DesignTokens.space5);
    if (_pedidos.carregando) {
      return ListView(
        padding: margem,
        children: List<Widget>.generate(
          3,
          (_) => const Padding(
            padding: EdgeInsets.symmetric(vertical: DesignTokens.space4),
            child: SkeletonDeLinha(),
          ),
        ),
      );
    }
    if (_pedidos.falhou) {
      return ListView(
        padding: const EdgeInsets.all(DesignTokens.space5),
        children: <Widget>[
          const BannerAviso(
            variante: VarianteAviso.erro,
            mensagem:
                'Não foi possível carregar suas solicitações. Verifique sua conexão e tente de novo.',
          ),
          const SizedBox(height: DesignTokens.space2),
          BotaoTextual(texto: 'Tentar de novo', onPressed: _pedidos.carregar),
        ],
      );
    }
    if (_pedidos.itens.isEmpty) {
      final publico = _privacidade == Privacidade.publico;
      return ListView(
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          DesignTokens.space10,
          DesignTokens.space5,
          DesignTokens.space5,
        ),
        children: <Widget>[
          EstadoVazio(
            icone: PhosphorIconsRegular.userPlus,
            titulo: 'Nenhuma solicitação pendente',
            texto: publico
                ? 'Seu perfil é público, então quem quiser seguir você segue na hora. Pedidos só '
                      'existem em perfil privado.'
                : 'Pedidos para seguir seu perfil privado aparecem aqui.',
            rodape: publico
                ? BotaoTextual(texto: 'Editar perfil', onPressed: widget.aoEditarPerfil)
                : null,
          ),
        ],
      );
    }
    return ListView.separated(
      padding: margem,
      itemCount: _pedidos.itens.length + 2,
      separatorBuilder: (_, _) => Divider(height: 1, color: theme.divider),
      itemBuilder: (context, indice) {
        if (indice == 0) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
            child: Semantics(
              liveRegion: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    contagem(_pendentes, 'solicitação', 'solicitações'),
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                  ),
                  const SizedBox(height: DesignTokens.space1),
                  Text(
                    'Quem você aceitar passa a ver sua estante, suas notas e suas resenhas.',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                  ),
                ],
              ),
            ),
          );
        }
        if (indice == _pedidos.itens.length + 1) {
          return FimDaLista(
            temMais: _pedidos.temMais,
            carregandoMais: _pedidos.carregandoMais,
            falhou: _pedidos.falhouMais,
            aoCarregar: _pedidos.carregarMais,
          );
        }
        return _item(theme, _pedidos.itens[indice - 1]);
      },
    );
  }

  Widget _item(ThemeData theme, SolicitacaoSeguir pedido) {
    final aceito = _aceitos.contains(pedido.id);
    final ocupado = _aceitando.contains(pedido.id);
    final nome = pedido.solicitante.displayName;
    return Opacity(
      opacity: aceito ? 0.6 : 1,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            LinhaDeLeitor(
              leitor: pedido.solicitante,
              aoAbrir: () => widget.aoAbrirPerfil(pedido.solicitante.username),
              acao: Text(
                tempoDeEspera(pedido.criadaEm),
                style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
              ),
            ),
            const SizedBox(height: DesignTokens.space3),
            // §4: os dois botões em linha própria, o destrutivo antes do primário.
            if (aceito)
              Semantics(
                liveRegion: true,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: <Widget>[
                    Icon(PhosphorIconsBold.check, size: 16, color: theme.primaryAccent),
                    const SizedBox(width: DesignTokens.space1),
                    Text(
                      'Aceito',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.primaryAccent,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              )
            else
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: <Widget>[
                  BotaoDeLinha(
                    texto: 'Recusar',
                    destrutivo: true,
                    rotuloAcessivel: 'Recusar solicitação de $nome',
                    aoTocar: ocupado ? null : () => _recusar(pedido),
                  ),
                  const SizedBox(width: DesignTokens.space3),
                  BotaoDeLinha(
                    texto: 'Aceitar',
                    preenchido: true,
                    rotuloAcessivel: 'Aceitar solicitação de $nome',
                    aoTocar: ocupado ? null : () => _aceitar(pedido),
                  ),
                ],
              ),
            if (_erros[pedido.id] != null) ...<Widget>[
              const SizedBox(height: DesignTokens.space2),
              Text(
                _erros[pedido.id]!,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
