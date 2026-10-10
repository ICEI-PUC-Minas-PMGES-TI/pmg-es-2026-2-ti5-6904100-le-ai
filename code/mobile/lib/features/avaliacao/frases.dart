import 'leitura_service.dart';

/// Textos e validação das frases e trechos (frases-do-livro.md e adicionar-frase.md, seção 8),
/// iguais a `src/livros/frases.ts` da web.

const int limiteDoTrecho = 500;

/// Caracteres Unicode (code points), como o servidor e o `char_length` do banco.
int contarCaracteres(String texto) => texto.runes.length;

/// `14 frases`, `1 frase`, `0 frases`.
String rotuloDeFrases(int total) => '$total ${total == 1 ? 'frase' : 'frases'}';

/// `Página 57 · @marina.antunes`; a frase de quem olha diz `você`.
String referenciaDaFrase(Frase frase) =>
    'Página ${frase.pagina} · ${frase.minha ? 'você' : '@${frase.autorUsername}'}';

/// Linha de cota do bloco do livro e do formulário.
String linhaDaCota(int minhas, int limite, {bool noFormulario = false}) {
  if (minhas == 0) {
    return 'Você ainda não guardou frases deste livro. Cabem até $limite.';
  }
  final base = 'Você guardou $minhas de $limite frases deste livro.';
  return noFormulario && minhas == limite - 1 ? '$base Esta é a última que cabe.' : base;
}

abstract final class TextosDasFrases {
  static const String titulo = 'Frases e trechos';
  static const String adicionar = 'Adicionar frase';
  static const String verTodas = 'Ver todas as frases';
  static const String limite =
      'Você chegou ao limite de 10 frases por livro. Exclua uma das suas para guardar outra.';
  static const String vazioTitulo = 'Nenhuma frase ainda';
  static const String vazioTexto = 'Guarde um trecho que marcou você, com a página em que ele está.';
  static const String vazioBotao = 'Adicionar a primeira';
  static const String erroCarga =
      'Não foi possível carregar as frases deste livro. Verifique sua conexão e tente de novo.';
  static const String tentarDeNovo = 'Tentar de novo';
  static const String excluirTitulo = 'Excluir esta frase?';
  static const String excluirConsequencia =
      'A frase sai desta lista e da página do livro. Não é possível desfazer.';
  static const String excluirBotao = 'Excluir frase';
  static const String excluirFalha =
      'Não foi possível excluir a frase. Verifique sua conexão e tente de novo.';
  static const String rotuloTrecho = 'Trecho';
  static const String placeholderTrecho = 'Copie o trecho como está no livro.';
  static const String ajudaTrecho = 'Até 500 caracteres.';
  static const String rotuloPagina = 'Página';
  static String ajudaPagina(int total) => 'Entre 1 e $total. É a página em que o trecho está.';
  static const String salvar = 'Salvar frase';
  static const String salvando = 'Salvando';
  static const String cancelar = 'Cancelar';
  static const String erroTrechoVazio = 'Escreva o trecho que você quer guardar.';
  static String erroTrechoLongo(int excedente) =>
      'Use até 500 caracteres. Tire $excedente para salvar.';
  static const String erroPaginaVazia = 'Informe a página em que o trecho está.';
  static String erroPaginaAcima(int total) =>
      'O livro tem $total páginas. Informe uma página até $total.';
  static const String erroPaginaZero = 'Informe uma página a partir de 1.';
  static const String erroEnvio =
      'Não foi possível salvar a frase. Verifique sua conexão e tente de novo.';
  static const String limiteNoEnvio =
      'Você já guardou 10 frases deste livro. Exclua uma das suas para guardar esta.';
  static const String verMinhas = 'Ver minhas frases';
  static const String fechar = 'Fechar';
  static const String naoSeraGuardado = 'O trecho que você escreveu não será guardado.';
  static const String descartarTitulo = 'Descartar esta frase?';
  static const String descartar = 'Descartar';
  static const String continuar = 'Continuar escrevendo';
}

/// Erro do trecho, ou `null` quando ele vale. O servidor confere de novo.
String? erroDoTrecho(String texto) {
  if (texto.trim().isEmpty) {
    return TextosDasFrases.erroTrechoVazio;
  }
  final total = contarCaracteres(texto);
  return total > limiteDoTrecho ? TextosDasFrases.erroTrechoLongo(total - limiteDoTrecho) : null;
}

/// Erro da página digitada, ou `null` quando ela está entre 1 e o total do livro.
String? erroDaPagina(String digitado, int total) {
  if (digitado.trim().isEmpty) {
    return TextosDasFrases.erroPaginaVazia;
  }
  final pagina = int.tryParse(digitado.trim());
  if (pagina == null || pagina < 1) {
    return TextosDasFrases.erroPaginaZero;
  }
  return pagina > total ? TextosDasFrases.erroPaginaAcima(total) : null;
}
