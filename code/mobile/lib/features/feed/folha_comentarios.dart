import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/perfil_service.dart';
import '../perfil/textos.dart';
import '../perfil/widgets_de_perfil.dart';
import 'comentario_item.dart';
import 'social_service.dart';
import 'verbos.dart';

/// Depois disto sem resposta do envio, a linha vira a de cold start (comentarios.md §4.5).
const Duration _aposEsteTempoEColdStart = Duration(seconds: 3);
const int _limiteDoTexto = 2000;

/// Abre os comentários de [atividade] num bottom sheet de 88% da altura (comentarios.md §4),
/// sobre o feed escurecido. [aoComentar] avisa o feed a cada comentário confirmado, para a
/// contagem do item acompanhar sem recarregar.
Future<void> mostrarComentarios(
  BuildContext context, {
  required SocialService social,
  required PerfilService perfil,
  required Atividade atividade,
  required VoidCallback aoComentar,
}) {
  final theme = Theme.of(context);
  return showModalBottomSheet<void>(
    context: context,
    useSafeArea: true,
    isScrollControlled: true,
    backgroundColor: theme.elevatedSurface,
    barrierColor: theme.isDark ? const Color(0x99000000) : DesignTokens.tinta.withValues(alpha: 0.4),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(DesignTokens.radiusXl)),
    ),
    builder: (context) => FractionallySizedBox(
      heightFactor: 0.88,
      child: FolhaComentarios(
        social: social,
        perfil: perfil,
        atividade: atividade,
        aoComentar: aoComentar,
      ),
    ),
  );
}

class FolhaComentarios extends StatefulWidget {
  final SocialService social;
  final PerfilService perfil;
  final Atividade atividade;
  final VoidCallback aoComentar;

  const FolhaComentarios({
    super.key,
    required this.social,
    required this.perfil,
    required this.atividade,
    required this.aoComentar,
  });

  @override
  State<FolhaComentarios> createState() => _FolhaComentariosState();
}

/// Respostas de uma raiz já carregadas, pelo cursor opaco do `social`.
class _Respostas {
  final List<Comentario> itens;
  final String? proximoCursor;
  final bool temMais;

  const _Respostas(this.itens, this.proximoCursor, this.temMais);
}

class _FolhaComentariosState extends State<FolhaComentarios> {
  late final ListaPaginada<Comentario> _raizes = ListaPaginada<Comentario>(
    (pagina) => widget.social.listarComentariosRaiz(widget.atividade.id, pagina),
    (comentario) => comentario.id,
  );
  final Map<String, _Respostas> _respostas = <String, _Respostas>{};
  final Map<String, int> _totalDeRespostas = <String, int>{};
  final Set<String> _expandidas = <String>{};
  final Set<String> _carregandoRespostas = <String>{};
  final TextEditingController _texto = TextEditingController();
  final FocusNode _foco = FocusNode();

  late int _totalComentarios = widget.atividade.totalComentarios;
  Comentario? _respondendoA;
  String? _meuAvatar;
  String? _meuNome;
  bool _enviando = false;
  bool _demorando = false;
  bool _limitado = false;
  String? _erroDeEnvio;
  Timer? _relogioDeColdStart;

  /// A mesma intenção reenviada depois de uma falha usa a mesma chave (RNF-ERR-04); mudar o
  /// texto ou o alvo é outra intenção.
  String? _chave;

  @override
  void initState() {
    super.initState();
    _raizes.addListener(_redesenhar);
    _texto.addListener(_aoMudarTexto);
    _raizes.carregar();
    _carregarMeuPerfil();
  }

  @override
  void dispose() {
    _relogioDeColdStart?.cancel();
    _raizes.dispose();
    _texto.dispose();
    _foco.dispose();
    super.dispose();
  }

  void _redesenhar() {
    if (mounted) {
      setState(() {});
    }
  }

  void _aoMudarTexto() {
    _chave = null;
    _redesenhar();
  }

