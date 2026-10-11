import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../../core/network/api_client.dart';
import '../../design/theme.dart';
import '../../design/tokens.dart';
import '../../design/widgets/banner_aviso.dart';
import '../../design/widgets/botao_textual.dart';
import '../../design/widgets/entrada_suave.dart';
import '../perfil/perfil_service.dart';
import 'lista_form_page.dart';
import 'listas_service.dart';
import 'widgets_de_lista.dart';

/// Seção `Listas` do perfil no mobile (meu-perfil.md P2 §4.2 E, perfil-de-outro-leitor.md P2
/// §4 C): as três listas atualizadas mais recentemente no card do índice, `Ver todas` (o índice)
/// e, para o dono, `Nova lista` como botão textual. Última seção do perfil.
///
/// Quem usa decide se mostra: com o perfil restrito (RN-08), nada daqui aparece.
class ListasDoPerfil extends StatefulWidget {
  final ListasService servico;
  final String usuarioId;
  final bool proprio;

  /// Primeiro nome, para `Rafael ainda não criou listas.`
  final String? nome;
  final VoidCallback aoVerTodas;
  final ValueChanged<String> aoAbrirLista;
  final Future<Privacidade> Function()? obterPrivacidade;

  const ListasDoPerfil({
    super.key,
    required this.servico,
    required this.usuarioId,
    required this.proprio,
    this.nome,
    required this.aoVerTodas,
    required this.aoAbrirLista,
    this.obterPrivacidade,
  });

  @override
  State<ListasDoPerfil> createState() => _ListasDoPerfilState();
}

class _ListasDoPerfilState extends State<ListasDoPerfil> {
  List<ListaResumo> _listas = const <ListaResumo>[];
  bool _carregando = true;
  bool _falhou = false;

  @override
  void initState() {
    super.initState();
    widget.servico.alteracoes.addListener(_carregar);
    _carregar();
  }

  @override
  void dispose() {
    widget.servico.alteracoes.removeListener(_carregar);
    super.dispose();
  }

  /// Só a primeira página, de três: a seção não mostra total.
  Future<void> _carregar() async {
    setState(() {
      _carregando = _listas.isEmpty;
      _falhou = false;
    });
    try {
      final pagina = await widget.servico.listarDoPerfil(widget.usuarioId, 0, tamanho: 3);
      if (mounted) {
        setState(() {
          _listas = pagina.itens.take(3).toList();
          _carregando = false;
        });
      }
    } on ApiException {
      if (mounted) {
        setState(() {
          _carregando = false;
          _falhou = true;
        });
      }
    }
  }

  Future<void> _novaLista() async {
    final resultado = await abrirFormularioDeLista(
      context,
      servico: widget.servico,
      obterPrivacidade: widget.obterPrivacidade,
    );
    final lista = resultado?.lista;
    if (mounted && lista != null) {
      widget.aoAbrirLista(lista.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textoMudo = theme.textTheme.bodyMedium?.copyWith(color: theme.secondaryText);
    final vazio = !_carregando && !_falhou && _listas.isEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Semantics(
                header: true,
                child: Text('Listas', style: theme.textTheme.headlineSmall),
              ),
            ),
            if (_listas.isNotEmpty)
              TextButton(
                onPressed: widget.aoVerTodas,
                style: TextButton.styleFrom(
                  foregroundColor: theme.primaryAccent,
                  minimumSize: const Size(48, 48),
                  padding: const EdgeInsets.symmetric(horizontal: DesignTokens.space1),
                  textStyle: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                child: const Text('Ver todas'),
              ),
          ],
        ),
        const SizedBox(height: DesignTokens.space3),
        if (_carregando)
          const EntradaSuave(
            child: Column(children: <Widget>[SkeletonDeCard(), SkeletonDeCard(), SkeletonDeCard()]),
          )
        else if (_falhou)
          BannerAviso(
            variante: VarianteAviso.erro,
            triangulo: true,
            mensagem: widget.proprio
                ? 'Não foi possível carregar suas listas. Verifique sua conexão e tente de novo.'
                : 'Não foi possível carregar as listas. Verifique sua conexão e tente de novo.',
            acao: BotaoTextual(texto: 'Tentar de novo', onPressed: _carregar),
          )
        else if (vazio)
          Text(
            widget.proprio
                ? 'Junte livros sob um título, com uma descrição e na ordem que você quiser.'
                : '${widget.nome ?? 'Este leitor'} ainda não criou listas.',
            style: textoMudo,
          )
        else
          for (var i = 0; i < _listas.length; i++)
            DecoratedBox(
              decoration: BoxDecoration(
                border: i == _listas.length - 1
                    ? null
                    : Border(bottom: BorderSide(color: theme.divider)),
              ),
              child: CardDeLista(
                lista: _listas[i],
                aoTocar: () => widget.aoAbrirLista(_listas[i].id),
              ),
            ),
        if (widget.proprio) ...<Widget>[
          const SizedBox(height: DesignTokens.space3),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _novaLista,
              icon: const Icon(PhosphorIconsRegular.plus, size: 20),
              label: const Text('Nova lista'),
              style: TextButton.styleFrom(
                foregroundColor: theme.primaryAccent,
                minimumSize: const Size(48, 48),
                padding: EdgeInsets.zero,
                textStyle: theme.textTheme.labelLarge,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
