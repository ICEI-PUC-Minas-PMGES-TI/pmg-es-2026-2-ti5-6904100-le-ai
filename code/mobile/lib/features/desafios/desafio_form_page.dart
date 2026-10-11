import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/cabecalho_tela.dart';
import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_destrutivo.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/faixa_informativa.dart';
import '../../design/widgets/folha_inferior.dart';
import 'desafios_service.dart';
import 'textos.dart';
import 'widgets_de_desafios.dart';

/// Criar e editar desafio (docs/design/periodo-2/F-DSF/criar-desafio.md, RF-DSF-01/04). A tela é
/// empilhada na aba Perfil, com a barra inferior; voltar nunca pede confirmação (§4).
///
/// Três escolhas, nada pré-selecionado: unidade, período e quanto. O resumo e a faixa só aparecem
/// com as três válidas. O alvo é validado ao sair do campo ou depois de uma tentativa, e o teto
/// da unidade é conferido aqui com a mesma frase do servidor (decisão do dono de 09/10/2026); o
/// 400/422 com `campos.valorAlvo` também cai no campo.
///
/// Reenviar a mesma intenção (mesmo corpo) repete a `Idempotency-Key` (RNF-ERR-04). A edição
/// manda só o que mudou e fica desabilitada sem mudança.
class DesafioFormPage extends StatefulWidget {
  final DesafiosService servico;

  /// Sem desafio, cria; com ele, edita.
  final Desafio? desafio;

  /// Volta para a lista: depois de salvar, de excluir ou pela seta.
  final VoidCallback aoConcluir;

  /// O dia de hoje para a faixa (`em setembro`, `em 2026`). Injetável para os testes.
  final DateTime Function() hoje;

  const DesafioFormPage({
    super.key,
    required this.servico,
    this.desafio,
    required this.aoConcluir,
    this.hoje = DateTime.now,
  });

  @override
  State<DesafioFormPage> createState() => _DesafioFormPageState();
}

class _DesafioFormPageState extends State<DesafioFormPage> {
  late UnidadeDesafio? _unidade = widget.desafio?.unidade;
  late JanelaDesafio? _janela = widget.desafio?.janela;
  late final TextEditingController _alvo = TextEditingController(
    text: widget.desafio == null ? '' : '${widget.desafio!.valorAlvo}',
  );
  final FocusNode _focoDoAlvo = FocusNode();

  bool _alvoTocado = false;
  bool _enviando = false;
  bool _demorando = false;
  bool _excluindo = false;
  String? _erroDoServidor;
  String? _erroDoAlvoNoServidor;
  String? _erroDaExclusao;

  ({String corpo, String valor})? _chave;
  String? _chaveDaExclusao;
  Timer? _relogio;

  bool get _edicao => widget.desafio != null;

  @override
  void initState() {
    super.initState();
    _focoDoAlvo.addListener(() {
      if (!_focoDoAlvo.hasFocus && mounted) {
        setState(() => _alvoTocado = true);
      }
    });
  }

  @override
  void dispose() {
    _relogio?.cancel();
    _alvo.dispose();
    _focoDoAlvo.dispose();
    super.dispose();
  }

  int? get _valor => int.tryParse(_alvo.text.trim());

  /// Erro do alvo, na ordem: o do servidor, vazio depois de tocado, zero, acima do teto.
  String? get _erroDoAlvo {
    if (_erroDoAlvoNoServidor != null) {
      return _erroDoAlvoNoServidor;
    }
    final valor = _valor;
    final unidade = _unidade;
    // Acima do teto não há o que esperar: nenhum dígito a mais corrige, e o botão já desabilitou.
    if (valor != null && unidade != null && valor > unidade.tetoDoAlvo) {
      return erroDoTeto(unidade);
    }
    if (!_alvoTocado) {
      return null;
    }
    if (valor == null) {
      return 'Informe quanto você quer alcançar.';
    }
    if (valor <= 0) {
      return 'Informe um número maior que zero.';
    }
    return null;
  }

  bool get _alvoValido {
    final valor = _valor;
    final unidade = _unidade;
    return valor != null &&
        valor > 0 &&
        (unidade == null || valor <= unidade.tetoDoAlvo) &&
        _erroDoAlvoNoServidor == null;
  }

  bool get _completo => _unidade != null && _janela != null && _alvoValido;

  bool get _mudou {
    final desafio = widget.desafio;
    return desafio == null ||
        _unidade != desafio.unidade ||
        _janela != desafio.janela ||
        _valor != desafio.valorAlvo;
  }

  bool get _ocupado => _enviando || _excluindo;

