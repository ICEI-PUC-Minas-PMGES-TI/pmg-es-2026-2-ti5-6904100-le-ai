package br.com.leai.social.feed;

/** Cursor opaco de paginação de respostas malformado ou adulterado (RF-SOC-18). */
public class CursorInvalidoException extends RuntimeException {

  public CursorInvalidoException(String cursor, Throwable causa) {
    super("cursor de respostas invalido: " + cursor, causa);
  }
}
