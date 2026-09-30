package br.com.leai.identidade.integracao;

import static br.com.leai.identidade.seed.SeedDeIdentidade.DONO;
import static br.com.leai.identidade.seed.SeedDeIdentidade.NAO_SEGUIDOR;
import static br.com.leai.identidade.seed.SeedDeIdentidade.PRIVADO;
import static br.com.leai.identidade.seed.SeedDeIdentidade.SEGUIDOR;
import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.identidade.seed.SeedDeIdentidade;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * O seed de RNF-TST-08 roda sem violar CHECK, é reproduzível e cobre a matriz de RN-08 pela API:
 * público, privado para seguidor e para não-seguidor, e o pedido pendente.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class SeedIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-do-seed-local";

  @Autowired private JdbcTemplate jdbc;
  @Autowired private TransactionTemplate transacao;
  @Autowired private PasswordEncoder codificadorDeSenha;
  @Autowired private ObjectMapper objectMapper;

  private SeedDeIdentidade seed;

  @BeforeEach
  void preparar() {
    seed = new SeedDeIdentidade(jdbc, transacao, codificadorDeSenha);
  }

  private int contar(String sql, Object... argumentos) {
    Integer total = jdbc.queryForObject(sql, Integer.class, argumentos);
    return total == null ? 0 : total;
  }

  private int[] contadores(UUID id) {
    return jdbc.queryForObject(
        "SELECT qtd_seguidores, qtd_seguidos FROM usuario WHERE id = ?",
        (linha, n) -> new int[] {linha.getInt(1), linha.getInt(2)},
        id);
  }

  private String token(String username) {
    HttpResponse<String> login =
        postJson(
            "/auth/login",
            "{\"identificador\":\"%s\",\"senha\":\"%s\"}".formatted(username, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(login.statusCode()).isEqualTo(200);
    return objectMapper.readTree(login.body()).get("accessToken").asString();
  }

  private JsonNode get(String caminho, String token) {
    return objectMapper.readTree(
        enviar(
                HttpRequest.newBuilder(uri(caminho))
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build())
            .body());
  }

  @Test
  @DisplayName("rodar duas vezes não duplica nada e deixa os contadores coerentes")
  void idempotente() {
    seed.semear(SENHA);
    seed.semear(SENHA);

    assertThat(contar("SELECT count(*) FROM usuario WHERE username LIKE 'seed.%'")).isEqualTo(4);
    assertThat(contar("SELECT count(*) FROM seguidor WHERE seguidor_id = ?", SEGUIDOR)).isEqualTo(2);
    assertThat(
            contar(
                "SELECT count(*) FROM solicitacao_seguir WHERE solicitante_id = ?"
                    + " AND alvo_id = ? AND status = 'pendente'",
                NAO_SEGUIDOR,
                PRIVADO))
        .isEqualTo(1);
    assertThat(contadores(DONO)).containsExactly(1, 0);
    assertThat(contadores(PRIVADO)).containsExactly(1, 0);
    assertThat(contadores(SEGUIDOR)).containsExactly(0, 2);
    assertThat(contar("SELECT count(*) FROM outbox_identidade")).isZero();
  }

  @Test
  @DisplayName("rodar de novo desfaz o que a API mudou entre as contas do seed")
  void reproduzivel() {
    seed.semear(SENHA);
    jdbc.update("UPDATE usuario SET privacidade = 'publico', biografia = NULL WHERE id = ?", PRIVADO);
    jdbc.update("UPDATE solicitacao_seguir SET status = 'recusada', resolvido_em = now()");
    jdbc.update("DELETE FROM seguidor WHERE seguidor_id = ? AND seguido_id = ?", SEGUIDOR, DONO);
    jdbc.update("INSERT INTO seguidor (seguidor_id, seguido_id) VALUES (?, ?)", DONO, SEGUIDOR);

    seed.semear(SENHA);

    assertThat(jdbc.queryForObject("SELECT privacidade FROM usuario WHERE id = ?", String.class, PRIVADO))
        .isEqualTo("privado");
    assertThat(
            contar(
                "SELECT count(*) FROM solicitacao_seguir WHERE status = 'pendente' AND alvo_id = ?",
                PRIVADO))
        .isEqualTo(1);
    assertThat(contar("SELECT count(*) FROM seguidor WHERE seguidor_id = ?", DONO)).isZero();
    assertThat(contadores(DONO)).containsExactly(1, 0);
    assertThat(contadores(SEGUIDOR)).containsExactly(0, 2);
  }

  @Test
  @DisplayName("a API enxerga a matriz de RN-08: público, privado com e sem seguimento, pedido")
  void matrizPelaApi() {
    seed.semear(SENHA);
    String seguidor = token("seed.bruno");
    String naoSeguidor = token("seed.caio");
    String privado = token("seed.duda");

    JsonNode publico = get("/perfis/seed.ana", naoSeguidor);
    JsonNode privadoParaSeguidor = get("/perfis/seed.duda", seguidor);
    JsonNode privadoParaVisitante = get("/perfis/seed.duda", naoSeguidor);
    JsonNode caixa = get("/solicitacoes", privado);

    assertThat(publico.get("conteudoRestrito").asBoolean()).isFalse();
    assertThat(privadoParaSeguidor.get("relacao").asString()).isEqualTo("seguindo");
    assertThat(privadoParaSeguidor.get("conteudoRestrito").asBoolean()).isFalse();
    assertThat(privadoParaVisitante.get("relacao").asString()).isEqualTo("solicitacao_enviada");
    assertThat(privadoParaVisitante.get("conteudoRestrito").asBoolean()).isTrue();
    assertThat(privadoParaVisitante.get("biografia").asString()).isNotBlank();
    assertThat(caixa.get("totalElements").asLong()).isEqualTo(1);
    assertThat(caixa.get("items").get(0).get("solicitante").get("username").asString())
        .isEqualTo("seed.caio");
    assertThat(get("/me/seguidos", seguidor).get("totalElements").asLong()).isEqualTo(2);
  }
}
