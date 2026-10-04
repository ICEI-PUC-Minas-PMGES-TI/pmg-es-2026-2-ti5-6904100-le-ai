import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/estado_vazio.dart';
import '../../design/widgets/folha_inferior.dart';
import '../feed/social_service.dart';
import '../perfil/textos.dart';
import '../perfil/widgets_de_perfil.dart';
import 'recomendar_controller.dart';

class LivroRecomendado {
  final String id;
  final String titulo;
  final String? autor;
  final String? detalhes;
  final String? capaUrl;

  const LivroRecomendado({
    required this.id,
    required this.titulo,
    required this.autor,
    required this.detalhes,
    required this.capaUrl,
  });
}

// Rota raiz: a barra de envio fixa ocupa o lugar da barra inferior do shell.
Future<String?> abrirRecomendar(
  BuildContext context, {
  required SocialService social,
  required LivroRecomendado livro,
  required VoidCallback aoBuscarLeitores,
}) {
  return Navigator.of(context, rootNavigator: true).push<String>(
    MaterialPageRoute<String>(
      fullscreenDialog: true,
      builder: (_) =>
          RecomendarLivroPage(social: social, livro: livro, aoBuscarLeitores: aoBuscarLeitores),
    ),
  );
}

const Map<MotivoBloqueio, ({String texto, String anuncio, IconData icone})> _motivos =
    <MotivoBloqueio, ({String texto, String anuncio, IconData icone})>{
      MotivoBloqueio.jaTemLivro: (
        texto: 'Já tem esse livro em sua estante',
        anuncio: 'já tem esse livro em sua estante',
        icone: PhosphorIconsRegular.bookmarkSimple,
      ),
      MotivoBloqueio.limiteAtingido: (
        texto: 'Limite de recomendações para esta pessoa',
        anuncio: 'limite de recomendações para esta pessoa',
        icone: PhosphorIconsRegular.prohibit,
      ),
      MotivoBloqueio.semMutuo: (
        texto: 'Não segue mais você de volta',
        anuncio: 'não segue mais você de volta',
        icone: PhosphorIconsRegular.userMinus,
      ),
      MotivoBloqueio.jaRecomendado: (
        texto: 'Já tem uma recomendação sua deste livro',
        anuncio: 'já tem uma recomendação sua deste livro',
        icone: PhosphorIconsRegular.bookmarkSimple,
      ),
    };

class RecomendarLivroPage extends StatefulWidget {
  final SocialService social;
  final LivroRecomendado livro;
  final VoidCallback aoBuscarLeitores;

  const RecomendarLivroPage({
    super.key,
    required this.social,
    required this.livro,
    required this.aoBuscarLeitores,
  });

  @override
  State<RecomendarLivroPage> createState() => _RecomendarLivroPageState();
}