  String _chaveDaIntencao(Map<String, Object?> corpo) {
    final serializado = corpo.toString();
    final chave = _chave;
    if (chave != null && chave.corpo == serializado) {
      return chave.valor;
    }
    final valor = ApiClient.newIdempotencyKey();
    _chave = (corpo: serializado, valor: valor);
    return valor;
  }

  void _voltar() {
    if (!_ocupado) {
      widget.aoConcluir();
    }
  }

  void _escolherUnidade(UnidadeDesafio unidade) => setState(() {
    _unidade = unidade;
    // O teto muda com a unidade; o erro do servidor era sobre a anterior.
    _erroDoAlvoNoServidor = null;
  });

  Future<void> _enviar() async {
    if (!_completo || !_mudou || _ocupado) {
      return;
    }
    setState(() {
      _enviando = true;
      _erroDoServidor = null;
      _demorando = false;
    });
    _relogio = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() => _demorando = true);
      }
    });
    final unidade = _unidade!;
    final janela = _janela!;
    final valor = _valor!;
    // O fuso vai no corpo: entra na chave, para que um novo fuso seja uma nova intenção e não um
    // 409 a cada tentativa.
    final fuso = widget.servico.fusoDoDispositivo();
    try {
      final desafio = widget.desafio;
      if (desafio != null) {
        final corpo = <String, Object?>{
          if (unidade != desafio.unidade) 'unidade': unidade.valor,
          if (janela != desafio.janela) 'janela': janela.valor,
          if (valor != desafio.valorAlvo) 'valorAlvo': valor,
        };
        await widget.servico.editar(
          desafio.id,
          corpo,
          idempotencyKey: _chaveDaIntencao(<String, Object?>{...corpo, 'fusoHorario': fuso}),
          fusoHorario: fuso,
        );
      } else {
        final corpo = <String, Object?>{
          'unidade': unidade.valor,
          'janela': janela.valor,
          'valorAlvo': valor,
          'fusoHorario': fuso,
        };
        await widget.servico.criar(
          unidade: unidade,
          janela: janela,
          valorAlvo: valor,
          idempotencyKey: _chaveDaIntencao(corpo),
          fusoHorario: fuso,
        );
      }
      if (!mounted) {
        return;
      }
      _relogio?.cancel();
      setState(() => _enviando = false);
      widget.aoConcluir();
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      final doCampo = erro.status == 400 || erro.status == 422 ? erro.campos['valorAlvo'] : null;
      setState(() {
        if (doCampo != null) {
          _erroDoAlvoNoServidor = doCampo;
        } else {
          _erroDoServidor = _edicao
              ? 'Não foi possível salvar as alterações. $textoDeFalhaDeRede'
              : 'Não foi possível criar o desafio. $textoDeFalhaDeRede';
        }
      });
      if (doCampo != null) {
        _focoDoAlvo.requestFocus();
      }
    } finally {
      _relogio?.cancel();
      if (mounted) {
        setState(() {
          _enviando = false;
          _demorando = false;
        });
      }
    }
  }

  Future<void> _excluir() async {
    final desafio = widget.desafio;
    if (desafio == null) {
      return;
    }
    // O título salvo, e não o editado e ainda não salvo.
    final confirmado = await confirmarAcaoDestrutiva(
      Navigator.of(context, rootNavigator: true).context,
      titulo: tituloDaExclusao(desafio),
      texto: textoDaExclusao,
      acao: 'Excluir desafio',
    );
    if (!confirmado || !mounted) {
      return;
    }
    setState(() {
      _excluindo = true;
      _erroDaExclusao = null;
    });
    _chaveDaExclusao ??= ApiClient.newIdempotencyKey();
    try {
      await widget.servico.excluir(desafio.id, idempotencyKey: _chaveDaExclusao!);
      if (mounted) {
        setState(() => _excluindo = false);
        widget.aoConcluir();
      }
    } on ApiException catch (erro) {
      if (!mounted) {
        return;
      }
      setState(() => _excluindo = false);
      // Já excluído (por outra tela ou outro aparelho): o resultado é o mesmo.
      if (erro.status == 404) {
        widget.aoConcluir();
        return;
      }
      setState(() => _erroDaExclusao = 'Não foi possível excluir o desafio. $textoDeFalhaDeRede');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final legenda = theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText);
    final rotulo = theme.textTheme.labelMedium;
    final desafio = widget.desafio;
    final unidade = _unidade;
    final janela = _janela;
    final erroDoAlvo = _erroDoAlvo;
    final hoje = widget.hoje();
    final fonteGrande = MediaQuery.textScalerOf(context).scale(16) > 16 * 1.3;

    Widget grupo({required String titulo, required Widget conteudo, Widget? rodape}) {
      return Semantics(
        container: true,
        label: titulo,
        explicitChildNodes: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            ExcludeSemantics(child: Text(titulo, style: rotulo)),
            const SizedBox(height: DesignTokens.space2),
            conteudo,
            if (rodape != null) ...<Widget>[const SizedBox(height: DesignTokens.space2), rodape],
          ],
        ),
      );
    }

    final chipsDeUnidade = <Widget>[
      for (final opcao in UnidadeDesafio.values)
        ChipDeEscolha(
          rotulo: rotuloDaUnidade(opcao),
          icone: iconeDaUnidade(opcao, preenchido: opcao == unidade),
          ativo: opcao == unidade,
          ocupado: _ocupado,
          aoTocar: () => _escolherUnidade(opcao),
        ),
    ];

    return Column(
      children: <Widget>[
        CabecalhoTela(
          titulo: _edicao ? 'Editar desafio' : 'Novo desafio',
          aoVoltar: _voltar,
          semDivisor: true,
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
              DesignTokens.space5,
              DesignTokens.space6,
              DesignTokens.space5,
              DesignTokens.space6,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                if (desafio != null && desafio.pausado) ...<Widget>[
                  Row(
                    children: <Widget>[
                      const PillPausado(),
                      const SizedBox(width: DesignTokens.space3),
                      Expanded(child: Text('Continua pausado depois de salvar.', style: legenda)),
                    ],
                  ),
                  const SizedBox(height: DesignTokens.space6),
                ],
                grupo(
                  titulo: 'O que você quer contar',
                  conteudo: fonteGrande
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: <Widget>[
                            for (var i = 0; i < chipsDeUnidade.length; i++) ...<Widget>[
                              if (i > 0) const SizedBox(height: DesignTokens.space2),
                              chipsDeUnidade[i],
                            ],
                          ],
                        )
                      : Row(
                          children: <Widget>[
                            for (var i = 0; i < chipsDeUnidade.length; i++) ...<Widget>[
                              if (i > 0) const SizedBox(width: DesignTokens.space2),
                              Expanded(child: chipsDeUnidade[i]),
                            ],
                          ],
                        ),
                  rodape: Text(ajudaDaUnidade(unidade), style: legenda),
                ),
                const SizedBox(height: DesignTokens.space6),
                grupo(
                  titulo: 'Em que período',
                  conteudo: Column(
                    children: <Widget>[
                      for (final linha in <List<JanelaDesafio>>[
                        <JanelaDesafio>[JanelaDesafio.diaria, JanelaDesafio.semanal],
                        <JanelaDesafio>[JanelaDesafio.mensal, JanelaDesafio.anual],
                      ]) ...<Widget>[
                        if (linha.first == JanelaDesafio.mensal)
                          const SizedBox(height: DesignTokens.space2),
                        Row(
                          children: <Widget>[
                            for (final opcao in linha) ...<Widget>[
                              if (opcao != linha.first) const SizedBox(width: DesignTokens.space2),
                              Expanded(
                                child: ChipDeEscolha(
                                  rotulo: rotuloDaJanela(opcao),
                                  ativo: opcao == janela,
                                  ocupado: _ocupado,
                                  aoTocar: () => setState(() => _janela = opcao),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ],
                  ),
                  rodape: Text(ajudaDaJanela, style: legenda),
                ),
                const SizedBox(height: DesignTokens.space6),
                grupo(
                  titulo: 'Quanto',
                  conteudo: Row(
                    children: <Widget>[
                      SizedBox(
                        width: 160,
                        child: Semantics(
                          label: 'Quanto',
                          hint: erroDoAlvo ?? ajudaDoAlvo,
                          child: CampoTexto(
                            controller: _alvo,
                            label: '',
                            placeholder: '20',
                            focusNode: _focoDoAlvo,
                            enabled: !_ocupado,
                            bordaDeErro: erroDoAlvo != null,
                            keyboardType: TextInputType.number,
                            inputFormatters: <TextInputFormatter>[
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(7),
                            ],
                            estiloDoTexto: theme.numInline.copyWith(
                              fontSize: 15,
                              fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
                            ),
                            onChanged: (_) => setState(() => _erroDoAlvoNoServidor = null),
                          ),
                        ),
                      ),
                      if (unidade != null) ...<Widget>[
                        const SizedBox(width: DesignTokens.space3),
                        ExcludeSemantics(
                          child: Text(
                            nomeDaUnidade(unidade, _valor ?? 0),
                            style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                          ),
                        ),
                      ],
                    ],
                  ),
                  rodape: ExcludeSemantics(
                    child: Text(
                      erroDoAlvo ?? ajudaDoAlvo,
                      style: erroDoAlvo == null
                          ? legenda
                          : theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
                    ),
                  ),
                ),
                if (_completo) ...<Widget>[
                  const SizedBox(height: DesignTokens.space6),
                  Text.rich(
                    TextSpan(
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
                      children: <InlineSpan>[
                        const TextSpan(text: 'Seu desafio: '),
                        TextSpan(
                          text: '${_valor!}',
                          style: theme.numInline.copyWith(fontWeight: FontWeight.w600),
                        ),
                        TextSpan(
                          text: tituloDoDesafio(
                            unidade!,
                            janela!,
                            _valor!,
                          ).substring('${_valor!}'.length),
                          style: theme.textTheme.labelLarge,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: DesignTokens.space4),
                  FaixaInformativa(
                    mensagem: desafio == null
                        ? faixaDaCriacao(janela, hoje)
                        : faixaDaEdicao(janela, desafio.janela, hoje),
                  ),
                ],
                if (_erroDoServidor != null) ...<Widget>[
                  const SizedBox(height: DesignTokens.space6),
                  BannerAviso(
                    variante: VarianteAviso.erro,
                    triangulo: true,
                    mensagem: _erroDoServidor!,
                  ),
                ],
                const SizedBox(height: DesignTokens.space8),
                BotaoPrimario(
                  texto: _edicao
                      ? (_enviando ? 'Salvando alterações' : 'Salvar alterações')
                      : (_enviando ? 'Criando desafio' : 'Criar desafio'),
                  carregando: _enviando,
                  desabilitadoNeutro: true,
                  onPressed: _completo && _mudou && !_excluindo ? _enviar : null,
                ),
                if (_demorando) ...<Widget>[
                  const SizedBox(height: DesignTokens.space2),
                  Semantics(
                    liveRegion: true,
                    child: Text(
                      'O serviço está iniciando. Isso pode levar alguns segundos.',
                      textAlign: TextAlign.center,
                      style: legenda,
                    ),
                  ),
                ],
                const SizedBox(height: DesignTokens.space3),
                BotaoTextual(
                  texto: 'Cancelar',
                  neutro: true,
                  larguraTotal: true,
                  onPressed: _ocupado ? null : _voltar,
                ),
                if (_edicao) ...<Widget>[
                  const SizedBox(height: DesignTokens.space8),
                  Divider(height: 1, color: theme.divider),
                  const SizedBox(height: DesignTokens.space5),
                  BotaoDestrutivo(
                    texto: 'Excluir desafio',
                    carregando: _excluindo,
                    onPressed: _enviando ? null : _excluir,
                  ),
                  if (_erroDaExclusao != null) ...<Widget>[
                    const SizedBox(height: DesignTokens.space3),
                    BannerAviso(
                      variante: VarianteAviso.erro,
                      triangulo: true,
                      mensagem: _erroDaExclusao!,
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Chip de escolha única do formulário (criar-desafio.md §4): 48px, pill. Inativo com borda
/// `linha` e texto `grafite`; ativo em `musgo-fundo`, sem borda, ícone `fill` e texto `musgo`
/// 600. Tocar no ativo não desmarca. Para o leitor de tela, um rádio do grupo.
class ChipDeEscolha extends StatelessWidget {
  final String rotulo;
  final IconData? icone;
  final bool ativo;

  /// Enquanto salva, os inativos esmaecem em `grafite-suave` e nada responde ao toque.
  final bool ocupado;
  final VoidCallback aoTocar;

  const ChipDeEscolha({
    super.key,
    required this.rotulo,
    this.icone,
    required this.ativo,
    this.ocupado = false,
    required this.aoTocar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cor = ativo
        ? theme.primaryAccent
        : ocupado
        ? theme.tertiaryText
        : theme.secondaryText;
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: ativo,
      enabled: !ocupado,
      label: rotulo,
      // Com `excludeSemantics`, a ação de toque do `InkWell` some da árvore: vai aqui.
      onTap: ocupado ? null : aoTocar,
      excludeSemantics: true,
      child: InkWell(
        onTap: ocupado ? null : aoTocar,
        borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space3),
            decoration: BoxDecoration(
              color: ativo ? theme.accentTint : null,
              border: ativo ? null : Border.all(color: theme.divider),
              borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                if (icone != null) ...<Widget>[
                  Icon(icone, size: 20, color: cor),
                  const SizedBox(width: DesignTokens.space2),
                ],
                Flexible(
                  child: Text(
                    rotulo,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: cor,
                      fontWeight: ativo ? FontWeight.w600 : null,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
