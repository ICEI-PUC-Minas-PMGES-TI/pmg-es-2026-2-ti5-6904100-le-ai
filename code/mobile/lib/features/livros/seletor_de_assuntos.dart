import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/folha_inferior.dart';
import 'livro_oficial.dart';
import 'seletor_de_assuntos_controller.dart';

/// Abre o seletor de assuntos (cadastro-pessoal.md §5.1 a §5.5) e devolve a seleção do
/// `Concluir`, em ordem alfabética. `null` quando a folha fecha de outro jeito (scrim, arrastar,
/// voltar, `Fechar` na falha): as mudanças feitas nela são descartadas, sem confirmação.
///
/// Pelo navegador raiz, porque a folha tem campo de texto: dentro da aba, o `Scaffold` do shell
/// consome a altura do teclado e a folha fica espremida (AGENTS do mobile).
Future<List<AssuntoResumo>?> escolherAssuntos(
  BuildContext context, {
  required SeletorDeAssuntosController controller,
  required List<AssuntoResumo> atuais,
}) {
  controller.abrir(atuais);
  return mostrarFolhaInferior<List<AssuntoResumo>>(
    Navigator.of(context, rootNavigator: true).context,
    builder: (context) => FolhaDeAssuntos(controller: controller),
  );
}

String _contagemEscolhidos(int n) => switch (n) {
  0 => 'Nenhum escolhido',
  1 => '1 escolhido',
  _ => '$n escolhidos',
};

String _contagemResultados(int n) => n == 1 ? '1 assunto' : '$n assuntos';

class FolhaDeAssuntos extends StatefulWidget {
  final SeletorDeAssuntosController controller;

  const FolhaDeAssuntos({super.key, required this.controller});

  @override
  State<FolhaDeAssuntos> createState() => _FolhaDeAssuntosState();
}

class _FolhaDeAssuntosState extends State<FolhaDeAssuntos> {
  final _busca = TextEditingController();
  final _focoDoTentarDeNovo = FocusNode();
  late EstadoDaListaDeAssuntos _estadoAnterior;

  SeletorDeAssuntosController get _c => widget.controller;

  @override
  void initState() {
    super.initState();
    _estadoAnterior = _c.estado;
    _busca.text = _c.busca;
    _c.addListener(_aoMudar);
  }

  @override
  void dispose() {
    _c.removeListener(_aoMudar);
    _busca.dispose();
    _focoDoTentarDeNovo.dispose();
    super.dispose();
  }

