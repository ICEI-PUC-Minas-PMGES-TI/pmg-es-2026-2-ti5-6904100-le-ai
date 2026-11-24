import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/cartao_de_sequencia.dart';
import '../../design/widgets/entrada_suave.dart';
import '../progresso/fila_de_progresso.dart';
import 'calendario.dart';
import 'grade_do_mes.dart';
import 'sequencia_service.dart';

const int _entidadeInvalida = 422;
const double _velocidadeDoDeslize = 200;

enum _Falha { semConexao, servidor }

_Falha _falhaDe(ApiException erro) => erro.kind == ApiFailureKind.network && erro.status == null
    ? _Falha.semConexao
    : _Falha.servidor;

/// Calendário de sequência (F-GAM-OPC, RF-GAM-04; calendario-de-sequencia.md): tela de detalhe
/// empilhada sobre o Perfil, **somente leitura**. Mostra o resumo da sequência (sempre o estado de
/// hoje, de `GET /me/sequencia`) e a grade de um mês por vez, navegável dentro da janela que o
/// servidor devolve (`mesMaisAntigo` a `mesAtual`, RNF-DES-02).
///
/// O dia só aparece marcado pelo servidor: a fila offline do aparelho nunca marca dia (§4.9,
/// RN-18.5), porque sequência e calendário precisam vir da mesma apuração. [alteracoes] é o
/// `ProgressoService.alteracoes`: registro ou exclusão de progresso recarregam em silêncio
/// [atrasoDaRecarga] depois, como o bloco do perfil, por causa do consumo assíncrono.
class CalendarioDaSequenciaPage extends StatefulWidget {
  final SequenciaService servico;
  final VoidCallback? aoVoltar;
  final FilaDeProgresso? fila;
  final ValueListenable<int>? alteracoes;
  final Duration atrasoDaRecarga;

  const CalendarioDaSequenciaPage({
    super.key,
    required this.servico,
    this.aoVoltar,
    this.fila,
    this.alteracoes,
    this.atrasoDaRecarga = const Duration(seconds: 3),
  });

  @override
  State<CalendarioDaSequenciaPage> createState() => _CalendarioDaSequenciaPageState();
}

class _CalendarioDaSequenciaPageState extends State<CalendarioDaSequenciaPage> {
  Sequencia? _sequencia;

  /// O último calendário recebido: dá a janela e o `hoje`, e a grade quando é do mês exibido.
  CalendarioDaSequencia? _calendario;
  Mes? _mesExibido;

  bool _carregando = true;
  _Falha? _falha;
  bool _carregandoMes = false;
  bool _falhaDoMes = false;

  /// Só a resposta do último pedido vale: tocar de novo num caret descarta a anterior (§4.7).
  int _pedido = 0;
  Timer? _relogio;
  bool _demorando = false;
  Timer? _recargaAgendada;

  @override
  void initState() {
    super.initState();
    widget.alteracoes?.addListener(_aoAlterar);
    widget.fila?.addListener(_aoMudarFila);
    unawaited(widget.fila?.carregar());
    unawaited(_carregarTudo());
  }

  @override
  void dispose() {
    _relogio?.cancel();
    _recargaAgendada?.cancel();
    widget.alteracoes?.removeListener(_aoAlterar);
    widget.fila?.removeListener(_aoMudarFila);
    super.dispose();
  }

  void _aoMudarFila() {
    if (mounted) {
      setState(() {});
    }
  }

  void _aoAlterar() {
    _recargaAgendada?.cancel();
    _recargaAgendada = Timer(widget.atrasoDaRecarga, () {
      if (mounted && !_carregando && _falha == null) {
        unawaited(_carregarTudo(silencioso: true));
      }
    });
  }

