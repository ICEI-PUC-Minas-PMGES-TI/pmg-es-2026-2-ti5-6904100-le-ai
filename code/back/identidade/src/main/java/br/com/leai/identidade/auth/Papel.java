package br.com.leai.identidade.auth;

/**
 * Papel gravado na claim {@code papel} do token de acesso. Os outros serviços leem esta claim
 * para restringir rotas ao administrador (F-MOD, RNF-SEC-04); o valor é contrato entre eles.
 */
public enum Papel {
  LEITOR("leitor"),
  ADMIN("admin");

  public static final String CLAIM = "papel";

  private final String valor;

  Papel(String valor) {
    this.valor = valor;
  }

  public String valor() {
    return valor;
  }
}
