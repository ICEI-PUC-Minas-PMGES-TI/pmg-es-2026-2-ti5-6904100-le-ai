import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/estado_vazio.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/perfil_service.dart';
import '../perfil/textos.dart';
import '../perfil/widgets_de_perfil.dart';
import 'lista_form_page.dart';
import 'listas_service.dart';
import 'textos.dart';
import 'widgets_de_lista.dart';

/// Índice de listas no mobile (docs/design/periodo-2/F-LST/listas-do-leitor.md §4,
/// RF-LST-01/04). Sem [username], as listas do próprio leitor, com `Nova lista` e a linha de
/// visibilidade; com ele, as de outro leitor, com `Listas de` e o nome. Paginado por rolagem, da
/// lista atualizada mais recentemente para a mais antiga.
///
/// O perfil de outro leitor vem do `identidade` (id, nome e `conteudoRestrito`); com conteúdo
/// restrito, ou com o 403 do `social`, o bloco de restrição (RN-08), sem nenhum mosaico.
class ListasDoLeitorPage extends StatefulWidget {
  final ListasService servico;
  final PerfilService perfil;

  /// Nulo para as listas do próprio leitor.
  final String? username;
  final VoidCallback? aoVoltar;
  final ValueChanged<String> aoAbrirLista;
  final ValueChanged<String>? aoAbrirPerfil;

  const ListasDoLeitorPage({
    super.key,
    required this.servico,
    required this.perfil,
    this.username,
    this.aoVoltar,
    required this.aoAbrirLista,
    this.aoAbrirPerfil,
  });

  @override
  State<ListasDoLeitorPage> createState() => _ListasDoLeitorPageState();
}

class _ListasDoLeitorPageState extends State<ListasDoLeitorPage> {
  final ScrollController _rolagem = ScrollController();
  late final ListaPaginada<ListaResumo> _listas = ListaPaginada<ListaResumo>(
    _buscar,
    (lista) => lista.id,
  );

  /// Dono das listas de outro leitor, e a privacidade do próprio leitor.
  Perfil? _dono;
  Privacidade? _privacidade;
  bool _carregandoDono = false;
  bool _falhouDono = false;
  bool _restrita = false;

  bool get _proprio => widget.username == null;

  @override
  void initState() {
    super.initState();
    _rolagem.addListener(_aoRolar);
    widget.servico.alteracoes.addListener(_recarregar);
    _carregar();
  }

  @override
  void dispose() {
    widget.servico.alteracoes.removeListener(_recarregar);
    _rolagem.dispose();
    _listas.dispose();
    super.dispose();
  }

  void _aoRolar() {
    if (_rolagem.hasClients && _rolagem.position.extentAfter < 400) {
      _listas.carregarMais();
    }
  }

  void _recarregar() {
    if (!_restrita && (_proprio || _dono != null)) {
      _listas.carregar();
    }
  }

  /// O 403 do `social` vira o bloco de restrição; a `ListaPaginada` só guarda que falhou.
  Future<Pagina<ListaResumo>> _buscar(int pagina) async {
    try {
      final dono = _dono;
      return _proprio || dono == null
          ? await widget.servico.listarMinhas(pagina)
          : await widget.servico.listarDoPerfil(dono.id, pagina);
    } on ApiException catch (erro) {
      if (erro.status == 403 && mounted) {
        setState(() => _restrita = true);
      }
      rethrow;
    }
  }

