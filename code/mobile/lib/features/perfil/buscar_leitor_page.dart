import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/estado_vazio.dart';
import 'perfil_service.dart';
import 'widgets_de_perfil.dart';

final RegExp _formato = RegExp(r'^[A-Za-z0-9._]{3,30}$');

enum _Estado { aterrissagem, buscando, encontrado, vazio, erro }

/// Buscar leitor (RF-SOC-03), a partir do protótipo buscar-leitor, com a mesma lógica da web
/// (`BuscarLeitorView.vue`): zero ou um resultado, só por username inteiro (RNF-SEC-19/44),
/// buscado no envio e não a cada tecla (o servidor limita a 30 por minuto).
///
/// - O campo fica no próprio header, ao lado da seta, sem título nem sino.
/// - O card traz o chip de privacidade e a biografia em duas linhas, com a ilustração de leitor
///   abaixo; "nenhum leitor" troca o ícone pela arte do cachorro.
/// - Sem o estado de "consulta parcial": saber que `rafa` é parte de um nome exigiria o servidor
///   revelar que existem nomes começando assim, que é a enumeração proibida.
class BuscarLeitorPage extends StatefulWidget {
  final PerfilService servico;
  final VoidCallback? aoVoltar;
  final void Function(String username) aoAbrirPerfil;

  const BuscarLeitorPage({
    super.key,
    required this.servico,
    this.aoVoltar,
    required this.aoAbrirPerfil,
  });

  @override
  State<BuscarLeitorPage> createState() => _BuscarLeitorPageState();
}

class _BuscarLeitorPageState extends State<BuscarLeitorPage> {
  final _consulta = TextEditingController();
  _Estado _estado = _Estado.aterrissagem;
  PerfilResumo? _resultado;
  String? _erroDeFormato;
  String _mensagemDeErro = 'Não foi possível buscar agora. Verifique sua conexão e tente de novo.';
  bool _coldStart = false;
  Timer? _timer;
  int _buscaAtual = 0;

  @override
  void initState() {
    super.initState();
    _consulta.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _timer?.cancel();
    _consulta.dispose();
    super.dispose();
  }

