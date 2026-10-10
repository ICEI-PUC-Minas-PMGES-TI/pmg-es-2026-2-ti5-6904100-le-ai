package br.com.leai.social.notificacao.model;

import br.com.leai.social.messaging.MessagingConstants;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Mapa evento → notificação de F-NOT (RF-NOT-01), item próprio do DoD da feature. Cada linha diz
 * de qual exchange o evento vem, que {@link TipoNotificacao} ele gera, de qual campo do {@code
 * data} sai quem agiu e quais campos do {@code data} viram snapshot. O schema de cada evento está
 * em {@code docs/mensageria/schemas/<evento>.v1.schema.json}; a chave de negócio é a do envelope
 * ({@code docs/mensageria/catalogo.md}), e o destinatário é sempre {@code data.destinatarioId}.
 *
 * <p>Ponto de extensão: um tipo novo (menção, curtida em resenha...) entra como uma linha aqui,
 * mais o schema no {@code MessageValidator} e o literal em {@link TipoNotificacao} — o consumidor,
 * a fila e a lista não mudam.
 */
public enum EventoDeNotificacao {
  SEGUIDOR_NOVO(
      MessagingConstants.EVENTO_SEGUIDOR_NOVO,
      MessagingConstants.IDENTIDADE_EXCHANGE,
      TipoNotificacao.NOVO_SEGUIDOR,
      "seguidor",
      List.of(DadosDeNotificacao.SEGUIMENTO_ID)),
  SOLICITACAO_CRIADA(
      MessagingConstants.EVENTO_SOLICITACAO_CRIADA,
      MessagingConstants.IDENTIDADE_EXCHANGE,
      TipoNotificacao.SOLICITACAO_CRIADA,
      "solicitante",
      List.of(DadosDeNotificacao.SOLICITACAO_ID)),
  SOLICITACAO_ACEITA(
      MessagingConstants.EVENTO_SOLICITACAO_ACEITA,
      MessagingConstants.IDENTIDADE_EXCHANGE,
      TipoNotificacao.SOLICITACAO_ACEITA,
      "perfilAceitante",
      List.of(DadosDeNotificacao.SOLICITACAO_ID, DadosDeNotificacao.SEGUIMENTO_ID)),
  ATIVIDADE_CURTIDA(
      MessagingConstants.EVENTO_ATIVIDADE_CURTIDA,
      MessagingConstants.SOCIAL_EXCHANGE,
      TipoNotificacao.ATIVIDADE_CURTIDA,
      "autorAcao",
      List.of(DadosDeNotificacao.ATIVIDADE_ID)),
  ATIVIDADE_COMENTADA(
      MessagingConstants.EVENTO_ATIVIDADE_COMENTADA,
      MessagingConstants.SOCIAL_EXCHANGE,
      TipoNotificacao.ATIVIDADE_COMENTADA,
      "autorAcao",
      List.of(DadosDeNotificacao.ATIVIDADE_ID, DadosDeNotificacao.COMENTARIO_ID)),
  COMENTARIO_RESPONDIDO(
      MessagingConstants.EVENTO_COMENTARIO_RESPONDIDO,
      MessagingConstants.SOCIAL_EXCHANGE,
      TipoNotificacao.COMENTARIO_RESPONDIDO,
      "autorAcao",
      List.of(DadosDeNotificacao.ATIVIDADE_ID, DadosDeNotificacao.COMENTARIO_ID)),
  USUARIO_MENCIONADO(
      MessagingConstants.EVENTO_USUARIO_MENCIONADO,
      MessagingConstants.SOCIAL_EXCHANGE,
      TipoNotificacao.USUARIO_MENCIONADO,
      "autorAcao",
      List.of(DadosDeNotificacao.ATIVIDADE_ID, DadosDeNotificacao.COMENTARIO_ID)),
  LEITURA_EM_RISCO(
      MessagingConstants.EVENTO_LEITURA_EM_RISCO,
      MessagingConstants.LEITURA_EXCHANGE,
      TipoNotificacao.LEITURA_EM_RISCO,
      null,
      List.of(DadosDeNotificacao.LEITURA_ID, DadosDeNotificacao.LIMIAR_DIAS)),
  LEITURA_EXPIRADA(
      MessagingConstants.EVENTO_LEITURA_EXPIRADA,
      MessagingConstants.LEITURA_EXCHANGE,
      TipoNotificacao.LEITURA_EXPIRADA,
      null,
      List.of(DadosDeNotificacao.LEITURA_ID, DadosDeNotificacao.LIMIAR_DIAS)),
  /**
   * F-AVA-2: o {@code leitura} só publica a primeira curtida do par resenha e leitor, então
   * recurtir não chega aqui. O {@code livro} do {@code data} vira o snapshot do destino.
   */
  RESENHA_CURTIDA(
      MessagingConstants.EVENTO_RESENHA_CURTIDA,
      MessagingConstants.LEITURA_EXCHANGE,
      TipoNotificacao.RESENHA_CURTIDA,
      "autorAcao",
      List.of(DadosDeNotificacao.RESENHA_ID));

