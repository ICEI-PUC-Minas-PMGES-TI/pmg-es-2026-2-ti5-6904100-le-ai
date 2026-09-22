package br.com.leai.identidade.messaging;

import java.util.List;

/** Queue declaration and bindings for a future domain consumer. */
public record ConsumerDefinition(
    String consumerName, String queue, String exchange, List<String> routingKeys) {}
