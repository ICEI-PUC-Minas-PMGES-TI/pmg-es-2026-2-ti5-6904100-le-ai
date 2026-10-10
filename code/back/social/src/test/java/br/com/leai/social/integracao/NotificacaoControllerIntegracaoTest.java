package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste.Fato;
import br.com.leai.social.notificacao.model.EventoDeNotificacao;
import br.com.leai.social.notificacao.service.ConsumidorDeNotificacao;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.UncheckedIOException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * F-NOT de ponta a ponta no serviço (RNF-TST-02): as notificações nascem pelo consumidor real a
 * partir dos envelopes dos produtores, e são lidas e marcadas por HTTP com JWT, passando por
 * Spring Security, validação, idempotência e Postgres. Cobre lista paginada com não lidas
 * (RF-NOT-02), marcação individual e em lote (RF-NOT-03), a ação de abandonar da leitura em risco
 * (RF-NOT-04), o isolamento por destinatário (RNF-SEC-02) e o canal SSE de tempo real
 * (RF-NOT-06).
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class NotificacaoControllerIntegracaoTest extends IntegracaoComPostgres {

  private static final ObjectMapper JSON = new ObjectMapper();
  private static final String CANAL = "/notificacoes/tempo-real";

  @Autowired private ConsumidorDeNotificacao consumidor;
  @Autowired private JdbcTemplate jdbc;

  @BeforeEach
  void preparaPerfisDeIdentidade() {
    // Mesma definição usada pelas outras classes deste módulo: CREATE OR REPLACE VIEW não remove
    // colunas, então a view precisa ficar idêntica entre as classes do mesmo contexto.
    jdbc.execute("CREATE SCHEMA IF NOT EXISTS identidade");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS identidade.usuario (
          id uuid PRIMARY KEY,
          suspenso boolean NOT NULL DEFAULT false,
          exclusao_solicitada_em timestamptz
        )
        """);
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS username text");
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS nome_exibicao text");
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS avatar_url text");
    jdbc.execute(
        "ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS privacidade text NOT NULL DEFAULT 'publico'");
    jdbc.execute(
        "ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS opt_out_recomendacao boolean NOT NULL DEFAULT false");
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW identidade.v_perfil_referencia_v1 AS
        SELECT id, username, nome_exibicao, avatar_url, privacidade, opt_out_recomendacao
          FROM identidade.usuario
         WHERE suspenso = false AND exclusao_solicitada_em IS NULL
        """);
  }

  @Test
  @DisplayName("lista so as notificacoes do leitor, paginadas e com o total de nao lidas")
  void listaPaginadaSoDoDono() throws Exception {
    UUID eu = UUID.randomUUID();
    UUID outro = UUID.randomUUID();
    List<UUID> minhas = new ArrayList<>();
    for (int i = 0; i < 3; i++) {
      minhas.add(notificar(EventoDeNotificacao.ATIVIDADE_CURTIDA, Fato.para(eu)));
    }
    UUID alheia = notificar(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(outro));
    String bearer = token(eu);

    JsonNode primeira = listar(bearer, 0, 2);
    JsonNode segunda = listar(bearer, 1, 2);

    assertThat(primeira.get("totalItens").asLong()).isEqualTo(3);
    assertThat(primeira.get("totalPaginas").asInt()).isEqualTo(2);
    assertThat(primeira.get("ultima").asBoolean()).isFalse();
    assertThat(primeira.get("totalNaoLidas").asLong()).isEqualTo(3);
    assertThat(segunda.get("ultima").asBoolean()).isTrue();
    List<String> ids = new ArrayList<>();
    primeira.get("itens").forEach(item -> ids.add(item.get("id").asText()));
    segunda.get("itens").forEach(item -> ids.add(item.get("id").asText()));
    // Mais recente primeiro.
    assertThat(ids)
        .containsExactly(minhas.get(2).toString(), minhas.get(1).toString(), minhas.get(0).toString())
        .doesNotContain(alheia.toString());
  }

  @Test
  @DisplayName("leitura em risco traz livro, limiar e a acao de abandonar com confirmacao")
  void leituraEmRiscoTrazAcaoDeAbandonar() throws Exception {
    UUID eu = UUID.randomUUID();
    Fato fato = Fato.para(eu).comCiclo(1, 30);
    notificar(EventoDeNotificacao.LEITURA_EM_RISCO, fato);

    JsonNode item = listar(token(eu), 0, 20).get("itens").get(0);

    assertThat(item.get("tipo").asText()).isEqualTo("LEITURA_EM_RISCO");
    assertThat(item.get("leituraId").asText()).isEqualTo(fato.leituraId().toString());
    assertThat(item.get("limiarDias").asInt()).isEqualTo(30);
    assertThat(item.get("livro").get("titulo").asText())
        .isEqualTo(EventosDeNotificacaoDeTeste.TITULO_LIVRO);
    assertThat(item.get("mensagem").asText())
        .isEqualTo(
            "Você não registra progresso em O Avesso da Pele há 30 dias. No dia 40 ele é"
                + " abandonado automaticamente.");
    JsonNode acao = item.get("acao");
    assertThat(acao.get("tipo").asText()).isEqualTo("ABANDONAR_LEITURA");
    assertThat(acao.get("service").asText()).isEqualTo("leitura");
    assertThat(acao.get("path").asText()).isEqualTo("/leituras/{leituraId}/abandonar");
    assertThat(acao.get("recursoId").asText()).isEqualTo(fato.leituraId().toString());
    assertThat(acao.get("requerConfirmacao").asBoolean()).isTrue();
  }

  @Test
  @DisplayName("curtida em resenha traz o livro do destino e a frase da curtida")
  void curtidaEmResenhaTrazLivroEFrase() throws Exception {
    UUID eu = UUID.randomUUID();
    UUID leitora = UUID.randomUUID();
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", leitora);
    notificar(EventoDeNotificacao.RESENHA_CURTIDA, Fato.para(eu).comAtor(leitora));

    JsonNode item = listar(token(eu), 0, 20).get("itens").get(0);

    assertThat(item.get("tipo").asText()).isEqualTo("RESENHA_CURTIDA");
    assertThat(item.get("livro").get("tipo").asText()).isEqualTo("oficial");
    assertThat(item.get("livro").get("titulo").asText())
        .isEqualTo(EventosDeNotificacaoDeTeste.TITULO_LIVRO);
    assertThat(item.get("mensagem").asText())
        .isEqualTo(
            EventosDeNotificacaoDeTeste.NOME_ATOR
                + " curtiu sua resenha de "
                + EventosDeNotificacaoDeTeste.TITULO_LIVRO
                + ".");
  }

  @Test
  @DisplayName("ator visivel aparece na notificacao; ator suspenso some e vira 'Um leitor'")
  void atorSuspensoNaoEExposto() throws Exception {
    UUID eu = UUID.randomUUID();
    UUID visivel = UUID.randomUUID();
    UUID suspenso = UUID.randomUUID();
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", visivel);
    jdbc.update("INSERT INTO identidade.usuario (id, suspenso) VALUES (?, true)", suspenso);
    notificar(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu).comAtor(suspenso));
    notificar(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu).comAtor(visivel));

    JsonNode itens = listar(token(eu), 0, 20).get("itens");

    JsonNode doVisivel = itens.get(0);
    assertThat(doVisivel.get("ator").get("id").asText()).isEqualTo(visivel.toString());
    assertThat(doVisivel.get("mensagem").asText())
        .isEqualTo(EventosDeNotificacaoDeTeste.NOME_ATOR + " começou a seguir você.");
    JsonNode doSuspenso = itens.get(1);
    assertThat(doSuspenso.get("ator").isNull()).isTrue();
    assertThat(doSuspenso.get("mensagem").asText()).isEqualTo("Um leitor começou a seguir você.");
  }

  @Test
  @DisplayName("marca uma notificacao individualmente e atualiza o total de nao lidas")
  void marcaIndividual() throws Exception {
    UUID eu = UUID.randomUUID();
    UUID primeira = notificar(EventoDeNotificacao.SOLICITACAO_CRIADA, Fato.para(eu));
    notificar(EventoDeNotificacao.SOLICITACAO_ACEITA, Fato.para(eu));
    String bearer = token(eu);

    HttpResponse<String> resposta =
        marcar(bearer, UUID.randomUUID(), "{\"modo\":\"SELECIONADAS\",\"ids\":[\"" + primeira + "\"]}");

    assertThat(resposta.statusCode()).isEqualTo(200);
    JsonNode corpo = JSON.readTree(resposta.body());
    assertThat(corpo.get("marcadas").asInt()).isEqualTo(1);
    assertThat(corpo.get("totalNaoLidas").asLong()).isEqualTo(1);
    JsonNode lida = listar(bearer, 0, 20).get("itens").get(1);
    assertThat(lida.get("id").asText()).isEqualTo(primeira.toString());
    assertThat(lida.get("lida").asBoolean()).isTrue();
    assertThat(lida.get("lidaEm").isNull()).isFalse();
  }

  @Test
  @DisplayName("id de outro destinatario no lote responde 404 e nao altera nada")
  void idAlheioNaoAlteraNada() throws Exception {
    UUID eu = UUID.randomUUID();
    UUID outro = UUID.randomUUID();
    UUID minha = notificar(EventoDeNotificacao.ATIVIDADE_COMENTADA, Fato.para(eu));
    UUID alheia = notificar(EventoDeNotificacao.ATIVIDADE_COMENTADA, Fato.para(outro));

    HttpResponse<String> resposta =
        marcar(
            token(eu),
            UUID.randomUUID(),
            "{\"modo\":\"SELECIONADAS\",\"ids\":[\"" + minha + "\",\"" + alheia + "\"]}");

    assertThat(resposta.statusCode()).isEqualTo(404);
    assertThat(resposta.body()).contains("\"codigo\":\"RECURSO_NAO_ENCONTRADO\"");
    assertThat(naoLidas(eu)).isEqualTo(1);
    assertThat(naoLidas(outro)).isEqualTo(1);
  }

  @Test
  @DisplayName("TODAS marca todas as nao lidas do leitor e so as dele")
  void marcaTodas() throws Exception {
    UUID eu = UUID.randomUUID();
    UUID outro = UUID.randomUUID();
    notificar(EventoDeNotificacao.COMENTARIO_RESPONDIDO, Fato.para(eu));
    notificar(EventoDeNotificacao.LEITURA_EXPIRADA, Fato.para(eu));
    notificar(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(outro));

    HttpResponse<String> resposta = marcar(token(eu), UUID.randomUUID(), "{\"modo\":\"TODAS\"}");

    assertThat(resposta.statusCode()).isEqualTo(200);
    JsonNode corpo = JSON.readTree(resposta.body());
    assertThat(corpo.get("marcadas").asInt()).isEqualTo(2);
    assertThat(corpo.get("totalNaoLidas").asLong()).isZero();
    assertThat(naoLidas(outro)).isEqualTo(1);
  }

  @Test
  @DisplayName("regra condicional: TODAS com ids e SELECIONADAS sem ids respondem 400")
  void regraCondicionalDoModo() throws Exception {
    String bearer = token(UUID.randomUUID());

    HttpResponse<String> todasComIds =
        marcar(bearer, UUID.randomUUID(), "{\"modo\":\"TODAS\",\"ids\":[\"" + UUID.randomUUID() + "\"]}");
    HttpResponse<String> selecionadasSemIds =
        marcar(bearer, UUID.randomUUID(), "{\"modo\":\"SELECIONADAS\"}");
    HttpResponse<String> semChave =
        enviar(
            HttpRequest.newBuilder(uri("/notificacoes/marcar-lidas"))
                .header("Authorization", "Bearer " + bearer)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{\"modo\":\"TODAS\"}"))
                .build());

    assertThat(todasComIds.statusCode()).isEqualTo(400);
    assertThat(selecionadasSemIds.statusCode()).isEqualTo(400);
    assertThat(semChave.statusCode()).isEqualTo(400);
  }

  @Test
  @DisplayName("mesma Idempotency-Key repete o resultado; com outro payload responde 409")
  void idempotenciaDaMarcacao() throws Exception {
    UUID eu = UUID.randomUUID();
    UUID id = notificar(EventoDeNotificacao.ATIVIDADE_CURTIDA, Fato.para(eu));
    String bearer = token(eu);
    UUID chave = UUID.randomUUID();
    String corpo = "{\"modo\":\"SELECIONADAS\",\"ids\":[\"" + id + "\"]}";

    HttpResponse<String> primeira = marcar(bearer, chave, corpo);
    HttpResponse<String> repetida = marcar(bearer, chave, corpo);
    HttpResponse<String> outroPayload = marcar(bearer, chave, "{\"modo\":\"TODAS\"}");

    assertThat(primeira.statusCode()).isEqualTo(200);
    assertThat(repetida.statusCode()).isEqualTo(200);
    assertThat(repetida.body()).isEqualTo(primeira.body());
    assertThat(JSON.readTree(primeira.body()).get("marcadas").asInt()).isEqualTo(1);
    assertThat(outroPayload.statusCode()).isEqualTo(409);
  }

  @Test
  @DisplayName("sem token as rotas de notificacao respondem 401")
  void semTokenE401() {
    HttpResponse<String> resposta =
        enviar(HttpRequest.newBuilder(uri("/notificacoes")).GET().build());

    assertThat(resposta.statusCode()).isEqualTo(401);
  }

  @Test
  @DisplayName("tempo real: sem token ou com token invalido o canal nao abre")
  void tempoRealExigeTokenValido() {
    HttpResponse<String> semToken =
        enviar(HttpRequest.newBuilder(uri(CANAL)).GET().build());
    HttpResponse<String> tokenInvalido =
        enviar(
            HttpRequest.newBuilder(uri(CANAL))
                .header("Authorization", "Bearer nao-e-um-jwt")
                .GET()
                .build());

    assertThat(semToken.statusCode()).isEqualTo(401);
    assertThat(tokenInvalido.statusCode()).isEqualTo(401);
  }

  @Test
  @DisplayName("tempo real: abre sincronizando as nao lidas e empurra a notificacao nova do dono")
  void tempoRealEmpurraANotificacaoDoDono() throws Exception {
    UUID eu = UUID.randomUUID();
    UUID outro = UUID.randomUUID();
    notificar(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu));

    try (CanalSse canal = abrirCanal(token(eu))) {
      EventoSse sincronizacao = canal.proximo();
      assertThat(sincronizacao.nome()).isEqualTo("sincronizacao");
      assertThat(JSON.readTree(sincronizacao.dado()).get("totalNaoLidas").asInt()).isEqualTo(1);

      notificar(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(outro));
      UUID minha = notificar(EventoDeNotificacao.ATIVIDADE_CURTIDA, Fato.para(eu));

      EventoSse recebido = canal.proximo();
      JsonNode dado = JSON.readTree(recebido.dado());
      assertThat(recebido.nome()).isEqualTo("notificacao");
      assertThat(recebido.id()).isEqualTo(minha.toString());
      assertThat(dado.get("notificacao").get("id").asText()).isEqualTo(minha.toString());
      assertThat(dado.get("notificacao").get("lida").asBoolean()).isFalse();
      assertThat(dado.get("totalNaoLidas").asInt()).isEqualTo(2);
    }
  }

  @Test
  @DisplayName("tempo real: reentrega do mesmo evento nao empurra de novo")
  void tempoRealNaoReentregaDuplicata() throws Exception {
    UUID eu = UUID.randomUUID();
    MessageEnvelope envelope =
        EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu));

    try (CanalSse canal = abrirCanal(token(eu))) {
      canal.proximo();
      consumidor.handle(envelope);
      consumidor.handle(envelope);
      UUID seguinte = notificar(EventoDeNotificacao.ATIVIDADE_COMENTADA, Fato.para(eu));

      assertThat(canal.proximo().id()).isNotNull();
      assertThat(canal.proximo().id()).isEqualTo(seguinte.toString());
    }
  }

  @Test
  @DisplayName("tempo real: o servidor encerra o canal quando o token expira")
  void tempoRealEncerraNaExpiracaoDoToken() throws Exception {
    try (CanalSse canal = abrirCanal(token(UUID.randomUUID(), Duration.ofSeconds(2)))) {
      assertThat(canal.proximo().nome()).isEqualTo("sincronizacao");

      assertThat(canal.encerrado(Duration.ofSeconds(10))).isTrue();
    }
  }

  private CanalSse abrirCanal(String bearer) throws Exception {
    HttpResponse<Stream<String>> resposta =
        HTTP.send(
            HttpRequest.newBuilder(uri(CANAL))
                .header("Authorization", "Bearer " + bearer)
                .header("Accept", "text/event-stream")
                .GET()
                .build(),
            HttpResponse.BodyHandlers.ofLines());
    assertThat(resposta.statusCode()).isEqualTo(200);
    assertThat(resposta.headers().firstValue("Content-Type")).hasValueSatisfying(
        tipo -> assertThat(tipo).startsWith("text/event-stream"));
    return new CanalSse(resposta.body());
  }

  private record EventoSse(String nome, String id, String dado) {}

  /** Lê o stream SSE numa thread própria; ignora heartbeats. */
  private static final class CanalSse implements AutoCloseable {

    private static final Duration ESPERA = Duration.ofSeconds(10);
    private static final EventoSse FIM = new EventoSse(null, null, null);

    private final Stream<String> linhas;
    private final BlockingQueue<EventoSse> eventos = new LinkedBlockingQueue<>();
    private final Thread leitor;

    CanalSse(Stream<String> linhas) {
      this.linhas = linhas;
      this.leitor = Thread.ofVirtual().start(this::ler);
    }

    private void ler() {
      String[] atual = new String[3];
      try {
        linhas.forEach(
            linha -> {
              if (linha.isEmpty()) {
                if (atual[0] != null || atual[2] != null) {
                  eventos.add(new EventoSse(atual[0], atual[1], atual[2]));
                }
                Arrays.fill(atual, null);
              } else if (linha.startsWith("event:")) {
                atual[0] = linha.substring("event:".length());
              } else if (linha.startsWith("id:")) {
                atual[1] = linha.substring("id:".length());
              } else if (linha.startsWith("data:")) {
                atual[2] = linha.substring("data:".length());
              }
            });
      } catch (UncheckedIOException fechado) {
        // close() durante a leitura.
      } finally {
        eventos.add(FIM);
      }
    }

    EventoSse proximo() throws InterruptedException {
      EventoSse evento = eventos.poll(ESPERA.toMillis(), TimeUnit.MILLISECONDS);
      assertThat(evento).as("evento SSE dentro de %s", ESPERA).isNotNull().isNotSameAs(FIM);
      return evento;
    }

    boolean encerrado(Duration limite) throws InterruptedException {
      return eventos.poll(limite.toMillis(), TimeUnit.MILLISECONDS) == FIM;
    }

    @Override
    public void close() throws InterruptedException {
      linhas.close();
      leitor.join(ESPERA.toMillis());
    }
  }

  private UUID notificar(EventoDeNotificacao evento, Fato fato) {
    MessageEnvelope envelope = EventosDeNotificacaoDeTeste.envelope(evento, fato);
    consumidor.handle(envelope);
    return jdbc.queryForObject(
        "SELECT id FROM notificacao WHERE event_id = ?", UUID.class, envelope.eventId());
  }

  private JsonNode listar(String bearer, int pagina, int tamanho) throws Exception {
    HttpResponse<String> resposta =
        enviar(
            HttpRequest.newBuilder(uri("/notificacoes?page=" + pagina + "&size=" + tamanho))
                .header("Authorization", "Bearer " + bearer)
                .GET()
                .build());
    assertThat(resposta.statusCode()).isEqualTo(200);
    return JSON.readTree(resposta.body());
  }

  private HttpResponse<String> marcar(String bearer, UUID chave, String corpo) {
    return enviar(
        HttpRequest.newBuilder(uri("/notificacoes/marcar-lidas"))
            .header("Authorization", "Bearer " + bearer)
            .header("Idempotency-Key", chave.toString())
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(corpo))
            .build());
  }

  private int naoLidas(UUID destinatario) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM notificacao WHERE destinatario_id = ? AND lida_em IS NULL",
        Integer.class,
        destinatario);
  }
}
