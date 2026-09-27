package br.com.leai.social.messaging;

import java.util.List;
import java.util.Map;

/**
 * Queue declaration and bindings of a domain consumer. One queue may listen to several exchanges:
 * the notification consumer receives events from {@code identidade}, {@code leitura} and {@code
 * social} itself.
 */
public record ConsumerDefinition(
    String consumerName, String queue, Map<String, List<String>> routingKeysByExchange) {

  public ConsumerDefinition {
    routingKeysByExchange = Map.copyOf(routingKeysByExchange);
  }

  public ConsumerDefinition(
      String consumerName, String queue, String exchange, List<String> routingKeys) {
    this(consumerName, queue, Map.of(exchange, routingKeys));
  }
}
