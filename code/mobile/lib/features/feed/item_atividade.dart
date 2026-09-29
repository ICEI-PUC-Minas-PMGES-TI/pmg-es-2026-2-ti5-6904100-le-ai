import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/estrelas_de_nota.dart';
import '../livros/formatos.dart';
import '../perfil/textos.dart';
import '../perfil/widgets_de_perfil.dart';
import 'social_service.dart';
import 'verbos.dart';

/// Item de atividade do feed (feed.md §4, design §4.9): a mesma estrutura para os cinco tipos,
/// que se distinguem só pelo verbo. O item só emite a intenção; a tela decide o que fazer.
class ItemAtividade extends StatelessWidget {
  final Atividade atividade;
  final VoidCallback aoCurtir;
  final VoidCallback aoDescurtir;
  final VoidCallback aoComentar;
  final VoidCallback aoAbrirAutor;
  final VoidCallback aoAbrirLivro;

  const ItemAtividade({
    super.key,
    required this.atividade,
    required this.aoCurtir,
    required this.aoDescurtir,
    required this.aoComentar,
    required this.aoAbrirAutor,
    required this.aoAbrirLivro,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final livro = atividade.livro;
    final resenha = atividade.resenha;
    final verbo = verboDeAtividade(atividade.tipo);
    final tempo = tempoDeEspera(atividade.criadoEm.toLocal());
    return Container(
      padding: const EdgeInsets.all(DesignTokens.space5),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: theme.divider))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              InkWell(
                onTap: aoAbrirAutor,
                customBorder: const CircleBorder(),
                child: ExcludeSemantics(
                  child: AvatarLeitor(
                    url: atividade.autor.avatarUrl,
                    nome: atividade.autor.nomeExibicao,
                    tamanho: 40,
                  ),
                ),
              ),
              const SizedBox(width: DesignTokens.space3),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    children: <InlineSpan>[
                      WidgetSpan(
                        alignment: PlaceholderAlignment.baseline,
                        baseline: TextBaseline.alphabetic,
                        child: GestureDetector(
                          onTap: aoAbrirAutor,
                          child: Text(atividade.autor.nomeExibicao, style: theme.textTheme.titleMedium),
                        ),
                      ),
                      TextSpan(text: ' · $tempo', style: theme.textTheme.bodySmall),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.space2),
          Text(
            verbo,
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
          ),
          const SizedBox(height: DesignTokens.space3),
          InkWell(
            onTap: aoAbrirLivro,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                CapaLivro(url: livro.capaUrl, largura: 80, altura: 120),
                const SizedBox(width: DesignTokens.space4),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        livro.titulo,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium,
                      ),
                      if (livro.autor.isNotEmpty)
                        Text(
                          livro.autor,
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                        ),
                      if (livro.pessoal) ...<Widget>[
                        const SizedBox(height: DesignTokens.space2),
                        const _ChipLivroPessoal(),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (resenha != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space3),
            if (resenha.nota != null) ...<Widget>[
              Semantics(
                label: '${formatarNota(resenha.nota!)} de 5',
                excludeSemantics: true,
                child: Row(
                  children: <Widget>[
                    EstrelasDeNota(valor: resenha.nota, tamanho: 16),
                    const SizedBox(width: DesignTokens.space2),
                    Text(
                      formatarNota(resenha.nota!),
                      style: theme.numInline.copyWith(
                        fontSize: theme.textTheme.bodySmall?.fontSize,
                        color: theme.secondaryText,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: DesignTokens.space2),
            ],
            Semantics(
              hint: 'Trecho truncado',
              child: Text(
                resenha.texto,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: theme.editorialBody.copyWith(color: theme.secondaryText),
              ),
            ),
            // A página de resenha é de F-AVA; até lá, o botão existe sem destino. O respiro dos lados
            // é do realce do toque; o deslocamento mantém o texto alinhado ao trecho da resenha.
            Transform.translate(
              offset: const Offset(-DesignTokens.space3, 0),
              child: TextButton(
                onPressed: () {},
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space3),
                  minimumSize: const Size(0, 48),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  foregroundColor: theme.primaryAccent,
                  textStyle: theme.textTheme.bodySmall,
                ),
                child: const Text('Ler resenha'),
              ),
            ),
          ],
          const SizedBox(height: DesignTokens.space4),
          Row(
            children: <Widget>[
              _BotaoDeAcao(
                rotulo:
                    '${atividade.curtidaPeloSolicitante ? 'Descurtir' : 'Curtir'}, '
                    '${contagem(atividade.totalCurtidas, 'curtida', 'curtidas')}',
                ativo: atividade.curtidaPeloSolicitante,
                aoTocar: atividade.curtidaPeloSolicitante ? aoDescurtir : aoCurtir,
                icone: _CoracaoDeCurtida(curtida: atividade.curtidaPeloSolicitante),
                numero: atividade.totalCurtidas,
              ),
              const SizedBox(width: DesignTokens.space3),
              _BotaoDeAcao(
                rotulo: atividade.totalComentarios == 0
                    ? 'Comentar'
                    : contagem(atividade.totalComentarios, 'comentário', 'comentários'),
                ativo: false,
                aoTocar: aoComentar,
                icone: Icon(PhosphorIconsRegular.chatCircle, size: 20, color: theme.secondaryText),
                numero: atividade.totalComentarios,
              ),
              const Spacer(),
              if (atividade.totalCurtidas > 0)
                ExcludeSemantics(
                  child: Text(
                    contagem(atividade.totalCurtidas, 'curtida', 'curtidas'),
                    style: theme.textTheme.bodySmall,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ChipLivroPessoal extends StatelessWidget {
  const _ChipLivroPessoal();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DesignTokens.space3,
        vertical: DesignTokens.space1,
      ),
      decoration: BoxDecoration(
        color: theme.elevatedSurface,
        border: Border.all(color: theme.divider),
        borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(PhosphorIconsRegular.bookmarkSimple, size: 16, color: theme.secondaryText),
          const SizedBox(width: DesignTokens.space1),
          Text(
            'Livro pessoal',
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: theme.secondaryText,
            ),
          ),
        ],
      ),
    );
  }
}

/// Pill de 32px com borda `linha` (feed.md §4); a área tocável vai a 48px sem mudar o desenho.
class _BotaoDeAcao extends StatelessWidget {
  final String rotulo;
  final bool ativo;
  final VoidCallback? aoTocar;
  final Widget icone;
  final int numero;

  const _BotaoDeAcao({
    required this.rotulo,
    required this.ativo,
    required this.aoTocar,
    required this.icone,
    required this.numero,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = ativo ? theme.primaryAccent : theme.secondaryText;
    return Semantics(
      button: true,
      enabled: aoTocar != null,
      label: rotulo,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: aoTocar,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Center(
            widthFactor: 1,
            child: Opacity(
              opacity: aoTocar == null ? 0.6 : 1,
              child: Container(
                height: 32,
                padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space3),
                decoration: BoxDecoration(
                  border: Border.all(color: theme.divider),
                  borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    icone,
                    if (numero > 0) ...<Widget>[
                      const SizedBox(width: DesignTokens.space1),
                      Text('$numero', style: theme.textTheme.bodySmall?.copyWith(color: cor)),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Coração de curtir. Por decisão do produto (igual à web), ao passar a curtido pulsa até 1.15
/// e solta seis partículas em `musgo`, contrariando feed.md §4.2.
class _CoracaoDeCurtida extends StatefulWidget {
  final bool curtida;

  const _CoracaoDeCurtida({required this.curtida});

  @override
  State<_CoracaoDeCurtida> createState() => _CoracaoDeCurtidaState();
}

class _CoracaoDeCurtidaState extends State<_CoracaoDeCurtida> with SingleTickerProviderStateMixin {
  late final AnimationController _controle = AnimationController(
    vsync: this,
    duration: DesignTokens.durBase,
  );

  static final Animatable<double> _escala = TweenSequence<double>(<TweenSequenceItem<double>>[
    TweenSequenceItem<double>(tween: Tween<double>(begin: 1, end: 1.15), weight: 35),
    TweenSequenceItem<double>(tween: Tween<double>(begin: 1.15, end: 1), weight: 65),
  ]).chain(CurveTween(curve: DesignTokens.easeOut));

  @override
  void didUpdateWidget(_CoracaoDeCurtida antigo) {
    super.didUpdateWidget(antigo);
    if (widget.curtida && !antigo.curtida) {
      _controle.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _controle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final icone = Icon(
      widget.curtida ? PhosphorIconsFill.heart : PhosphorIconsRegular.heart,
      size: 20,
      color: widget.curtida ? theme.primaryAccent : theme.secondaryText,
    );
    return AnimatedBuilder(
      animation: _controle,
      builder: (context, filho) => CustomPaint(
        foregroundPainter: _controle.isAnimating
            ? _Particulas(progresso: _controle.value, cor: theme.primaryAccent)
            : null,
        child: Transform.scale(scale: _escala.evaluate(_controle), child: filho),
      ),
      child: icone,
    );
  }
}

class _Particulas extends CustomPainter {
  static const int _total = 6;
  static const double _raio = 2;

  final double progresso;
  final Color cor;

  const _Particulas({required this.progresso, required this.cor});

  @override
  void paint(Canvas canvas, Size size) {
    final centro = size.center(Offset.zero);
    // Mesma trajetória da web: sai a 10px do centro, chega a 18px em 60% e some a 20px.
    final distancia = progresso < 0.6 ? 10 + 8 * (progresso / 0.6) : 18 + 2 * ((progresso - 0.6) / 0.4);
    final fim = progresso < 0.6 ? 1.0 : 1 - (progresso - 0.6) / 0.4;
    final pincel = Paint()..color = cor.withValues(alpha: fim);
    for (var i = 0; i < _total; i++) {
      final angulo = 2 * math.pi * i / _total - math.pi / 2;
      canvas.drawCircle(
        centro + Offset(math.cos(angulo), math.sin(angulo)) * distancia,
        _raio * fim,
        pincel,
      );
    }
  }

  @override
  bool shouldRepaint(_Particulas antigo) => antigo.progresso != progresso || antigo.cor != cor;
}
