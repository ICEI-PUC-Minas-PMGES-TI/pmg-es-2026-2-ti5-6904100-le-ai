package br.com.leai.social.push.model;

import br.com.leai.social.notificacao.model.TipoNotificacao;
import java.util.Map;
import java.util.UUID;

public record MensagemDePush(
    String token, String titulo, String corpo, UUID notificacaoId, TipoNotificacao tipo) {

  public static final String CAMPO_NOTIFICACAO_ID = "notificacaoId";
  public static final String CAMPO_TIPO = "tipo";

  public Map<String, String> dados() {
    return Map.of(CAMPO_NOTIFICACAO_ID, notificacaoId.toString(), CAMPO_TIPO, tipo.name());
  }
}
