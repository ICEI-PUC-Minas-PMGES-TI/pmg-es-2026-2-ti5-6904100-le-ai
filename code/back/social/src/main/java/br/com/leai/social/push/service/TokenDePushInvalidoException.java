package br.com.leai.social.push.service;

public class TokenDePushInvalidoException extends RuntimeException {

  public TokenDePushInvalidoException(Throwable causa) {
    super("Token de push inválido ou não registrado", causa);
  }
}
