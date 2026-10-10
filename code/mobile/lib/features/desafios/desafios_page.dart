import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../core/network/recarga_em_sequencia.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../../design/widgets/estado_vazio.dart';
import '../../design/widgets/folha_inferior.dart';
import '../listas/widgets_de_lista.dart';
import '../perfil/lista_paginada.dart';
import '../perfil/perfil_service.dart';
import '../perfil/widgets_de_perfil.dart';
import 'desafios_service.dart';
import 'textos.dart';
import 'widgets_de_desafios.dart';

enum _Acao { editar, pausar, retomar, excluir }

/// Lista de desafios (docs/design/periodo-2/F-DSF/desafios.md, RF-DSF-03/04): cada desafio com o
/// acumulado da janela corrente, os ativos primeiro e os pausados no grupo `Pausados`. A ordem é
/// a do servidor; a tela só separa os grupos. Paginada por rolagem (RNF-DES-02).
///
/// Pausar e retomar não pedem confirmação e não têm toast de sucesso: o card troca de grupo na
/// recarga. A falha mostra o toast persistente com `Tentar de novo`, que repete a mesma
/// `Idempotency-Key`. Um 409 (o estado já mudou) ou 404 (o desafio já não existe) recarrega a
/// lista em silêncio: a tela é que estava velha.
///
/// [alteracoesDeLeitura] são os avisos de progresso e de leitura finalizada: o acumulado chega
/// pelo consumo assíncrono no servidor, então a recarga espera [atrasoDaRecarga].
class DesafiosPage extends StatefulWidget {
  final DesafiosService servico;
  final Listenable? alteracoesDeLeitura;
  final Duration atrasoDaRecarga;
  final VoidCallback? aoVoltar;
  final VoidCallback aoCriar;
  final ValueChanged<Desafio> aoEditar;

  const DesafiosPage({
    super.key,
    required this.servico,
    this.alteracoesDeLeitura,
    this.atrasoDaRecarga = const Duration(seconds: 3),
    this.aoVoltar,
    required this.aoCriar,
    required this.aoEditar,
  });

  @override
  State<DesafiosPage> createState() => _DesafiosPageState();
}

class _DesafiosPageState extends State<DesafiosPage> {
  final ScrollController _rolagem = ScrollController();
  late final ListaPaginada<Desafio> _desafios = ListaPaginada<Desafio>(
    _buscar,
    (desafio) => desafio.id,
  );
  late final RecargaEmSequencia _recarga = RecargaEmSequencia(_desafios.carregar);

  /// Chave de cada ação ainda não confirmada, por desafio e ação: o `Tentar de novo` repete a
  /// mesma (RNF-ERR-04).
  final Map<String, String> _chaves = <String, String>{};
  Timer? _agendada;
  Timer? _relogio;
  bool _demorando = false;

  @override
  void initState() {
    super.initState();
    _rolagem.addListener(_aoRolar);
    _desafios.addListener(_aoMudarCarga);
    widget.servico.alteracoes.addListener(_recarregar);
    widget.alteracoesDeLeitura?.addListener(_aoRegistrarLeitura);
    unawaited(_desafios.carregar());
  }

  @override
  void didUpdateWidget(DesafiosPage antigo) {
    super.didUpdateWidget(antigo);
    if (antigo.alteracoesDeLeitura != widget.alteracoesDeLeitura) {
      antigo.alteracoesDeLeitura?.removeListener(_aoRegistrarLeitura);
      widget.alteracoesDeLeitura?.addListener(_aoRegistrarLeitura);
    }
  }

  @override
  void dispose() {
    _agendada?.cancel();
    _relogio?.cancel();
    widget.servico.alteracoes.removeListener(_recarregar);
    widget.alteracoesDeLeitura?.removeListener(_aoRegistrarLeitura);
    _desafios.removeListener(_aoMudarCarga);
    _rolagem.dispose();
    _desafios.dispose();
    super.dispose();
  }

  Future<Pagina<Desafio>> _buscar(int pagina) async {
    final resposta = await widget.servico.listar(pagina: pagina + 1);
    return Pagina<Desafio>(
      itens: resposta.itens,
      pagina: pagina,
      totalElementos: resposta.totalItens,
      totalPaginas: resposta.totalPaginas,
    );
  }

  void _aoRolar() {
    if (_rolagem.hasClients && _rolagem.position.extentAfter < 400) {
      _desafios.carregarMais();
    }
  }

