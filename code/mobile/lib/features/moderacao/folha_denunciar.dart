import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/aviso.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/folha_de_acoes.dart';
import '../../design/widgets/folha_inferior.dart';
import '../avaliacao/escrever_resenha_page.dart' show contarCaracteres;
import '../avaliacao/markdown_resenha.dart';
import '../feed/social_service.dart';
import '../perfil/widgets_de_perfil.dart';

/// Limite do motivo (decisão do dono, 16/10/2026): 500 caracteres, contados em code points.
const int limiteDoMotivo = 500;

/// Copy da denúncia (denunciar.md §8), igual à da web.
abstract final class TextosDaDenuncia {
  static const String rotuloMotivo = 'Motivo da denúncia';
  static const String placeholder =
      'Por exemplo: conta o final sem aviso de spoiler';
  static const String ajuda =
      'Obrigatório. Conte o que há de errado com as suas palavras.';
  static const String emBranco = 'Escreva o motivo da denúncia para continuar.';
  static const String longo = 'O motivo passou do limite de 500 caracteres.';
  static const String revisar = 'Revisar denúncia';
  static const String confirmar = 'Enviar esta denúncia?';
  static const String seuMotivo = 'Seu motivo';
  static const String enviar = 'Enviar denúncia';
  static const String enviando = 'Enviando denúncia';
  static const String voltar = 'Voltar ao motivo';
  static const String coldStart =
      'O serviço está iniciando. Isso pode levar alguns segundos.';
  static const String falhaConexao =
      'Não foi possível enviar a denúncia. Verifique sua conexão e tente de novo.';
  static const String falhaFrequencia =
      'Você enviou muitas denúncias em pouco tempo. Espere alguns minutos e tente de novo.';
  static const String descartarTitulo = 'Descartar esta denúncia?';
  static const String descartarTexto =
      'O motivo que você escreveu não será guardado. Nada vai para a moderação.';
  static const String descartar = 'Descartar';
  static const String continuar = 'Continuar escrevendo';
  static const String fechar = 'Fechar';
  static const String spoiler =
      'Resenha com spoiler. O texto fica oculto aqui.';
  static const String enviada = 'Denúncia enviada. A moderação vai analisar.';
  static const String denunciarResenha = 'Denunciar resenha';
  static const String denunciarComentario = 'Denunciar comentário';
}

/// Conteúdo denunciado (RF-MOD-01), com o que o card do passo 1 mostra. `via` e `referenciaId`
/// só na resenha de livro pessoal (RN-15.4), como nas reações.
class AlvoDaDenuncia {
  final bool ehResenha;
  final String id;
  final String autorNome;
  final String? autorAvatarUrl;
  final String livroTitulo;
  final String texto;
  final bool spoiler;
  final String? via;
  final String? referenciaId;

  const AlvoDaDenuncia.resenha({
    required this.id,
    required this.autorNome,
    this.autorAvatarUrl,
    required this.livroTitulo,
    required this.texto,
    this.spoiler = false,
    this.via,
    this.referenciaId,
  }) : ehResenha = true;

  const AlvoDaDenuncia.comentario({
    required this.id,
    required this.autorNome,
    this.autorAvatarUrl,
    required this.livroTitulo,
    required this.texto,
  }) : ehResenha = false,
       spoiler = false,
       via = null,
       referenciaId = null;
}

/// Abre a denúncia pelo navegador raiz (a folha enxerga o teclado e, no comentário, empilha sobre
/// a folha de comentários) e, se ela foi enviada, mostra o aviso de confirmação.
Future<void> abrirDenuncia(
  BuildContext context, {
  required SocialService social,
  required AlvoDaDenuncia alvo,
}) async {
  final enviada = await mostrarFolhaInferior<bool>(
    Navigator.of(context, rootNavigator: true).context,
    builder: (context) => FolhaDenunciar(social: social, alvo: alvo),
  );
  if (enviada == true && context.mounted) {
    mostrarAviso(
      context,
      TextosDaDenuncia.enviada,
      icone: PhosphorIconsRegular.checkCircle,
    );
  }
}

enum _Passo { motivo, confirmar, indisponivel, descartar }

enum _Falha { conexao, frequencia }

/// Denúncia em dois passos no mesmo sheet (denunciar.md §4), igual ao `DialogoDenunciar.vue`:
/// motivo e confirmação, com descarte e conteúdo indisponível trocando o conteúdo. Tentar de novo
/// depois de uma falha repete a mesma chave de idempotência (RNF-ERR-04).
class FolhaDenunciar extends StatefulWidget {
  final SocialService social;
  final AlvoDaDenuncia alvo;

