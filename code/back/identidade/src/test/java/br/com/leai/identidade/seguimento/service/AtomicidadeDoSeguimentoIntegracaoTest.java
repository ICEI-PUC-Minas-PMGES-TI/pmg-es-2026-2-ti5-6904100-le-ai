package br.com.leai.identidade.seguimento.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import br.com.leai.identidade.integracao.IntegracaoComPostgres;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import tools.jackson.databind.ObjectMapper;

/**
 * Escrita de domínio e evento na outbox na mesma transação (F-PERFIL, RNF-ERR-10): se gravar o
 * evento falha, o seguimento, os contadores e a solicitação voltam ao que eram, e nenhum evento
 * fica para trás. A falha é simulada no {@link EventosDeSeguimento}, depois das escritas de
 * domínio.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class AtomicidadeDoSeguimentoIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";

  @MockitoSpyBean private EventosDeSeguimento eventos;

  @Autowired private JdbcTemplate jdbc;

  @Autowired private ObjectMapper objectMapper;

  private record Leitor(UUID id, String username, String token) {}

  private Leitor novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    String username = "atomico_" + s;
    postJson(
        "/auth/register",
        """
        {"email":"atomico.%1$s@exemplo.com","username":"%2$s","displayName":"Leitora %1$s",
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

  private HttpResponse<String> post(String caminho, Leitor quem) {
    return enviar(
        HttpRequest.newBuilder(uri(caminho))
            .header("Authorization", "Bearer " + quem.token())
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .POST(HttpRequest.BodyPublishers.noBody())
            .build());
  }

  private int seguimentos(Leitor seguidor, Leitor seguido) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM seguidor WHERE seguidor_id = ? AND seguido_id = ?",
        Integer.class,
        seguidor.id(),
        seguido.id());
  }

  private int contador(String coluna, Leitor leitor) {
    return jdbc.queryForObject(
        "SELECT " + coluna + " FROM usuario WHERE id = ?", Integer.class, leitor.id());
  }

  private int eventos(String tipo) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM outbox_identidade WHERE tipo = ?", Integer.class, tipo);
  }

  @Test
  @DisplayName("seguir perfil público: falha no evento desfaz o seguimento e os contadores")
  void seguirSemEventoNaoSegue() {
    Leitor leitora = novoLeitor();
    Leitor publica = novoLeitor();
    int eventosAntes = eventos("seguidor.novo");
    doThrow(new IllegalStateException("falha simulada na outbox"))
        .when(eventos)
        .seguidorNovo(any(), any(), any());

    HttpResponse<String> resposta = post("/perfis/" + publica.username() + "/seguir", leitora);

    assertThat(resposta.statusCode()).isEqualTo(500);
    assertThat(seguimentos(leitora, publica)).isZero();
    assertThat(contador("qtd_seguidos", leitora)).isZero();
    assertThat(contador("qtd_seguidores", publica)).isZero();
    assertThat(eventos("seguidor.novo")).isEqualTo(eventosAntes);
  }

  @Test
  @DisplayName("aceitar pedido: falha no evento deixa o pedido pendente e ninguém seguindo")
  void aceitarSemEventoNaoAceita() {
    Leitor leitora = novoLeitor();
    Leitor privada = novoLeitor();
    jdbc.update("UPDATE usuario SET privacidade = 'privado' WHERE id = ?", privada.id());
    assertThat(post("/perfis/" + privada.username() + "/seguir", leitora).statusCode())
        .isBetween(200, 299);
    UUID solicitacaoId =
        jdbc.queryForObject(
            "SELECT id FROM solicitacao_seguir WHERE solicitante_id = ? AND alvo_id = ?",
            UUID.class,
            leitora.id(),
            privada.id());
    int eventosAntes = eventos("solicitacao.aceita");
    doThrow(new IllegalStateException("falha simulada na outbox"))
        .when(eventos)
        .solicitacaoAceita(any(), any(), any(), any());

    HttpResponse<String> resposta = post("/solicitacoes/" + solicitacaoId + "/aceitar", privada);

    assertThat(resposta.statusCode()).isEqualTo(500);
    assertThat(
            jdbc.queryForObject(
                "SELECT status FROM solicitacao_seguir WHERE id = ?", String.class, solicitacaoId))
        .isEqualTo("pendente");
    assertThat(seguimentos(leitora, privada)).isZero();
    assertThat(contador("qtd_seguidores", privada)).isZero();
    assertThat(eventos("solicitacao.aceita")).isEqualTo(eventosAntes);
  }
}