  Future<void> _buscar() async {
    final username = _consulta.text.trim().replaceFirst(RegExp('^@'), '');
    if (username.isEmpty) {
      return;
    }
    if (!_formato.hasMatch(username)) {
      setState(
        () => _erroDeFormato =
            'Digite o nome de usuário completo: de 3 a 30 letras, números, ponto ou traço baixo.',
      );
      return;
    }
    final minha = ++_buscaAtual;
    setState(() {
      _erroDeFormato = null;
      _estado = _Estado.buscando;
      _coldStart = false;
    });
    _timer = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() => _coldStart = true);
      }
    });
    try {
      final encontrados = await widget.servico.buscarPorUsername(username);
      if (!mounted || minha != _buscaAtual) {
        return;
      }
      setState(() {
        _resultado = encontrados.isEmpty ? null : encontrados.first;
        _estado = _resultado == null ? _Estado.vazio : _Estado.encontrado;
      });
    } on ApiException catch (erro) {
      if (!mounted || minha != _buscaAtual) {
        return;
      }
      setState(() {
        // 429 é o limite de buscas: a frase do servidor diz o que fazer.
        _mensagemDeErro = erro.status == 429
            ? erro.message
            : 'Não foi possível buscar agora. Verifique sua conexão e tente de novo.';
        _estado = _Estado.erro;
      });
    } finally {
      _timer?.cancel();
      if (mounted) {
        setState(() => _coldStart = false);
      }
    }
  }

  void _limpar() {
    setState(() {
      _buscaAtual++;
      _consulta.clear();
      _erroDeFormato = null;
      _resultado = null;
      _estado = _Estado.aterrissagem;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final vazio = _estado == _Estado.aterrissagem || _estado == _Estado.vazio;
    return Column(
      children: <Widget>[
        _cabecalho(theme),
        Expanded(
          child: vazio
              // Os dois vazios ficam centrados na vertical da área útil, como no protótipo.
              ? CustomScrollView(
                  slivers: <Widget>[
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Padding(
                        padding: const EdgeInsets.all(DesignTokens.space5),
                        child: Center(
                          child: Semantics(liveRegion: true, child: _conteudo(theme)),
                        ),
                      ),
                    ),
                  ],
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(
                    DesignTokens.space5,
                    DesignTokens.space6,
                    DesignTokens.space5,
                    DesignTokens.space5,
                  ),
                  children: <Widget>[Semantics(liveRegion: true, child: _conteudo(theme))],
                ),
        ),
      ],
    );
  }

  /// Header próprio da busca, como no protótipo: a seta e o campo no lugar do título, sem sino e
  /// sem divisor. Tem 72px com o campo de 48; cresce se o erro de formato aparecer embaixo.
  Widget _cabecalho(ThemeData theme) {
    return ColoredBox(
      color: theme.pageBackground,
      child: SafeArea(
        bottom: false,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: CabecalhoTela.altura),
          child: Padding(
            // A seta de 24px fica centrada no alvo de 48, alinhada aos 20px dos outros headers.
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space2,
              DesignTokens.space3,
              DesignTokens.space5,
              DesignTokens.space3,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Semantics(
                  button: true,
                  label: 'Voltar',
                  child: GestureDetector(
                    onTap: widget.aoVoltar,
                    behavior: HitTestBehavior.opaque,
                    child: SizedBox(
                      width: 48,
                      height: 48,
                      child: Icon(
                        PhosphorIconsRegular.arrowLeft,
                        size: 24,
                        color: theme.colorScheme.onSurface,
                      ),
                    ),
                  ),
                ),
                Expanded(child: _campo(theme)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _campo(ThemeData theme) {
    final buscando = _estado == _Estado.buscando;
    return Opacity(
      opacity: buscando ? 0.6 : 1,
      child: TextField(
        controller: _consulta,
        enabled: !buscando,
        autocorrect: false,
        enableSuggestions: false,
        textCapitalization: TextCapitalization.none,
        textInputAction: TextInputAction.search,
        onSubmitted: (_) => _buscar(),
        style: theme.textTheme.bodyMedium,
        decoration: InputDecoration(
          hintText: 'Nome de usuário exato',
          errorText: _erroDeFormato,
          errorMaxLines: 3,
          prefixIcon: Icon(PhosphorIconsRegular.at, size: 20, color: theme.tertiaryText),
          suffixIcon: _consulta.text.isEmpty
              ? null
              : IconButton(
                  tooltip: 'Limpar',
                  onPressed: _limpar,
                  icon: Icon(PhosphorIconsRegular.x, size: 20, color: theme.secondaryText),
                ),
        ),
      ),
    );
  }

  Widget _conteudo(ThemeData theme) {
    switch (_estado) {
      case _Estado.aterrissagem:
        return const EstadoVazio(
          icone: PhosphorIconsRegular.at,
          solto: true,
          titulo: 'Busque pelo nome de usuário',
          texto:
              'A busca por pessoas é exata: digite o nome de usuário inteiro, sem o arroba. Não '
              'existe lista de leitores para explorar.',
        );
      case _Estado.buscando:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const _SkeletonDoResultado(),
            if (_coldStart) ...<Widget>[
              const SizedBox(height: DesignTokens.space4),
              Text(
                'O servidor está iniciando. Isso pode levar alguns segundos.',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ],
          ],
        );
      case _Estado.encontrado:
        final leitor = _resultado!;
        return Column(
          children: <Widget>[
            Container(
              padding: const EdgeInsets.all(DesignTokens.space4),
              decoration: BoxDecoration(
                color: theme.elevatedSurface,
                borderRadius: BorderRadius.circular(DesignTokens.radius),
                boxShadow: theme.elevation1,
              ),
              child: LinhaDeLeitor(
                leitor: leitor,
                aoAbrir: () => widget.aoAbrirPerfil(leitor.username),
                linhasDaBiografia: 2,
                // Com fonte muito ampliada o chip encolhe em vez de estourar a coluna.
                abaixoDoUsername: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: ChipPrivacidade(privacidade: leitor.privacidade),
                ),
                acao: Icon(PhosphorIconsRegular.caretRight, size: 20, color: theme.tertiaryText),
              ),
            ),
            const SizedBox(height: DesignTokens.space8),
            ExcludeSemantics(
              // No escuro, a sombra do chão vira `linha-noite`: a arte do protótipo deixava uma
              // mancha clara sob o leitor.
              child: SvgPicture.asset(
                theme.brightness == Brightness.dark
                    ? 'assets/ilustracoes/leitor-encontrado-escura.svg'
                    : 'assets/ilustracoes/leitor-encontrado.svg',
                key: const ValueKey<String>('ilustracao-leitor-encontrado'),
                width: 180,
              ),
            ),
          ],
        );
      case _Estado.vazio:
        return const EstadoVazio(
          ilustracao: 'assets/ilustracoes/nenhum-leitor.svg',
          titulo: 'Nenhum leitor com esse nome de usuário',
          texto: 'Confira a grafia. A busca precisa do nome de usuário inteiro e exato.',
        );
      case _Estado.erro:
        return BannerAviso(
          variante: VarianteAviso.erro,
          triangulo: true,
          mensagem: _mensagemDeErro,
          acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _buscar),
        );
    }
  }
}

/// Skeleton do card de resultado (artboard "buscando"): card de 72px em `capa-placeholder` com o
/// círculo e as barras em `papel-elevado` translúcido por dentro, o inverso das listas.
class _SkeletonDoResultado extends StatelessWidget {
  const _SkeletonDoResultado();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final peca = theme.elevatedSurface.withValues(alpha: 0.6);
    Widget barra(double altura, double fracao) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: peca,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
    return ExcludeSemantics(
      child: Container(
        padding: const EdgeInsets.all(DesignTokens.space4),
        decoration: BoxDecoration(
          color: theme.coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radius),
        ),
        child: Row(
          children: <Widget>[
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(shape: BoxShape.circle, color: peca),
            ),
            const SizedBox(width: DesignTokens.space4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  barra(16, 0.55),
                  const SizedBox(height: DesignTokens.space2),
                  barra(12, 0.35),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