class _RecomendarLivroPageState extends State<RecomendarLivroPage> {
  late final RecomendarController _tela = RecomendarController(widget.social, widget.livro.id);
  final TextEditingController _busca = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tela.carregar();
  }

  @override
  void dispose() {
    _tela.dispose();
    _busca.dispose();
    super.dispose();
  }

  Future<void> _fechar() async {
    if (_tela.enviando) {
      return;
    }
    if (_tela.alterado && !_tela.podeConcluir) {
      final descartar = await confirmarAcaoDestrutiva(
        context,
        titulo: 'Descartar esta recomendação?',
        texto: 'A mensagem e os leitores escolhidos não serão guardados. Ninguém recebe nada.',
        acao: 'Descartar',
        cancelar: 'Continuar editando',
      );
      if (!descartar || !mounted) {
        return;
      }
    }
    Navigator.of(context).pop();
  }

  Future<void> _enviarOuConcluir() async {
    if (_tela.podeConcluir) {
      Navigator.of(context).pop();
      return;
    }
    final aviso = await _tela.enviar();
    if (aviso != null && mounted) {
      Navigator.of(context).pop(aviso);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _fechar();
        }
      },
      child: Scaffold(
        body: ListenableBuilder(
          listenable: _tela,
          builder: (context, _) => Column(
            children: <Widget>[
              CabecalhoTela(titulo: 'Recomendar', aoVoltar: _fechar, fechar: true, comSino: false),
              Expanded(child: _corpo(Theme.of(context))),
              if (!_tela.semMutuos) _barraDeEnvio(Theme.of(context)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _corpo(ThemeData theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        DesignTokens.space5,
        DesignTokens.space4,
        DesignTokens.space5,
        DesignTokens.space6,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          if (_tela.falha != null || _tela.avisoParcial != null) ...<Widget>[
            _avisoDoEnvio(),
            const SizedBox(height: DesignTokens.space4),
          ],
          _CartaoDoLivro(livro: widget.livro),
          if (_tela.semMutuos)
            Padding(
              padding: const EdgeInsets.only(top: DesignTokens.space10),
              child: EstadoVazio(
                icone: PhosphorIconsRegular.usersThree,
                solto: true,
                titulo: 'Ninguém para recomendar ainda',
                texto:
                    'Recomendações são trocadas entre leitores que se seguem. Quando alguém que você '
                    'segue seguir você de volta, essa pessoa aparece aqui.',
                rodape: BotaoPrimario(
                  texto: 'Buscar leitores',
                  larguraTotal: false,
                  onPressed: () {
                    Navigator.of(context).pop();
                    widget.aoBuscarLeitores();
                  },
                ),
              ),
            )
          else ...<Widget>[
            const SizedBox(height: DesignTokens.space6),
            _CampoDaMensagem(tela: _tela),
            const SizedBox(height: DesignTokens.space6),
            ..._paraQuem(theme),
          ],
        ],
      ),
    );
  }

  Widget _avisoDoEnvio() {
    return switch (_tela.falha) {
      FalhaDoEnvio.conexao => const BannerAviso(
        variante: VarianteAviso.erro,
        triangulo: true,
        mensagem: 'Não foi possível enviar a recomendação. Verifique sua conexão e tente de novo.',
      ),
      FalhaDoEnvio.frequencia => const BannerAviso(
        variante: VarianteAviso.alerta,
        icone: PhosphorIconsRegular.clock,
        mensagem:
            'Você enviou muitas recomendações em pouco tempo. Espere alguns minutos e tente de novo.',
      ),
      null => BannerAviso(
        variante: VarianteAviso.alerta,
        icone: PhosphorIconsRegular.info,
        mensagem: _tela.avisoParcial!,
      ),
    };
  }

  List<Widget> _paraQuem(ThemeData theme) {
    final escolhidos = _tela.selecionados.isEmpty
        ? 'Nenhum escolhido'
        : contagem(_tela.selecionados.length, 'escolhido', 'escolhidos');
    return <Widget>[
      Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: <Widget>[
          Expanded(child: Text('Para quem', style: theme.textTheme.titleMedium)),
          if (_tela.estado == EstadoDosLeitores.pronta)
            Semantics(
              liveRegion: true,
              child: Text(
                escolhidos,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ),
        ],
      ),
      const SizedBox(height: DesignTokens.space2),
      Text(
        'Aparecem aqui os leitores que você segue e que seguem você.',
        style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
      ),
      ...switch (_tela.estado) {
        EstadoDosLeitores.carregando => <Widget>[
          EntradaSuave(child: _Esqueleto(coldStart: _tela.coldStart)),
        ],
        EstadoDosLeitores.erro => <Widget>[
          const SizedBox(height: DesignTokens.space4),
          BannerAviso(
            variante: VarianteAviso.erro,
            triangulo: true,
            mensagem:
                'Não foi possível carregar seus leitores. Verifique sua conexão e tente de novo.',
            acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _tela.carregar),
          ),
        ],
        EstadoDosLeitores.pronta => _lista(theme),
      },
    ];
  }

  List<Widget> _lista(ThemeData theme) {
    final filtrados = _tela.filtrados;
    return <Widget>[
      const SizedBox(height: DesignTokens.space4),
      Text(
        'Buscar entre eles',
        style: theme.textTheme.labelMedium?.copyWith(color: theme.secondaryText),
      ),
      const SizedBox(height: DesignTokens.space2),
      TextField(
        controller: _busca,
        onChanged: _tela.alterarBusca,
        autocorrect: false,
        enableSuggestions: false,
        textInputAction: TextInputAction.search,
        style: theme.textTheme.bodyMedium,
        decoration: InputDecoration(
          hintText: 'Nome ou @username',
          prefixIcon: Icon(
            PhosphorIconsRegular.magnifyingGlass,
            size: 20,
            color: theme.tertiaryText,
          ),
          suffixIcon: _tela.busca.isEmpty
              ? null
              : IconButton(
                  tooltip: 'Limpar busca',
                  onPressed: () {
                    _busca.clear();
                    _tela.alterarBusca('');
                  },
                  icon: Icon(PhosphorIconsRegular.x, size: 20, color: theme.secondaryText),
                ),
        ),
      ),
      const SizedBox(height: DesignTokens.space3),
      if (filtrados.isEmpty)
        Text(
          'Ninguém com esse nome entre os leitores que você segue e que seguem você.',
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
        )
      else
        for (final candidato in filtrados) ...<Widget>[
          Divider(height: 1, color: theme.divider),
          _LinhaDeLeitor(
            candidato: candidato,
            situacao: _tela.situacao(candidato),
            marcado: _tela.selecionados.contains(candidato.leitor.id),
            aoAlternar: () => _tela.alternar(candidato),
          ),
        ],
    ];
  }

  Widget _barraDeEnvio(ThemeData theme) {
    final total = _tela.selecionados.length;
    final rotulo = _tela.enviando
        ? 'Enviando recomendação'
        : _tela.podeConcluir
        ? 'Concluir'
        : total == 0
        ? 'Enviar recomendação'
        : 'Enviar para ${contagem(total, 'leitor', 'leitores')}';
    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.pageBackground,
        border: Border(top: BorderSide(color: theme.divider)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: DesignTokens.space5,
            vertical: DesignTokens.space4,
          ),
          child: BotaoPrimario(
            texto: rotulo,
            icone: _tela.podeConcluir ? null : PhosphorIconsRegular.paperPlaneTilt,
            desabilitadoNeutro: true,
            carregando: _tela.enviando,
            onPressed: _tela.podeEnviar || _tela.podeConcluir ? _enviarOuConcluir : null,
          ),
        ),
      ),
    );
  }
}

