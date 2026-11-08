package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste.Fato;
import br.com.leai.social.notificacao.model.EventoDeNotificacao;
import br.com.leai.social.notificacao.service.ConsumidorDeNotificacao;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class PreferenciaNotificacaoControllerIntegracaoTest extends IntegracaoComPostgres {

  private static final ObjectMapper JSON = new ObjectMapper();
  private static final String CAMINHO = "/me/notificacoes/preferencias";

  private static final List<String> TIPOS_DO_CONTRATO =
      List.of(
          "NOVO_SEGUIDOR",
          "SOLICITACAO_CRIADA",
          "SOLICITACAO_ACEITA",
          "ATIVIDADE_CURTIDA",
          "ATIVIDADE_COMENTADA",
          "COMENTARIO_RESPONDIDO",
          "USUARIO_MENCIONADO",
          "LEITURA_EM_RISCO",
          "LEITURA_EXPIRADA",
          "RECOMENDACAO_RECEBIDA",
          "RESENHA_CURTIDA",
          "LEMBRETE_SEQUENCIA");

  @Autowired private ConsumidorDeNotificacao consumidor;
  @Autowired private JdbcTemplate jdbc;

  @Test
  @DisplayName("GET devolve os 12 tipos em ordem fixa, todos habilitados para quem nunca alterou")
  void getDevolveTodosHabilitadosEmOrdemFixa() throws Exception {
    HttpResponse<String> resposta = listar(token(UUID.randomUUID()));

    assertThat(resposta.statusCode()).isEqualTo(200);
    JsonNode preferencias = JSON.readTree(resposta.body()).get("preferencias");
    assertThat(tipos(preferencias)).containsExactlyElementsOf(TIPOS_DO_CONTRATO);
    preferencias.forEach(item -> assertThat(item.get("habilitada").asBoolean()).isTrue());
  }

  @Test
  @DisplayName("PUT altera so os tipos enviados e devolve o conjunto completo")
  void putAlteraSoOsEnviadosEDevolveTudo() throws Exception {
    UUID eu = UUID.randomUUID();
    String bearer = token(eu);

    HttpResponse<String> resposta =
        atualizar(
            bearer,
            UUID.randomUUID(),
            corpo(Map.of("NOVO_SEGUIDOR", false, "RECOMENDACAO_RECEBIDA", false)));

    assertThat(resposta.statusCode()).isEqualTo(200);
    JsonNode preferencias = JSON.readTree(resposta.body()).get("preferencias");
    assertThat(tipos(preferencias)).containsExactlyElementsOf(TIPOS_DO_CONTRATO);
    assertThat(desabilitados(preferencias))
        .containsExactlyInAnyOrder("NOVO_SEGUIDOR", "RECOMENDACAO_RECEBIDA");
    assertThat(desabilitados(JSON.readTree(listar(bearer).body()).get("preferencias")))
        .containsExactlyInAnyOrder("NOVO_SEGUIDOR", "RECOMENDACAO_RECEBIDA");

    HttpResponse<String> reabilitando =
        atualizar(bearer, UUID.randomUUID(), corpo(Map.of("NOVO_SEGUIDOR", true)));

    assertThat(desabilitados(JSON.readTree(reabilitando.body()).get("preferencias")))
        .containsExactly("RECOMENDACAO_RECEBIDA");
  }

  @Test
  @DisplayName("cada um dos 12 tipos e gravavel, com os literais aceitos pelo banco")
  void todosOsTiposSaoGravaveis() throws Exception {
    UUID eu = UUID.randomUUID();
    Map<String, Boolean> todosDesabilitados =
        TIPOS_DO_CONTRATO.stream().collect(Collectors.toMap(tipo -> tipo, tipo -> false));

    HttpResponse<String> resposta =
        atualizar(token(eu), UUID.randomUUID(), corpo(todosDesabilitados));

    assertThat(resposta.statusCode()).isEqualTo(200);
    assertThat(desabilitados(JSON.readTree(resposta.body()).get("preferencias")))
        .containsExactlyInAnyOrderElementsOf(TIPOS_DO_CONTRATO);
    assertThat(literaisGravados(eu))
        .containsExactlyInAnyOrder(
            "novo_seguidor",
            "solicitacao_seguir",
            "solicitacao_aceita",
            "atividade_curtida",
            "atividade_comentada",
            "comentario_respondido",
            "usuario_mencionado",
            "leitura_em_risco",
            "leitura_expirada",
            "recomendacao_recebida",
            "resenha_curtida",
            "lembrete_sequencia");
  }

  @Test
  @DisplayName("PUT com tipo desconhecido responde 400 padrao e nao altera nada")
  void tipoDesconhecidoNaoAlteraNada() throws Exception {
    UUID eu = UUID.randomUUID();

    HttpResponse<String> resposta =
        atualizar(
            token(eu),
            UUID.randomUUID(),
            """
            {"preferencias":[
              {"tipo":"NOVO_SEGUIDOR","habilitada":false},
              {"tipo":"TIPO_QUE_NAO_EXISTE","habilitada":false}
            ]}
            """);

    assertThat(resposta.statusCode()).isEqualTo(400);
    JsonNode erro = JSON.readTree(resposta.body());
    assertThat(erro.get("codigo").asText()).isEqualTo("REQUISICAO_INVALIDA");
    assertThat(erro.get("mensagem").asText()).isNotBlank();
    assertThat(erro.has("correlationId")).isTrue();
    assertThat(literaisGravados(eu)).isEmpty();
  }

  @Test
  @DisplayName("PUT com tipo repetido responde 400 e nao altera nada")
  void tipoRepetidoNaoAlteraNada() throws Exception {
    UUID eu = UUID.randomUUID();

    HttpResponse<String> resposta =
        atualizar(
            token(eu),
            UUID.randomUUID(),
            """
            {"preferencias":[
              {"tipo":"NOVO_SEGUIDOR","habilitada":false},
              {"tipo":"NOVO_SEGUIDOR","habilitada":true}
            ]}
            """);

    assertThat(resposta.statusCode()).isEqualTo(400);
    assertThat(literaisGravados(eu)).isEmpty();
  }

  @Test
  @DisplayName("PUT sem lista, vazio, sem habilitada ou sem Idempotency-Key responde 400")
  void corposInvalidosRespondem400() throws Exception {
    UUID eu = UUID.randomUUID();
    String bearer = token(eu);

    assertThat(atualizar(bearer, UUID.randomUUID(), "{}").statusCode()).isEqualTo(400);
    assertThat(atualizar(bearer, UUID.randomUUID(), "{\"preferencias\":[]}").statusCode())
        .isEqualTo(400);
    assertThat(
            atualizar(
                    bearer,
                    UUID.randomUUID(),
                    "{\"preferencias\":[{\"tipo\":\"NOVO_SEGUIDOR\"}]}")
                .statusCode())
        .isEqualTo(400);
    HttpResponse<String> semChave =
        enviar(
            HttpRequest.newBuilder(uri(CAMINHO))
                .header("Authorization", "Bearer " + bearer)
                .header("Content-Type", "application/json")
                .PUT(
                    HttpRequest.BodyPublishers.ofString(
                        corpo(Map.of("NOVO_SEGUIDOR", false))))
                .build());
    assertThat(semChave.statusCode()).isEqualTo(400);
    assertThat(literaisGravados(eu)).isEmpty();
  }

  @Test
  @DisplayName("sem token as rotas de preferencias respondem 401")
  void semTokenE401() throws Exception {
    HttpResponse<String> get = enviar(HttpRequest.newBuilder(uri(CAMINHO)).GET().build());
    HttpResponse<String> put =
        enviar(
            HttpRequest.newBuilder(uri(CAMINHO))
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .PUT(HttpRequest.BodyPublishers.ofString(corpo(Map.of("NOVO_SEGUIDOR", false))))
                .build());

    assertThat(get.statusCode()).isEqualTo(401);
    assertThat(put.statusCode()).isEqualTo(401);
  }

  @Test
  @DisplayName("cada leitor le e altera so as proprias preferencias")
  void isolamentoEntreLeitores() throws Exception {
    UUID a = UUID.randomUUID();
    UUID b = UUID.randomUUID();
    atualizar(token(a), UUID.randomUUID(), corpo(Map.of("NOVO_SEGUIDOR", false)));

    JsonNode deB = JSON.readTree(listar(token(b)).body()).get("preferencias");
    atualizar(token(b), UUID.randomUUID(), corpo(Map.of("ATIVIDADE_CURTIDA", false)));

    assertThat(desabilitados(deB)).isEmpty();
    assertThat(literaisGravados(a)).containsExactly("novo_seguidor");
    assertThat(literaisGravados(b)).containsExactly("atividade_curtida");
    assertThat(desabilitados(JSON.readTree(listar(token(a)).body()).get("preferencias")))
        .containsExactly("NOVO_SEGUIDOR");
  }

  @Test
  @DisplayName("mesma Idempotency-Key repete o resultado sem reaplicar; com outro payload responde 409")
  void idempotenciaDoPut() throws Exception {
    UUID eu = UUID.randomUUID();
    String bearer = token(eu);
    UUID chave = UUID.randomUUID();
    String desabilitar = corpo(Map.of("NOVO_SEGUIDOR", false));

    HttpResponse<String> primeira = atualizar(bearer, chave, desabilitar);
    atualizar(bearer, UUID.randomUUID(), corpo(Map.of("NOVO_SEGUIDOR", true)));
    HttpResponse<String> repetida = atualizar(bearer, chave, desabilitar);
    HttpResponse<String> outroPayload =
        atualizar(bearer, chave, corpo(Map.of("ATIVIDADE_CURTIDA", false)));

    assertThat(primeira.statusCode()).isEqualTo(200);
    assertThat(repetida.statusCode()).isEqualTo(200);
    assertThat(repetida.body()).isEqualTo(primeira.body());
    assertThat(outroPayload.statusCode()).isEqualTo(409);
    assertThat(desabilitados(JSON.readTree(listar(bearer).body()).get("preferencias"))).isEmpty();
  }

  @Test
  @DisplayName("desabilitar por HTTP suprime o evento seguinte e reabilitar nao recupera o suprimido")
  void desabilitarEReabilitarPorHttpAgemNoConsumidor() throws Exception {
    UUID eu = UUID.randomUUID();
    String bearer = token(eu);
    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu)));

    atualizar(bearer, UUID.randomUUID(), corpo(Map.of("NOVO_SEGUIDOR", false)));
    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu)));
    assertThat(totalDeNotificacoes(eu)).isEqualTo(1);

    atualizar(bearer, UUID.randomUUID(), corpo(Map.of("NOVO_SEGUIDOR", true)));
    assertThat(totalDeNotificacoes(eu)).isEqualTo(1);
    consumidor.handle(
        EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu)));
    assertThat(totalDeNotificacoes(eu)).isEqualTo(2);
  }

  private HttpResponse<String> listar(String bearer) {
    return enviar(
        HttpRequest.newBuilder(uri(CAMINHO))
            .header("Authorization", "Bearer " + bearer)
            .GET()
            .build());
  }

  private HttpResponse<String> atualizar(String bearer, UUID chave, String corpo) {
    return enviar(
        HttpRequest.newBuilder(uri(CAMINHO))
            .header("Authorization", "Bearer " + bearer)
            .header("Idempotency-Key", chave.toString())
            .header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString(corpo))
            .build());
  }

  private static String corpo(Map<String, Boolean> alteracoes) throws Exception {
    List<Map<String, Object>> itens = new ArrayList<>();
    alteracoes.forEach((tipo, habilitada) -> itens.add(Map.of("tipo", tipo, "habilitada", habilitada)));
    return JSON.writeValueAsString(Map.of("preferencias", itens));
  }

  private static List<String> tipos(JsonNode preferencias) {
    List<String> tipos = new ArrayList<>();
    preferencias.forEach(item -> tipos.add(item.get("tipo").asText()));
    return tipos;
  }

  private static List<String> desabilitados(JsonNode preferencias) {
    List<String> tipos = new ArrayList<>();
    preferencias.forEach(
        item -> {
          if (!item.get("habilitada").asBoolean()) {
            tipos.add(item.get("tipo").asText());
          }
        });
    return tipos;
  }

  private List<String> literaisGravados(UUID usuario) {
    return jdbc.queryForList(
        "SELECT tipo FROM preferencia_notificacao WHERE usuario_id = ?", String.class, usuario);
  }

  private int totalDeNotificacoes(UUID destinatario) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM notificacao WHERE destinatario_id = ?", Integer.class, destinatario);
  }
}
