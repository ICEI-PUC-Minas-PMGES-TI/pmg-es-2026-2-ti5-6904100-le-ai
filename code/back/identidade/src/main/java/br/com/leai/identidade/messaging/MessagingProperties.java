package br.com.leai.identidade.messaging;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** AMQP settings kept separate from the domain environment contract. */
@ConfigurationProperties(prefix = "leai")
public record MessagingProperties(boolean amqpEnabled, String amqpUrl, String serviceName) {}
