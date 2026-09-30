import 'package:flutter/material.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import '../theme.dart';

/// Estrelas de exibição (documento-de-design §4.3): `Star` cheia e `StarHalf` em `musgo`, vazia
/// em contorno `grafite-suave`. A meia estrela é o glifo `StarHalf` sólido, nunca um gradiente.
///
/// [valor] nulo desenha as cinco vazias — é o "Sem nota". Quem usa escreve o valor ou o `Sem
/// nota` ao lado, em texto: ausente e `0` têm as mesmas estrelas e só o texto distingue (RN-06).
class EstrelasDeNota extends StatelessWidget {
  final double? valor;

  /// 16 (`sm`), 24 (`md`) ou 32 (`lg`).
  final double tamanho;

  /// Espaço entre as estrelas.
  final double espaco;

  const EstrelasDeNota({super.key, required this.valor, this.tamanho = 24, this.espaco = 2});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final nota = valor ?? -1;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        for (var i = 1; i <= 5; i++) ...<Widget>[
          if (i > 1) SizedBox(width: espaco),
          Icon(
            nota >= i
                ? PhosphorIconsFill.star
                : nota >= i - 0.5
                ? PhosphorIconsFill.starHalf
                : PhosphorIconsRegular.star,
            size: tamanho,
            color: nota >= i - 0.5 ? theme.primaryAccent : theme.tertiaryText,
          ),
        ],
      ],
    );
  }
}
