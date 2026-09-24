package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.identidade.messaging.MessageEnvelope;
import br.com.leai.identidade.messaging.MessageValidator;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Grafo de seguidores contra Postgres real (RF-SOC-05..07, RN-08): seguir, pedir, aceitar,
 * recusar, desfazer, contadores, eventos na outbox e idempotência (RNF-TST-01/02/03).
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class SeguimentoIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";

  @Autowired private JdbcTemplate jdbc;

  @Autowired private ObjectMapper objectMapper;

  private final MessageValidator validador = new MessageValidator();

  private record Leitor(UUID id, String username, String token) {}

  private Leitor novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    String username = "segue_" + s;
    postJson(
        "/auth/register",
        """
        {"email":"segue.%1$s@exemplo.com","username":"%2$s","displayName":"Leitora %1$s",
         "dataNascimento":"1990-01-01","senha":"%3$s"}
        """
            .formatted(s, username, SENHA),
        "Idempotency-Key",
        UUID.randomUUID().toString());
    HttpResponse<String> login =
        postJson(
            "/auth/login",
            "{\"identificador\":\"%s\",\"senha\":\"%s\"}".formatted(username, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    String token = objectMapper.readTree(login.body()).get("accessToken").asString();
    UUID id = jdbc.queryForObject("SELECT id FROM usuario WHERE username = ?", UUID.class, username);
    return new Leitor(id, username, token);
  }

  private Leitor novoLeitorPrivado() {
    Leitor leitor = novoLeitor();
    jdbc.update("UPDATE usuario SET privacidade = 'privado' WHERE id = ?", leitor.id());
    return leitor;
  }

  private HttpResponse<String> requisicao(String metodo, String caminho, Leitor quem, String chave) {
    HttpRequest.Builder builder =
        HttpRequest.newBuilder(uri(caminho))
            .header("Authorization", "Bearer " + quem.token())
            .method(metodo, HttpRequest.BodyPublishers.noBody());
    if (chave != null) {
      builder.header("Idempotency-Key", chave);
    }
    return enviar(builder.build());
  }

  private HttpResponse<String> seguir(Leitor quem, Leitor alvo, String chave) {
    return requisicao("POST", "/perfis/" + alvo.username() + "/seguir", quem, chave);
  }

  private HttpResponse<String> seguir(Leitor quem, Leitor alvo) {
    return seguir(quem, alvo, UUID.randomUUID().toString());
  }

  private boolean segue(Leitor seguidor, Leitor seguido) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM seguidor WHERE seguidor_id = ? AND seguido_id = ?)",
            Boolean.class,
            seguidor.id(),
            seguido.id()));
  }

  private int[] contadores(Leitor leitor) {
    return jdbc.queryForObject(
        "SELECT qtd_seguidores, qtd_seguidos FROM usuario WHERE id = ?",
        (linha, n) -> new int[] {linha.getInt(1), linha.getInt(2)},
        leitor.id());
  }

  /** Eventos gravados para o destinatário, com o `data` já validado pelo schema do catálogo. */
  private List<Map<String, Object>> eventosPara(String tipo, Leitor destinatario) {
    List<Map<String, Object>> eventos = new ArrayList<>();
    for (Map<String, Object> linha :
        jdbc.queryForList(
            "SELECT chave_negocio, payload::text AS payload FROM outbox_identidade"
                + " WHERE tipo = ? AND payload->>'destinatarioId' = ?",
            tipo,
            destinatario.id().toString())) {
      Map<String, Object> data =
          objectMapper.readValue((String) linha.get("payload"), new TypeReference<>() {});
      validador.validate(
          new MessageEnvelope(
              UUID.randomUUID(),
              tipo,
              1,
              OffsetDateTime.now(),
              UUID.randomUUID(),
              (String) linha.get("chave_negocio"),
              data));
      data.put("_chave", linha.get("chave_negocio"));
      eventos.add(data);
    }
    return eventos;
  }

  @Test
  @DisplayName("seguir perfil público é imediato: 201, contadores e seguidor.novo para o seguido")
  void seguirPublico() {
    Leitor eu = novoLeitor();
    Leitor alvo = novoLeitor();

    HttpResponse<String> resposta = seguir(eu, alvo);

    assertThat(resposta.statusCode()).isEqualTo(201);
    assertThat(objectMapper.readTree(resposta.body()).get("estado").asString()).isEqualTo("seguindo");
    assertThat(segue(eu, alvo)).isTrue();
    assertThat(contadores(alvo)).containsExactly(1, 0);
    assertThat(contadores(eu)).containsExactly(0, 1);
    List<Map<String, Object>> eventos = eventosPara("seguidor.novo", alvo);
    assertThat(eventos).hasSize(1);
    @SuppressWarnings("unchecked")
    Map<String, Object> seguidor = (Map<String, Object>) eventos.getFirst().get("seguidor");
    assertThat(seguidor.get("username")).isEqualTo(eu.username());
    assertThat((String) eventos.getFirst().get("_chave")).startsWith("seguimento:");
  }

  @Test
  @DisplayName("seguir de novo é 409; repetir a chave devolve o 201 original sem segundo evento")
  void duplicidadeEIdempotencia() {
    Leitor eu = novoLeitor();
    Leitor alvo = novoLeitor();
    String chave = UUID.randomUUID().toString();

    HttpResponse<String> primeira = seguir(eu, alvo, chave);
    HttpResponse<String> replay = seguir(eu, alvo, chave);
    HttpResponse<String> outraChave = seguir(eu, alvo);

    assertThat(replay.statusCode()).isEqualTo(201);
    assertThat(replay.body()).isEqualTo(primeira.body());
    assertThat(outraChave.statusCode()).isEqualTo(409);
    assertThat(contadores(alvo)[0]).isEqualTo(1);
    assertThat(eventosPara("seguidor.novo", alvo)).hasSize(1);
  }

  @Test
  @DisplayName("perfil privado gera pedido pendente e solicitacao.criada; pedir de novo é 409")
  void seguirPrivado() {
    Leitor eu = novoLeitor();
    Leitor alvo = novoLeitorPrivado();

    HttpResponse<String> resposta = seguir(eu, alvo);
    JsonNode corpo = objectMapper.readTree(resposta.body());

    assertThat(resposta.statusCode()).isEqualTo(201);
    assertThat(corpo.get("estado").asString()).isEqualTo("solicitacao_pendente");
    assertThat(corpo.get("solicitacaoId").asString()).isNotBlank();
    assertThat(segue(eu, alvo)).isFalse();
    assertThat(contadores(alvo)).containsExactly(0, 0);
    assertThat(eventosPara("solicitacao.criada", alvo)).hasSize(1);
    assertThat(seguir(eu, alvo).statusCode()).isEqualTo(409);
  }

  @Test
  @DisplayName("seguir o próprio perfil é 409, username desconhecido é 404, sem chave é 400")
  void recusas() {
    Leitor eu = novoLeitor();

    assertThat(seguir(eu, eu).statusCode()).isEqualTo(409);
    assertThat(requisicao("POST", "/perfis/ninguem_aqui/seguir", eu, UUID.randomUUID().toString())
            .statusCode())
        .isEqualTo(404);
    assertThat(seguir(eu, novoLeitor(), null).statusCode()).isEqualTo(400);
  }

  @Test
  @DisplayName("a caixa de pedidos é só do destinatário e paginada; parâmetro fora do limite é 400")
  void caixaDePedidos() {
    Leitor alvo = novoLeitorPrivado();
    Leitor um = novoLeitor();
    Leitor dois = novoLeitor();
    seguir(um, alvo);
    seguir(dois, alvo);

    JsonNode pagina =
        objectMapper.readTree(requisicao("GET", "/solicitacoes?page=0&size=1", alvo, null).body());
    JsonNode deOutro = objectMapper.readTree(requisicao("GET", "/solicitacoes", um, null).body());

    assertThat(pagina.get("items")).hasSize(1);
    assertThat(pagina.get("totalElements").asLong()).isEqualTo(2);
    assertThat(pagina.get("totalPages").asInt()).isEqualTo(2);
    // O mais recente primeiro.
    assertThat(pagina.get("items").get(0).get("solicitante").get("username").asString())
        .isEqualTo(dois.username());
    assertThat(pagina.get("items").get(0).get("solicitante").get("relacao").asString())
        .isEqualTo("solicitacao_recebida");
    assertThat(deOutro.get("totalElements").asLong()).isZero();
    assertThat(requisicao("GET", "/solicitacoes?size=51", alvo, null).statusCode()).isEqualTo(400);
    assertThat(requisicao("GET", "/solicitacoes?page=-1", alvo, null).statusCode()).isEqualTo(400);
  }

  private UUID pedir(Leitor quem, Leitor alvo) {
    return UUID.fromString(
        objectMapper.readTree(seguir(quem, alvo).body()).get("solicitacaoId").asString());
  }

  @Test
  @DisplayName("aceitar cria o seguimento, conta e avisa quem pediu; aceitar de novo é 409")
  void aceitar() {
    Leitor alvo = novoLeitorPrivado();
    Leitor quemPediu = novoLeitor();
    UUID pedido = pedir(quemPediu, alvo);

    HttpResponse<String> resposta =
        requisicao("POST", "/solicitacoes/" + pedido + "/aceitar", alvo, UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(204);
    assertThat(segue(quemPediu, alvo)).isTrue();
    assertThat(contadores(alvo)).containsExactly(1, 0);
    assertThat(contadores(quemPediu)).containsExactly(0, 1);
    List<Map<String, Object>> aceitos = eventosPara("solicitacao.aceita", quemPediu);
    assertThat(aceitos).hasSize(1);
    assertThat(aceitos.getFirst().get("solicitacaoId")).isEqualTo(pedido.toString());
    assertThat(
            requisicao("POST", "/solicitacoes/" + pedido + "/aceitar", alvo, UUID.randomUUID().toString())
                .statusCode())
        .isEqualTo(409);
  }

  @Test
  @DisplayName("pedido de outra pessoa é 404 para aceitar e recusar, como o inexistente")
  void pedidoAlheio() {
    Leitor alvo = novoLeitorPrivado();
    Leitor quemPediu = novoLeitor();
    Leitor intruso = novoLeitor();
    UUID pedido = pedir(quemPediu, alvo);

    assertThat(
            requisicao("POST", "/solicitacoes/" + pedido + "/aceitar", intruso, UUID.randomUUID().toString())
                .statusCode())
        .isEqualTo(404);
    assertThat(
            requisicao("POST", "/solicitacoes/" + pedido + "/recusar", quemPediu, UUID.randomUUID().toString())
                .statusCode())
        .isEqualTo(404);
    assertThat(
            requisicao("POST", "/solicitacoes/" + UUID.randomUUID() + "/aceitar", alvo, UUID.randomUUID().toString())
                .statusCode())
        .isEqualTo(404);
    assertThat(segue(quemPediu, alvo)).isFalse();
  }

  @Test
  @DisplayName("recusar encerra o pedido sem seguimento e sem evento; depois dá para pedir de novo")
  void recusar() {
    Leitor alvo = novoLeitorPrivado();
    Leitor quemPediu = novoLeitor();
    UUID pedido = pedir(quemPediu, alvo);

    assertThat(
            requisicao("POST", "/solicitacoes/" + pedido + "/recusar", alvo, UUID.randomUUID().toString())
                .statusCode())
        .isEqualTo(204);
    assertThat(segue(quemPediu, alvo)).isFalse();
    assertThat(eventosPara("solicitacao.aceita", quemPediu)).isEmpty();
    assertThat(seguir(quemPediu, alvo).statusCode()).isEqualTo(201);
  }

  @Test
  @DisplayName("deixar de seguir e remover seguidor desfazem a relação e os contadores; repetir é 204")
  void desfazer() {
    Leitor eu = novoLeitor();
    Leitor alvo = novoLeitor();
    seguir(eu, alvo);
    seguir(alvo, eu);

    assertThat(requisicao("DELETE", "/perfis/" + alvo.username() + "/seguir", eu, UUID.randomUUID().toString())
            .statusCode())
        .isEqualTo(204);
    assertThat(requisicao("DELETE", "/perfis/" + alvo.username() + "/seguir", eu, UUID.randomUUID().toString())
            .statusCode())
        .isEqualTo(204);
    assertThat(segue(eu, alvo)).isFalse();

    // alvo me segue; eu removo alvo dos meus seguidores.
    assertThat(requisicao("DELETE", "/seguidores/" + alvo.username(), eu, UUID.randomUUID().toString())
            .statusCode())
        .isEqualTo(204);
    assertThat(segue(alvo, eu)).isFalse();
    assertThat(contadores(eu)).containsExactly(0, 0);
    assertThat(contadores(alvo)).containsExactly(0, 0);
  }

  @Test
  @DisplayName("mudar de público para privado não remove seguidores (RN-08)")
  void privadoPreservaSeguidores() {
    Leitor eu = novoLeitor();
    Leitor alvo = novoLeitor();
    seguir(eu, alvo);

    enviar(
        HttpRequest.newBuilder(uri("/me/perfil"))
            .header("Authorization", "Bearer " + alvo.token())
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .PUT(
                HttpRequest.BodyPublishers.ofString(
                    "{\"displayName\":\"Alvo\",\"biografia\":null,\"avatar\":null,\"privacidade\":\"privado\"}"))
            .build());
    JsonNode perfil =
        objectMapper.readTree(requisicao("GET", "/perfis/" + alvo.username(), eu, null).body());

    assertThat(segue(eu, alvo)).isTrue();
    assertThat(perfil.get("relacao").asString()).isEqualTo("seguindo");
    assertThat(perfil.get("conteudoRestrito").asBoolean()).isFalse();
    assertThat(perfil.get("contadores").get("seguidores").asLong()).isEqualTo(1);
  }

  @Test
  @DisplayName("cinco seguir simultâneos com chaves diferentes: um 201, o resto 409, contador 1")
  void corrida() throws Exception {
    Leitor eu = novoLeitor();
    Leitor alvo = novoLeitor();
    int concorrentes = 5;
    CountDownLatch largada = new CountDownLatch(1);

    List<Integer> status = new ArrayList<>();
    try (ExecutorService executor = Executors.newFixedThreadPool(concorrentes)) {
      List<Future<HttpResponse<String>>> futuros = new ArrayList<>();
      for (int i = 0; i < concorrentes; i++) {
        futuros.add(
            executor.submit(
                () -> {
                  largada.await();
                  return seguir(eu, alvo);
                }));
      }
      largada.countDown();
      for (Future<HttpResponse<String>> futuro : futuros) {
        status.add(futuro.get().statusCode());
      }
    }

    assertThat(status).containsOnlyOnce(201);
    assertThat(status.stream().filter(s -> s == 409)).hasSize(concorrentes - 1);
    assertThat(contadores(alvo)[0]).isEqualTo(1);
    assertThat(eventosPara("seguidor.novo", alvo)).hasSize(1);
  }

  @Test
  @DisplayName("acima de 30 ações de seguir por minuto o mesmo usuário recebe 429 (RNF-SEC-18)")
  void limite() {
    Leitor eu = novoLeitor();
    for (int i = 0; i < 30; i++) {
      requisicao("POST", "/perfis/ninguem_" + i + "/seguir", eu, UUID.randomUUID().toString());
    }

    assertThat(requisicao("POST", "/perfis/ninguem_x/seguir", eu, UUID.randomUUID().toString())
            .statusCode())
        .isEqualTo(429);
  }
}
