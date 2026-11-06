package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Timestamp;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Suspensão e reativação de conta pelo painel (F-MOD-OPC, RF-MOD-04/05) de ponta a ponta, com o
 * {@code identidade} simulado num servidor HTTP de verdade: autorização, repasse do JWT,
 * idempotência, um log por episódio, timeout, indisponibilidade sem auditoria falsa e o registro
 * com o motivo e a suspensão vigente.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class SuspensaoDeContaIntegracaoTest extends IntegracaoComPostgres {

  private static final IdentidadeSimulada IDENTIDADE = new IdentidadeSimulada();

  @DynamicPropertySource
  static void identidade(DynamicPropertyRegistry registro) {
    registro.add("leai.identidade-base-url", IDENTIDADE::url);
    registro.add("leai.moderacao-token", () -> LeituraSimulada.TOKEN);
    registro.add("leai.moderacao.timeout-de-leitura", () -> "1s");
    registro.add("leai.moderacao.espera-da-retentativa", () -> "0s");
  }

  @AfterAll
  static void desligar() {
    IDENTIDADE.close();
  }

  @Autowired private JdbcTemplate jdbc;
  @Autowired private ObjectMapper json;
  private MassaDeModeracao massa;

  private final UUID admin = UUID.randomUUID();
  private UUID autora;
  private UUID leitora;

  @BeforeEach
  void preparar() {
    massa = new MassaDeModeracao(jdbc);
    massa.preparar();
    IDENTIDADE.reiniciar();
    // O que o identidade real faz na VIEW: a conta some da de perfil e fica na da moderação.
    IDENTIDADE.aoAplicar(
        (id, suspenso) ->
            jdbc.update(
                "UPDATE identidade.usuario SET suspenso = ?, suspenso_em = ? WHERE id = ?",
                suspenso,
                suspenso ? Timestamp.from(IDENTIDADE.suspensoEm(id)) : null,
                id));
    autora = massa.leitor("autora");
    leitora = massa.leitor("leitora");
  }

  // ------------------------------------------------------------------ acesso

  @Test
  @DisplayName("Leitor recebe 403 ao suspender ou reativar, e o identidade nem é chamado")
  void leitorNaoSuspende() throws Exception {
    assertThat(acao("suspender", autora, token(leitora, "leitor"), chave(), "Spam").statusCode())
        .isEqualTo(403);
    assertThat(acao("reativar", autora, token(leitora), chave(), "Spam").statusCode())
        .isEqualTo(403);
    assertThat(IDENTIDADE.chamadas()).isEmpty();
    assertThat(logsDeConta()).isZero();
  }

  // ------------------------------------------------------------------ fluxo

  @Test
  @DisplayName("Suspender e reativar: um log cada, com o motivo e o instante do identidade")
  void suspenderEReativar() throws Exception {
    String jwt = tokenAdmin();
    HttpResponse<String> suspensa = acao("suspender", autora, jwt, chave(), "  Spam recorrente.  ");

    assertThat(suspensa.statusCode()).as(suspensa.body()).isEqualTo(200);
    JsonNode corpo = corpo(suspensa);
    assertThat(corpo.get("usuarioId").asString()).isEqualTo(autora.toString());
    assertThat(corpo.get("suspensa").asBoolean()).isTrue();
    assertThat(corpo.get("suspensaEm").asString()).isEqualTo(IDENTIDADE.suspensoEm(autora).toString());
    IdentidadeSimulada.Chamada chamada = IDENTIDADE.chamadas().getFirst();
    assertThat(chamada.token()).isEqualTo(LeituraSimulada.TOKEN);
    assertThat(chamada.authorization()).isEqualTo("Bearer " + jwt);

    Map<String, Object> log =
        jdbc.queryForMap(
            "SELECT admin, alvo_tipo, alvo_id, detalhe, criado_em FROM log_moderacao"
                + " WHERE acao = 'suspender_conta'");
    assertThat(log.get("admin")).isEqualTo(admin.toString());
    assertThat(log.get("alvo_tipo")).isEqualTo("usuario");
    assertThat(log.get("alvo_id")).isEqualTo(autora);
    assertThat(log.get("detalhe")).isEqualTo("Spam recorrente.");
    assertThat(((Timestamp) log.get("criado_em")).toInstant())
        .isEqualTo(IDENTIDADE.suspensoEm(autora));

    HttpResponse<String> reativada = acao("reativar", autora, jwt, chave(), "Revisto.");
    assertThat(reativada.statusCode()).isEqualTo(200);
    assertThat(corpo(reativada).get("suspensa").asBoolean()).isFalse();
    assertThat(corpo(reativada).get("reativadaEm").isNull()).isFalse();
    assertThat(logsDeConta()).isEqualTo(2);
    assertThat(
            jdbc.queryForObject(
                "SELECT detalhe FROM log_moderacao WHERE acao = 'reativar_conta'", String.class))
        .isEqualTo("Revisto.");
  }

  @Test
  @DisplayName("Dois cliques com chaves diferentes, ou a conta já suspensa: uma linha só")
  void doisCliquesUmLog() throws Exception {
    assertThat(acao("suspender", autora, tokenAdmin(), chave(), "Spam").statusCode()).isEqualTo(200);
    assertThat(acao("suspender", autora, tokenAdmin(), chave(), "De novo").statusCode())
        .isEqualTo(200);
    assertThat(acao("suspender", autora, tokenAdmin(), chave(), "Outra vez").statusCode())
        .isEqualTo(200);

    assertThat(logsDeConta()).isEqualTo(1);
    // Reativar conta ativa: sucesso sem log.
    UUID ativa = massa.leitor("ativa");
    assertThat(acao("reativar", ativa, tokenAdmin(), chave(), "Nada").statusCode()).isEqualTo(200);
    assertThat(logsDeConta()).isEqualTo(1);
  }

  @Test
  @DisplayName("Mesma chave repetida devolve o recibo sem chamar o identidade de novo")
  void mesmaChaveDevolveRecibo() throws Exception {
    String chave = chave();
    HttpResponse<String> primeira = acao("suspender", autora, tokenAdmin(), chave, "Spam");
    HttpResponse<String> segunda = acao("suspender", autora, tokenAdmin(), chave, "Spam");

    assertThat(segunda.statusCode()).isEqualTo(200);
    assertThat(segunda.body()).isEqualTo(primeira.body());
    assertThat(IDENTIDADE.chamadas()).hasSize(1);
    assertThat(logsDeConta()).isEqualTo(1);
  }

  @Test
  @DisplayName("Timeout: 504 sem log; a retentativa com a mesma chave grava a linha que faltou")
  void timeoutERetentativa() throws Exception {
    IDENTIDADE.modo(IdentidadeSimulada.Modo.APLICA_E_DEMORA);
    IDENTIDADE.demora(2500);
    String chave = chave();

    HttpResponse<String> estourou = acao("suspender", autora, tokenAdmin(), chave, "Spam");
    assertThat(estourou.statusCode()).isEqualTo(504);
    assertThat(codigo(estourou)).isEqualTo("TEMPO_ESGOTADO");
    assertThat(logsDeConta()).isZero();

    HttpResponse<String> deNovo = acao("suspender", autora, tokenAdmin(), chave, "Spam");
    assertThat(deNovo.statusCode()).isEqualTo(200);
    assertThat(logsDeConta()).isEqualTo(1);
    assertThat(
            jdbc.queryForObject(
                    "SELECT criado_em FROM log_moderacao WHERE acao = 'suspender_conta'",
                    Timestamp.class)
                .toInstant())
        .isEqualTo(IDENTIDADE.suspensoEm(autora));
  }

  @Test
  @DisplayName("identidade parado: 503, nenhum log; religado, a mesma chave grava uma linha")
  void identidadeParado() throws Exception {
    IDENTIDADE.modo(IdentidadeSimulada.Modo.INDISPONIVEL);
    String chave = chave();

    HttpResponse<String> falhou = acao("suspender", autora, tokenAdmin(), chave, "Spam");
    assertThat(falhou.statusCode()).isEqualTo(503);
    // Uma retentativa dentro da mesma requisição (RNF-ERR-08).
    assertThat(IDENTIDADE.chamadas()).hasSize(2);
    assertThat(logsDeConta()).isZero();
    assertThat(
            jdbc.queryForObject(
                "SELECT suspenso FROM identidade.usuario WHERE id = ?", Boolean.class, autora))
        .isFalse();

    IDENTIDADE.modo(IdentidadeSimulada.Modo.APLICA);
    assertThat(acao("suspender", autora, tokenAdmin(), chave, "Spam").statusCode()).isEqualTo(200);
    assertThat(logsDeConta()).isEqualTo(1);
  }

  @Test
  @DisplayName("404 e 422 do identidade passam ao painel; 403 dele vira 503, sem log")
  void errosDoIdentidade() throws Exception {
    IDENTIDADE.modo(IdentidadeSimulada.Modo.NAO_ENCONTRADA);
    assertThat(acao("suspender", autora, tokenAdmin(), chave(), "Spam").statusCode())
        .isEqualTo(404);
    IDENTIDADE.modo(IdentidadeSimulada.Modo.CONTA_ADMIN);
    assertThat(acao("suspender", autora, tokenAdmin(), chave(), "Spam").statusCode())
        .isEqualTo(422);
    IDENTIDADE.modo(IdentidadeSimulada.Modo.RECUSA);
    assertThat(acao("suspender", autora, tokenAdmin(), chave(), "Spam").statusCode())
        .isEqualTo(503);
    assertThat(logsDeConta()).isZero();
  }

  @Test
  @DisplayName("Motivo vazio, só espaços ou com 501 code points é 422; 500 emojis passam")
  void motivoObrigatorio() throws Exception {
    assertThat(acao("suspender", autora, tokenAdmin(), chave(), null).statusCode()).isEqualTo(422);
    assertThat(acao("suspender", autora, tokenAdmin(), chave(), "   ").statusCode()).isEqualTo(422);
    assertThat(acao("reativar", autora, tokenAdmin(), chave(), "").statusCode()).isEqualTo(422);
    assertThat(acao("suspender", autora, tokenAdmin(), chave(), "😀".repeat(501)).statusCode())
        .isEqualTo(422);
    // U+0000 o Postgres recusa no log: barrado antes de suspender (validação, 06/11/2026).
    assertThat(acao("suspender", autora, tokenAdmin(), chave(), "spam" + (char) 0).statusCode())
        .isEqualTo(422);
    assertThat(IDENTIDADE.chamadas()).isEmpty();

    assertThat(acao("suspender", autora, tokenAdmin(), chave(), "😀".repeat(500)).statusCode())
        .isEqualTo(200);
  }

  @Test
  @DisplayName("Sem Idempotency-Key é 400")
  void semChave() throws Exception {
    assertThat(acao("suspender", autora, tokenAdmin(), null, "Spam").statusCode()).isEqualTo(400);
  }

  // ------------------------------------------------------------------ painel e registro

  @Test
  @DisplayName("Fila: autor suspenso continua com nome, marcado como suspenso, e a denúncia fica")
  void autorSuspensoNaFila() throws Exception {
    UUID atividade = massa.atividadeDeLeitura(autora, massa.livroOficial("Torto Arado"));
    massa.segue(leitora, autora);
    UUID comentario = massa.comentario(atividade, autora, null, "Spam");
    UUID denuncia = denunciar(leitora, comentario);

    acao("suspender", autora, tokenAdmin(), chave(), "Spam");

    JsonNode item = corpo(get("/admin/denuncias", tokenAdmin())).get("itens").get(0);
    assertThat(item.get("id").asString()).isEqualTo(denuncia.toString());
    assertThat(item.get("autor").get("username").asString()).isEqualTo("autora");
    assertThat(item.get("autor").get("suspensa").asBoolean()).isTrue();
    assertThat(item.get("autor").get("suspensaEm").isNull()).isFalse();
    assertThat(item.get("denunciante").get("suspensa").asBoolean()).isFalse();
    assertThat(
            jdbc.queryForObject("SELECT estado FROM denuncia WHERE id = ?", String.class, denuncia))
        .isEqualTo("pendente");
  }

  @Test
  @DisplayName("Registro: motivo nas linhas de conta e suspensão vigente só na atual")
  void registroComSuspensaoVigente() throws Exception {
    acao("suspender", autora, tokenAdmin(), chave(), "Primeira");
    acao("reativar", autora, tokenAdmin(), chave(), "Revisto");
    Thread.sleep(5);
    acao("suspender", autora, tokenAdmin(), chave(), "Segunda");

    JsonNode itens = corpo(get("/admin/moderacao/logs", tokenAdmin())).get("itens");
    assertThat(itens).hasSize(3);
    JsonNode atual = itens.get(0);
    assertThat(atual.get("acao").asString()).isEqualTo("suspender_conta");
    assertThat(atual.get("alvoTipo").asString()).isEqualTo("usuario");
    assertThat(atual.get("alvoId").asString()).isEqualTo(autora.toString());
    assertThat(atual.get("alvoConta").asString()).isEqualTo("autora");
    assertThat(atual.get("motivo").asString()).isEqualTo("Segunda");
    assertThat(atual.get("suspensaoVigente").asBoolean()).isTrue();
    assertThat(itens.get(1).get("acao").asString()).isEqualTo("reativar_conta");
    assertThat(itens.get(1).get("suspensaoVigente").asBoolean()).isFalse();
    assertThat(itens.get(2).get("motivo").asString()).isEqualTo("Primeira");
    assertThat(itens.get(2).get("suspensaoVigente").asBoolean()).isFalse();

    acao("reativar", autora, tokenAdmin(), chave(), "De volta");
    JsonNode depois = corpo(get("/admin/moderacao/logs", tokenAdmin())).get("itens");
    for (JsonNode linha : depois) {
      assertThat(linha.get("suspensaoVigente").asBoolean()).isFalse();
    }
  }

  @Test
  @DisplayName("Linha de conteúdo não traz motivo nem alvo de conta (RNF-SEC-36)")
  void linhaDeConteudoSemMotivo() throws Exception {
    UUID atividade = massa.atividadeDeLeitura(autora, massa.livroOficial("Livro"));
    massa.segue(leitora, autora);
    UUID denuncia = denunciar(leitora, massa.comentario(atividade, autora, null, "Spam"));
    post("/admin/denuncias/" + denuncia + "/arquivar", tokenAdmin(), chave());

    JsonNode linha = corpo(get("/admin/moderacao/logs", tokenAdmin())).get("itens").get(0);
    assertThat(linha.get("acao").asString()).isEqualTo("arquivar_denuncia");
    assertThat(linha.get("motivo").isNull()).isTrue();
    assertThat(linha.get("alvoConta").isNull()).isTrue();
    assertThat(linha.get("alvoId").isNull()).isTrue();
    assertThat(linha.get("suspensaoVigente").asBoolean()).isFalse();
  }

  @Test
  @DisplayName("Com a denúncia já arquivada, reativar pelo id da linha do registro funciona")
  void reativarPeloRegistro() throws Exception {
    UUID atividade = massa.atividadeDeLeitura(autora, massa.livroOficial("Livro"));
    massa.segue(leitora, autora);
    UUID denuncia = denunciar(leitora, massa.comentario(atividade, autora, null, "Spam"));
    acao("suspender", autora, tokenAdmin(), chave(), "Spam");
    post("/admin/denuncias/" + denuncia + "/arquivar", tokenAdmin(), chave());
    assertThat(corpo(get("/admin/denuncias", tokenAdmin())).get("itens")).isEmpty();

    JsonNode vigente = null;
    for (JsonNode linha : corpo(get("/admin/moderacao/logs", tokenAdmin())).get("itens")) {
      if (linha.get("suspensaoVigente").asBoolean()) {
        vigente = linha;
      }
    }
    assertThat(vigente).isNotNull();
    UUID alvo = UUID.fromString(vigente.get("alvoId").asString());

    HttpResponse<String> reativada = acao("reativar", alvo, tokenAdmin(), chave(), "Revisto");
    assertThat(reativada.statusCode()).isEqualTo(200);
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM log_moderacao WHERE acao = 'reativar_conta' AND alvo_id = ?",
                Long.class,
                autora))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("Admin acha a conta pelo username, também suspensa, com o motivo vigente; leitor 403")
  void contaPorUsername() throws Exception {
    JsonNode ativa = corpo(get("/admin/usuarios?username=AUTORA", tokenAdmin()));
    assertThat(ativa.get("id").asString()).isEqualTo(autora.toString());
    assertThat(ativa.get("suspensa").asBoolean()).isFalse();
    assertThat(ativa.get("motivo").isNull()).isTrue();

    acao("suspender", autora, tokenAdmin(), chave(), "Ataques repetidos.");
    JsonNode suspensa = corpo(get("/admin/usuarios?username=autora", tokenAdmin()));
    assertThat(suspensa.get("suspensa").asBoolean()).isTrue();
    assertThat(suspensa.get("suspensaEm").isNull()).isFalse();
    assertThat(suspensa.get("motivo").asString()).isEqualTo("Ataques repetidos.");

    assertThat(get("/admin/usuarios?username=ninguem", tokenAdmin()).statusCode()).isEqualTo(404);
    massa.emExclusao(leitora);
    assertThat(get("/admin/usuarios?username=leitora", tokenAdmin()).statusCode()).isEqualTo(404);
    assertThat(get("/admin/usuarios?username=autora", token(leitora, "leitor")).statusCode())
        .isEqualTo(403);
  }

  // ------------------------------------------------------------------ apoio

  private long logsDeConta() {
    return jdbc.queryForObject(
        "SELECT count(*) FROM log_moderacao WHERE alvo_tipo = 'usuario'", Long.class);
  }

  private String tokenAdmin() throws Exception {
    return token(admin, "admin");
  }

  private static String chave() {
    return UUID.randomUUID().toString();
  }

  private HttpResponse<String> acao(
      String acao, UUID usuario, String token, String chave, String motivo) throws Exception {
    HttpRequest.Builder requisicao =
        HttpRequest.newBuilder(uri("/admin/usuarios/" + usuario + "/" + acao))
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .POST(
                HttpRequest.BodyPublishers.ofString(
                    motivo == null ? "{}" : json.writeValueAsString(Map.of("motivo", motivo))));
    if (chave != null) {
      requisicao.header("Idempotency-Key", chave);
    }
    return enviar(requisicao.build());
  }

  private UUID denunciar(UUID quem, UUID comentario) throws Exception {
    String corpo =
        json.writeValueAsString(
            Map.of("alvoTipo", "comentario", "alvoId", comentario.toString(), "motivo", "Spam"));
    HttpResponse<String> resposta =
        enviar(
            HttpRequest.newBuilder(uri("/denuncias"))
                .header("Authorization", "Bearer " + token(quem))
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", chave())
                .POST(HttpRequest.BodyPublishers.ofString(corpo))
                .build());
    assertThat(resposta.statusCode()).as(resposta.body()).isEqualTo(201);
    return UUID.fromString(json.readTree(resposta.body()).get("id").asString());
  }

  private HttpResponse<String> get(String caminho, String token) {
    return enviar(
        HttpRequest.newBuilder(uri(caminho)).header("Authorization", "Bearer " + token).GET().build());
  }

  private HttpResponse<String> post(String caminho, String token, String chave) {
    return enviar(
        HttpRequest.newBuilder(uri(caminho))
            .header("Authorization", "Bearer " + token)
            .header("Idempotency-Key", chave)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build());
  }

  private JsonNode corpo(HttpResponse<String> resposta) {
    return json.readTree(resposta.body());
  }

  private String codigo(HttpResponse<String> resposta) {
    return corpo(resposta).get("codigo").asString();
  }
}
