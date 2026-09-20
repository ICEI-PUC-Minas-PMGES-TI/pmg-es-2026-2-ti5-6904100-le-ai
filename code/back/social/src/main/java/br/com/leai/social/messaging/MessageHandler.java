package br.com.leai.social.messaging;

@FunctionalInterface
public interface MessageHandler {
  void handle(MessageEnvelope envelope) throws Exception;
}
