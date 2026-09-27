import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/bloco_de_spoiler.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/cartao_progresso.dart';
import '../../design/widgets/estado_vazio.dart';
import '../../design/widgets/estrelas_de_nota.dart';
import '../../design/widgets/etiqueta.dart';
import '../../design/widgets/folha_inferior.dart';
import '../avaliacao/avaliacao_controller.dart';
import '../avaliacao/bloco_sua_avaliacao.dart';
import '../avaliacao/leitura_service.dart';
import '../avaliacao/painel_de_nota.dart';
import 'acervo_service.dart';
import 'formatos.dart';

/// Página do livro pessoal (RN-03, RN-15). Estrutura e cópia de
/// docs/design/periodo-1/F-ACV-CADASTRO/livro-pessoal.md §4 e §8.
///
/// Dois públicos, e quem decide qual é o **servidor** (`modoConsulta`): o dono vê as ações de
/// editar e excluir; o terceiro, que só chega pelo feed, vê a página em modo consulta, em que
/// essas ações **não existem** — não são botões cinzas (RN-15.3).
///
/// Nota e resenha: o dono avalia pelo bloco "Sua avaliação" (F-AVA, RN-03), que carrega do
/// `leitura`; o terceiro vê a nota e a resenha do dono que o `acervo` já traz na página.
class LivroPessoalPage extends StatefulWidget {
  final AcervoService servico;
  final LeituraService leitura;
  final String livroId;

  /// Via de acesso de terceiro (RN-15). O dono abre sem nenhuma das duas.
  final String? via;
  final String? referenciaId;

  final VoidCallback? aoVoltar;

  /// Abre a edição. Devolve quando a edição fecha, e a página recarrega.
  final Future<void> Function(String livroId)? aoEditar;
  final VoidCallback? aoExcluir;
  final VoidCallback? aoVoltarAoFeed;

  const LivroPessoalPage({
    super.key,
    required this.servico,
    required this.leitura,
    required this.livroId,
    this.via,
    this.referenciaId,
    this.aoVoltar,
    this.aoEditar,
    this.aoExcluir,
    this.aoVoltarAoFeed,
  });

  @override
  State<LivroPessoalPage> createState() => _LivroPessoalPageState();
}

enum _Carga { carregando, pronto, indisponivel, falha }

class _LivroPessoalPageState extends State<LivroPessoalPage> {
  _Carga _carga = _Carga.carregando;
  LivroPessoal? _livro;
  String? _mensagem;

  /// Só existe para o dono, e só depois que o servidor disse que não é modo consulta.
  AvaliacaoController? _avaliacao;

  /// Resenha do dono com spoiler, vista por terceiro: fora da árvore até o toque (RF-AVA-03).
  bool _spoilerRevelado = false;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  @override
  void dispose() {
    _avaliacao?.dispose();
    super.dispose();
  }

  Future<void> _carregar() async {
    setState(() {
      _carga = _Carga.carregando;
      _mensagem = null;
    });
    try {
      final livro = await widget.servico.obterLivroPessoal(
        widget.livroId,
        via: widget.via,
        referenciaId: widget.referenciaId,
      );
      if (mounted) {
        setState(() {
          _livro = livro;
          _carga = _Carga.pronto;
          if (!livro.modoConsulta && _avaliacao == null) {
            _avaliacao = AvaliacaoController(widget.leitura, widget.livroId)..carregar();
          }
        });
      }
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      setState(() {
        // Livro excluído e acesso negado são o MESMO estado, com a mesma copy: nada pode
        // confirmar a existência do livro a quem não tem acesso (§4.8, §10).
        if (erro.status == 404 || erro.status == 403) {
          _carga = _Carga.indisponivel;
        } else {
          _carga = _Carga.falha;
          _mensagem = erro.message;
        }
      });
    }
  }

  Future<void> _abrirMenu() async {
    final escolha = await mostrarFolhaInferior<String>(
      context,
      builder: (context) {
        final theme = Theme.of(context);
        Widget item(String valor, IconData icone, String rotulo, Color cor) {
          return Semantics(
            button: true,
            child: GestureDetector(
              onTap: () => Navigator.of(context).pop(valor),
              behavior: HitTestBehavior.opaque,
              child: SizedBox(
                height: 56,
                child: Row(
                  children: <Widget>[
                    Icon(icone, size: 20, color: cor),
                    const SizedBox(width: DesignTokens.space4),
                    Text(rotulo, style: theme.textTheme.bodyMedium?.copyWith(color: cor)),
                  ],
                ),
              ),
            ),
          );
        }

        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            item(
              'editar',
              PhosphorIconsRegular.pencilSimple,
              'Editar livro',
              theme.colorScheme.onSurface,
            ),
            Divider(height: 1, color: theme.divider),
            item('excluir', PhosphorIconsRegular.trash, 'Excluir livro', theme.colorScheme.error),
            const SizedBox(height: DesignTokens.space4),
            BotaoTextual(
              texto: 'Cancelar',
              neutro: true,
              larguraTotal: true,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        );
      },
    );
    if (!mounted || escolha == null) {
      return;
    }
    if (escolha == 'editar') {
      await widget.aoEditar?.call(widget.livroId);
      if (mounted) {
        await _carregar();
      }
    } else {
      await _excluir();
    }
  }

