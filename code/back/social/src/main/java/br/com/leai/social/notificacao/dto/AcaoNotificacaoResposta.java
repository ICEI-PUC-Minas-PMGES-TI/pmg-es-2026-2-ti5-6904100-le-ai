package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema {@code AcaoNotificacao}: a ação direta de abandonar da notificação de leitura em risco
 * (RF-NOT-04). Quem executa é {@code leitura}; o cliente confirma antes e chama com o próprio JWT.
 */
@Schema(name = "AcaoNotificacao")
public record AcaoNotificacaoResposta(
    String tipo,
    String rotulo,
    String service,
    String method,
    String path,
    String recursoId,
    boolean requerConfirmacao) {

  private static final String ABANDONAR_LEITURA = "ABANDONAR_LEITURA";

  public static AcaoNotificacaoResposta abandonarLeitura(String leituraId) {
    return new AcaoNotificacaoResposta(
        ABANDONAR_LEITURA,
        "Abandonar leitura",
        "leitura",
        "POST",
        "/leituras/{leituraId}/abandonar",
        leituraId,
        true);
  }
}
