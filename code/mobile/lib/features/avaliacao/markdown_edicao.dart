import 'package:flutter/services.dart';

/// Edição do texto cru pela barra de formatação do editor de resenha (escrever-resenha.md §4.1),
/// sem widget, para testar sem montar o editor. Cada operação recebe o texto e a seleção e devolve
/// o texto e a seleção novos. A web tem a mesma lógica em `code/front/src/markdown/edicao.ts`.

enum Marca {
  negrito('**'),
  italico('*'),
  tachado('~~');

  final String simbolo;
  const Marca(this.simbolo);
}

enum Prefixo { marcadores, numerada, citacao }

final Map<Marca, RegExp> _padraoDaMarca = <Marca, RegExp>{
  Marca.negrito: RegExp(r'\*\*(?=\S)(.*?\S)\*\*'),
  Marca.italico: RegExp(r'(?<![*\w])\*(?=[^\s*])(.*?[^\s*])\*(?![*\w])'),
  Marca.tachado: RegExp(r'~~(?=\S)(.*?\S)~~'),
};

final Map<Prefixo, RegExp> _padraoDoPrefixo = <Prefixo, RegExp>{
  Prefixo.marcadores: RegExp(r'^- '),
  Prefixo.numerada: RegExp(r'^\d+\. '),
  Prefixo.citacao: RegExp(r'^> '),
};

final RegExp _qualquerLista = RegExp(r'^(- |\d+\. )');

/// Seleção válida: sem foco, o campo devolve -1, e aí vale o fim do texto.
({int inicio, int fim}) _selecao(TextEditingValue valor) {
  final tamanho = valor.text.length;
  final selecao = valor.selection;
  if (!selecao.isValid) {
    return (inicio: tamanho, fim: tamanho);
  }
  return (inicio: selecao.start.clamp(0, tamanho), fim: selecao.end.clamp(0, tamanho));
}

TextEditingValue _valor(String texto, int inicio, int fim) => TextEditingValue(
  text: texto,
  selection: TextSelection(baseOffset: inicio, extentOffset: fim),
);

({int inicio, int fim}) _limitesDaLinha(String texto, int posicao) {
  final inicio = posicao == 0 ? 0 : texto.lastIndexOf('\n', posicao - 1) + 1;
  final quebra = texto.indexOf('\n', posicao);
  return (inicio: inicio, fim: quebra == -1 ? texto.length : quebra);
}

/// O trecho marcado que contém a seleção, na linha dela, ou `null`.
({int inicio, int fim})? _trechoMarcado(TextEditingValue valor, Marca marca) {
  final selecao = _selecao(valor);
  final linha = _limitesDaLinha(valor.text, selecao.inicio);
  if (selecao.fim > linha.fim) {
    return null;
  }
  final conteudo = valor.text.substring(linha.inicio, linha.fim);
  for (final achado in _padraoDaMarca[marca]!.allMatches(conteudo)) {
    final inicio = linha.inicio + achado.start;
    final fim = linha.inicio + achado.end;
    if (selecao.inicio >= inicio && selecao.fim <= fim) {
      return (inicio: inicio, fim: fim);
    }
  }
  return null;
}

/// O botão de negrito, itálico ou tachado fica ativo com o cursor dentro da formatação.
bool marcaAtiva(TextEditingValue valor, Marca marca) => _trechoMarcado(valor, marca) != null;

/// Negrito, itálico e tachado envolvem a seleção; sem seleção, inserem o par com o cursor no
/// meio. Com o cursor dentro da formatação, removem o par.
TextEditingValue alternarMarca(TextEditingValue valor, Marca marca) {
  final simbolo = marca.simbolo;
  final tamanho = simbolo.length;
  final texto = valor.text;
  final selecao = _selecao(valor);
  final marcado = _trechoMarcado(valor, marca);
  if (marcado != null) {
    final novo =
        texto.substring(0, marcado.inicio) +
        texto.substring(marcado.inicio + tamanho, marcado.fim - tamanho) +
        texto.substring(marcado.fim);
    int ajustar(int posicao) =>
        (posicao - tamanho).clamp(marcado.inicio, marcado.fim - 2 * tamanho);
    return _valor(novo, ajustar(selecao.inicio), ajustar(selecao.fim));
  }
  final novo =
      texto.substring(0, selecao.inicio) +
      simbolo +
      texto.substring(selecao.inicio, selecao.fim) +
      simbolo +
      texto.substring(selecao.fim);
  return _valor(novo, selecao.inicio + tamanho, selecao.fim + tamanho);
}