  const FolhaDenunciar({super.key, required this.social, required this.alvo});

  @override
  State<FolhaDenunciar> createState() => _FolhaDenunciarState();
}

class _FolhaDenunciarState extends State<FolhaDenunciar> {
  static const Duration _limiteDoColdStart = Duration(seconds: 3);

  final TextEditingController _motivo = TextEditingController();
  final FocusNode _focoDoMotivo = FocusNode();
  _Passo _passo = _Passo.motivo;
  String? _erroDoMotivo;
  bool _enviando = false;
  bool _coldStart = false;
  _Falha? _falha;
  Timer? _timerDoColdStart;
  ({String corpo, String valor})? _chave;

  AlvoDaDenuncia get _alvo => widget.alvo;
  bool get _escrito => _motivo.text.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _motivo.addListener(() {
      if (_erroDoMotivo != null) {
        setState(() => _erroDoMotivo = null);
      } else {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _timerDoColdStart?.cancel();
    _motivo.dispose();
    _focoDoMotivo.dispose();
    super.dispose();
  }

  void _revisar() {
    final String? erro;
    if (!_escrito) {
      erro = TextosDaDenuncia.emBranco;
    } else if (contarCaracteres(_motivo.text) > limiteDoMotivo) {
      erro = TextosDaDenuncia.longo;
    } else {
      erro = null;
    }
    setState(() {
      _erroDoMotivo = erro;
      if (erro == null) {
        _falha = null;
        _passo = _Passo.confirmar;
      }
    });
    if (erro != null) {
      _focoDoMotivo.requestFocus();
    }
  }

  String _chaveDaIntencao(String corpo) {
    final atual = _chave;
    if (atual != null && atual.corpo == corpo) {
      return atual.valor;
    }
    final nova = ApiClient.newIdempotencyKey();
    _chave = (corpo: corpo, valor: nova);
    return nova;
  }

  Future<void> _enviar() async {
    if (_enviando) return;
    final motivo = _motivo.text.trim();
    setState(() {
      _enviando = true;
      _falha = null;
    });
    _timerDoColdStart = Timer(_limiteDoColdStart, () {
      if (mounted) setState(() => _coldStart = true);
    });
    try {
      await widget.social.denunciar(
        alvoTipo: _alvo.ehResenha ? 'resenha' : 'comentario',
        alvoId: _alvo.id,
        motivo: motivo,
        via: _alvo.via,
        referenciaId: _alvo.referenciaId,
        idempotencyKey: _chaveDaIntencao(
          '${_alvo.via}|${_alvo.referenciaId}|$motivo',
        ),
      );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (erro) {
      if (!mounted) return;
      setState(() {
        if (erro.status == 404) {
          _passo = _Passo.indisponivel;
        } else {
          _falha = erro.status == 429 ? _Falha.frequencia : _Falha.conexao;
        }
      });
    } finally {
      _timerDoColdStart?.cancel();
      if (mounted) {
        setState(() {
          _enviando = false;
          _coldStart = false;
        });
      }
    }
  }

  bool get _pedeDescarte =>
      _escrito && (_passo == _Passo.motivo || _passo == _Passo.confirmar);

  void _pedirFechar() {
    if (_enviando) return;
    if (_pedeDescarte) {
      setState(() => _passo = _Passo.descartar);
      return;
    }
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_pedeDescarte && !_enviando,
      onPopInvokedWithResult: (saiu, _) {
        if (!saiu && !_enviando && _pedeDescarte) {
          setState(() => _passo = _Passo.descartar);
        }
      },
      child: AnimatedSwitcher(
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : DesignTokens.durBase,
        child: KeyedSubtree(
          key: ValueKey<_Passo>(_passo),
          child: switch (_passo) {
            _Passo.motivo => _passoDoMotivo(context),
            _Passo.confirmar => _passoDeConfirmar(context),
            _Passo.indisponivel => _indisponivel(context),
            _Passo.descartar => _descartar(context),
          },
        ),
      ),
    );
  }

  Widget _passoDoMotivo(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall;
    final total = contarCaracteres(_motivo.text);
    final erro = _erroDoMotivo;
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  _alvo.ehResenha
                      ? TextosDaDenuncia.denunciarResenha
                      : TextosDaDenuncia.denunciarComentario,
                  style: theme.textTheme.titleLarge,
                ),
              ),
              IconButton(
                tooltip: TextosDaDenuncia.fechar,
                onPressed: _pedirFechar,
                constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                icon: Icon(
                  PhosphorIconsRegular.x,
                  size: 24,
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.space4),
          _CardDoConteudo(alvo: _alvo),
          const SizedBox(height: DesignTokens.space6),
          CampoTexto(
            key: const ValueKey<String>('campo-motivo'),
            controller: _motivo,
            focusNode: _focoDoMotivo,
            label: TextosDaDenuncia.rotuloMotivo,
            placeholder: TextosDaDenuncia.placeholder,
            minLines: 4,
            maxLines: 6,
            keyboardType: TextInputType.multiline,
            bordaDeErro: erro != null,
          ),
          const SizedBox(height: DesignTokens.space2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Semantics(
                  liveRegion: erro != null,
                  child: Text(
                    erro ?? TextosDaDenuncia.ajuda,
                    style: legenda?.copyWith(
                      color: erro != null
                          ? theme.colorScheme.error
                          : theme.secondaryText,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: DesignTokens.space4),
              Text(
                '$total de $limiteDoMotivo caracteres',
                key: const ValueKey<String>('contador-motivo'),
                style: theme.numInline.copyWith(
                  fontSize: legenda?.fontSize,
                  color: total > limiteDoMotivo
                      ? theme.colorScheme.error
                      : theme.secondaryText,
                ),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.space6),
          BotaoPrimario(texto: TextosDaDenuncia.revisar, onPressed: _revisar),
        ],
      ),
    );
  }

  Widget _passoDeConfirmar(BuildContext context) {
    final theme = Theme.of(context);
    final consequencia = _alvo.ehResenha
        ? 'A resenha de ${_alvo.autorNome} e o seu motivo vão para a moderação. '
              'Depois de enviada, a denúncia não pode ser desfeita.'
        : 'O comentário de ${_alvo.autorNome} e o seu motivo vão para a moderação. '
              'Depois de enviada, a denúncia não pode ser desfeita.';
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(TextosDaDenuncia.confirmar, style: theme.textTheme.titleMedium),
          const SizedBox(height: DesignTokens.space3),
          Text(
            consequencia,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.secondaryText,
            ),
          ),
          if (_falha != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space4),
            BannerAviso(
              variante: _falha == _Falha.conexao
                  ? VarianteAviso.erro
                  : VarianteAviso.alerta,
              mensagem: _falha == _Falha.conexao
                  ? TextosDaDenuncia.falhaConexao
                  : TextosDaDenuncia.falhaFrequencia,
            ),
          ],
          const SizedBox(height: DesignTokens.space4),
          Container(
            padding: const EdgeInsets.only(left: DesignTokens.space4),
            decoration: BoxDecoration(
              border: Border(left: BorderSide(color: theme.divider, width: 2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  TextosDaDenuncia.seuMotivo,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.secondaryText,
                  ),
                ),
                const SizedBox(height: DesignTokens.space1),
                Text(_motivo.text.trim(), style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
          const SizedBox(height: DesignTokens.space6),
          OutlinedButton.icon(
            onPressed: _enviar,
            icon: Icon(
              PhosphorIconsRegular.flag,
              size: 20,
              color: theme.colorScheme.error,
            ),
            label: Semantics(
              liveRegion: true,
              child: Text(
                _enviando ? TextosDaDenuncia.enviando : TextosDaDenuncia.enviar,
              ),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: theme.colorScheme.error,
              minimumSize: const Size.fromHeight(48),
              side: BorderSide(color: theme.colorScheme.error),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(DesignTokens.radius),
              ),
            ),
          ),
          const SizedBox(height: DesignTokens.space3),
          BotaoTextual(
            texto: TextosDaDenuncia.voltar,
            neutro: true,
            larguraTotal: true,
            onPressed: _enviando
                ? null
                : () => setState(() => _passo = _Passo.motivo),
          ),
          if (_coldStart) ...<Widget>[
            const SizedBox(height: DesignTokens.space3),
            Semantics(
              liveRegion: true,
              child: Text(
                TextosDaDenuncia.coldStart,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.secondaryText,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _indisponivel(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          _alvo.ehResenha
              ? 'Esta resenha não está mais disponível'
              : 'Este comentário não está mais disponível',
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: DesignTokens.space3),
        Text(
          _alvo.ehResenha
              ? 'Ela pode ter sido excluída, ou o perfil de quem a escreveu mudou a privacidade. '
                    'Não há o que denunciar.'
              : 'Ele pode ter sido excluído, ou a atividade deixou de estar visível para você. '
                    'Não há o que denunciar.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.secondaryText,
          ),
        ),
        const SizedBox(height: DesignTokens.space6),
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(),
          style: OutlinedButton.styleFrom(
            foregroundColor: theme.colorScheme.onSurface,
            minimumSize: const Size.fromHeight(48),
            side: BorderSide(color: theme.divider),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(DesignTokens.radius),
            ),
          ),
          child: const Text(TextosDaDenuncia.fechar),
        ),
      ],
    );
  }

  Widget _descartar(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          TextosDaDenuncia.descartarTitulo,
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: DesignTokens.space3),
        Text(
          TextosDaDenuncia.descartarTexto,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.secondaryText,
          ),
        ),
        const SizedBox(height: DesignTokens.space6),
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(),
          style: OutlinedButton.styleFrom(
            foregroundColor: theme.colorScheme.error,
            minimumSize: const Size.fromHeight(48),
            side: BorderSide(color: theme.colorScheme.error),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(DesignTokens.radius),
            ),
          ),
          child: const Text(TextosDaDenuncia.descartar),
        ),
        const SizedBox(height: DesignTokens.space3),
        BotaoTextual(
          texto: TextosDaDenuncia.continuar,
          neutro: true,
          larguraTotal: true,
          onPressed: () => setState(() => _passo = _Passo.motivo),
        ),
      ],
    );
  }
}

