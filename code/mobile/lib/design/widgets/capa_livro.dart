import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';

/// Capa de livro com placeholder (documento-de-design §4.5, RN-14.4). Sem imagem, ou enquanto
/// ela carrega, é um retângulo `capa-placeholder` de **canto vivo** — a capa é a exceção
/// declarada do sistema de raio. [raio] existe para os poucos lugares em que o prompt pede
/// capa arredondada com imagem carregada, e nunca se aplica ao placeholder.
class CapaLivro extends StatelessWidget {
  final String? url;
  final Uint8List? bytes;
  final double largura;
  final double altura;
  final double raio;
  final bool comIcone;

  const CapaLivro({
    super.key,
    this.url,
    this.bytes,
    required this.largura,
    required this.altura,
    this.raio = 0,
    this.comIcone = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final placeholder = Container(
      width: largura,
      height: altura,
      color: theme.coverPlaceholder,
      alignment: Alignment.center,
      child: comIcone
          ? Icon(PhosphorIconsRegular.bookOpen, size: 32, color: theme.tertiaryText)
          : null,
    );

    Widget? imagem;
    if (bytes != null) {
      imagem = Image.memory(bytes!, width: largura, height: altura, fit: BoxFit.cover);
    } else if (url != null) {
      imagem = Image.network(
        url!,
        width: largura,
        height: altura,
        fit: BoxFit.cover,
        loadingBuilder: (context, filho, progresso) =>
            progresso == null ? filho : placeholder,
        errorBuilder: (context, erro, pilha) => placeholder,
      );
    }
    if (imagem == null) {
      return ExcludeSemantics(child: placeholder);
    }
    return ExcludeSemantics(
      child: ClipRRect(borderRadius: BorderRadius.circular(raio), child: imagem),
    );
  }
}