  /// Resumo e mês juntos. [silencioso] mantém a tela como está e só troca os dados se der certo.
  Future<void> _carregarTudo({bool silencioso = false}) async {
    final pedido = ++_pedido;
    final mes = _mesExibido;
    if (!silencioso) {
      setState(() {
        _carregando = true;
        _falha = null;
        _demorando = false;
      });
      _relogio?.cancel();
      _relogio = Timer(const Duration(seconds: 3), () {
        if (mounted && _carregando) {
          setState(() => _demorando = true);
        }
      });
    }
    final doCalendario = widget.servico.calendario(mes: mes);
    // Se o resumo falhar primeiro, a falha do calendário não fica sem quem a escute.
    unawaited(doCalendario.then<void>((_) {}, onError: (Object _) {}));
    try {
      final sequencia = await widget.servico.obterMinha();
      final calendario = await doCalendario;
      if (!mounted || pedido != _pedido) {
        return;
      }
      _relogio?.cancel();
      setState(() {
        _sequencia = sequencia;
        _calendario = calendario;
        _mesExibido = calendario.mes;
        _carregando = false;
        _carregandoMes = false;
        _falhaDoMes = false;
        _demorando = false;
      });
    } on ApiException catch (erro) {
      if (!mounted || pedido != _pedido) {
        return;
      }
      // O mês saiu da janela (virou o mês no servidor): volta para o mês corrente.
      if (erro.status == _entidadeInvalida && mes != null) {
        _mesExibido = null;
        unawaited(_carregarTudo(silencioso: silencioso));
        return;
      }
      if (silencioso) {
        return;
      }
      _relogio?.cancel();
      setState(() {
        _carregando = false;
        _falha = _falhaDe(erro);
        _demorando = false;
      });
    }
  }

  void _irPara(Mes mes) {
    final calendario = _calendario;
    if (calendario == null || mes < calendario.mesMaisAntigo || mes > calendario.mesAtual) {
      return;
    }
    setState(() {
      _mesExibido = mes;
      _carregandoMes = true;
      _falhaDoMes = false;
    });
    unawaited(_carregarMes(mes));
  }

  Future<void> _carregarMes(Mes mes) async {
    final pedido = ++_pedido;
    try {
      final calendario = await widget.servico.calendario(mes: mes);
      if (!mounted || pedido != _pedido) {
        return;
      }
      setState(() {
        _calendario = calendario;
        _mesExibido = calendario.mes;
        _carregandoMes = false;
      });
      _anunciar('${calendario.mes.titulo}, ${totalDoMes(calendario.dias.length)}');
    } on ApiException catch (erro) {
      if (!mounted || pedido != _pedido) {
        return;
      }
      if (erro.status == _entidadeInvalida) {
        _mesExibido = null;
        unawaited(_carregarTudo());
        return;
      }
      setState(() {
        _carregandoMes = false;
        _falhaDoMes = true;
      });
    }
  }

  void _anunciar(String texto) {
    unawaited(
      SemanticsService.sendAnnouncement(View.of(context), texto, Directionality.of(context)),
    );
  }

  /// Os limites vêm do último calendário recebido; a posição, do mês exibido.
  bool get _podeVoltar {
    final calendario = _calendario;
    final mes = _mesExibido;
    return calendario != null && mes != null && mes > calendario.mesMaisAntigo;
  }

  bool get _podeAvancar {
    final calendario = _calendario;
    final mes = _mesExibido;
    return calendario != null && mes != null && mes < calendario.mesAtual;
  }

  void _voltarMes() {
    if (_podeVoltar) {
      _irPara(_mesExibido!.anterior);
    }
  }

