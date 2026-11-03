package br.com.leai.social.lista.model;

import java.util.UUID;

/**
 * Linha de {@code identidade.v_perfil_referencia_v1}. A VIEW já omite conta suspensa ou em
 * exclusão, então ausência significa 404 para quem pergunta (RN-08).
 */
public record PerfilDoDono(
    UUID id, String username, String nomeExibicao, String avatarUrl, String privacidade) {

  public boolean publico() {
    return "publico".equals(privacidade);
  }
}
