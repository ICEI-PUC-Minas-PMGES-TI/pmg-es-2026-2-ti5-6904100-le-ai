package br.com.leai.social.feed.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * Desfaz, no texto que o autor manda ao editar, a máscara da menção a conta oculta (F-MOD-OPC,
 * revisão do PR #61).
 *
 * <p>A listagem troca o {@code @username} de conta suspensa ou em exclusão por {@value
 * ServicoDeInteracao#MENCAO_OCULTA}, também para o autor, e os editores da web e do app partem
 * desse texto. Sem este passo, salvar a edição gravava {@code "um leitor"} no lugar da menção, e
 * a reativação não a devolvia. O texto mascarado é a apresentação; o gravado continua com o {@code
 * @username}, que nunca sai do servidor.
 *
 * <p>Cada trecho mascarado é procurado no texto editado entre as ocorrências de {@value
 * ServicoDeInteracao#MENCAO_OCULTA}, na mesma ordem, pela vizinhança que sobrou em volta dele (um
 * alinhamento por programação dinâmica, que maximiza o contexto casado). O trecho que o autor
 * apagou ou alterou não casa e sai; o que ficou volta a ser o {@code @username} original. Um
 * "um leitor" que o autor digitou de próprio punho só vira menção se ocupar o lugar de uma
 * menção apagada, com a mesma vizinhança; aparece igual enquanto a conta estiver oculta.
 *
 * <p><b>Versão da apresentação</b> (segunda rodada da revisão): a desmáscara só vale contra a
 * apresentação que o editor carregou. Se a conta mencionada foi suspensa ou reativada entre a
 * leitura e o PATCH, a apresentação de agora é outra, e deduzir dela apagaria a menção ou
 * transformaria um "um leitor" literal em menção. Por isso o autor recebe a {@link #versao} da
 * apresentação, devolve-a no PATCH, e a edição com versão diferente é recusada (409) para o
 * editor recarregar.
 */
final class MascaraDeMencoes {

  /** Quanto de vizinhança conta de cada lado: basta para desempatar sem custo quadrático. */
  static final int CONTEXTO_MAXIMO = 64;

  /** Um trecho mascarado: posição no texto mascarado e o username que ele esconde. */
  record Oculta(int posicao, String username) {}

  private MascaraDeMencoes() {}

  /**
   * Identifica a apresentação: o texto mascarado e onde estão os trechos mascarados (um "um
   * leitor" literal e um mascarado dão versões diferentes). Não carrega o username oculto.
   */
  static String versao(String mascarado, List<Oculta> ocultas) {
    StringBuilder fonte = new StringBuilder(mascarado).append('\u0000');
    for (Oculta oculta : ocultas) {
      fonte.append(oculta.posicao()).append(',');
    }
    try {
      byte[] hash =
          MessageDigest.getInstance("SHA-256")
              .digest(fonte.toString().getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(hash).substring(0, 22);
    } catch (NoSuchAlgorithmException impossivel) {
      // SHA-256 é algoritmo obrigatório em toda JVM.
      throw new IllegalStateException("SHA-256 indisponível", impossivel);
    }
  }

  static String desmascarar(String mascarado, List<Oculta> ocultas, String editado) {
    if (ocultas.isEmpty()) {
      return editado;
    }
    String mascara = ServicoDeInteracao.MENCAO_OCULTA;
    List<Integer> ocorrencias = new ArrayList<>();
    for (int i = editado.indexOf(mascara); i >= 0; i = editado.indexOf(mascara, i + mascara.length())) {
      ocorrencias.add(i);
    }
    if (ocorrencias.isEmpty()) {
      return editado;
    }

    int k = ocultas.size();
    int m = ocorrencias.size();
    int[][] pontos = new int[k][m];
    for (int i = 0; i < k; i++) {
      for (int j = 0; j < m; j++) {
        pontos[i][j] = pontuacao(mascarado, ocultas.get(i).posicao(), editado, ocorrencias.get(j));
      }
    }
    // melhor[i][j]: maior contexto casando as i primeiras ocultas com as j primeiras ocorrências.
    int[][] melhor = new int[k + 1][m + 1];
    for (int i = 1; i <= k; i++) {
      for (int j = 1; j <= m; j++) {
        int valor = Math.max(melhor[i - 1][j], melhor[i][j - 1]);
        if (pontos[i - 1][j - 1] > 0) {
          valor = Math.max(valor, melhor[i - 1][j - 1] + pontos[i - 1][j - 1]);
        }
        melhor[i][j] = valor;
      }
    }

    String[] usernamePorOcorrencia = new String[m];
    for (int i = k, j = m; i > 0 && j > 0; ) {
      if (melhor[i][j] == melhor[i - 1][j]) {
        i--;
      } else if (melhor[i][j] == melhor[i][j - 1]) {
        j--;
      } else {
        usernamePorOcorrencia[j - 1] = ocultas.get(i - 1).username();
        i--;
        j--;
      }
    }

    StringBuilder resultado = new StringBuilder(editado.length() + 32);
    int cursor = 0;
    for (int j = 0; j < m; j++) {
      if (usernamePorOcorrencia[j] == null) {
        continue;
      }
      int inicio = ocorrencias.get(j);
      resultado.append(editado, cursor, inicio).append('@').append(usernamePorOcorrencia[j]);
      cursor = inicio + mascara.length();
    }
    return resultado.append(editado, cursor, editado.length()).toString();
  }

  /**
   * Vizinhança comum dos dois trechos: o que casa à esquerda mais o que casa à direita. O começo e
   * o fim do texto contam como um caractere, para que um comentário só com a menção também case.
   */
  private static int pontuacao(String mascarado, int posicao, String editado, int ocorrencia) {
    int esquerda = 0;
    while (esquerda < CONTEXTO_MAXIMO) {
      int a = posicao - esquerda - 1;
      int b = ocorrencia - esquerda - 1;
      if (a < 0 || b < 0) {
        if (a < 0 && b < 0) {
          esquerda++;
        }
        break;
      }
      if (mascarado.charAt(a) != editado.charAt(b)) {
        break;
      }
      esquerda++;
    }
    int tamanho = ServicoDeInteracao.MENCAO_OCULTA.length();
    int direita = 0;
    while (direita < CONTEXTO_MAXIMO) {
      int a = posicao + tamanho + direita;
      int b = ocorrencia + tamanho + direita;
      if (a >= mascarado.length() || b >= editado.length()) {
        if (a >= mascarado.length() && b >= editado.length()) {
          direita++;
        }
        break;
      }
      if (mascarado.charAt(a) != editado.charAt(b)) {
        break;
      }
      direita++;
    }
    return esquerda + direita;
  }
}