  void _avancarMes() {
    if (_podeAvancar) {
      _irPara(_mesExibido!.seguinte);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        CabecalhoTela(titulo: TextosDoCalendario.titulo, aoVoltar: widget.aoVoltar),
        Expanded(child: _corpo(Theme.of(context))),
      ],
    );
  }

  Widget _corpo(ThemeData theme) {
    const margem = EdgeInsets.fromLTRB(
      DesignTokens.space5,
      DesignTokens.space4,
      DesignTokens.space5,
      DesignTokens.space8,
    );
    if (_carregando) {
      return ListView(padding: margem, children: <Widget>[_esqueleto(theme)]);
    }
    final falha = _falha;
    if (falha != null) {
      return ListView(padding: margem, children: <Widget>[_bannerDeFalha(theme, falha)]);
    }
    final sequencia = _sequencia!;
    return ListView(
      padding: margem,
      children: <Widget>[
        CartaoDeSequencia(atual: sequencia.atual, recorde: sequencia.maior),
        const SizedBox(height: DesignTokens.space6),
        GestureDetector(
          behavior: HitTestBehavior.translucent,
          onHorizontalDragEnd: (detalhes) {
            final velocidade = detalhes.primaryVelocity ?? 0;
            if (velocidade > _velocidadeDoDeslize) {
              _voltarMes();
            } else if (velocidade < -_velocidadeDoDeslize) {
              _avancarMes();
            }
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              _navegacao(theme),
              const SizedBox(height: DesignTokens.space4),
              _grade(theme),
            ],
          ),
        ),
        if (!_falhaDoMes) ...<Widget>[
          const SizedBox(height: DesignTokens.space4),
          const LegendaDoCalendario(),
          ..._frases(theme, sequencia),
        ],
      ],
    );
  }

  Widget _navegacao(ThemeData theme) {
    final mes = _mesExibido!;
    final calendario = _calendario!;
    final doMes = calendario.mes == mes && !_carregandoMes ? calendario : null;
    final estiloDoTotal = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        SizedBox(
          height: 48,
          child: Row(
            children: <Widget>[
              _BotaoDeMes(
                icone: PhosphorIconsRegular.caretLeft,
                rotulo: TextosDoCalendario.mesAnterior,
                aoTocar: _podeVoltar ? _voltarMes : null,
              ),
              Expanded(
                child: Center(
                  child: Text(
                    mes.titulo,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleLarge,
                  ),
                ),
              ),
              _BotaoDeMes(
                icone: PhosphorIconsRegular.caretRight,
                rotulo: TextosDoCalendario.proximoMes,
                aoTocar: _podeAvancar ? _avancarMes : null,
              ),
            ],
          ),
        ),
        const SizedBox(height: DesignTokens.space1),
        if (doMes != null)
          Center(child: _totalDoMes(theme, doMes.dias.length, estiloDoTotal))
        else if (_carregandoMes)
          Center(
            child: FractionallySizedBox(
              widthFactor: 0.3,
              child: Container(
                height: 13,
                decoration: BoxDecoration(
                  color: theme.divider,
                  borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
                ),
              ),
            ),
          ),
      ],
    );
  }

  /// `20 dias com leitura`, com o número em JetBrains Mono.
  Widget _totalDoMes(ThemeData theme, int dias, TextStyle? estilo) {
    final texto = totalDoMes(dias);
    if (dias == 0) {
      return Text(texto, style: estilo);
    }
    final numero = '$dias';
    return Text.rich(
      TextSpan(
        style: estilo,
        children: <InlineSpan>[
          TextSpan(
            text: numero,
            style: theme.numInline.copyWith(
              fontSize: estilo?.fontSize,
              height: estilo?.height,
              color: estilo?.color,
            ),
          ),
          TextSpan(text: texto.substring(numero.length)),
        ],
      ),
    );
  }

  Widget _grade(ThemeData theme) {
    final mes = _mesExibido!;
    final calendario = _calendario!;
    final Widget conteudo;
    if (_falhaDoMes) {
      conteudo = BannerAviso(
        key: ValueKey<String>('falha-$mes'),
        variante: VarianteAviso.erro,
        triangulo: true,
        mensagem: TextosDoCalendario.erroDoMes(mes),
        acao: BotaoTextual(texto: TextosDoCalendario.tentarDeNovo, onPressed: () => _irPara(mes)),
      );
    } else if (_carregandoMes || calendario.mes != mes) {
      conteudo = EntradaSuave(
        key: ValueKey<String>('esqueleto-$mes'),
        child: const GradeEsqueleto(),
      );
    } else {
      conteudo = GradeDoMes(key: ValueKey<String>('grade-$mes'), calendario: calendario);
    }
    final reduzido = MediaQuery.of(context).disableAnimations;
    return AnimatedSwitcher(
      duration: reduzido ? Duration.zero : DesignTokens.durBase,
      switchInCurve: DesignTokens.easeInOut,
      switchOutCurve: DesignTokens.easeInOut,
      layoutBuilder: (atual, anteriores) =>
          Stack(alignment: Alignment.topCenter, children: <Widget>[...anteriores, ?atual]),
      child: conteudo,
    );
  }

  List<Widget> _frases(ThemeData theme, Sequencia sequencia) {
    final calendario = _calendario!;
    if (_carregandoMes || calendario.mes != _mesExibido) {
      return const <Widget>[];
    }
    final caption = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    // Sem nenhum dia com leitura, o recorde é zero: a frase de conta nova (§4.5).
    if (sequencia.maior == 0 && calendario.dias.isEmpty) {
      return <Widget>[
        const SizedBox(height: DesignTokens.space4),
        Text(
          TextosDoCalendario.contaSemLeitura,
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
        ),
      ];
    }
    final hojeSemRegistro =
        calendario.mes == calendario.mesAtual &&
        calendario.diaDeHoje != null &&
        !calendario.hojeTemLeitura &&
        sequencia.atual > 0;
    return <Widget>[
      if (hojeSemRegistro) ...<Widget>[
        const SizedBox(height: DesignTokens.space3),
        Text(TextosDoCalendario.hojeSemRegistro, style: caption),
      ],
      if (!calendario.podeVoltar) ...<Widget>[
        const SizedBox(height: DesignTokens.space3),
        Text(TextosDoCalendario.mesMaisAntigo, style: caption),
      ],
    ];
  }

  /// Skeleton estático do layout final (§4.6), com um só fade de entrada.
  Widget _esqueleto(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        EntradaSuave(
          child: ExcludeSemantics(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Container(
                  height: 104,
                  decoration: BoxDecoration(
                    color: theme.elevatedSurface,
                    borderRadius: BorderRadius.circular(DesignTokens.radiusMd),
                  ),
                ),
                const SizedBox(height: DesignTokens.space6),
                SizedBox(
                  height: 48,
                  child: Center(
                    child: FractionallySizedBox(
                      widthFactor: 0.4,
                      child: Container(
                        height: 20,
                        decoration: BoxDecoration(
                          color: theme.divider,
                          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: DesignTokens.space4),
                const GradeEsqueleto(),
              ],
            ),
          ),
        ),
        if (_demorando) ...<Widget>[
          const SizedBox(height: DesignTokens.space4),
          Semantics(
            liveRegion: true,
            child: Text(
              TextosDoCalendario.coldStart,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
            ),
          ),
        ],
      ],
    );
  }

  Widget _bannerDeFalha(ThemeData theme, _Falha falha) {
    final tentar = BotaoTextual(
      texto: TextosDoCalendario.tentarDeNovo,
      onPressed: () => unawaited(_carregarTudo()),
    );
    if (falha == _Falha.servidor) {
      return BannerAviso(
        variante: VarianteAviso.erro,
        triangulo: true,
        mensagem: TextosDoCalendario.erro,
        acao: tentar,
      );
    }
    final naFila = widget.fila?.itens.length ?? 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        _BannerSemConexao(acao: tentar),
        if (naFila > 0) ...<Widget>[
          const SizedBox(height: DesignTokens.space4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(PhosphorIconsRegular.cloudArrowUp, size: 16, color: theme.secondaryText),
              const SizedBox(width: DesignTokens.space2),
              Expanded(
                child: Text(
                  registrosNaFila(naFila),
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Caret de troca de mês (§4, navegação): alvo de 48 por 48, sem fundo nem borda. Desabilitado
/// fica em `grafite-suave`, sem resposta a toque, e é anunciado como indisponível, sem sumir.
class _BotaoDeMes extends StatelessWidget {
  final IconData icone;
  final String rotulo;
  final VoidCallback? aoTocar;

  const _BotaoDeMes({required this.icone, required this.rotulo, required this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final habilitado = aoTocar != null;
    return Semantics(
      button: true,
      enabled: habilitado,
      label: rotulo,
      onTap: aoTocar,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: aoTocar,
        behavior: HitTestBehavior.opaque,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Center(
            child: Icon(
              icone,
              size: 24,
              color: habilitado ? theme.colorScheme.onSurface : theme.tertiaryText,
            ),
          ),
        ),
      ),
    );
  }
}

/// Sem conexão não é erro (§4.9): fundo `papel-elevado`, `WifiSlash` em `grafite`, sem `rubi`.
class _BannerSemConexao extends StatelessWidget {
  final Widget acao;

  const _BannerSemConexao({required this.acao});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(DesignTokens.space4),
        decoration: BoxDecoration(
          color: theme.elevatedSurface,
          borderRadius: BorderRadius.circular(DesignTokens.radius),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(PhosphorIconsRegular.wifiSlash, size: 20, color: theme.secondaryText),
            const SizedBox(width: DesignTokens.space3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(TextosDoCalendario.semConexao, style: theme.textTheme.bodyMedium),
                  const SizedBox(height: DesignTokens.space2),
                  acao,
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
