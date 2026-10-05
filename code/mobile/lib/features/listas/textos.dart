/// Textos das telas de F-LST (docs/design/periodo-2/F-LST/*.md §8), iguais aos de
/// `code/front/src/listas/textos.ts`. Todo número aparece com unidade.
///
/// **Sem pronome de gênero**, como em `perfil/textos.dart`: os protótipos escrevem "as listas
/// dela", mas o produto não sabe o gênero de ninguém; as frases usam o nome.
library;

import '../livros/formatos.dart';
import '../perfil/perfil_service.dart';
import '../perfil/textos.dart';

String contagemDeLivros(int valor) => contagem(valor, 'livro', 'livros');

String contagemDeListas(int valor) => contagem(valor, 'lista', 'listas');

/// `7 livros · atualizada em 12 de setembro de 2026` (lista.md §3).
String linhaDeContagem(int quantidade, DateTime atualizadaEm) =>
    '${contagemDeLivros(quantidade)} · atualizada em ${formatarData(atualizadaEm)}';

/// Linha de visibilidade da lista (lista.md §4, criar-lista.md §3).
String visibilidadeDaLista(Privacidade privacidade) => privacidade == Privacidade.privado
    ? 'Seu perfil é privado: só quem você aceitou como seguidor vê esta lista.'
    : 'Seu perfil é público: qualquer leitor pode ver esta lista.';

/// Linha de visibilidade do índice (listas-do-leitor.md §8).
String visibilidadeDasListas(Privacidade privacidade) => privacidade == Privacidade.privado
    ? 'Seu perfil é privado: só quem você aceitou como seguidor vê suas listas.'
    : 'Seu perfil é público: qualquer leitor pode ver suas listas.';

/// Bloco de restrição (RN-08): `Só quem Beatriz aceita como seguidor vê as listas.`
String textoDeListasRestritas(String? nome) => nome == null
    ? 'Só seguidores aceitos veem estas listas.'
    : 'Só quem $nome aceita como seguidor vê as listas.';

/// Conta como o servidor (`char_length`): code points, não unidades UTF-16.
int caracteres(String texto) => texto.runes.length;