  Future<void> _excluir() async {
    final livro = _livro!;
    // A mesma confirmação de cadastro-pessoal.md §4.8, não redesenhada aqui (§4.4).
    final confirmado = await confirmarAcaoDestrutiva(
      context,
      titulo: 'Excluir este livro?',
      texto:
          '${livro.titulo} sai da sua estante e sua nota e resenha dele são perdidas. Quem viu '
          'esse livro pelo seu feed deixa de conseguir abri-lo. Não dá para desfazer.',
      acao: 'Excluir livro',
    );
    if (!confirmado || !mounted) {
      return;
    }
    try {
      await widget.servico.excluirLivroPessoal(
        livro.id,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
      if (mounted) {
        widget.aoExcluir?.call();
      }
    } on ApiException catch (erro) {
      if (mounted) {
        setState(() => _mensagem = erro.message);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final livro = _livro;
    final ehDono = _carga == _Carga.pronto && livro != null && !livro.modoConsulta;

    return Column(
      children: <Widget>[
        // O título do header fica vazio: o título do livro está no hero logo abaixo (§4).
        CabecalhoTela(
          titulo: '',
          aoVoltar: widget.aoVoltar,
          acoes: <Widget>[
            if (ehDono)
              Semantics(
                button: true,
                label: 'Ações do livro',
                child: GestureDetector(
                  onTap: _abrirMenu,
                  behavior: HitTestBehavior.opaque,
                  child: SizedBox(
                    width: 48,
                    height: 48,
                    child: Icon(
                      PhosphorIconsRegular.dotsThreeVertical,
                      size: 24,
                      color: theme.colorScheme.onSurface,
                    ),
                  ),
                ),
              ),
          ],
        ),
        Expanded(child: _corpo(theme)),
      ],
    );
  }

  Widget _corpo(ThemeData theme) {
    switch (_carga) {
      case _Carga.carregando:
        return const _Esqueleto();
      case _Carga.indisponivel:
        return SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
          child: Column(
            children: <Widget>[
              const SizedBox(height: DesignTokens.space8),
              EstadoVazio(
                icone: PhosphorIconsRegular.bookOpen,
                titulo: 'Este livro não está mais disponível',
                texto: 'Ele pode ter sido excluído por quem o cadastrou.',
                rodape: Padding(
                  padding: const EdgeInsets.only(top: DesignTokens.space6),
                  child: BotaoTextual(texto: 'Voltar ao feed', onPressed: widget.aoVoltarAoFeed),
                ),
              ),
            ],
          ),
        );
      case _Carga.falha:
        return Padding(
          padding: const EdgeInsets.all(DesignTokens.space5),
          child: Column(
            children: <Widget>[
              BannerAviso(
                variante: VarianteAviso.erro,
                mensagem: _mensagem ?? 'Não foi possível conectar ao serviço.',
              ),
              const SizedBox(height: DesignTokens.space4),
              BotaoPrimario(texto: 'Tentar de novo', onPressed: _carregar),
            ],
          ),
        );
      case _Carga.pronto:
        return _conteudo(theme, _livro!);
    }
  }

  Widget _conteudo(ThemeData theme, LivroPessoal livro) {
    final consulta = livro.modoConsulta;
    final resenha = livro.resenhaDoDono;
    final nomeDoDono = livro.dono?.nome;
    final primeiroNome = nomeDoDono?.split(' ').first;
    final avaliacao = _avaliacao;

    Widget divisor() => Divider(height: 1, color: theme.divider);
    Widget secao(List<Widget> filhos) => Padding(
      padding: const EdgeInsets.symmetric(vertical: DesignTokens.space5),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: filhos),
    );

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          if (_mensagem != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space5),
            BannerAviso(variante: VarianteAviso.erro, mensagem: _mensagem!),
          ],
          const SizedBox(height: DesignTokens.space6),
          Center(
            child: DecoratedBox(
              decoration: BoxDecoration(
                boxShadow: livro.capaUrl == null ? null : theme.elevation2,
                borderRadius: BorderRadius.circular(DesignTokens.radius),
              ),
              child: CapaLivro(
                url: livro.capaUrl,
                largura: 140,
                altura: 187,
                raio: DesignTokens.radius,
                comIcone: true,
              ),
            ),
          ),
          const SizedBox(height: DesignTokens.space5),
          Text(
            livro.titulo,
            style: theme.displayTitle,
            textAlign: TextAlign.center,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: DesignTokens.space2),
          // Não é link: livro pessoal não tem página de autor (RN-03).
          Text(
            livro.autor,
            style: theme.textTheme.bodyLarge?.copyWith(color: theme.secondaryText),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: DesignTokens.space3),
          const Center(child: Etiqueta(texto: 'Livro pessoal')),
          if (consulta && nomeDoDono != null) ...<Widget>[
            const SizedBox(height: DesignTokens.space3),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                _Avatar(url: livro.dono?.avatarUrl),
                const SizedBox(width: DesignTokens.space2),
                Flexible(
                  child: Text(
                    'Livro pessoal de $nomeDoDono',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: DesignTokens.space6),
          divisor(),
          // Ficha: só páginas. Sem editora, ISBN ou série, que não existem aqui (§4.1).
          Padding(
            padding: const EdgeInsets.symmetric(vertical: DesignTokens.space5),
            child: Row(
              children: <Widget>[
                Text('Páginas', style: theme.textTheme.labelMedium),
                const Spacer(),
                Text(formatarPaginas(livro.paginas), style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
          if (livro.sinopse != null && livro.sinopse!.trim().isNotEmpty) ...<Widget>[
            divisor(),
            secao(<Widget>[
              Text('Sinopse', style: theme.textTheme.titleMedium),
              const SizedBox(height: DesignTokens.space3),
              Text(livro.sinopse!, style: theme.editorialBody),
            ]),
          ],
          // O dono avalia aqui (RN-03); a ausência é estado normal, não erro (§1).
          if (!consulta && avaliacao != null) ...<Widget>[
            divisor(),
            secao(<Widget>[
              BlocoSuaAvaliacao(
                avaliacao: avaliacao,
                livro: LivroAvaliado(
                  titulo: livro.titulo,
                  autor: livro.autor,
                  capaUrl: livro.capaUrl,
                ),
              ),
            ]),
          ],
          // O terceiro vê a nota e a resenha do dono, sem ação nenhuma (RN-15.2). Sem avaliação,
          // nem o convite aparece (§4.6).
          if (consulta && livro.notaDoDono != null) ...<Widget>[
            divisor(),
            secao(<Widget>[
              Text(
                'Nota de ${primeiroNome ?? 'quem cadastrou'}',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: DesignTokens.space3),
              _Estrelas(nota: livro.notaDoDono!),
            ]),
          ],
          if (consulta && resenha != null) ...<Widget>[
            divisor(),
            secao(<Widget>[
              Text(
                'Resenha de ${primeiroNome ?? 'quem cadastrou'}',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: DesignTokens.space3),
              if (resenha.spoiler && !_spoilerRevelado)
                BlocoDeSpoiler(aoRevelar: () => setState(() => _spoilerRevelado = true))
              else
                Text(resenha.texto, style: theme.editorialBody),
              const SizedBox(height: DesignTokens.space3),
              Text(formatarData(resenha.atualizadoEm), style: theme.textTheme.bodySmall),
            ]),
          ],
          const SizedBox(height: DesignTokens.space12),
        ],
      ),
    );
  }
}

class _Estrelas extends StatelessWidget {
  final double nota;

  const _Estrelas({required this.nota});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final texto = formatarNota(nota);
    return Semantics(
      label: '$texto de 5',
      excludeSemantics: true,
      child: Row(
        children: <Widget>[
          EstrelasDeNota(valor: nota, tamanho: 24, espaco: 0),
          const SizedBox(width: DesignTokens.space2),
          Text(texto, style: theme.numInline),
        ],
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String? url;

  const _Avatar({this.url});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ExcludeSemantics(
      child: CircleAvatar(
        radius: 12,
        backgroundColor: theme.coverPlaceholder,
        foregroundImage: url == null ? null : NetworkImage(url!),
      ),
    );
  }
}

/// Skeleton com a forma do layout final (§4.7): capa, duas barras de título, uma de autor e três
/// linhas de sinopse. Sem spinner.
class _Esqueleto extends StatelessWidget {
  const _Esqueleto();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space5),
      child: Column(
        children: <Widget>[
          const SizedBox(height: DesignTokens.space6),
          Container(
            width: 140,
            height: 187,
            decoration: BoxDecoration(
              color: theme.divider,
              borderRadius: BorderRadius.circular(DesignTokens.radius),
            ),
          ),
          const SizedBox(height: DesignTokens.space5),
          const BarraSkeleton(altura: 28, fracaoDaLargura: 0.8),
          const SizedBox(height: DesignTokens.space2),
          const BarraSkeleton(altura: 28, fracaoDaLargura: 0.5),
          const SizedBox(height: DesignTokens.space3),
          const BarraSkeleton(altura: 18, fracaoDaLargura: 0.4),
          const SizedBox(height: DesignTokens.space8),
          const BarraSkeleton(altura: 14, fracaoDaLargura: 1),
          const SizedBox(height: DesignTokens.space2),
          const BarraSkeleton(altura: 14, fracaoDaLargura: 1),
          const SizedBox(height: DesignTokens.space2),
          const BarraSkeleton(altura: 14, fracaoDaLargura: 0.7),
        ],
      ),
    );
  }
}
