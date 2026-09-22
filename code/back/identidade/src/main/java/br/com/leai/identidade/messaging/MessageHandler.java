package br.com.leai.identidade.messaging;

@FunctionalInterface
public interface MessageHandler {
  void handle(MessageEnvelope envelope) throws Exception;
}
