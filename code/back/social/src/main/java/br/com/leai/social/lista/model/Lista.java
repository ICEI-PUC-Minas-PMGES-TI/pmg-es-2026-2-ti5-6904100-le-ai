package br.com.leai.social.lista.model;

import java.time.Instant;
import java.util.UUID;

/** Linha de {@code social.lista}. {@code ativo = false} é a exclusão lógica (RF-LST-03). */
public record Lista(
    UUID id,
    UUID donoId,
    String titulo,
    String descricao,
    boolean ativo,
    Instant criadoEm,
    Instant atualizadoEm) {

  public boolean pertenceA(UUID usuarioId) {
    return donoId.equals(usuarioId);
  }
}
