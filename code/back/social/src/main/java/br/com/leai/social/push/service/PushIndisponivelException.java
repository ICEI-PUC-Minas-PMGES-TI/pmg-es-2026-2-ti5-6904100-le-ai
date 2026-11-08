package br.com.leai.social.push.service;

public class PushIndisponivelException extends RuntimeException {

  public PushIndisponivelException(Throwable causa) {
    super("Serviço de push indisponível", causa);
  }
}
