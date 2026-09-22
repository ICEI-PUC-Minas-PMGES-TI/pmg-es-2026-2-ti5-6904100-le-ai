package br.com.leai.social.messaging;

import java.util.List;
import java.util.Map;

/** Names and broker policies shared by the messaging runtime of this service. */
public final class MessagingConstants {

  public static final String IDENTIDADE_EXCHANGE = "leai.events.identidade";
  public static final String ACERVO_EXCHANGE = "leai.events.acervo";
  public static final String LEITURA_EXCHANGE = "leai.events.leitura";
  public static final String SOCIAL_EXCHANGE = "leai.events.social";
  public static final String DEAD_LETTER_EXCHANGE = "leai.dead-letter";
  public static final List<String> DOMAIN_EXCHANGES =
      List.of(IDENTIDADE_EXCHANGE, ACERVO_EXCHANGE, LEITURA_EXCHANGE, SOCIAL_EXCHANGE);
  public static final List<Long> RETRY_DELAYS_MILLIS = List.of(1_000L, 5_000L, 15_000L);

  private MessagingConstants() {}

  public static Map<String, Object> deadLetterArguments(String queue) {
    return Map.of(
        "x-dead-letter-exchange", DEAD_LETTER_EXCHANGE,
        "x-dead-letter-routing-key", queue);
  }

  public static String exchangeFor(String serviceName) {
    return switch (serviceName) {
      case "identidade" -> IDENTIDADE_EXCHANGE;
      case "social" -> SOCIAL_EXCHANGE;
      default -> throw new IllegalArgumentException("Servico sem exchange de dominio: " + serviceName);
    };
  }
}
