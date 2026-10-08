import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/campo_texto.dart';
import '../../design/widgets/folha_inferior.dart';
import 'filtros_da_busca.dart';

/// Botão de filtros ao lado do campo de busca (`descobrir.md` do Período 2). Inativo: 48x48,
/// borda `linha`, fundo `papel-elevado`, ícone regular. Com filtro: fundo `musgo-fundo`, ícone
/// cheio em `musgo` e o badge da contagem, igual ao do sino.
class BotaoDeFiltros extends StatelessWidget {
  final int ativos;
  final VoidCallback aoTocar;

  const BotaoDeFiltros({super.key, required this.ativos, required this.aoTocar});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ativo = ativos > 0;
    return Semantics(
      button: true,
      label: ativo ? 'Filtros, ${ativos == 1 ? '1 ativo' : '$ativos ativos'}' : 'Filtros',
      excludeSemantics: true,
      onTap: aoTocar,
      child: GestureDetector(
        onTap: aoTocar,
        behavior: HitTestBehavior.opaque,
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: ativo ? theme.accentTint : theme.elevatedSurface,
            borderRadius: BorderRadius.circular(DesignTokens.radius),
            border: ativo ? null : Border.all(color: theme.divider),
          ),
          child: Center(
            child: SizedBox(
              width: 24,
              height: 24,
              child: Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.center,
                children: <Widget>[
                  Icon(
                    ativo
                        ? PhosphorIconsFill.slidersHorizontal
                        : PhosphorIconsRegular.slidersHorizontal,
                    size: 20,
                    color: ativo ? theme.primaryAccent : theme.secondaryText,
                  ),
                  if (ativo)
                    Positioned(
                      top: -10,
                      right: -10,
                      child: Container(
                        width: 18,
                        height: 18,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: theme.primaryAccent,
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '$ativos',
                          style: TextStyle(
                            fontFamily: DesignTokens.fontMono,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onPrimary,
                            height: 1,
                          ),
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

/// Abre a folha de filtros. Devolve os filtros a aplicar (`FiltrosDaBusca.nenhum` em `Limpar
/// filtros`), ou nulo quando ela fecha sem aplicar: pela alça, pelo scrim ou pelo voltar.
Future<FiltrosDaBusca?> mostrarFolhaDeFiltros(BuildContext context, FiltrosDaBusca aplicados) =>
    mostrarFolhaInferior<FiltrosDaBusca>(
      context,
      builder: (context) => FolhaDeFiltros(aplicados: aplicados),
    );

/// Conteúdo da folha de filtros (`descobrir.md` do Período 2): título, texto de apoio, os seis
/// campos, o helper da faixa, `Aplicar filtros` e `Limpar filtros`. Nenhum campo ganha foco ao
/// abrir, para o teclado não subir. Texto livre, sem autocompletar.
///
/// A validação roda ao sair do campo e ao aplicar, nunca a cada dígito. Com erro, a folha não
/// fecha, o foco vai para `Mínimo de páginas`, a mensagem é anunciada e nada vai ao servidor.
class FolhaDeFiltros extends StatefulWidget {
  final FiltrosDaBusca aplicados;

  const FolhaDeFiltros({super.key, required this.aplicados});

  @override
  State<FolhaDeFiltros> createState() => _FolhaDeFiltrosState();
}

class _FolhaDeFiltrosState extends State<FolhaDeFiltros> {
  late final RascunhoDosFiltros _inicial = RascunhoDosFiltros.de(widget.aplicados);
  late final _autor = TextEditingController(text: _inicial.autor);
  late final _editora = TextEditingController(text: _inicial.editora);
  late final _serie = TextEditingController(text: _inicial.serie);
  late final _ano = TextEditingController(text: _inicial.ano);
  late final _minimo = TextEditingController(text: _inicial.paginasMin);
  late final _maximo = TextEditingController(text: _inicial.paginasMax);
  final _focoDoAno = FocusNode();
  final _focoDoMinimo = FocusNode();
  final _focoDoMaximo = FocusNode();
  ErrosDosFiltros _erros = const ErrosDosFiltros();

  @override
  void initState() {
    super.initState();
    for (final foco in <FocusNode>[_focoDoAno, _focoDoMinimo, _focoDoMaximo]) {
      foco.addListener(() {
        if (!foco.hasFocus) {
          setState(() => _erros = _rascunho.validar());
        }
      });
    }
  }

  @override
  void dispose() {
    for (final controlador in <TextEditingController>[
      _autor,
      _editora,
      _serie,
      _ano,
      _minimo,
      _maximo,
    ]) {
      controlador.dispose();
    }
    _focoDoAno.dispose();
    _focoDoMinimo.dispose();
    _focoDoMaximo.dispose();
    super.dispose();
  }

  RascunhoDosFiltros get _rascunho => RascunhoDosFiltros(
    autor: _autor.text,
    editora: _editora.text,
    serie: _serie.text,
    ano: _ano.text,
    paginasMin: _minimo.text,
    paginasMax: _maximo.text,
  );

  void _aplicar() {
    final erros = _rascunho.validar();
    if (erros.algum) {
      setState(() => _erros = erros);
      (erros.ano != null &&
                  erros.paginasMin == null &&
                  erros.paginasMax == null &&
                  erros.faixa == null
              ? _focoDoAno
              : _focoDoMinimo)
          .requestFocus();
      SemanticsService.sendAnnouncement(
        View.of(context),
        erros.principal!,
        Directionality.of(context),
      );
      return;
    }
    Navigator.of(context).pop(_rascunho.paraFiltros());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final faixaInvertida = _erros.faixa != null;
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Semantics(header: true, child: Text('Filtros', style: theme.textTheme.titleMedium)),
          const SizedBox(height: DesignTokens.space2),
          Text(
            'Preencha só o que quiser usar. Os filtros valem junto com a busca e o assunto.',
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
          ),
          const SizedBox(height: DesignTokens.space5),
          _texto(_autor, 'Autor', 'Nome do autor'),
          const SizedBox(height: DesignTokens.space4),
          _texto(_editora, 'Editora', 'Nome da editora'),
          const SizedBox(height: DesignTokens.space4),
          _texto(_serie, 'Série', 'Nome da série'),
          const SizedBox(height: DesignTokens.space4),
          CampoTexto(
            controller: _ano,
            focusNode: _focoDoAno,
            label: 'Ano de publicação',
            placeholder: 'Ex.: 2019',
            keyboardType: TextInputType.number,
            erro: _erros.ano,
            inputFormatters: _digitos(digitosDoAno),
          ),
          const SizedBox(height: DesignTokens.space4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: _paginas(
                  _minimo,
                  _focoDoMinimo,
                  'Mínimo de páginas',
                  _erros.paginasMin,
                  faixaInvertida,
                ),
              ),
              const SizedBox(width: DesignTokens.space3),
              Expanded(
                child: _paginas(
                  _maximo,
                  _focoDoMaximo,
                  'Máximo de páginas',
                  _erros.paginasMax,
                  faixaInvertida,
                ),
              ),
            ],
          ),
          if (faixaInvertida) ...<Widget>[
            const SizedBox(height: DesignTokens.space2),
            Text(
              _erros.faixa!,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
            ),
          ],
          const SizedBox(height: DesignTokens.space2),
          Text(
            'Use números inteiros maiores que zero.',
            style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
          ),
          const SizedBox(height: DesignTokens.space6),
          BotaoPrimario(texto: 'Aplicar filtros', onPressed: _aplicar),
          const SizedBox(height: DesignTokens.space3),
          BotaoTextual(
            texto: 'Limpar filtros',
            larguraTotal: true,
            onPressed: () => Navigator.of(context).pop(FiltrosDaBusca.nenhum),
          ),
        ],
      ),
    );
  }

  Widget _texto(TextEditingController controlador, String label, String placeholder) => CampoTexto(
    controller: controlador,
    label: label,
    placeholder: placeholder,
    inputFormatters: <TextInputFormatter>[LengthLimitingTextInputFormatter(maximoDoTextoDoFiltro)],
  );

  Widget _paginas(
    TextEditingController controlador,
    FocusNode foco,
    String label,
    String? erro,
    bool faixaInvertida,
  ) {
    final theme = Theme.of(context);
    return CampoTexto(
      controller: controlador,
      focusNode: foco,
      label: label,
      keyboardType: TextInputType.number,
      erro: erro,
      bordaDeErro: faixaInvertida,
      inputFormatters: _digitos(digitosDasPaginas),
      trailing: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsetsDirectional.only(end: DesignTokens.space4),
          child: Align(
            alignment: AlignmentDirectional.centerEnd,
            widthFactor: 1,
            child: Text(
              'páginas',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.tertiaryText),
            ),
          ),
        ),
      ),
    );
  }

  static List<TextInputFormatter> _digitos(int quantidade) => <TextInputFormatter>[
    FilteringTextInputFormatter.digitsOnly,
    LengthLimitingTextInputFormatter(quantidade),
  ];
}

