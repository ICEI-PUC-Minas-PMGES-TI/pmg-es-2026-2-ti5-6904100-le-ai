package br.com.leai.social.feed;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Cursor opaco de paginação de respostas (RF-SOC-18): o par {@code (criadoEm, id)} usado pelo
 * cliente para pedir a próxima página, na mesma ordem do índice {@code
 * comentario_raiz_criado_idx} e da comparação de tupla {@code (criado_em, id) > (?, ?)} feita por
 * {@link ComentarioRepository#buscarRespostasPorRaiz}.
 *
 * <p>O formato interno (base64 de {@code criadoEm|id}) não é parte do contrato: o cliente só
 * ecoa de volta o valor de {@code proximoCursor} recebido, sem interpretá-lo (schema {@code
 * Cursor} de {@code docs/api/social.yaml}).
 */
public record CursorComentario(Instant criadoEm, UUID id) {

  private static final String SEPARADOR = "|";

  public String codificar() {
    String bruto = criadoEm.toString() + SEPARADOR + id;
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bruto.getBytes(StandardCharsets.UTF_8));
  }

  public static CursorComentario decodificar(String cursor) {
    try {
      String bruto = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
      int separador = bruto.lastIndexOf(SEPARADOR);
      if (separador < 0) {
        throw new IllegalArgumentException("cursor sem separador");
      }
      Instant criadoEm = Instant.parse(bruto.substring(0, separador));
      UUID id = UUID.fromString(bruto.substring(separador + 1));
      return new CursorComentario(criadoEm, id);
    } catch (RuntimeException erro) {
      throw new CursorInvalidoException(cursor, erro);
    }
  }
}