  void _aoMudar() {
    if (!mounted) {
      return;
    }
    final estado = _c.estado;
    // A falha leva o foco a `Tentar de novo` (§9).
    if (estado == EstadoDaListaDeAssuntos.erro && _estadoAnterior != estado) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _focoDoTentarDeNovo.canRequestFocus) {
          _focoDoTentarDeNovo.requestFocus();
        }
      });
    }
    _estadoAnterior = estado;
    setState(() {});
  }

  void _limparBusca() {
    _busca.clear();
    _c.buscar('');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final estado = _c.estado;
    final pronto = estado == EstadoDaListaDeAssuntos.pronto;
    // Até 85% da viewport, descontados a alça e os paddings da folha (§5.1).
    final media = MediaQuery.of(context);
    final alturaMaxima =
        media.size.height * 0.85 -
        DesignTokens.space3 -
        4 -
        DesignTokens.space5 -
        DesignTokens.space6 -
        media.padding.bottom;

    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: alturaMaxima < 200 ? 200 : alturaMaxima),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: <Widget>[
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text('Assuntos', style: theme.textTheme.titleMedium),
                ),
              ),
              if (pronto)
                Text(
                  _contagemEscolhidos(_c.quantidade),
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                ),
            ],
          ),
          const SizedBox(height: DesignTokens.space2),
          Text(
            'Os assuntos vêm de uma lista fixa do Lê Ai.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
          const SizedBox(height: DesignTokens.space4),
          // O título da folha é o label visível; o leitor de tela ouve `Buscar assunto`.
          Semantics(
            label: 'Buscar assunto',
            child: CampoTexto(
              controller: _busca,
              label: '',
              placeholder: 'Buscar assunto',
              icone: PhosphorIconsRegular.magnifyingGlass,
              enabled: pronto,
              onChanged: _c.buscar,
              trailing: pronto && _busca.text.isNotEmpty
                  ? IconButton(
                      tooltip: 'Limpar busca',
                      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                      icon: Icon(PhosphorIconsRegular.x, size: 20, color: theme.secondaryText),
                      onPressed: _limparBusca,
                    )
                  : null,
            ),
          ),
          const SizedBox(height: DesignTokens.space4),
          Flexible(child: _corpo(theme, estado)),
          Divider(height: 1, color: theme.divider),
          Padding(
            padding: const EdgeInsets.only(top: DesignTokens.space4),
            child: _rodape(estado),
          ),
        ],
      ),
    );
  }

  Widget _corpo(ThemeData theme, EstadoDaListaDeAssuntos estado) {
    switch (estado) {
      case EstadoDaListaDeAssuntos.carregando:
        return SingleChildScrollView(child: _Carregando(coldStart: _c.coldStart));
      case EstadoDaListaDeAssuntos.erro:
        return SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: DesignTokens.space4),
          child: _Falha(foco: _focoDoTentarDeNovo, aoTentarDeNovo: _c.carregar),
        );
      case EstadoDaListaDeAssuntos.pronto:
        final visiveis = _c.visiveis;
        final termo = _busca.text.trim();
        if (visiveis.isEmpty) {
          return SingleChildScrollView(
            padding: const EdgeInsets.only(top: DesignTokens.space2, bottom: DesignTokens.space4),
            child: Semantics(
              liveRegion: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Nenhum assunto com "$termo".', style: theme.textTheme.labelLarge),
                  const SizedBox(height: DesignTokens.space2),
                  Text(
                    'A lista é fixa: escolha o assunto mais próximo, como Ficção literária ou '
                    'Fantasia.',
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                  ),
                ],
              ),
            ),
          );
        }
        return ShaderMask(
          // Fade de 24px de `papel` sobre a borda inferior da área que rola (§5.1, item 4).
          blendMode: BlendMode.dstIn,
          shaderCallback: (area) {
            final inicioDoFade = area.height <= 24 ? 0.0 : (area.height - 24) / area.height;
            return LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: const <Color>[Color(0xFF000000), Color(0xFF000000), Color(0x00000000)],
              stops: <double>[0, inicioDoFade, 1],
            ).createShader(area);
          },
          child: SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: DesignTokens.space6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                if (termo.isNotEmpty) ...<Widget>[
                  Semantics(
                    liveRegion: true,
                    child: Text(
                      _contagemResultados(visiveis.length),
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    ),
                  ),
                  const SizedBox(height: DesignTokens.space1),
                ],
                Wrap(
                  spacing: DesignTokens.space2,
                  children: <Widget>[
                    for (final assunto in visiveis)
                      ChipDeEscolhaDeAssunto(
                        nome: assunto.nome,
                        marcado: _c.marcado(assunto.id),
                        aoAlternar: () => _c.alternar(assunto),
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
    }
  }

  Widget _rodape(EstadoDaListaDeAssuntos estado) {
    final pronto = estado == EstadoDaListaDeAssuntos.pronto;
    return Row(
      children: <Widget>[
        if (pronto && _c.quantidade > 0)
          BotaoTextual(texto: 'Limpar', neutro: true, onPressed: _c.limpar),
        const Spacer(),
        if (estado == EstadoDaListaDeAssuntos.erro)
          BotaoTextual(texto: 'Fechar', neutro: true, onPressed: () => Navigator.of(context).pop())
        else
          Opacity(
            opacity: pronto ? 1 : 0.4,
            child: BotaoPrimario(
              texto: 'Concluir',
              larguraTotal: false,
              onPressed: pronto ? () => Navigator.of(context).pop(_c.selecao) : null,
            ),
          ),
      ],
    );
  }
}

/// Chip marcável do seletor: uma caixa de marcar para o leitor de tela (`checked`), com o
/// `Check` e o peso 600 no ativo, para a seleção não depender só da cor (§9). Visual de 32px,
/// alvo de 48px.
class ChipDeEscolhaDeAssunto extends StatelessWidget {
  final String nome;
  final bool marcado;
  final VoidCallback aoAlternar;