  Future<void> _carregarMeuPerfil() async {
    try {
      final perfil = await widget.perfil.obterMeuPerfil();
      if (mounted) {
        setState(() {
          _meuAvatar = perfil.avatarUrl;
          _meuNome = perfil.displayName;
        });
      }
    } on ApiException {
      // Sem o perfil, o campo mostra o avatar vazio; comentar continua possível.
    }
  }

  int _respostasDe(Comentario raiz) => _totalDeRespostas[raiz.id] ?? raiz.totalRespostas;

  Future<void> _carregarRespostas(String raizId, {String? cursor}) async {
    if (!_carregandoRespostas.add(raizId)) {
      return;
    }
    _redesenhar();
    try {
      final lista = await widget.social.listarRespostas(raizId, cursor: cursor);
      final antes = cursor == null ? const <Comentario>[] : _respostas[raizId]?.itens ?? const <Comentario>[];
      final vistos = antes.map((resposta) => resposta.id).toSet();
      _respostas[raizId] = _Respostas(
        <Comentario>[...antes, ...lista.itens.where((resposta) => !vistos.contains(resposta.id))],
        lista.proximoCursor,
        lista.temMais,
      );
      _expandidas.add(raizId);
    } on ApiException catch (erro) {
      _erroDeEnvio = erro.message;
    } finally {
      _carregandoRespostas.remove(raizId);
      _redesenhar();
    }
  }

  void _alternarRespostas(Comentario raiz) {
    if (_expandidas.remove(raiz.id)) {
      _redesenhar();
    } else if (_respostas.containsKey(raiz.id)) {
      setState(() => _expandidas.add(raiz.id));
    } else {
      _carregarRespostas(raiz.id);
    }
  }

  void _responder(Comentario alvo) {
    setState(() {
      _respondendoA = alvo;
      _erroDeEnvio = null;
    });
    final mencao = '@${alvo.autor.username} ';
    _texto.value = TextEditingValue(
      text: mencao,
      selection: TextSelection.collapsed(offset: mencao.length),
    );
    _foco.requestFocus();
  }

  void _cancelarResposta() {
    setState(() => _respondendoA = null);
    _texto.clear();
  }

  Future<void> _enviar() async {
    final texto = _texto.text.trim();
    if (texto.isEmpty || _enviando || _limitado) {
      return;
    }
    final alvo = _respondendoA;
    final chave = _chave ??= ApiClient.newIdempotencyKey();
    setState(() {
      _enviando = true;
      _demorando = false;
      _erroDeEnvio = null;
    });
    _relogioDeColdStart = Timer(_aposEsteTempoEColdStart, () => setState(() => _demorando = true));
    try {
      final novo = await widget.social.comentar(
        widget.atividade.id,
        texto: texto,
        comentarioRespondidoId: alvo?.id,
        idempotencyKey: chave,
      );
      if (!mounted) {
        return;
      }
      if (alvo == null) {
        _raizes
          ..itens = <Comentario>[..._raizes.itens, novo]
          ..total += 1;
      } else {
        await _inserirResposta(alvo.comentarioRaizId ?? alvo.id, novo);
      }
      _totalComentarios++;
      _respondendoA = null;
      _chave = null;
      _texto.removeListener(_aoMudarTexto);
      _texto.clear();
      _texto.addListener(_aoMudarTexto);
      widget.aoComentar();
    } on ApiException catch (erro) {
      if (erro.status == 429) {
        _limitado = true;
      } else {
        _erroDeEnvio = erro.message;
      }
    } finally {
      _relogioDeColdStart?.cancel();
      _enviando = false;
      _demorando = false;
      _redesenhar();
    }
  }

