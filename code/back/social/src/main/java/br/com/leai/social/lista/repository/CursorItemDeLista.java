package br.com.leai.social.lista.repository;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

/**
 * Cursor opaco dos itens de uma lista: o par {@code (ordem, id)} do último item entregue, na mesma
 * ordem da consulta {@code ORDER BY ordem, id}. Molde de {@code feed.repository.CursorComentario};
 * o formato interno não é contrato, o cliente só devolve o {@code proximoCursor} recebido.
 */
public record CursorItemDeLista(int ordem, UUID id) {

  private static final String SEPARADOR = "|";

  public String codificar() {
    String bruto = ordem + SEPARADOR + id;
    return Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(bruto.getBytes(StandardCharsets.UTF_8));
  }

  /** Lança {@link IllegalArgumentException} quando o cursor foi malformado ou adulterado. */
  public static CursorItemDeLista decodificar(String cursor) {
    try {
      String bruto = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
      int separador = bruto.indexOf(SEPARADOR);
      if (separador < 0) {
        throw new IllegalArgumentException("cursor sem separador");
      }
      int ordem = Integer.parseInt(bruto.substring(0, separador));
      UUID id = UUID.fromString(bruto.substring(separador + 1));
      return new CursorItemDeLista(ordem, id);
    } catch (RuntimeException erro) {
      throw new IllegalArgumentException("cursor de itens de lista inválido", erro);
    }
  }
}