/// Filtros aplicados, abaixo da faixa de assuntos: chips no estilo de chip ativo que quebram em
/// linhas, cada um com `X`, e `Limpar filtros` no fim. O assunto não vira chip.
class FileiraDeFiltros extends StatelessWidget {
  final List<ChipDeFiltro> chips;
  final ValueChanged<ChaveDoFiltro> aoRemover;
  final VoidCallback aoLimpar;

  const FileiraDeFiltros({
    super.key,
    required this.chips,
    required this.aoRemover,
    required this.aoLimpar,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Wrap(
      spacing: DesignTokens.space2,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: <Widget>[
        for (final chip in chips)
          Semantics(
            button: true,
            label: 'Remover filtro ${chip.rotulo}',
            excludeSemantics: true,
            onTap: () => aoRemover(chip.chave),
            child: GestureDetector(
              onTap: () => aoRemover(chip.chave),
              behavior: HitTestBehavior.opaque,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Align(
                  widthFactor: 1,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: DesignTokens.space4,
                      vertical: DesignTokens.space2,
                    ),
                    decoration: BoxDecoration(
                      color: theme.accentTint,
                      borderRadius: BorderRadius.circular(DesignTokens.radiusFull),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Flexible(
                          child: Text(
                            chip.rotulo,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.primaryAccent,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: DesignTokens.space1),
                        Icon(PhosphorIconsRegular.x, size: 16, color: theme.primaryAccent),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        BotaoTextual(texto: 'Limpar filtros', onPressed: aoLimpar),
      ],
    );
  }
}