  /// A resposta nova vai para o fim das respostas da raiz, expandindo-a (RN-10: sempre sob a
  /// raiz, mesmo quando respondia a outra resposta).
  Future<void> _inserirResposta(String raizId, Comentario novo) async {
    _totalDeRespostas[raizId] =
        (_totalDeRespostas[raizId] ??
            _raizes.itens.where((raiz) => raiz.id == raizId).firstOrNull?.totalRespostas ??
            0) +
        1;
    final carregadas = _respostas[raizId];
    if (carregadas == null) {
      await _carregarRespostas(raizId);
    }
    final atuais = _respostas[raizId];
    if (atuais != null && atuais.itens.every((resposta) => resposta.id != novo.id)) {
      _respostas[raizId] = _Respostas(<Comentario>[...atuais.itens, novo], atuais.proximoCursor, atuais.temMais);
    }
    _expandidas.add(raizId);
  }

  bool _pertoDoFim(ScrollNotification notificacao) {
    if (notificacao.metrics.extentAfter < 300) {
      _raizes.carregarMais();
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        children: <Widget>[
          const SizedBox(height: DesignTokens.space3),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: theme.divider,
              borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
            ),
          ),
          const SizedBox(height: DesignTokens.space3),
          _cabecalho(theme),
          _resumo(theme),
          Expanded(
            child: NotificationListener<ScrollNotification>(
              onNotification: _pertoDoFim,
              child: _lista(theme),
            ),
          ),
          _rodape(theme),
        ],
      ),
    );
  }

  Widget _cabecalho(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space4,
        DesignTokens.space2,
        DesignTokens.space4,
      ),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.divider))),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Semantics(header: true, child: Text('Comentários', style: theme.textTheme.titleLarge)),
                if (!_raizes.carregando)
                  Text(
                    _totalComentarios == 0
                        ? 'Nenhum comentário'
                        : contagem(_totalComentarios, 'comentário', 'comentários'),
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                  ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            tooltip: 'Fechar',
            constraints: const BoxConstraints.tightFor(width: 48, height: 48),
            icon: Icon(PhosphorIconsRegular.x, size: 24, color: theme.colorScheme.onSurface),
          ),
        ],
      ),
    );
  }

  /// Resumo não acionável (comentarios.md §4): o caminho para o livro é o item do feed.
  Widget _resumo(ThemeData theme) {
    final atividade = widget.atividade;
    final livro = atividade.livro;
    final estilo = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return Container(
      color: theme.pageBackground,
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space5,
        vertical: DesignTokens.space3,
      ),
      child: Row(
        children: <Widget>[
          CapaLivro(url: livro.capaUrl, largura: 32, altura: 48),
          const SizedBox(width: DesignTokens.space3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  '${atividade.autor.nomeExibicao} ${verboDeAtividade(atividade.tipo)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: estilo,
                ),
                Text(
                  livro.autor.isEmpty ? livro.titulo : '${livro.titulo}, de ${livro.autor}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: estilo,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _lista(ThemeData theme) {
    if (_raizes.carregando) {
      return const _SkeletonDeComentarios();
    }
    if (_raizes.falhou) {
      return ListView(
        padding: const EdgeInsets.all(DesignTokens.space5),
        children: <Widget>[
          BannerAviso(
            variante: VarianteAviso.erro,
            triangulo: true,
            mensagem:
                'Não foi possível carregar os comentários. Verifique sua conexão e tente de novo.',
            acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _raizes.carregar),
          ),
        ],
      );
    }
    if (_raizes.itens.isEmpty) {
      return CustomScrollView(
        slivers: <Widget>[
          SliverFillRemaining(
            hasScrollBody: false,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Icon(PhosphorIconsRegular.chatCircle, size: 32, color: theme.tertiaryText),
                  const SizedBox(height: DesignTokens.space5),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 260),
                    child: Text(
                      'Seja o primeiro a comentar esta atividade.',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }
    final raizes = _raizes.itens;
    return ListView.builder(
      itemCount: raizes.length + 1,
      itemBuilder: (context, indice) {
        if (indice == raizes.length) {
          return FimDaLista(
            temMais: _raizes.temMais,
            carregandoMais: _raizes.carregandoMais,
            falhou: _raizes.falhouMais,
            aoCarregar: _raizes.carregarMais,
          );
        }
        return _blocoDaRaiz(theme, raizes[indice]);
      },
    );
  }

  Widget _blocoDaRaiz(ThemeData theme, Comentario raiz) {
    final total = _respostasDe(raiz);
    final expandida = _expandidas.contains(raiz.id);
    final respostas = _respostas[raiz.id];
    return Padding(
      key: ValueKey<String>(raiz.id),
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space5,
        vertical: DesignTokens.space4,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          ComentarioItem(comentario: raiz, aoResponder: () => _responder(raiz)),
          if (total > 0)
            Padding(
              padding: const EdgeInsets.only(left: DesignTokens.space10 + DesignTokens.space1),
              child: _botaoDeRespostas(
                theme,
                texto: expandida
                    ? 'Ocultar respostas'
                    : 'Ver ${contagem(total, 'resposta', 'respostas')}',
                aoTocar: _carregandoRespostas.contains(raiz.id) ? null : () => _alternarRespostas(raiz),
              ),
            ),
          if (expandida && respostas != null) ...<Widget>[
            for (final resposta in respostas.itens)
              Padding(
                key: ValueKey<String>(resposta.id),
                padding: const EdgeInsets.only(left: DesignTokens.space10, top: DesignTokens.space2),
                child: ComentarioItem(comentario: resposta, aoResponder: () => _responder(resposta)),
              ),
            if (respostas.temMais)
              Padding(
                padding: const EdgeInsets.only(left: DesignTokens.space10),
                child: _botaoDeRespostas(
                  theme,
                  texto: 'Ver mais respostas',
                  aoTocar: _carregandoRespostas.contains(raiz.id)
                      ? null
                      : () => _carregarRespostas(raiz.id, cursor: respostas.proximoCursor),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _botaoDeRespostas(ThemeData theme, {required String texto, required VoidCallback? aoTocar}) {
    return TextButton(
      onPressed: aoTocar,
      style: TextButton.styleFrom(
        // Esquerda em zero para o traço alinhar ao texto do comentário; a direita dá respiro ao realce.
        padding: const EdgeInsets.only(right: DesignTokens.space3),
        minimumSize: const Size(48, 48),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        foregroundColor: theme.primaryAccent,
        textStyle: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(width: 16, height: 1, color: theme.divider),
          const SizedBox(width: DesignTokens.space2),
          Text(texto),
        ],
      ),
    );
  }

  Widget _rodape(ThemeData theme) {
    final alvo = _respondendoA;
    final bloqueado = _enviando || _limitado;
    final podeEnviar = !bloqueado && _texto.text.trim().isNotEmpty;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (_limitado)
          Container(
            color: theme.warningTint,
            padding: const EdgeInsets.symmetric(
              horizontal: DesignTokens.space5,
              vertical: DesignTokens.space3,
            ),
            child: Row(
              children: <Widget>[
                Icon(PhosphorIconsRegular.warning, size: 20, color: theme.warningColor),
                const SizedBox(width: DesignTokens.space3),
                Expanded(
                  child: Text(
                    'Muitos comentários seguidos. Espere alguns minutos para comentar de novo.',
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          )
        else if (_enviando)
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: DesignTokens.space5,
              vertical: DesignTokens.space2,
            ),
            child: Text(
              _demorando
                  ? 'Enviando. O servidor está iniciando e isso pode levar alguns segundos.'
                  : 'Enviando…',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          )
        else if (_erroDeEnvio != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space5,
              DesignTokens.space2,
              DesignTokens.space5,
              0,
            ),
            child: BannerAviso(variante: VarianteAviso.erro, mensagem: _erroDeEnvio!),
          )
        else if (alvo != null)
          Container(
            color: theme.accentTint,
            padding: const EdgeInsets.only(left: DesignTokens.space5),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    'Respondendo a ${primeiroNome(alvo.autor.nomeExibicao)}',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.primaryAccent),
                  ),
                ),
                IconButton(
                  onPressed: _cancelarResposta,
                  tooltip: 'Cancelar resposta',
                  constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                  icon: Icon(PhosphorIconsRegular.x, size: 20, color: theme.primaryAccent),
                ),
              ],
            ),
          ),
        Container(
          decoration: BoxDecoration(
            color: theme.elevatedSurface,
            border: Border(top: BorderSide(color: theme.divider)),
          ),
          padding: const EdgeInsets.fromLTRB(
            DesignTokens.space5,
            DesignTokens.space3,
            DesignTokens.space2,
            DesignTokens.space3,
          ),
          child: SafeArea(
            top: false,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.only(bottom: DesignTokens.space1 + 2),
                  child: ExcludeSemantics(
                    child: AvatarLeitor(url: _meuAvatar, nome: _meuNome, tamanho: 32),
                  ),
                ),
                const SizedBox(width: DesignTokens.space3),
                Expanded(
                  child: Opacity(
                    opacity: bloqueado ? 0.5 : 1,
                    child: TextField(
                      controller: _texto,
                      focusNode: _foco,
                      enabled: !bloqueado,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: _limiteDoTexto,
                      textCapitalization: TextCapitalization.sentences,
                      style: theme.textTheme.bodyMedium,
                      decoration: InputDecoration(
                        hintText: 'Escreva um comentário',
                        counterText: '',
                        isDense: true,
                        filled: true,
                        fillColor: theme.pageBackground,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: DesignTokens.space4,
                          vertical: DesignTokens.space3,
                        ),
                        border: _borda(theme),
                        enabledBorder: _borda(theme),
                        disabledBorder: _borda(theme),
                        focusedBorder: _borda(theme),
                      ),
                    ),
                  ),
                ),
                Semantics(
                  button: true,
                  enabled: podeEnviar,
                  label: 'Enviar comentário',
                  excludeSemantics: true,
                  child: IconButton(
                    onPressed: podeEnviar ? _enviar : null,
                    constraints: const BoxConstraints.tightFor(width: 48, height: 48),
                    icon: Icon(
                      PhosphorIconsRegular.paperPlaneRight,
                      size: 24,
                      color: podeEnviar ? theme.primaryAccent : theme.tertiaryText,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  OutlineInputBorder _borda(ThemeData theme) => OutlineInputBorder(
    borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
    borderSide: BorderSide(color: theme.divider),
  );
}

/// Skeleton estático (comentarios.md §4.7): três blocos com círculo de 32px e três barras de
/// 15px em 35%, 90% e 60% da largura. Um único fade de entrada, sem shimmer.
class _SkeletonDeComentarios extends StatelessWidget {
  const _SkeletonDeComentarios();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget barra(double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: Container(
        height: 15,
        decoration: BoxDecoration(
          color: theme.coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
    final bloco = Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space5,
        vertical: DesignTokens.space4,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(color: theme.coverPlaceholder, shape: BoxShape.circle),
          ),
          const SizedBox(width: DesignTokens.space3),
          Expanded(
            child: Column(
              children: <Widget>[
                barra(0.35),
                const SizedBox(height: DesignTokens.space2),
                barra(0.9),
                const SizedBox(height: DesignTokens.space2),
                barra(0.6),
              ],
            ),
          ),
        ],
      ),
    );
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: DesignTokens.durBase,
      curve: DesignTokens.easeOut,
      builder: (context, opacidade, filho) => Opacity(opacity: opacidade, child: filho),
      child: Semantics(
        label: 'Carregando comentários',
        child: ListView(
          physics: const NeverScrollableScrollPhysics(),
          children: <Widget>[bloco, bloco, bloco],
        ),
      ),
    );
  }
}