  Future<void> _carregar() async {
    if (_proprio) {
      unawaited(_carregarPrivacidade());
      await _listas.carregar();
      return;
    }
    setState(() {
      _carregandoDono = true;
      _falhouDono = false;
      _restrita = false;
    });
    try {
      final dono = await widget.perfil.obterPerfil(widget.username!);
      if (!mounted) {
        return;
      }
      setState(() {
        _dono = dono;
        _carregandoDono = false;
        _restrita = dono.conteudoRestrito;
      });
      if (!dono.conteudoRestrito) {
        await _listas.carregar();
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _carregandoDono = false;
          _falhouDono = true;
        });
      }
    }
  }

  Future<Privacidade> _minhaPrivacidade() async =>
      (await widget.perfil.obterMeuPerfil()).privacidade;

  Future<void> _carregarPrivacidade() async {
    try {
      final privacidade = await _minhaPrivacidade();
      if (mounted) {
        setState(() => _privacidade = privacidade);
      }
    } on ApiException {
      // A linha de visibilidade fica fora.
    }
  }

  Future<void> _novaLista() async {
    final resultado = await abrirFormularioDeLista(
      context,
      servico: widget.servico,
      obterPrivacidade: _minhaPrivacidade,
    );
    final lista = resultado?.lista;
    if (mounted && lista != null) {
      widget.aoAbrirLista(lista.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: 'Listas', aoVoltar: widget.aoVoltar, semDivisor: true),
        Expanded(
          child: ListenableBuilder(
            listenable: _listas,
            builder: (context, _) => _corpo(theme),
          ),
        ),
      ],
    );
  }

  Widget _corpo(ThemeData theme) {
    const lateral = EdgeInsets.symmetric(horizontal: DesignTokens.space5);
    if (_restrita) {
      final nome = _dono == null ? null : primeiroNome(_dono!.displayName);
      return SingleChildScrollView(
        padding: const EdgeInsets.all(DesignTokens.space10),
        child: EstadoVazio(
          icone: PhosphorIconsRegular.lock,
          solto: true,
          titulo: 'Este perfil é privado',
          texto: textoDeListasRestritas(nome),
          rodape: widget.aoAbrirPerfil == null
              ? null
              : BotaoSecundarioDeLista(
                  texto: nome == null ? 'Ver perfil' : 'Ver perfil de $nome',
                  aoTocar: () => widget.aoAbrirPerfil!(widget.username!),
                ),
        ),
      );
    }
    final carregando = _carregandoDono || (_listas.carregando && _listas.itens.isEmpty);
    final falhou = _falhouDono || (_listas.falhou && _listas.itens.isEmpty);
    final vazio = !carregando && !falhou && _listas.itens.isEmpty;

    return ListView(
      controller: _rolagem,
      padding: const EdgeInsets.only(bottom: DesignTokens.space12),
      children: <Widget>[
        Padding(
          padding: lateral.copyWith(top: DesignTokens.space2),
          child: _linhaDeTopo(theme, carregando: carregando, falhou: falhou, vazio: vazio),
        ),
        if (!vazio || !_proprio)
          Padding(
            padding: const EdgeInsets.only(top: DesignTokens.space4),
            child: Divider(height: 1, color: theme.divider),
          ),
        if (carregando)
          EntradaSuave(
            child: Padding(
              padding: lateral,
              child: Column(children: <Widget>[for (var i = 0; i < 5; i++) const SkeletonDeCard()]),
            ),
          )
        else if (falhou)
          Padding(
            padding: lateral.copyWith(top: DesignTokens.space4),
            child: BannerAviso(
              variante: VarianteAviso.erro,
              triangulo: true,
              mensagem: 'Não foi possível carregar as listas. Verifique sua conexão e tente de novo.',
              acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
            ),
          )
        else if (vazio && _proprio)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space10,
              DesignTokens.space10,
              DesignTokens.space10,
              0,
            ),
            child: EstadoVazio(
              icone: PhosphorIconsRegular.listBullets,
              solto: true,
              titulo: 'Você ainda não tem listas',
              texto: 'Junte livros sob um título, com uma descrição e na ordem que você quiser.',
              rodape: BotaoPrimario(
                texto: 'Nova lista',
                icone: PhosphorIconsRegular.plus,
                larguraTotal: false,
                onPressed: _novaLista,
              ),
            ),
          )
        else if (vazio)
          Padding(
            padding: lateral.copyWith(top: DesignTokens.space4),
            child: Text(
              '${_dono == null ? 'Este leitor' : primeiroNome(_dono!.displayName)} ainda não '
              'criou listas.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
            ),
          )
        else ...<Widget>[
          for (var i = 0; i < _listas.itens.length; i++)
            Padding(
              padding: lateral,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  border: i == _listas.itens.length - 1
                      ? null
                      : Border(bottom: BorderSide(color: theme.divider)),
                ),
                child: CardDeLista(
                  lista: _listas.itens[i],
                  aoTocar: () => widget.aoAbrirLista(_listas.itens[i].id),
                ),
              ),
            ),
          Padding(
            padding: lateral,
            child: FimDaLista(
              temMais: _listas.temMais,
              carregandoMais: _listas.carregandoMais,
              falhou: _listas.falhouMais,
              aoCarregar: _listas.carregarMais,
              esqueleto: const Column(children: <Widget>[SkeletonDeCard(), SkeletonDeCard()]),
            ),
          ),
        ],
      ],
    );
  }

  Widget _linhaDeTopo(
    ThemeData theme, {
    required bool carregando,
    required bool falhou,
    required bool vazio,
  }) {
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final Widget contagemOuBarra = carregando
        ? Container(
            width: 64,
            height: 13,
            decoration: BoxDecoration(
              color: theme.coverPlaceholder,
              borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
            ),
          )
        : falhou || vazio
        ? const SizedBox.shrink()
        : Text(contagemDeListas(_listas.total), style: legenda);

    if (_proprio) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          // §4.2: sem listas, a contagem e `Nova lista` saem; a ação fica só no bloco de vazio.
          if (!vazio)
            Row(
              children: <Widget>[
                Expanded(
                  child: Align(alignment: Alignment.centerLeft, child: contagemOuBarra),
                ),
                TextButton.icon(
                  onPressed: _novaLista,
                  icon: const Icon(PhosphorIconsRegular.plus, size: 16),
                  label: const Text('Nova lista'),
                  style: TextButton.styleFrom(
                    foregroundColor: theme.primaryAccent,
                    minimumSize: const Size(48, 48),
                    textStyle: theme.textTheme.labelLarge,
                  ),
                ),
              ],
            ),
          if (_privacidade != null) ...<Widget>[
            if (!vazio) const SizedBox(height: DesignTokens.space2),
            LinhaDeVisibilidade(
              privacidade: _privacidade!,
              texto: visibilidadeDasListas(_privacidade!),
            ),
          ],
        ],
      );
    }

    final dono = _dono;
    if (dono == null) {
      return SizedBox(height: 48, child: Align(alignment: Alignment.centerLeft, child: contagemOuBarra));
    }
    return SizedBox(
      height: 48,
      child: Row(
        children: <Widget>[
          AvatarLeitor(url: dono.avatarUrl, tamanho: 24, nome: dono.displayName),
          const SizedBox(width: DesignTokens.space2),
          Text('Listas de ', style: legenda),
          Flexible(
            child: Semantics(
              link: true,
              child: GestureDetector(
                onTap: widget.aoAbrirPerfil == null
                    ? null
                    : () => widget.aoAbrirPerfil!(dono.username),
                child: Text(
                  dono.displayName,
                  overflow: TextOverflow.ellipsis,
                  style: legenda?.copyWith(
                    color: theme.primaryAccent,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
          const Spacer(),
          contagemOuBarra,
        ],
      ),
    );
  }
}
