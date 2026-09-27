import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/botao_primario.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/capa_livro.dart';
import '../../design/widgets/dialogo_confirmacao.dart';
import '../../design/widgets/folha_inferior.dart';
import '../../design/widgets/seletor_de_nota.dart';
import '../livros/formatos.dart';
import 'avaliacao_controller.dart';

/// O que o painel e o editor mostram do livro: o card compacto (capa 60 por 90, título, autor).
class LivroAvaliado {
  final String titulo;
  final String? autor;
  final String? capaUrl;

  const LivroAvaliado({required this.titulo, this.autor, this.capaUrl});
}

enum _SaidaDoPainel { salva, remover }

const String _erroAoSalvar =
    'Não foi possível salvar sua nota. Verifique sua conexão e tente de novo.';
const String _erroAoRemover =
    'Não foi possível remover sua nota. Verifique sua conexão e tente de novo.';

/// Abre o painel de dar nota (avaliar-livro.md §4) como bottom sheet.
///
/// Remover passa por confirmação em modal (RNF-USA-04): o sheet dá lugar ao dialog centrado
/// (§4.5), e `Cancelar` volta ao painel.
Future<void> abrirPainelDeNota(
  BuildContext context, {
  required AvaliacaoController avaliacao,
  required LivroAvaliado livro,
}) async {
  String? erro;
  while (true) {
    if (!context.mounted) {
      return;
    }
    final saida = await mostrarFolhaInferior<_SaidaDoPainel>(
      context,
      builder: (_) => PainelDeNota(avaliacao: avaliacao, livro: livro, erroInicial: erro),
    );
    if (saida != _SaidaDoPainel.remover || !context.mounted) {
      return;
    }
    final confirmado = await confirmarNoModal(
      context,
      titulo: 'Remover sua nota?',
      texto: 'O livro volta a ficar sem nota sua. Sua resenha, se houver, continua publicada.',
      acao: 'Remover nota',
    );
    if (!confirmado) {
      erro = null;
      continue;
    }
    try {
      await avaliacao.removerNota();
      return;
    } on ApiException {
      erro = _erroAoRemover;
    }
  }
}

/// Conteúdo do painel. Público para os testes montarem sem o sheet.
class PainelDeNota extends StatefulWidget {
  final AvaliacaoController avaliacao;
  final LivroAvaliado livro;
  final String? erroInicial;

  const PainelDeNota({super.key, required this.avaliacao, required this.livro, this.erroInicial});

  @override
  State<PainelDeNota> createState() => _PainelDeNotaState();
}

class _PainelDeNotaState extends State<PainelDeNota> {
  late double? _escolhido = widget.avaliacao.nota?.valor;
  bool _salvando = false;
  late String? _erro = widget.erroInicial;

  Future<void> _salvar() async {
    final valor = _escolhido;
    if (valor == null) {
      return;
    }
    setState(() {
      _salvando = true;
      _erro = null;
    });
    try {
      await widget.avaliacao.salvarNota(valor);
      if (mounted) {
        Navigator.of(context).pop(_SaidaDoPainel.salva);
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _salvando = false;
          _erro = _erroAoSalvar;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final salva = widget.avaliacao.nota;
    final escolhido = _escolhido;
    final zeroSalvo = escolhido == 0 && salva?.valor == 0;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            CapaLivro(
              url: widget.livro.capaUrl,
              largura: 60,
              altura: 90,
              titulo: widget.livro.titulo,
              autor: widget.livro.autor,
            ),
            const SizedBox(width: DesignTokens.space4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    widget.livro.titulo,
                    style: theme.textTheme.titleSmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (widget.livro.autor != null)
                    Text(
                      widget.livro.autor!,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
                    ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: DesignTokens.space4),
        Divider(height: 1, color: theme.divider),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: DesignTokens.space8),
          child: Column(
            children: <Widget>[
              SeletorDeNota(
                valor: escolhido,
                habilitado: !_salvando,
                aoMudar: (valor) => setState(() => _escolhido = valor),
              ),
              const SizedBox(height: DesignTokens.space4),
              // O número é o que o leitor de tela anuncia; `Sem nota` e `0` só se distinguem
              // por aqui, porque as estrelas são as mesmas (RN-06).
              Semantics(
                liveRegion: true,
                child: escolhido == null
                    ? Text(
                        'Sem nota',
                        style: theme.textTheme.bodyMedium?.copyWith(color: theme.tertiaryText),
                      )
                    : Text(formatarNota(escolhido), style: theme.numDisplay),
              ),
              const SizedBox(height: DesignTokens.space2),
              Text(
                zeroSalvo ? 'Você deu nota 0 a este livro.' : 'de 0 a 5, com meia estrela',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.secondaryText),
              ),
            ],
          ),
        ),
        BotaoPrimario(
          texto: _salvando ? 'Salvando' : 'Salvar nota',
          carregando: _salvando,
          onPressed: escolhido == null ? null : _salvar,
        ),
        if (_erro != null) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          Text(_erro!, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error)),
        ],
        if (salva != null) ...<Widget>[
          const SizedBox(height: DesignTokens.space2),
          BotaoTextual(
            texto: 'Remover nota',
            destrutivo: true,
            larguraTotal: true,
            onPressed: _salvando ? null : () => Navigator.of(context).pop(_SaidaDoPainel.remover),
          ),
        ],
      ],
    );
  }
}
