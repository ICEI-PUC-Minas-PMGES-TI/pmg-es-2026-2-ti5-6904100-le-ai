package br.com.leai.identidade.email;

/** Desfecho de uma tentativa de envio ao Brevo, para quem decide se tenta de novo. */
public enum ResultadoDeEnvio {
  ACEITO,
  /** Credencial ou remetente ausente, ou dados de envio vazios: tentar de novo não resolve. */
  IGNORADO,
  /** Rede, tempo esgotado, 5xx ou 429: vale tentar de novo mais tarde. */
  FALHA_TEMPORARIA,
  /** 4xx que não seja 429: o pedido está errado e repetir dá o mesmo erro. */
  FALHA_DEFINITIVA;

  public boolean valeRepetir() {
    return this == FALHA_TEMPORARIA;
  }
}
