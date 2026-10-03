package br.com.leai.social.messaging;

import java.util.List;
import java.util.Map;

/** Names and broker policies shared by the messaging runtime of this service. */
public final class MessagingConstants {

  public static final String IDENTIDADE_EXCHANGE = "leai.events.identidade";
  public static final String ACERVO_EXCHANGE = "leai.events.acervo";
  public static final String LEITURA_EXCHANGE = "leai.events.leitura";
  public static final String SOCIAL_EXCHANGE = "leai.events.social";
  public static final String DEAD_LETTER_EXCHANGE = "leai.dead-letter";
  public static final List<String> DOMAIN_EXCHANGES =
      List.of(IDENTIDADE_EXCHANGE, ACERVO_EXCHANGE, LEITURA_EXCHANGE, SOCIAL_EXCHANGE);
  public static final List<Long> RETRY_DELAYS_MILLIS = List.of(1_000L, 5_000L, 15_000L);

  /** Topologia do consumidor de {@code leitura}/{@code resenha} do feed (RF-SOC-10). */
  public static final String FEED_CONSUMER_NAME = "social.feed";

  public static final String FEED_QUEUE = "leai.social.feed";
  public static final String EVENTO_LEITURA_INICIADA = "leitura.iniciada";
  public static final String EVENTO_LEITURA_RETOMADA = "leitura.retomada";
  public static final String EVENTO_LEITURA_FINALIZADA = "leitura.finalizada";
  public static final String EVENTO_LEITURA_ABANDONADA = "leitura.abandonada";
  public static final String EVENTO_RESENHA_PUBLICADA = "resenha.publicada";
  public static final String EVENTO_RESENHA_EXCLUIDA = "resenha.excluida";
  public static final List<String> FEED_ROUTING_KEYS =
      List.of(
          EVENTO_LEITURA_INICIADA,
          EVENTO_LEITURA_RETOMADA,
          EVENTO_LEITURA_FINALIZADA,
          EVENTO_LEITURA_ABANDONADA,
          EVENTO_RESENHA_PUBLICADA,
          EVENTO_RESENHA_EXCLUIDA);

  /** Topologia do consumidor de notificações in-app (F-NOT, RF-NOT-01). */
  public static final String NOTIFICACOES_CONSUMER_NAME = "social.notificacoes";

  public static final String NOTIFICACOES_QUEUE = "leai.social.notificacoes";
  public static final String EVENTO_SEGUIDOR_NOVO = "seguidor.novo";
  public static final String EVENTO_SOLICITACAO_CRIADA = "solicitacao.criada";
  public static final String EVENTO_SOLICITACAO_ACEITA = "solicitacao.aceita";
  public static final String EVENTO_ATIVIDADE_CURTIDA = "atividade.curtida";
  public static final String EVENTO_ATIVIDADE_COMENTADA = "atividade.comentada";
  public static final String EVENTO_COMENTARIO_RESPONDIDO = "comentario.respondido";
  public static final String EVENTO_USUARIO_MENCIONADO = "usuario.mencionado";
  public static final String EVENTO_LEITURA_EM_RISCO = "leitura.em_risco";
  public static final String EVENTO_LEITURA_EXPIRADA = "leitura.expirada";

  private MessagingConstants() {}

  public static Map<String, Object> deadLetterArguments(String queue) {
    return Map.of(
        "x-dead-letter-exchange", DEAD_LETTER_EXCHANGE,
        "x-dead-letter-routing-key", queue);
  }

  public static String exchangeFor(String serviceName) {
    return switch (serviceName) {
      case "identidade" -> IDENTIDADE_EXCHANGE;
      case "social" -> SOCIAL_EXCHANGE;
      default -> throw new IllegalArgumentException("Servico sem exchange de dominio: " + serviceName);
    };
  }
}
