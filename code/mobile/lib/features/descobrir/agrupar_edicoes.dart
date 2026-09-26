import '../livros/livro_oficial.dart';

/// Edições de uma mesma obra na lista de resultados (RN-01). O modelo continua por edição: o
/// grupo só existe na tela, e o card mostra a [principal] com a contagem das demais.
class GrupoDeEdicoes {
  final List<LivroOficialResumo> edicoes;

  const GrupoDeEdicoes(this.edicoes);

  /// A primeira que chega, que é a mais recente: o servidor ordena por ano decrescente dentro do
  /// grupo.
  LivroOficialResumo get principal => edicoes.first;

  List<LivroOficialResumo> get outras => edicoes.sublist(1);
}

/// Agrupa por título mais autores, **só entre vizinhos**. O servidor devolve as edições de uma
/// obra contíguas, inclusive através da fronteira da página, então basta comparar com o grupo
/// anterior; aplicada sobre a lista acumulada, o "N edições" do último card cresce quando a
/// próxima página traz mais uma.
///
/// Livro sem autor nunca se agrupa: sem autor, título igual não prova que é a mesma obra (o
/// servidor faz o mesmo, com o id do livro na chave).
List<GrupoDeEdicoes> agruparEdicoes(List<LivroOficialResumo> livros) {
  final grupos = <List<LivroOficialResumo>>[];
  String? chaveAnterior;
  for (final livro in livros) {
    final chave = _chave(livro);
    if (chave != null && chave == chaveAnterior) {
      grupos.last.add(livro);
    } else {
      grupos.add(<LivroOficialResumo>[livro]);
    }
    chaveAnterior = chave;
  }
  return <GrupoDeEdicoes>[for (final edicoes in grupos) GrupoDeEdicoes(edicoes)];
}

String? _chave(LivroOficialResumo livro) {
  if (livro.autores.isEmpty) {
    return null;
  }
  final autores = livro.autores.map((autor) => autor.id).toList()..sort();
  return '${semAcento(livro.titulo.trim().toLowerCase())}|${autores.join(',')}';
}

const Map<String, String> _acentos = <String, String>{
  'á': 'a',
  'à': 'a',
  'â': 'a',
  'ã': 'a',
  'ä': 'a',
  'é': 'e',
  'è': 'e',
  'ê': 'e',
  'ë': 'e',
  'í': 'i',
  'ì': 'i',
  'î': 'i',
  'ï': 'i',
  'ó': 'o',
  'ò': 'o',
  'ô': 'o',
  'õ': 'o',
  'ö': 'o',
  'ú': 'u',
  'ù': 'u',
  'û': 'u',
  'ü': 'u',
  'ç': 'c',
  'ñ': 'n',
};

/// Tira os acentos do português (e do trema e da til espanhola), em minúsculas. Não é o
/// `unaccent` do banco, mas cobre o que o acervo tem de título em pt-BR.
String semAcento(String texto) {
  final saida = StringBuffer();
  for (final letra in texto.split('')) {
    saida.write(_acentos[letra] ?? letra);
  }
  return saida.toString();
}