/// Card do conteúdo denunciado (denunciar.md §4, passo 1): autoria e trecho de até três linhas.
/// Resenha em Newsreader com a formatação do original; comentário em Manrope, como texto.
class _CardDoConteudo extends StatelessWidget {
  final AlvoDaDenuncia alvo;

  const _CardDoConteudo({required this.alvo});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final Widget trecho;
    if (alvo.ehResenha && alvo.spoiler) {
      trecho = Text(
        TextosDaDenuncia.spoiler,
        style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
      );
    } else if (alvo.ehResenha) {
      trecho = Text.rich(
        TextSpan(
          style: theme.editorialBody,
          children: spansDosTrechos(trechoCorrido(alvo.texto)),
        ),
        maxLines: 3,
        overflow: TextOverflow.ellipsis,
      );
    } else {
      trecho = Text(
        alvo.texto,
        maxLines: 3,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.bodyMedium,
      );
    }
    return Container(
      padding: const EdgeInsets.all(DesignTokens.space4),
      decoration: BoxDecoration(
        color: theme.isDark ? theme.pageBackground : theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              AvatarLeitor(
                url: alvo.autorAvatarUrl,
                nome: alvo.autorNome,
                tamanho: 32,
              ),
              const SizedBox(width: DesignTokens.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      alvo.autorNome,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      alvo.ehResenha
                          ? 'Resenha de ${alvo.livroTitulo}'
                          : 'Resposta em ${alvo.livroTitulo}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.secondaryText,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.space3),
          trecho,
        ],
      ),
    );
  }
}

/// `DotsThree` de 20px em `grafite` da resenha de outra pessoa (pagina-do-livro.md P2 e
/// livro-pessoal.md, lote 7): abre a folha de ações com `Denunciar resenha` em `rubi`.
class MenuDaResenhaDeOutraPessoa extends StatelessWidget {
  final SocialService social;
  final AlvoDaDenuncia alvo;

  const MenuDaResenhaDeOutraPessoa({
    super.key,
    required this.social,
    required this.alvo,
  });

  Future<void> _abrir(BuildContext context) async {
    final escolha = await escolherNaFolha(context, const <AcaoDaFolha>[
      AcaoDaFolha(
        valor: 'denunciar',
        icone: PhosphorIconsRegular.flag,
        rotulo: TextosDaDenuncia.denunciarResenha,
        destrutiva: true,
      ),
    ]);
    if (escolha == 'denunciar' && context.mounted) {
      await abrirDenuncia(context, social: social, alvo: alvo);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return IconButton(
      tooltip: 'Mais ações da resenha',
      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
      onPressed: () => _abrir(context),
      icon: Icon(
        PhosphorIconsRegular.dotsThree,
        size: 20,
        color: theme.secondaryText,
      ),
    );
  }
}
