package br.com.leai.social.notificacao.model;

/**
 * Tipos de notificação gerados ({@code TipoNotificacao} de {@code docs/api/social.yaml}). O nome
 * segue o contrato HTTP; o literal é o valor aceito pelo CHECK {@code notificacao_tipo_valido} da
 * migration {@code V20260916024928__cria_modelo_social.sql}. Os tipos futuros já previstos no CHECK
 * (recomendação, lembrete) entram aqui junto do contrato do produtor, não antes.
 */
public enum TipoNotificacao {
  NOVO_SEGUIDOR("novo_seguidor"),
  SOLICITACAO_CRIADA("solicitacao_seguir"),
  SOLICITACAO_ACEITA("solicitacao_aceita"),
  ATIVIDADE_CURTIDA("atividade_curtida"),
  ATIVIDADE_COMENTADA("atividade_comentada"),
  COMENTARIO_RESPONDIDO("comentario_respondido"),
  USUARIO_MENCIONADO("usuario_mencionado"),
  LEITURA_EM_RISCO("leitura_em_risco"),
  LEITURA_EXPIRADA("leitura_expirada"),
  RESENHA_CURTIDA("resenha_curtida");

  private final String literal;

  TipoNotificacao(String literal) {
    this.literal = literal;
  }

  public String literal() {
    return literal;
  }

  /** Tipos com {@code leitura_ref} obrigatória (CHECK {@code notificacao_leitura_ref_coerente}). */
  public boolean referenciaLeitura() {
    return this == LEITURA_EM_RISCO || this == LEITURA_EXPIRADA;
  }

  public static TipoNotificacao deLiteral(String literal) {
    for (TipoNotificacao tipo : values()) {
      if (tipo.literal.equals(literal)) {
        return tipo;
      }
    }
    throw new IllegalArgumentException("tipo de notificação desconhecido: " + literal);
  }
}
