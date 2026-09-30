package br.com.leai.social.messaging;

import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** AMQP wiring is inert unless AMQP_ENABLED=true. */
@Configuration
@EnableConfigurationProperties(MessagingProperties.class)
public class MessagingConfiguration {

  @Bean(name = "rabbitConnectionFactory")
  @ConditionalOnProperty(prefix = "leai", name = "amqp-enabled", havingValue = "true")
  CachingConnectionFactory rabbitConnectionFactory(MessagingProperties properties) {
    if (properties.amqpUrl() == null || properties.amqpUrl().isBlank()) {
      throw new IllegalStateException("AMQP_URL e obrigatorio quando AMQP_ENABLED=true");
    }
    CachingConnectionFactory factory = new CachingConnectionFactory();
    factory.setUri(properties.amqpUrl());
    factory.setChannelCacheSize(2);
    return factory;
  }

  @Bean
  AmqpConnectionService amqpConnectionService(
      MessagingProperties properties,
      org.springframework.beans.factory.ObjectProvider<ConnectionFactory> connectionFactory) {
    return new AmqpConnectionService(properties, connectionFactory.getIfAvailable());
  }

  @Bean
  MessageValidator messageValidator() {
    return new MessageValidator();
  }

  @Bean
  AmqpPublisherService amqpPublisherService(
      MessagingProperties properties, AmqpConnectionService connection, MessageValidator validator) {
    return new AmqpPublisherService(properties, connection, validator);
  }

  @Bean
  AmqpConsumerService amqpConsumerService(
      MessagingProperties properties,
      AmqpConnectionService connection,
      MessageValidator validator,
      org.springframework.jdbc.core.JdbcTemplate jdbcTemplate,
      org.springframework.transaction.PlatformTransactionManager transactionManager) {
    return new AmqpConsumerService(
        properties, connection, validator, jdbcTemplate, transactionManager);
  }

  @Bean
  OutboxDispatcherService outboxDispatcherService(
      MessagingProperties properties,
      AmqpConnectionService connection,
      AmqpPublisherService publisher,
      org.springframework.jdbc.core.JdbcTemplate jdbcTemplate,
      org.springframework.transaction.PlatformTransactionManager transactionManager) {
    return new OutboxDispatcherService(
        properties, connection, publisher, jdbcTemplate, transactionManager);
  }
}
