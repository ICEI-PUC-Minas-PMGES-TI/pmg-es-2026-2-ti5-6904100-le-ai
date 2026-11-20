package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;

import br.com.leai.identidade.conta.service.RemocaoDeAsset;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;

/**
 * Exclusão definitiva pelo job (F-CONTA-2, RN-23.5 a 23.7), no que o {@code
 * ExclusaoDeContaIntegracaoTest} não confere: identificadores liberados, avatar, tentativas de
 * login, auditoria e a atomicidade da conta com o evento {@code conta.excluida} (RNF-ERR-10).
 *
 * <p>O {@link RemocaoDeAsset} é substituído por mock: a chamada real vai ao Cloudinary pela rede,
 * e o que é do {@code identidade} é pedir a remoção do asset certo, depois do commit.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
@ExtendWith(OutputCaptureExtension.class)
class ExclusaoDefinitivaIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";
  private static final String TOKEN_DO_AGENDADOR = "token-do-agendador-com-32-caracteres!";

  @DynamicPropertySource
  static void agendador(DynamicPropertyRegistry registro) {
    registro.add("leai.scheduler-token", () -> TOKEN_DO_AGENDADOR);
  }

  @MockitoBean private RemocaoDeAsset remocaoDeAsset;

  @Autowired private ObjectMapper objectMapper;
  @Autowired private JdbcTemplate jdbc;

  /** Mesmo motivo do {@code ExclusaoDeContaIntegracaoTest}: o seed conta a outbox inteira. */
  @AfterEach
  void limpar() {
    jdbc.update("DROP TRIGGER IF EXISTS falha_conta_excluida ON outbox_identidade");
    jdbc.update("DROP FUNCTION IF EXISTS falhar_conta_excluida()");
    jdbc.update("DELETE FROM outbox_identidade");
  }

  private record Leitor(String email, String username, UUID id, String token) {}

  private HttpResponse<String> cadastrar(String email, String username) {
    return postJson(
        "/auth/register",
        """
        {"email":"%s","username":"%s","displayName":"Leitora",
         "dataNascimento":"1990-01-01","senha":"%s"}
        """
            .formatted(email, username, SENHA),
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  private HttpResponse<String> entrar(String identificador) {
    return postJson(
        "/auth/login",
        "{\"identificador\":\"" + identificador + "\",\"senha\":\"" + SENHA + "\"}",
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  private Leitor novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    String email = "definitiva." + s + "@exemplo.com";
    String username = "definitiva_" + s;
    HttpResponse<String> cadastro = cadastrar(email, username);
    assertThat(cadastro.statusCode()).isEqualTo(201);
    UUID id = UUID.fromString(objectMapper.readTree(cadastro.body()).get("id").asString());
    String token = objectMapper.readTree(entrar(username).body()).get("accessToken").asString();
    return new Leitor(email, username, id, token);
  }

  /** Pede a exclusão e antecipa a janela em 31 dias, respeitando os CHECKs de +30 dias. */
  private void pedirEVencer(Leitor leitor) {
    HttpResponse<String> pedido =
        enviar(
            HttpRequest.newBuilder(uri("/me/conta"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + leitor.token())
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .method(
                    "DELETE",
                    HttpRequest.BodyPublishers.ofString(
                        "{\"senha\":\"" + SENHA + "\",\"confirmacao\":true}"))
                .build());
    assertThat(pedido.statusCode()).isEqualTo(202);
    jdbc.update(
        "UPDATE usuario SET exclusao_solicitada_em = exclusao_solicitada_em - INTERVAL '31 days',"
            + " exclusao_prevista_em = exclusao_prevista_em - INTERVAL '31 days' WHERE id = ?",
        leitor.id());
    jdbc.update(
        "UPDATE exclusao_conta SET criado_em = criado_em - INTERVAL '31 days',"
            + " prevista_em = prevista_em - INTERVAL '31 days'"
            + " WHERE usuario_ref = ? AND status = 'pendente'",
        leitor.id());
  }

  private HttpResponse<String> job() {
    return postJson(
        "/internal/jobs/exclusao-conta",
        "",
        "X-Scheduler-Token",
        TOKEN_DO_AGENDADOR,
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  private int contas(UUID id) {
    return jdbc.queryForObject("SELECT count(*) FROM usuario WHERE id = ?", Integer.class, id);
  }

  private int eventosDaConta(UUID id) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM outbox_identidade WHERE tipo = 'conta.excluida'"
            + " AND chave_negocio = ?",
        Integer.class,
        "conta:" + id);
  }

  @Test
  @DisplayName("depois da exclusão definitiva, username e e-mail ficam livres para um cadastro novo")
  void identificadoresLiberados() {
    Leitor antiga = novoLeitor();
    pedirEVencer(antiga);
    // Durante a janela, os dois continuam reservados.
    assertThat(cadastrar(antiga.email(), antiga.username()).statusCode()).isEqualTo(409);

    assertThat(job().statusCode()).isEqualTo(200);
    assertThat(contas(antiga.id())).isZero();

    HttpResponse<String> nova = cadastrar(antiga.email(), antiga.username());
    assertThat(nova.statusCode()).isEqualTo(201);
    UUID novaId = UUID.fromString(objectMapper.readTree(nova.body()).get("id").asString());
    assertThat(novaId).isNotEqualTo(antiga.id());
    // O login pelo e-mail antigo chega à conta nova, não a um resto da antiga.
    HttpResponse<String> login = entrar(antiga.email());
    assertThat(login.statusCode()).isEqualTo(200);
    assertThat(objectMapper.readTree(login.body()).get("tipo").asString()).isEqualTo("sessao");
    String accessToken = objectMapper.readTree(login.body()).get("accessToken").asString();
    String reivindicacoes =
        new String(
            java.util.Base64.getUrlDecoder().decode(accessToken.split("\\.")[1]),
            java.nio.charset.StandardCharsets.UTF_8);
    assertThat(objectMapper.readTree(reivindicacoes).get("sub").asString())
        .isEqualTo(novaId.toString());
  }

  @Test
  @DisplayName("o job pede ao Cloudinary a remoção do avatar da conta, depois do commit da exclusão")
  void avatarApagado() {
    Leitor leitor = novoLeitor();
    String publicId = "avatares/" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    HttpResponse<String> edicao =
        enviar(
            HttpRequest.newBuilder(uri("/me/perfil"))
                .header("Authorization", "Bearer " + leitor.token())
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .PUT(
                    HttpRequest.BodyPublishers.ofString(
                        """
                        {"displayName":"Leitora","biografia":null,"privacidade":"publico",
                         "avatar":{"url":"https://res.cloudinary.com/leai/image/upload/v1727200000/%1$s.png",
                                   "publicId":"%1$s"}}
                        """
                            .formatted(publicId)))
                .build());
    assertThat(edicao.statusCode()).isEqualTo(200);
    pedirEVencer(leitor);
    AtomicInteger contaNoMomentoDaRemocao = new AtomicInteger(-1);
    doAnswer(
            chamada -> {
              contaNoMomentoDaRemocao.set(contas(leitor.id()));
              return true;
            })
        .when(remocaoDeAsset)
        .apagar(publicId);

    assertThat(job().statusCode()).isEqualTo(200);

    verify(remocaoDeAsset).apagar(publicId);
    // Lido por outra conexão: a remoção só é pedida quando a exclusão já está gravada.
    assertThat(contaNoMomentoDaRemocao.get()).isZero();
  }

  @Test
  @DisplayName("o job apaga as linhas de tentativa_login da conta, por e-mail e por username")
  void tentativasDeLoginApagadas() {
    Leitor leitor = novoLeitor();
    String outraIdentidade = "outra_" + UUID.randomUUID().toString().substring(0, 8);
    jdbc.update(
        "INSERT INTO tentativa_login (identidade, falhas) VALUES (?, 3), (?, 2), (?, 1)",
        leitor.email().toUpperCase(),
        leitor.username(),
        outraIdentidade);
    pedirEVencer(leitor);

    assertThat(job().statusCode()).isEqualTo(200);

    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM tentativa_login"
                    + " WHERE lower(identidade::text) IN (lower(?), lower(?))",
                Integer.class,
                leitor.email(),
                leitor.username()))
        .isZero();
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM tentativa_login WHERE identidade = ?",
                Integer.class,
                outraIdentidade))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("o job fica na auditoria com o recibo e o total, sem e-mail, username ou id da conta")
  void auditoriaDoJob(CapturedOutput saida) {
    Leitor leitor = novoLeitor();
    pedirEVencer(leitor);
    int inicio = saida.getOut().length();

    assertThat(job().statusCode()).isEqualTo(200);

    String log = saida.getOut().substring(inicio);
    assertThat(log).contains("Exclusão de conta finalizada pelo recibo ");
    assertThat(log).containsPattern("Job de exclusão de conta: [1-9][0-9]* conta\\(s\\) finalizada");
    assertThat(log)
        .doesNotContain(leitor.email())
        .doesNotContain(leitor.username())
        .doesNotContain(leitor.id().toString())
        .doesNotContain(SENHA)
        .doesNotContain(TOKEN_DO_AGENDADOR);
  }

  @Test
  @DisplayName("falha ao gravar conta.excluida desfaz a finalização: a conta, o recibo e o grafo ficam")
  void falhaNoEventoDesfazAFinalizacao() {
    Leitor leitor = novoLeitor();
    Leitor seguidora = novoLeitor();
    jdbc.update(
        "INSERT INTO seguidor (seguidor_id, seguido_id) VALUES (?, ?)",
        seguidora.id(),
        leitor.id());
    jdbc.update("INSERT INTO tentativa_login (identidade, falhas) VALUES (?, 1)", leitor.username());
    pedirEVencer(leitor);
    // A falha acontece no INSERT do evento, a última escrita da finalização.
    jdbc.execute(
        """
        CREATE FUNCTION falhar_conta_excluida() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.tipo = 'conta.excluida' THEN
            RAISE EXCEPTION 'falha simulada ao gravar conta.excluida';
          END IF;
          RETURN NEW;
        END $$
        """);
    jdbc.execute(
        "CREATE TRIGGER falha_conta_excluida BEFORE INSERT ON outbox_identidade"
            + " FOR EACH ROW EXECUTE FUNCTION falhar_conta_excluida()");

    HttpResponse<String> resposta = job();

    assertThat(resposta.statusCode()).isEqualTo(500);
    assertThat(contas(leitor.id())).isEqualTo(1);
    assertThat(
            jdbc.queryForObject(
                "SELECT exclusao_solicitada_em IS NOT NULL FROM usuario WHERE id = ?",
                Boolean.class,
                leitor.id()))
        .isTrue();
    assertThat(
            jdbc.queryForObject(
                "SELECT status FROM exclusao_conta WHERE usuario_ref = ?",
                String.class,
                leitor.id()))
        .isEqualTo("pendente");
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM seguidor WHERE seguido_id = ?", Integer.class, leitor.id()))
        .isEqualTo(1);
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM tentativa_login WHERE identidade = ?",
                Integer.class,
                leitor.username()))
        .isEqualTo(1);
    assertThat(eventosDaConta(leitor.id())).isZero();

    // Sem a falha, a execução seguinte finaliza a mesma conta, com o evento.
    jdbc.execute("DROP TRIGGER falha_conta_excluida ON outbox_identidade");
    assertThat(job().statusCode()).isEqualTo(200);
    assertThat(contas(leitor.id())).isZero();
    assertThat(eventosDaConta(leitor.id())).isEqualTo(1);
  }
}
