package br.com.leai.social.lista.model;

import java.util.UUID;

/** Linha de {@code acervo.v_livro_referencia_v1}; {@code tipo} vem em minúsculas ({@code oficial}/{@code pessoal}). */
public record LivroDeReferencia(
    UUID id, String tipo, UUID donoId, String titulo, String autor, String capaUrl, boolean ativo) {

  public boolean pessoal() {
    return "pessoal".equals(tipo);
  }

  /**
   * RN-15.1: entra numa lista o livro ativo que seja oficial ou pessoal do próprio dono da lista.
   */
  public boolean podeEntrarNaListaDe(UUID donoDaLista) {
    return ativo && ("oficial".equals(tipo) || (pessoal() && donoDaLista.equals(donoId)));
  }
}