/// A linha do cursor começa com o prefixo da lista ou da citação.
bool prefixoAtivo(TextEditingValue valor, Prefixo prefixo) {
  final linha = _limitesDaLinha(valor.text, _selecao(valor).inicio);
  return _padraoDoPrefixo[prefixo]!.hasMatch(valor.text.substring(linha.inicio, linha.fim));
}

/// Lista com marcadores, lista numerada e citação põem o prefixo em cada linha selecionada (ou na
/// do cursor), com a lista numerada em sequência. Se todas já têm o prefixo, ele sai. Trocar o tipo
/// de lista troca o marcador.
TextEditingValue alternarPrefixo(TextEditingValue valor, Prefixo prefixo) {
  final texto = valor.text;
  final selecao = _selecao(valor);
  final inicio = _limitesDaLinha(texto, selecao.inicio).inicio;
  final fim = _limitesDaLinha(texto, selecao.fim).fim;
  final linhas = texto.substring(inicio, fim).split('\n');
  final padrao = _padraoDoPrefixo[prefixo]!;
  final todas = linhas.every(padrao.hasMatch);
  final novas = <String>[
    for (var i = 0; i < linhas.length; i++)
      if (todas)
        linhas[i].replaceFirst(padrao, '')
      else
        switch (prefixo) {
              Prefixo.marcadores => '- ',
              Prefixo.numerada => '${i + 1}. ',
              Prefixo.citacao => '> ',
            } +
            linhas[i].replaceFirst(prefixo == Prefixo.citacao ? padrao : _qualquerLista, ''),
  ];
  final bloco = novas.join('\n');
  final novo = texto.substring(0, inicio) + bloco + texto.substring(fim);
  if (selecao.inicio == selecao.fim && linhas.length == 1) {
    final diferenca = bloco.length - (fim - inicio);
    final cursor = selecao.inicio + diferenca < inicio ? inicio : selecao.inicio + diferenca;
    return _valor(novo, cursor, cursor);
  }
  return _valor(novo, inicio, inicio + bloco.length);
}

final RegExp _itemDeLista = RegExp(r'^(- |(\d+)\. )(.*)$');

/// `Enter` dentro de uma lista continua com o próximo marcador; num item vazio, sai da lista.
/// Fora de lista, ou com seleção, devolve `null` e o `Enter` segue o normal.
TextEditingValue? continuarLista(TextEditingValue valor) {
  final selecao = _selecao(valor);
  if (selecao.inicio != selecao.fim) {
    return null;
  }
  final texto = valor.text;
  final linha = _limitesDaLinha(texto, selecao.inicio);
  final lista = _itemDeLista.firstMatch(texto.substring(linha.inicio, selecao.inicio));
  if (lista == null) {
    return null;
  }
  if (lista[3]!.trim().isEmpty && texto.substring(selecao.inicio, linha.fim).trim().isEmpty) {
    final novo = texto.substring(0, linha.inicio) + texto.substring(linha.fim);
    return _valor(novo, linha.inicio, linha.inicio);
  }
  final marcador = lista[2] != null ? '${int.parse(lista[2]!) + 1}. ' : '- ';
  final insercao = '\n$marcador';
  final novo = texto.substring(0, selecao.inicio) + insercao + texto.substring(selecao.inicio);
  final cursor = selecao.inicio + insercao.length;
  return _valor(novo, cursor, cursor);
}

/// `Enter` no teclado do sistema chega como um `\n` inserido no cursor; dentro de uma lista, vira o
/// próximo marcador (ou a saída da lista, num item vazio).
class ContinuarListaNoEnter extends TextInputFormatter {
  const ContinuarListaNoEnter();

  @override
  TextEditingValue formatEditUpdate(TextEditingValue antes, TextEditingValue depois) {
    final selecao = antes.selection;
    if (!selecao.isValid || !selecao.isCollapsed || depois.text.length != antes.text.length + 1) {
      return depois;
    }
    final cursor = selecao.start;
    final comEnter = '${antes.text.substring(0, cursor)}\n${antes.text.substring(cursor)}';
    if (depois.text != comEnter) {
      return depois;
    }
    return continuarLista(antes) ?? depois;
  }
}
