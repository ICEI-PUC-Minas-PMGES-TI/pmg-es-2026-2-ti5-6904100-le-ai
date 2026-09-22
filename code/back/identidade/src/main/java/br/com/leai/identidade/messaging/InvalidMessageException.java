package br.com.leai.identidade.messaging;

/** A permanent message failure; the consumer must send it directly to the DLQ. */
public class InvalidMessageException extends RuntimeException {

  public InvalidMessageException(String message) {
    super(message);
  }
}
