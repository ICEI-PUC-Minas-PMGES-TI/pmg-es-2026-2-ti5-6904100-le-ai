import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/dialogo_confirmacao.dart';
import '../../design/widgets/estado_vazio.dart';
import 'lista_paginada.dart';
import 'perfil_service.dart';
import 'textos.dart';
import 'widgets_de_perfil.dart';

enum AbaDeConexoes { seguidores, seguidos }

/// Conexões (RF-SOC-07/08), a partir de docs/design/periodo-1/F-PERFIL/seguidores-e-seguidos.md,
/// com a mesma lógica da web (`ConexoesView.vue`): as duas listas do próprio leitor em abas, as
/// duas primeiras páginas carregadas juntas porque as abas mostram as duas contagens. Não existe
/// versão para terceiros (RNF-SEC-19/44). Remover e deixar de seguir pedem confirmação, cada um
/// com a sua consequência (RNF-USA-04).
class ConexoesPage extends StatefulWidget {
  final PerfilService servico;
  final AbaDeConexoes abaInicial;
  final VoidCallback? aoVoltar;
  final void Function(String username) aoAbrirPerfil;
  final VoidCallback aoBuscarLeitor;

  const ConexoesPage({
    super.key,
    required this.servico,
    this.abaInicial = AbaDeConexoes.seguidores,
    this.aoVoltar,
    required this.aoAbrirPerfil,
    required this.aoBuscarLeitor,
  });

  @override
  State<ConexoesPage> createState() => _ConexoesPageState();
}

class _ConexoesPageState extends State<ConexoesPage> {
  late AbaDeConexoes _aba = widget.abaInicial;
  late final ListaPaginada<PerfilResumo> _seguidores = ListaPaginada<PerfilResumo>(
    (pagina) => widget.servico.listarSeguidores(pagina),
    (leitor) => leitor.id,
  );
  late final ListaPaginada<PerfilResumo> _seguidos = ListaPaginada<PerfilResumo>(
    (pagina) => widget.servico.listarSeguidos(pagina),
    (leitor) => leitor.id,
  );

  ListaPaginada<PerfilResumo> get _lista =>
      _aba == AbaDeConexoes.seguidores ? _seguidores : _seguidos;

  @override
  void initState() {
    super.initState();
    _seguidores.addListener(_redesenhar);
    _seguidos.addListener(_redesenhar);
    _seguidores.carregar();
    _seguidos.carregar();
  }

  @override
  void dispose() {
    _seguidores.dispose();
    _seguidos.dispose();
    super.dispose();
  }

  void _redesenhar() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _remover(PerfilResumo leitor) async {
    final confirmado = await confirmarNoModal(
      context,
      titulo: 'Remover ${primeiroNome(leitor.displayName)} dos seus seguidores?',
      texto:
          'Essa pessoa deixa de seguir você e perde o acesso ao seu conteúdo restrito. Ela pode '
          'pedir para seguir de novo.',
      acao: 'Remover',
    );
    if (!confirmado) {
      return;
    }
    await _executar(
      () => widget.servico.removerSeguidor(
        leitor.username,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      ),
      () => _seguidores.retirar(leitor.id),
    );
  }

  Future<void> _deixarDeSeguir(PerfilResumo leitor) async {
    final confirmado = await confirmarNoModal(
      context,
      titulo: 'Deixar de seguir ${primeiroNome(leitor.displayName)}?',
      texto: leitor.privacidade == Privacidade.privado
          ? 'As atividades dessa pessoa saem do seu feed, e você perde o acesso à estante e às '
                'resenhas. Seguir de novo exige uma solicitação nova.'
          : 'As atividades dessa pessoa saem do seu feed. Você pode seguir de novo quando quiser.',
      acao: 'Deixar de seguir',
    );
    if (!confirmado) {
      return;
    }
    await _executar(
      () => widget.servico.deixarDeSeguir(
        leitor.username,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      ),
      () => _seguidos.retirar(leitor.id),
    );
  }

