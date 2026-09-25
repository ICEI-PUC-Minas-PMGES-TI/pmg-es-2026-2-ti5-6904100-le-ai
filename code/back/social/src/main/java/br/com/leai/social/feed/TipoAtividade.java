package br.com.leai.social.feed;

/**
 * Tipos de fato do feed (RF-SOC-08..12), espelhando o CHECK {@code atividade_tipo_valido} da
 * migration {@code V20260916024928__cria_modelo_social.sql}. Os nomes desta enum seguem a
 * convenção Java (maiúsculo/underscore); o literal persistido no banco é sempre minúsculo, via
 * {@link TipoAtividadeConverter}.
 */
public enum TipoAtividade {
  LEITURA_INICIADA("leitura_iniciada"),
  LEITURA_RETOMADA("leitura_retomada"),
  LEITURA_CONCLUIDA("leitura_concluida"),
  LEITURA_ABANDONADA("leitura_abandonada"),
  RESENHA_PUBLICADA("resenha_publicada");

  private final String literal;

  TipoAtividade(String literal) {
    this.literal = literal;
  }

  /** Literal exato aceito pelo CHECK {@code atividade_tipo_valido} no banco. */
  public String literal() {
    return literal;
  }

  public static TipoAtividade deLiteral(String literal) {
    for (TipoAtividade tipo : values()) {
      if (tipo.literal.equals(literal)) {
        return tipo;
      }
    }
    throw new IllegalArgumentException("tipo de atividade desconhecido: " + literal);
  }
}