  private static final String CAMPO_DESTINATARIO = "destinatarioId";
  private static final String CAMPO_LIVRO = "livro";
  private static final String CAMPO_DISPLAY_NAME = "displayName";

  private final String evento;
  private final String exchange;
  private final TipoNotificacao tipo;
  private final String campoAtor;
  private final List<String> camposCopiados;

  EventoDeNotificacao(
      String evento,
      String exchange,
      TipoNotificacao tipo,
      String campoAtor,
      List<String> camposCopiados) {
    this.evento = evento;
    this.exchange = exchange;
    this.tipo = tipo;
    this.campoAtor = campoAtor;
    this.camposCopiados = camposCopiados;
  }

  public String evento() {
    return evento;
  }

  public TipoNotificacao tipo() {
    return tipo;
  }

  public static Optional<EventoDeNotificacao> deEvento(String evento) {
    return Arrays.stream(values()).filter(e -> e.evento.equals(evento)).findFirst();
  }

  /** Bindings da fila de notificações: cada exchange de origem com os seus eventos. */
  public static Map<String, List<String>> routingKeysPorExchange() {
    return Arrays.stream(values())
        .collect(
            Collectors.groupingBy(
                e -> e.exchange,
                LinkedHashMap::new,
                Collectors.mapping(e -> e.evento, Collectors.toList())));
  }

  public String destinatarioId(Map<String, Object> data) {
    return (String) data.get(CAMPO_DESTINATARIO);
  }

  /** Snapshot de {@code notificacao.dados} a partir do {@code data} já validado pelo schema. */
  public Map<String, Object> snapshot(Map<String, Object> data) {
    Map<String, Object> dados = new LinkedHashMap<>();
    if (campoAtor != null) {
      dados.put(DadosDeNotificacao.ATOR, ator(mapa(data, campoAtor)));
    }
    camposCopiados.forEach(campo -> dados.put(campo, data.get(campo)));
    if (data.containsKey(CAMPO_LIVRO)) {
      dados.put(DadosDeNotificacao.LIVRO, livro(mapa(data, CAMPO_LIVRO)));
    }
    return dados;
  }

  private static Map<String, Object> ator(Map<String, Object> usuario) {
    Map<String, Object> ator = new LinkedHashMap<>();
    ator.put(DadosDeNotificacao.ATOR_ID, usuario.get("id"));
    ator.put(DadosDeNotificacao.ATOR_USERNAME, usuario.get("username"));
    ator.put(DadosDeNotificacao.ATOR_NOME, usuario.get(CAMPO_DISPLAY_NAME));
    ator.put(DadosDeNotificacao.ATOR_AVATAR, usuario.get("avatarUrl"));
    return ator;
  }

  private static Map<String, Object> livro(Map<String, Object> livro) {
    Map<String, Object> snapshot = new LinkedHashMap<>();
    snapshot.put(DadosDeNotificacao.LIVRO_ID, livro.get("id"));
    snapshot.put(DadosDeNotificacao.LIVRO_TIPO, livro.get("tipo"));
    snapshot.put(DadosDeNotificacao.LIVRO_TITULO, livro.get("titulo"));
    return snapshot;
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> mapa(Map<String, Object> data, String campo) {
    return (Map<String, Object>) data.get(campo);
  }
}