  Future<void> _executar(Future<void> Function() acao, VoidCallback aoConcluir) async {
    try {
      await acao();
      aoConcluir();
    } on ApiException catch (erro) {
      if (mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(erro.message)));
      }
    }
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.extentAfter < 300) {
      _lista.carregarMais();
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: 'Conexões', aoVoltar: widget.aoVoltar),
        _faixaDeAbas(theme),
        Expanded(
          child: NotificationListener<ScrollNotification>(
            onNotification: _pertoDoFim,
            child: _conteudo(theme),
          ),
        ),
      ],
    );
  }

  Widget _faixaDeAbas(ThemeData theme) {
    Widget aba(AbaDeConexoes valor, String rotulo, ListaPaginada<PerfilResumo> lista) {
      final ativa = _aba == valor;
      final cor = ativa ? theme.primaryAccent : theme.secondaryText;
      final contagem = lista.carregando || lista.falhou ? null : lista.total;
      return Expanded(
        child: Semantics(
          selected: ativa,
          button: true,
          label: contagem == null ? rotulo : '$rotulo $contagem',
          excludeSemantics: true,
          child: InkWell(
            onTap: () => setState(() => _aba = valor),
            splashFactory: NoSplash.splashFactory,
            child: Container(
              height: 48,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: ativa ? theme.primaryAccent : Colors.transparent, width: 2),
                ),
              ),
              child: Text.rich(
                TextSpan(
                  text: rotulo,
                  children: <InlineSpan>[
                    if (contagem != null)
                      TextSpan(text: ' $contagem', style: theme.numInline.copyWith(color: cor)),
                  ],
                ),
                style: theme.textTheme.labelLarge?.copyWith(color: cor),
              ),
            ),
          ),
        ),
      );
    }

    return DecoratedBox(
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.divider))),
      child: Row(
        children: <Widget>[
          aba(AbaDeConexoes.seguidores, 'Seguidores', _seguidores),
          aba(AbaDeConexoes.seguidos, 'Seguindo', _seguidos),
        ],
      ),
    );
  }

  Widget _conteudo(ThemeData theme) {
    final lista = _lista;
    const margem = EdgeInsets.symmetric(horizontal: DesignTokens.space5);
    if (lista.carregando) {
      return ListView(
        padding: margem,
        children: List<Widget>.generate(
          6,
          (_) => const Padding(
            padding: EdgeInsets.symmetric(vertical: DesignTokens.space4),
            child: SkeletonDeLinha(),
          ),
        ),
      );
    }
    if (lista.falhou) {
      return ListView(
        padding: const EdgeInsets.all(DesignTokens.space5),
        children: <Widget>[
          const BannerAviso(
            variante: VarianteAviso.erro,
            mensagem: 'Não foi possível carregar suas conexões. Verifique sua conexão e tente de novo.',
          ),
          const SizedBox(height: DesignTokens.space2),
          BotaoTextual(texto: 'Tentar de novo', onPressed: lista.carregar),
        ],
      );
    }
    if (lista.itens.isEmpty) {
      final seguidores = _aba == AbaDeConexoes.seguidores;
      return ListView(
        padding: const EdgeInsets.fromLTRB(
          DesignTokens.space5,
          DesignTokens.space10,
          DesignTokens.space5,
          DesignTokens.space5,
        ),
        children: <Widget>[
          EstadoVazio(
            icone: PhosphorIconsRegular.users,
            titulo: seguidores ? 'Ninguém segue você ainda' : 'Você ainda não segue ninguém',
            texto: seguidores
                ? 'Quando alguém começar a seguir você, aparece aqui.'
                : 'Busque um leitor pelo nome de usuário para começar a montar seu feed.',
            // Na aba Seguidores não há o que fazer para ganhar seguidores; sem CTA inventado.
            rodape: seguidores
                ? null
                : BotaoPrimario(texto: 'Buscar leitor', onPressed: widget.aoBuscarLeitor),
          ),
        ],
      );
    }
    return ListView.separated(
      padding: margem,
      itemCount: lista.itens.length + 1,
      separatorBuilder: (_, _) => Divider(height: 1, color: theme.divider),
      itemBuilder: (context, indice) {
        if (indice == lista.itens.length) {
          return FimDaLista(
            temMais: lista.temMais,
            carregandoMais: lista.carregandoMais,
            falhou: lista.falhouMais,
            aoCarregar: lista.carregarMais,
          );
        }
        final leitor = lista.itens[indice];
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: DesignTokens.space4),
          child: LinhaDeLeitor(
            leitor: leitor,
            aoAbrir: () => widget.aoAbrirPerfil(leitor.username),
            acao: _aba == AbaDeConexoes.seguidores
                ? BotaoDeLinha(
                    texto: 'Remover',
                    destrutivo: true,
                    rotuloAcessivel: 'Remover ${leitor.displayName} dos seus seguidores',
                    aoTocar: () => _remover(leitor),
                  )
                : BotaoDeLinha(
                    texto: 'Seguindo',
                    icone: PhosphorIconsBold.check,
                    rotuloAcessivel: 'Seguindo ${leitor.displayName}. Deixar de seguir',
                    aoTocar: () => _deixarDeSeguir(leitor),
                  ),
          ),
        );
      },
    );
  }
}

