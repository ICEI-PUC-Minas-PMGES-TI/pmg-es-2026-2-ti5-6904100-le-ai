import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import 'adicionar_frase.dart';
import 'frase_citada.dart';
import 'frases.dart';
import 'leitura_service.dart';

/// Seção `Frases e trechos` da página do livro (pagina-do-livro.md §5.4, F-AVA-2), igual a
/// `SecaoFrases.vue`: contagem, as três frases mais recentes de todos os leitores (RN-08 no
/// servidor), `Ver todas as frases` e `Adicionar frase`. Sem excluir aqui. Carrega à parte: com o
/// `leitura` fora, a página abre igual. No livro pessoal, a página só a monta para o dono.
class SecaoFrases extends StatefulWidget {
  final LeituraService leitura;
  final LivroDaFrase livro;
  final VoidCallback? aoVerTodas;

  const SecaoFrases({super.key, required this.leitura, required this.livro, this.aoVerTodas});

  @override
  State<SecaoFrases> createState() => _SecaoFrasesState();
}

enum _Carga { carregando, pronta, erro }

class _SecaoFrasesState extends State<SecaoFrases> {
  _Carga _carga = _Carga.carregando;
  PaginaFrases? _pagina;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar() async {
    setState(() => _carga = _Carga.carregando);
    try {
      final pagina = await widget.leitura.listarFrases(widget.livro.id, limite: 3);
      if (mounted) {
        setState(() {
          _pagina = pagina;
          _carga = _Carga.pronta;
        });
      }
    } on Exception {
      if (mounted) {
        setState(() => _carga = _Carga.erro);
      }
    }
  }

  Future<void> _adicionar() async {
    final pagina = _pagina;
    final resultado = await abrirAdicionarFrase(
      context,
      leitura: widget.leitura,
      livro: widget.livro,
      minhasFrases: pagina?.minhasFrases ?? 0,
      limite: pagina?.limitePorLivro ?? 10,
    );
    if (!mounted || pagina == null) return;
    switch (resultado) {
      case FraseSalva(:final frase):
        // A frase nova entra em primeiro; a mais antiga das três fica só na lista completa.
        setState(() {
          _pagina = PaginaFrases(
            itens: <Frase>[frase, ...pagina.itens].take(3).toList(),
            page: pagina.page,
            totalItens: pagina.totalItens + 1,
            totalPaginas: pagina.totalPaginas,
            minhasFrases: pagina.minhasFrases + 1,
            limitePorLivro: pagina.limitePorLivro,
          );
        });
      case VerMinhasFrases():
        widget.aoVerTodas?.call();
      case null:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pagina = _pagina;
    final total = pagina?.totalItens ?? 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: <Widget>[
            Text(TextosDasFrases.titulo, style: theme.textTheme.titleLarge),
            if (_carga == _Carga.pronta && total > 0) ...<Widget>[
              const SizedBox(width: DesignTokens.space3),
              Text(
                rotuloDeFrases(total),
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ],
          ],
        ),
        const SizedBox(height: DesignTokens.space4),
        ...switch (_carga) {
          _Carga.carregando => <Widget>[_esqueleto(theme)],
          _Carga.erro => <Widget>[
            Text(
              TextosDasFrases.erroCarga,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
            ),
            BotaoTextual(texto: TextosDasFrases.tentarDeNovo, onPressed: _carregar),
          ],
          _Carga.pronta when total == 0 => <Widget>[
            Icon(PhosphorIconsRegular.quotes, size: 32, color: theme.tertiaryText),
            const SizedBox(height: DesignTokens.space3),
            Text(TextosDasFrases.vazioTitulo, style: theme.textTheme.titleMedium),
            const SizedBox(height: DesignTokens.space2),
            Text(
              TextosDasFrases.vazioTexto,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText),
            ),
            const SizedBox(height: DesignTokens.space4),
            BotaoPrimario(texto: TextosDasFrases.vazioBotao, onPressed: _adicionar),
          ],
          _Carga.pronta => <Widget>[
            for (final (indice, frase) in pagina!.itens.indexed) ...<Widget>[
              if (indice > 0) const SizedBox(height: DesignTokens.space5),
              FraseCitada(frase: frase),
            ],
            const SizedBox(height: DesignTokens.space3),
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              spacing: DesignTokens.space3,
              children: <Widget>[
                if (widget.aoVerTodas != null)
                  BotaoTextual(texto: TextosDasFrases.verTodas, onPressed: widget.aoVerTodas),
                if (pagina.minhasFrases < pagina.limitePorLivro)
                  TextButton.icon(
                    onPressed: _adicionar,
                    icon: const Icon(PhosphorIconsRegular.plus, size: 20),
                    label: const Text(TextosDasFrases.adicionar),
                    style: TextButton.styleFrom(
                      foregroundColor: theme.primaryAccent,
                      minimumSize: const Size(48, 48),
                      textStyle: theme.textTheme.labelLarge,
                    ),
                  ),
              ],
            ),
          ],
        },
      ],
    );
  }

  Widget _esqueleto(ThemeData theme) {
    Widget barra(double fracao, double altura) => FractionallySizedBox(
      widthFactor: fracao,
      alignment: Alignment.centerLeft,
      child: Container(
        height: altura,
        decoration: BoxDecoration(
          color: theme.coverPlaceholder,
          borderRadius: BorderRadius.circular(DesignTokens.radiusSm),
        ),
      ),
    );
    return ExcludeSemantics(
      child: Container(
        padding: const EdgeInsets.only(left: DesignTokens.space4),
        decoration: BoxDecoration(
          border: Border(left: BorderSide(color: theme.coverPlaceholder, width: 2)),
        ),
        child: Column(
          children: <Widget>[
            barra(0.95, 17),
            const SizedBox(height: DesignTokens.space2),
            barra(0.55, 17),
            const SizedBox(height: DesignTokens.space2),
            barra(0.35, 13),
          ],
        ),
      ),
    );
  }
}