class _CartaoDoLivro extends StatelessWidget {
  final LivroRecomendado livro;

  const _CartaoDoLivro({required this.livro});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(DesignTokens.space5),
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        borderRadius: BorderRadius.circular(DesignTokens.radiusLg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          CapaLivro(url: livro.capaUrl, largura: 60, altura: 90),
          const SizedBox(width: DesignTokens.space4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(livro.titulo, style: theme.textTheme.titleMedium),
                if (livro.autor != null)
                  Text(
                    livro.autor!,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                  ),
                if (livro.detalhes != null) ...<Widget>[
                  const SizedBox(height: DesignTokens.space2),
                  Text(
                    livro.detalhes!,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CampoDaMensagem extends StatelessWidget {
  final RecomendarController tela;

  const _CampoDaMensagem({required this.tela});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final excede = tela.mensagemExcede;
    final corDoAviso = excede ? theme.colorScheme.error : theme.secondaryText;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(
          'Mensagem (opcional)',
          style: theme.textTheme.labelMedium?.copyWith(color: theme.secondaryText),
        ),
        const SizedBox(height: DesignTokens.space2),
        TextField(
          onChanged: tela.alterarMensagem,
          minLines: 3,
          maxLines: 5,
          textCapitalization: TextCapitalization.sentences,
          style: theme.textTheme.bodyMedium,
          decoration: InputDecoration(
            hintText: 'Conte por que esse livro combina com a pessoa',
            enabledBorder: excede
                ? OutlineInputBorder(
                    borderRadius: BorderRadius.circular(DesignTokens.radius),
                    borderSide: BorderSide(color: theme.colorScheme.error, width: 1.5),
                  )
                : null,
          ),
        ),
        const SizedBox(height: DesignTokens.space2),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Expanded(
              child: Text(
                excede
                    ? 'A mensagem passou do limite de 280 caracteres.'
                    : 'Todos os escolhidos recebem a mesma mensagem.',
                style: theme.textTheme.bodySmall?.copyWith(color: corDoAviso),
              ),
            ),
            const SizedBox(width: DesignTokens.space4),
            Semantics(
              liveRegion: excede,
              child: Text(
                '${tela.caracteres} de $limiteDaMensagem caracteres',
                style: theme.numInline.copyWith(
                  fontSize: theme.textTheme.bodySmall?.fontSize,
                  height: theme.textTheme.bodySmall?.height,
                  color: excede ? theme.colorScheme.error : theme.secondaryText,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _LinhaDeLeitor extends StatelessWidget {
  final CandidatoARecomendacao candidato;
  final SituacaoDoLeitor situacao;
  final bool marcado;
  final VoidCallback aoAlternar;

  const _LinhaDeLeitor({
    required this.candidato,
    required this.situacao,
    required this.marcado,
    required this.aoAlternar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final leitor = candidato.leitor;
    final (rotulo, linhaDeBaixo, direita) = switch (situacao) {
      Disponivel() => (
        '${leitor.nomeExibicao}, @${leitor.username}, ${marcado ? 'selecionada' : 'não selecionada'}',
        Text(
          '@${leitor.username}',
          style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
        ),
        _CaixaDeSelecao(marcada: marcado),
      ),
      Enviada() => (
        '${leitor.nomeExibicao}, recomendação enviada',
        Text(
          'Recomendação enviada',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.primaryAccent,
            fontWeight: FontWeight.w600,
          ),
        ),
        Icon(PhosphorIconsBold.check, size: 20, color: theme.primaryAccent),
      ),
      Indisponivel(:final motivo) => (
        '${leitor.nomeExibicao}, ${_motivos[motivo]!.anuncio}, indisponível',
        Row(
          children: <Widget>[
            Icon(_motivos[motivo]!.icone, size: 16, color: theme.secondaryText),
            const SizedBox(width: DesignTokens.space1),
            Flexible(
              child: Text(
                _motivos[motivo]!.texto,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ),
          ],
        ),
        null,
      ),
    };
    final disponivel = situacao is Disponivel;
    return Semantics(
      label: rotulo,
      checked: disponivel ? marcado : null,
      excludeSemantics: true,
      child: InkWell(
        onTap: disponivel ? aoAlternar : null,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 64),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: DesignTokens.space3),
            child: Row(
              children: <Widget>[
                Opacity(
                  opacity: situacao is Indisponivel ? 0.5 : 1,
                  child: AvatarLeitor(
                    url: leitor.avatarUrl,
                    nome: leitor.nomeExibicao,
                    tamanho: 40,
                  ),
                ),
                const SizedBox(width: DesignTokens.space3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        leitor.nomeExibicao,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: situacao is Indisponivel ? theme.secondaryText : null,
                        ),
                      ),
                      linhaDeBaixo,
                    ],
                  ),
                ),
                ?direita,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CaixaDeSelecao extends StatelessWidget {
  final bool marcada;

  const _CaixaDeSelecao({required this.marcada});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AnimatedContainer(
      duration: DesignTokens.durFast,
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        color: marcada ? theme.primaryAccent : Colors.transparent,
        borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        border: marcada ? null : Border.all(color: theme.secondaryText, width: 1.5),
      ),
      child: marcada
          ? Icon(PhosphorIconsBold.check, size: 16, color: theme.colorScheme.onPrimary)
          : null,
    );
  }
}

class _Esqueleto extends StatelessWidget {
  final bool coldStart;

  const _Esqueleto({required this.coldStart});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget barra(double fracao, double altura) => FractionallySizedBox(
      widthFactor: fracao,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: theme.coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const SizedBox(height: DesignTokens.space3),
        for (var i = 0; i < 4; i++) ...<Widget>[
          Divider(height: 1, color: theme.divider),
          SizedBox(
            height: 64,
            child: Row(
              children: <Widget>[
                CircleAvatar(radius: 20, backgroundColor: theme.coverPlaceholder),
                const SizedBox(width: DesignTokens.space3),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      barra(0.45, 15),
                      const SizedBox(height: DesignTokens.space2),
                      barra(0.3, 13),
                    ],
                  ),
                ),
                Container(width: 24, height: 24, color: theme.coverPlaceholder),
              ],
            ),
          ),
        ],
        if (coldStart)
          Padding(
            padding: const EdgeInsets.only(top: DesignTokens.space3),
            child: Text(
              'O serviço está iniciando. Isso pode levar alguns segundos.',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          ),
      ],
    );
  }
}