  /// Passados três segundos na primeira carga, avisa que o serviço pode estar acordando
  /// (RNF-ERR-09).
  void _aoMudarCarga() {
    final esperando = _desafios.carregando && _desafios.itens.isEmpty;
    if (esperando && _relogio == null) {
      _relogio = Timer(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() => _demorando = true);
        }
      });
    } else if (!esperando && _relogio != null) {
      _relogio?.cancel();
      _relogio = null;
      _demorando = false;
    }
  }

  void _recarregar() => unawaited(_recarga.pedir());

  /// Vários registros seguidos (fila offline) viram uma recarga só, depois do último.
  void _aoRegistrarLeitura() {
    _agendada?.cancel();
    _agendada = Timer(widget.atrasoDaRecarga, () {
      if (mounted) {
        _recarregar();
      }
    });
  }

  Future<void> _abrirAcoes(Desafio desafio) async {
    // Pelo navegador raiz, para o scrim cobrir a barra inferior.
    final acao = await mostrarFolhaInferior<_Acao>(
      Navigator.of(context, rootNavigator: true).context,
      builder: (context) => _MenuDoDesafio(desafio: desafio),
    );
    if (!mounted || acao == null) {
      return;
    }
    switch (acao) {
      case _Acao.editar:
        widget.aoEditar(desafio);
      case _Acao.pausar:
      case _Acao.retomar:
        await _executar(desafio, acao);
      case _Acao.excluir:
        final confirmado = await confirmarAcaoDestrutiva(
          Navigator.of(context, rootNavigator: true).context,
          titulo: tituloDaExclusao(desafio),
          texto: textoDaExclusao,
          acao: 'Excluir desafio',
        );
        if (confirmado && mounted) {
          await _executar(desafio, acao);
        }
    }
  }

  Future<void> _executar(Desafio desafio, _Acao acao) async {
    final chaveDaAcao = '${desafio.id}:${acao.name}';
    final chave = _chaves[chaveDaAcao] ??= ApiClient.newIdempotencyKey();
    try {
      switch (acao) {
        case _Acao.pausar:
          await widget.servico.pausar(desafio.id, idempotencyKey: chave);
        case _Acao.retomar:
          await widget.servico.retomar(desafio.id, idempotencyKey: chave);
        case _Acao.excluir:
          await widget.servico.excluir(desafio.id, idempotencyKey: chave);
        case _Acao.editar:
          return;
      }
      _chaves.remove(chaveDaAcao);
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      if (erro.status == 409 || erro.status == 404) {
        _chaves.remove(chaveDaAcao);
        _recarregar();
        return;
      }
      final verbo = switch (acao) {
        _Acao.pausar => 'pausar',
        _Acao.retomar => 'retomar',
        _ => 'excluir',
      };
      mostrarAvisoDeLista(
        context,
        texto: 'Não foi possível $verbo o desafio. $textoDeFalhaDeRede',
        falha: true,
        acao: 'Tentar de novo',
        aoAcionar: () => unawaited(_executar(desafio, acao)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _desafios,
      builder: (context, _) {
        final theme = Theme.of(context);
        final carregando = _desafios.carregando && _desafios.itens.isEmpty;
        final falhou = _desafios.falhou && _desafios.itens.isEmpty;
        final vazio = !carregando && !falhou && _desafios.itens.isEmpty;
        return Column(
          children: <Widget>[
            CabecalhoTela(
              titulo: 'Desafios',
              aoVoltar: widget.aoVoltar,
              semDivisor: true,
              acoes: <Widget>[
                // §4.5: no vazio a ação fica só no bloco; nunca dois CTAs iguais na tela.
                if (!vazio)
                  Semantics(
                    button: true,
                    label: 'Novo desafio',
                    excludeSemantics: true,
                    child: GestureDetector(
                      onTap: widget.aoCriar,
                      behavior: HitTestBehavior.opaque,
                      child: SizedBox(
                        width: 48,
                        height: 48,
                        child: Icon(
                          PhosphorIconsRegular.plus,
                          size: 24,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            Expanded(
              child: _corpo(theme, carregando: carregando, falhou: falhou, vazio: vazio),
            ),
          ],
        );
      },
    );
  }

  Widget _corpo(
    ThemeData theme, {
    required bool carregando,
    required bool falhou,
    required bool vazio,
  }) {
    const margens = EdgeInsets.fromLTRB(
      DesignTokens.space5,
      DesignTokens.space2,
      DesignTokens.space5,
      DesignTokens.space12,
    );
    if (carregando) {
      return ListView(
        padding: margens,
        children: <Widget>[
          EntradaSuave(
            child: Column(
              children: <Widget>[
                for (var i = 0; i < 3; i++) ...<Widget>[
                  if (i > 0) const SizedBox(height: DesignTokens.space4),
                  const SkeletonDeDesafio(),
                ],
              ],
            ),
          ),
          if (_demorando) ...<Widget>[
            const SizedBox(height: DesignTokens.space4),
            Semantics(
              liveRegion: true,
              child: Text(
                'O serviço está iniciando. Isso pode levar alguns segundos.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ),
          ],
        ],
      );
    }
    if (falhou) {
      return ListView(
        padding: margens,
        children: <Widget>[
          BannerAviso(
            variante: VarianteAviso.erro,
            triangulo: true,
            mensagem: 'Não foi possível carregar seus desafios. $textoDeFalhaDeRede',
            acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _desafios.carregar),
          ),
        ],
      );
    }
    if (vazio) {
      return LayoutBuilder(
        builder: (context, limites) => SingleChildScrollView(
          padding: const EdgeInsets.all(DesignTokens.space10),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: limites.maxHeight - 2 * DesignTokens.space10),
            child: Center(
              child: EstadoVazio(
                icone: PhosphorIconsRegular.target,
                solto: true,
                titulo: 'Você ainda não tem desafios',
                texto:
                    'Escolha um alvo curto, como páginas por dia, minutos por semana ou livros '
                    'por ano. Cada registro de progresso e cada leitura finalizada contam '
                    'sozinhos.',
                rodape: BotaoPrimario(
                  texto: 'Novo desafio',
                  larguraTotal: false,
                  onPressed: widget.aoCriar,
                ),
              ),
            ),
          ),
        ),
      );
    }

    final ativos = _desafios.itens.where((desafio) => !desafio.pausado).toList();
    final pausados = _desafios.itens.where((desafio) => desafio.pausado).toList();
    Widget cartao(Desafio desafio) => Padding(
      key: ValueKey<String>('desafio-${desafio.id}'),
      padding: const EdgeInsets.only(bottom: DesignTokens.space4),
      child: CartaoDeDesafio(desafio: desafio, aoAbrirAcoes: () => _abrirAcoes(desafio)),
    );
    return ListView(
      controller: _rolagem,
      padding: margens,
      children: <Widget>[
        ...ativos.map(cartao),
        if (pausados.isNotEmpty) ...<Widget>[
          Padding(
            padding: EdgeInsets.only(
              top: ativos.isEmpty ? 0 : DesignTokens.space4,
              bottom: DesignTokens.space3,
            ),
            child: Semantics(
              header: true,
              child: Text('Pausados', style: theme.textTheme.titleMedium),
            ),
          ),
          ...pausados.map(cartao),
        ],
        FimDaLista(
          temMais: _desafios.temMais,
          carregandoMais: _desafios.carregandoMais,
          falhou: _desafios.falhouMais,
          aoCarregar: _desafios.carregarMais,
          esqueleto: const Column(
            children: <Widget>[
              SkeletonDeDesafio(),
              SizedBox(height: DesignTokens.space4),
              SkeletonDeDesafio(),
            ],
          ),
        ),
      ],
    );
  }
}

/// Menu de ações (desafios.md §4.3): cabeçalho com o desafio e a situação da janela, `Editar`,
/// `Pausar` ou `Retomar` com a segunda linha que diz o efeito, e `Excluir` por último, em `rubi`.
class _MenuDoDesafio extends StatelessWidget {
  final Desafio desafio;

  const _MenuDoDesafio({required this.desafio});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    Widget opcao(
      _Acao acao,
      IconData icone,
      String rotulo, {
      String? detalhe,
      bool destrutiva = false,
    }) {
      final cor = destrutiva ? theme.colorScheme.error : theme.colorScheme.onSurface;
      return Semantics(
        button: true,
        child: InkWell(
          onTap: () => Navigator.of(context).pop(acao),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 56),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: DesignTokens.space3),
              child: Row(
                children: <Widget>[
                  Icon(icone, size: 20, color: cor),
                  const SizedBox(width: DesignTokens.space4),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Text(rotulo, style: theme.textTheme.bodyMedium?.copyWith(color: cor)),
                        if (detalhe != null)
                          Text(
                            detalhe,
                            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final opcoes = <Widget>[
      opcao(_Acao.editar, PhosphorIconsRegular.pencilSimple, 'Editar desafio'),
      if (desafio.pausado)
        opcao(
          _Acao.retomar,
          PhosphorIconsRegular.play,
          'Retomar desafio',
          detalhe: 'Volta a contar a partir de agora.',
        )
      else
        opcao(
          _Acao.pausar,
          PhosphorIconsRegular.pause,
          'Pausar desafio',
          detalhe: 'O que você registrar durante a pausa não conta.',
        ),
      opcao(_Acao.excluir, PhosphorIconsRegular.trash, 'Excluir desafio', destrutiva: true),
    ];
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Icon(iconeDaUnidade(desafio.unidade), size: 20, color: theme.secondaryText),
              ),
              const SizedBox(width: DesignTokens.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(tituloDe(desafio), style: theme.textTheme.titleMedium),
                    const SizedBox(height: DesignTokens.space1),
                    Text(
                      subtituloDoMenu(desafio),
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: DesignTokens.space4),
          Divider(height: 1, color: theme.divider),
          for (var i = 0; i < opcoes.length; i++) ...<Widget>[
            if (i > 0) Divider(height: 1, color: theme.divider),
            opcoes[i],
          ],
          const SizedBox(height: DesignTokens.space4),
          BotaoTextual(
            texto: 'Cancelar',
            neutro: true,
            larguraTotal: true,
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }
}
