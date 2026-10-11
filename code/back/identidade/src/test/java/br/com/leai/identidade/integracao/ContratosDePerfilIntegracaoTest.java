package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;

/**
 * Contratos do {@code identidade} lidos pelos outros serviços (F-PERFIL, RN-08): as VIEWs {@code
 * v_perfil_referencia_v1} e {@code v_seguimento_aceito_v1}, que os consumidores de {@code leitura},
 * {@code acervo} e {@code social} só simulam como tabela. Aqui elas rodam de verdade, com conta
 * suspensa, conta em exclusão e pedido ainda pendente. Também a trava de banco contra seguir a si
 * mesmo, que a API já recusa antes com 409.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ContratosDePerfilIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";

  @Autowired private JdbcTemplate jdbc;

  @Autowired private ObjectMapper objectMapper;

  private record Leitor(UUID id, String username, String token) {}

  private Leitor novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    String username = "contrato_" + s;
    postJson(
        "/auth/register",
        """
        {"email":"contrato.%1$s@exemplo.com","username":"%2$s","displayName":"Leitora %1$s",
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

  private void seguir(Leitor quem, Leitor alvo) {
    HttpResponse<String> resposta =
        enviar(
            HttpRequest.newBuilder(uri("/perfis/" + alvo.username() + "/seguir"))
                .header("Authorization", "Bearer " + quem.token())
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .POST(HttpRequest.BodyPublishers.noBody())
                .build());
    assertThat(resposta.statusCode()).isBetween(200, 299);
  }

  private void suspender(Leitor leitor) {
    jdbc.update("UPDATE usuario SET suspenso = true WHERE id = ?", leitor.id());
  }

  private void pedirExclusao(Leitor leitor) {
    jdbc.update(
        "UPDATE usuario SET exclusao_solicitada_em = now(),"
            + " exclusao_prevista_em = now() + INTERVAL '30 days' WHERE id = ?",
        leitor.id());
  }

  private boolean temPerfil(Leitor leitor) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM v_perfil_referencia_v1 WHERE id = ?)",
            Boolean.class,
            leitor.id()));
  }

  private boolean seguimentoVisivel(Leitor seguidor, Leitor seguido) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM v_seguimento_aceito_v1"
                + " WHERE seguidor_id = ? AND seguido_id = ?)",
            Boolean.class,
            seguidor.id(),
            seguido.id()));
  }

  @Test
  @DisplayName("perfil de referência traz a conta ativa e omite suspensa e em exclusão")
  void perfilDeReferencia() {
    Leitor ativa = novoLeitor();
    Leitor privada = novoLeitor();
    Leitor suspensa = novoLeitor();
    Leitor emExclusao = novoLeitor();
    jdbc.update("UPDATE usuario SET privacidade = 'privado' WHERE id = ?", privada.id());
    suspender(suspensa);
    pedirExclusao(emExclusao);

    assertThat(temPerfil(ativa)).isTrue();
    assertThat(
            jdbc.queryForList(
                "SELECT privacidade FROM v_perfil_referencia_v1 WHERE id IN (?, ?) ORDER BY"
                    + " privacidade",
                String.class,
                ativa.id(),
                privada.id()))
        .containsExactly("privado", "publico");
    assertThat(temPerfil(suspensa)).isFalse();
    assertThat(temPerfil(emExclusao)).isFalse();
  }

  @Test
  @DisplayName("seguimento aceito aparece; pedido pendente ainda não")
  void soSeguimentoAceito() {
    Leitor leitora = novoLeitor();
    Leitor publica = novoLeitor();
    Leitor privada = novoLeitor();
    jdbc.update("UPDATE usuario SET privacidade = 'privado' WHERE id = ?", privada.id());

    seguir(leitora, publica);
    seguir(leitora, privada);

    assertThat(seguimentoVisivel(leitora, publica)).isTrue();
    assertThat(seguimentoVisivel(leitora, privada)).isFalse();
  }

  @Test
  @DisplayName("seguimento some quando qualquer um dos lados fica suspenso ou pede exclusão")
  void seguimentoSomeComContaIndisponivel() {
    Leitor seguidorSuspenso = novoLeitor();
    Leitor seguidoEmExclusao = novoLeitor();
    Leitor seguida = novoLeitor();
    Leitor seguidora = novoLeitor();
    seguir(seguidorSuspenso, seguida);
    seguir(seguidora, seguidoEmExclusao);
    seguir(seguidora, seguida);

    suspender(seguidorSuspenso);
    pedirExclusao(seguidoEmExclusao);

    assertThat(seguimentoVisivel(seguidorSuspenso, seguida)).isFalse();
    assertThat(seguimentoVisivel(seguidora, seguidoEmExclusao)).isFalse();
    assertThat(seguimentoVisivel(seguidora, seguida)).isTrue();
    // A relação continua gravada: a VIEW só esconde (RN-23, cancelar a exclusão restaura).
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM seguidor WHERE seguidor_id = ? OR seguido_id = ?",
                Integer.class,
                seguidorSuspenso.id(),
                seguidoEmExclusao.id()))
        .isEqualTo(2);
  }

  @Test
  @DisplayName("o banco recusa seguir a si mesmo mesmo sem passar pela API")
  void bancoRecusaSeguirASiMesmo() {
    Leitor leitora = novoLeitor();

    assertThatThrownBy(
            () ->
                jdbc.update(
                    "INSERT INTO seguidor (seguidor_id, seguido_id) VALUES (?, ?)",
                    leitora.id(),
                    leitora.id()))
        .isInstanceOf(DataIntegrityViolationException.class)
        .hasMessageContaining("seguidor_usuarios_distintos");
  }
}