  const ChipDeEscolhaDeAssunto({
    super.key,
    required this.nome,
    required this.marcado,
    required this.aoAlternar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final corDoTexto = marcado ? theme.primaryAccent : theme.colorScheme.onSurface;
    return Semantics(
      checked: marcado,
      label: nome,
      excludeSemantics: true,
      // Com `excludeSemantics`, o toque do filho some da árvore: vai aqui também.
      onTap: aoAlternar,
      child: GestureDetector(
        onTap: aoAlternar,
        behavior: HitTestBehavior.opaque,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Align(
            widthFactor: 1,
            child: AnimatedContainer(
              duration: DesignTokens.durFast,
              constraints: const BoxConstraints(minHeight: 32),
              padding: const EdgeInsets.symmetric(
                horizontal: DesignTokens.space3,
                vertical: DesignTokens.space1,
              ),
              decoration: BoxDecoration(
                color: marcado ? theme.accentTint : null,
                borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
                border: Border.all(color: marcado ? theme.accentTint : theme.divider),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  if (marcado) ...<Widget>[
                    Icon(PhosphorIconsRegular.check, size: 16, color: theme.primaryAccent),
                    const SizedBox(width: DesignTokens.space1),
                  ],
                  Flexible(
                    child: Text(
                      nome,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: corDoTexto,
                        fontWeight: marcado ? FontWeight.w600 : null,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Skeleton estático de três linhas de pílulas, com um único fade de entrada; sem spinner (§5.4).
class _Carregando extends StatelessWidget {
  final bool coldStart;

  const _Carregando({required this.coldStart});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget pilula(double largura) => Container(
      width: largura,
      height: 32,
      decoration: BoxDecoration(
        color: theme.divider,
        borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
      ),
    );
    Widget linha(List<double> larguras) => Padding(
      padding: const EdgeInsets.only(bottom: DesignTokens.space2),
      child: Wrap(
        spacing: DesignTokens.space2,
        children: <Widget>[for (final largura in larguras) pilula(largura)],
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Semantics(
          label: 'Carregando assuntos',
          liveRegion: true,
          child: ExcludeSemantics(
            child: EntradaSuave(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  linha(const <double>[88, 64, 104]),
                  linha(const <double>[72, 120, 56]),
                  linha(const <double>[96, 80]),
                ],
              ),
            ),
          ),
        ),
        if (coldStart) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          Text(
            'O serviço está iniciando. Isso pode levar alguns segundos.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
        ],
        const SizedBox(height: DesignTokens.space4),
      ],
    );
  }
}

/// A lista não carregou (§5.5). O assunto é opcional: a falha fica restrita à folha, e o
/// formulário por baixo continua salvando.
class _Falha extends StatelessWidget {
  final FocusNode foco;
  final VoidCallback aoTentarDeNovo;

  const _Falha({required this.foco, required this.aoTentarDeNovo});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Semantics(
          liveRegion: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(PhosphorIconsRegular.warningCircle, size: 24, color: theme.colorScheme.error),
              const SizedBox(height: DesignTokens.space3),
              Text('Não foi possível carregar os assuntos.', style: theme.textTheme.labelLarge),
              const SizedBox(height: DesignTokens.space2),
              Text(
                'Você pode salvar o livro agora e escolher os assuntos depois, em Editar livro.',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
              ),
            ],
          ),
        ),
        const SizedBox(height: DesignTokens.space4),
        OutlinedButton.icon(
          focusNode: foco,
          onPressed: aoTentarDeNovo,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(48, 48),
            foregroundColor: theme.colorScheme.onSurface,
            side: BorderSide(color: theme.divider),
            textStyle: theme.textTheme.labelLarge,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(DesignTokens.radius)),
            splashFactory: NoSplash.splashFactory,
          ),
          icon: const Icon(PhosphorIconsRegular.arrowClockwise, size: 20),
          label: const Text('Tentar de novo'),
        ),
      ],
    );
  }
}
