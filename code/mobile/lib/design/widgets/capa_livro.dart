import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';

/// Capa de livro com placeholder (documento-de-design §4.5, RN-14.4). Sem imagem, ou enquanto
/// ela carrega, é um retângulo `capa-placeholder` de **canto vivo** — a capa é a exceção
/// declarada do sistema de raio. [raio] existe para os poucos lugares em que o prompt pede
/// capa arredondada com imagem carregada, e nunca se aplica ao placeholder.
///
/// Com [titulo], o placeholder é **textual** (descobrir.md §4.1 e design §4.5): o título
/// centralizado em `title-sm` `tinta` e o autor abaixo em `caption` `grafite`, nunca um ícone de
/// livro genérico. A letra acompanha a largura, para caber na capa de 80px da lista e crescer na
/// página do livro.
class CapaLivro extends StatelessWidget {
  final String? url;
  final Uint8List? bytes;
  final double largura;
  final double altura;
  final double raio;
  final bool comIcone;
  final String? titulo;
  final String? autor;

  const CapaLivro({
    super.key,
    this.url,
    this.bytes,
    required this.largura,
    required this.altura,
    this.raio = 0,
    this.comIcone = false,
    this.titulo,
    this.autor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final placeholder = Container(
      width: largura,
      height: altura,
      color: theme.coverPlaceholder,
      alignment: Alignment.center,
      child: titulo != null
          ? _PlaceholderTextual(titulo: titulo!, autor: autor, largura: largura)
          : comIcone
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

class _PlaceholderTextual extends StatelessWidget {
  final String titulo;
  final String? autor;
  final double largura;

  const _PlaceholderTextual({required this.titulo, required this.autor, required this.largura});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.all(largura * 0.08),
      // Os dois textos são `Flexible`: com fonte ampliada eles cortam dentro da capa em vez de
      // estourar o retângulo, que tem tamanho fixo.
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Flexible(
            child: Text(
              titulo,
              textAlign: TextAlign.center,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.titleMedium?.copyWith(fontSize: min(17, largura * 0.17)),
            ),
          ),
          if (autor != null) ...<Widget>[
            SizedBox(height: largura * 0.05),
            Flexible(
              child: Text(
                autor!,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.secondaryText,
                  fontSize: min(13, largura * 0.14),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
