package br.com.leai.social.notificacao.model;

import java.util.Arrays;
import java.util.Optional;

public enum TipoPreferenciaNotificacao {
  NOVO_SEGUIDOR(TipoNotificacao.NOVO_SEGUIDOR),
  SOLICITACAO_CRIADA(TipoNotificacao.SOLICITACAO_CRIADA),
  SOLICITACAO_ACEITA(TipoNotificacao.SOLICITACAO_ACEITA),
  ATIVIDADE_CURTIDA(TipoNotificacao.ATIVIDADE_CURTIDA),
  ATIVIDADE_COMENTADA(TipoNotificacao.ATIVIDADE_COMENTADA),
  COMENTARIO_RESPONDIDO(TipoNotificacao.COMENTARIO_RESPONDIDO),
  USUARIO_MENCIONADO(TipoNotificacao.USUARIO_MENCIONADO),
  LEITURA_EM_RISCO(TipoNotificacao.LEITURA_EM_RISCO),
  LEITURA_EXPIRADA(TipoNotificacao.LEITURA_EXPIRADA),
  RECOMENDACAO_RECEBIDA(TipoNotificacao.RECOMENDACAO_RECEBIDA),
  RESENHA_CURTIDA(TipoNotificacao.RESENHA_CURTIDA),
  LEMBRETE_SEQUENCIA("lembrete_sequencia");

  private final String literal;

  TipoPreferenciaNotificacao(TipoNotificacao tipo) {
    this(tipo.literal());
  }

  TipoPreferenciaNotificacao(String literal) {
    this.literal = literal;
  }

  public String literal() {
    return literal;
  }

  public static Optional<TipoPreferenciaNotificacao> deNome(String nome) {
    return Arrays.stream(values()).filter(tipo -> tipo.name().equals(nome)).findFirst();
  }

  public static TipoPreferenciaNotificacao deLiteral(String literal) {
    return Arrays.stream(values())
        .filter(tipo -> tipo.literal.equals(literal))
        .findFirst()
        .orElseThrow(
            () ->
                new IllegalArgumentException(
                    "tipo de preferência de notificação desconhecido: " + literal));
  }
}
