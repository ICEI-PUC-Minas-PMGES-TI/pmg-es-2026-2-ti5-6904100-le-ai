package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
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
 * Painel de moderação (F-MOD, RF-MOD-02/03/05) de ponta a ponta, com o {@code leitura} simulado
 * num servidor HTTP de verdade: o timeout, a retentativa e a chave fixa por alvo são testados
 * sobre a rede, não sobre um mock do cliente.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ModeracaoIntegracaoTest extends IntegracaoComPostgres {

  private static final LeituraSimulada LEITURA = new LeituraSimulada();

  @DynamicPropertySource
  static void leitura(DynamicPropertyRegistry registro) {
    registro.add("leai.leitura-base-url", LEITURA::url);
    registro.add("leai.moderacao-token", () -> LeituraSimulada.TOKEN);
    registro.add("leai.moderacao.timeout-de-leitura", () -> "1s");
    registro.add("leai.moderacao.espera-da-retentativa", () -> "0s");
  }

  @AfterAll
  static void desligar() {
    LEITURA.close();
  }

  @Autowired private JdbcTemplate jdbc;
  @Autowired private ObjectMapper json;
  private MassaDeModeracao massa;

  private final UUID admin = UUID.randomUUID();
  private UUID autora;
  private UUID leitora;
  private UUID livro;

  @BeforeEach
  void preparar() {
    massa = new MassaDeModeracao(jdbc);
    massa.preparar();
    LEITURA.reiniciar();
    autora = massa.leitor("autora");
    leitora = massa.leitor("leitora");
    livro = massa.livroOficial("Torto Arado");
  }

  // ------------------------------------------------------------------ acesso

  @Test
  @DisplayName("Painel e ações só com papel admin: leitor e token sem papel são 403, sem token 401")
  void somenteAdmin() throws Exception {
    UUID denuncia = denunciarResenha(leitora, massa.resenha(autora, livro, "Texto"));

    assertThat(get("/admin/denuncias", token(leitora, "leitor")).statusCode()).isEqualTo(403);
    assertThat(get("/admin/denuncias", token(leitora)).statusCode()).isEqualTo(403);
    assertThat(get("/admin/moderacao/logs", token(leitora, "leitor")).statusCode()).isEqualTo(403);
    assertThat(
            post("/admin/denuncias/" + denuncia + "/arquivar", token(leitora, "leitor"), chave())
                .statusCode())
        .isEqualTo(403);
    assertThat(enviar(HttpRequest.newBuilder(uri("/admin/denuncias")).GET().build()).statusCode())
        .isEqualTo(401);
    assertThat(get("/admin/denuncias", tokenAdmin()).statusCode()).isEqualTo(200);
    assertThat(estado(denuncia)).isEqualTo("pendente");
  }

  // ------------------------------------------------------------------ fila

  @Test
  @DisplayName("Fila da mais antiga para a mais recente, com conteúdo, contexto e cursor")
  void filaComCursor() throws Exception {
    UUID resenha = massa.resenha(autora, livro, "A segunda parte *muda tudo*.");
    massa.nota(autora, livro, "4.5");
    UUID primeira = denunciarResenha(leitora, resenha);
    UUID atividade = massa.atividadeDeLeitura(autora, livro);
    massa.segue(leitora, autora);
    UUID comentarista = massa.leitor("comentarista");
    UUID raiz = massa.comentario(atividade, comentarista, null, "Spam aqui");
    massa.comentario(atividade, autora, raiz, "Resposta");
    UUID segunda = denunciar(leitora, "comentario", raiz, "Divulgação");
    jdbc.update("UPDATE denuncia SET criado_em = criado_em + interval '1 second' WHERE id = ?", segunda);

    JsonNode pagina1 = corpo(get("/admin/denuncias?limite=1", tokenAdmin()));
    assertThat(pagina1.get("temMais").asBoolean()).isTrue();
    JsonNode item1 = pagina1.get("itens").get(0);
    assertThat(item1.get("id").asString()).isEqualTo(primeira.toString());
    assertThat(item1.get("tipo").asString()).isEqualTo("resenha");
    assertThat(item1.get("motivo").asString()).isEqualTo("Motivo de teste");
    assertThat(item1.get("denunciante").get("username").asString()).isEqualTo("leitora");
    assertThat(item1.get("autor").get("username").asString()).isEqualTo("autora");
    assertThat(item1.get("livro").get("titulo").asString()).isEqualTo("Torto Arado");
    assertThat(item1.get("conteudo").get("texto").asString()).isEqualTo("A segunda parte *muda tudo*.");
    assertThat(item1.get("conteudo").get("nota").asDouble()).isEqualTo(4.5);
    assertThat(item1.get("remocaoNaoConfirmada").asBoolean()).isFalse();

    String cursor = pagina1.get("proximoCursor").asString();
    JsonNode pagina2 = corpo(get("/admin/denuncias?limite=1&cursor=" + cursor, tokenAdmin()));
    JsonNode item2 = pagina2.get("itens").get(0);
    assertThat(pagina2.get("temMais").asBoolean()).isFalse();
    assertThat(item2.get("id").asString()).isEqualTo(segunda.toString());
    assertThat(item2.get("conteudo").get("respostas").asInt()).isEqualTo(1);
    assertThat(item2.get("atividade").get("autorNome").asString()).isEqualTo("Nome");
    assertThat(item2.get("atividade").get("visivelParaAdmin").asBoolean()).isFalse();

    assertThat(get("/admin/denuncias?cursor=lixo", tokenAdmin()).statusCode()).isEqualTo(400);
  }

  @Test
  @DisplayName("Conteúdo apagado pelo autor vem nulo, e o perfil fora da VIEW também")
  void conteudoIndisponivel() throws Exception {
    UUID resenha = massa.resenha(autora, livro, "Texto");
    denunciarResenha(leitora, resenha);
    massa.apagarResenha(resenha);
    massa.emExclusao(autora);

    JsonNode item = corpo(get("/admin/denuncias", tokenAdmin())).get("itens").get(0);

    assertThat(item.get("conteudo").isNull()).isTrue();
    assertThat(item.get("autor").isNull()).isTrue();
  }

  // ------------------------------------------------------------------ arquivar

  @Test
  @DisplayName("Arquivar fecha só a escolhida, registra e não repete")
  void arquivarSoAEscolhida() throws Exception {
    UUID resenha = massa.resenha(autora, livro, "Texto");
    UUID primeira = denunciarResenha(leitora, resenha);
    UUID segunda = denunciarResenha(massa.leitor("outra"), resenha);

    HttpResponse<String> resposta =
        post("/admin/denuncias/" + primeira + "/arquivar", tokenAdmin(), chave());

    assertThat(resposta.statusCode()).isEqualTo(200);
    assertThat(corpo(resposta).get("denunciasFechadas").get(0).asString()).isEqualTo(primeira.toString());
    assertThat(estado(primeira)).isEqualTo("arquivada");
    assertThat(estado(segunda)).isEqualTo("pendente");
    Map<String, Object> log = jdbc.queryForMap("SELECT * FROM log_moderacao");
    assertThat(log.get("acao")).isEqualTo("arquivar_denuncia");
    assertThat(log.get("admin")).isEqualTo(admin.toString());
    assertThat(log.get("alvo_autor_id")).isEqualTo(autora);
    assertThat(log.get("detalhe")).isNull();

    HttpResponse<String> deNovo = post("/admin/denuncias/" + primeira + "/arquivar", tokenAdmin(), chave());
    assertThat(deNovo.statusCode()).isEqualTo(409);
    assertThat(corpo(deNovo).get("codigo").asString()).isEqualTo("DENUNCIA_JA_RESOLVIDA");
  }

  // ------------------------------------------------------------------ remover comentário

  @Test
  @DisplayName("Remover comentário-raiz leva as respostas e fecha as denúncias delas, com um log")
  void removerComentarioComRespostas() throws Exception {
    UUID atividade = massa.atividadeDeLeitura(autora, livro);
    massa.segue(leitora, autora);
    UUID comentarista = massa.leitor("comentarista");
    UUID raiz = massa.comentario(atividade, comentarista, null, "Ofensa");
    UUID resposta = massa.comentario(atividade, comentarista, raiz, "Mais ofensa");
    UUID daRaiz = denunciar(leitora, "comentario", raiz, "Ofensivo");
    UUID daResposta = denunciar(leitora, "comentario", resposta, "Ofensivo também");

    HttpResponse<String> remocao = post("/admin/denuncias/" + daRaiz + "/remover", tokenAdmin(), chave());

    assertThat(remocao.statusCode()).isEqualTo(200);
    assertThat(estado(daRaiz)).isEqualTo("removida");
    assertThat(estado(daResposta)).isEqualTo("removida");
    assertThat(massa.contar("SELECT count(*) FROM comentario WHERE id IN (?, ?)", raiz, resposta)).isZero();
    assertThat(massa.contar("SELECT count(*) FROM log_moderacao WHERE acao = 'remover_conteudo'")).isEqualTo(1);
    assertThat(LEITURA.chamadas()).isEmpty();
  }

  // ------------------------------------------------------------------ remover resenha

  @Test
  @DisplayName("Remover resenha pede ao leitura com o token e a chave fixa, e fecha tudo do alvo")
  void removerResenha() throws Exception {
    UUID resenha = massa.resenha(autora, livro, "Texto");
    UUID atividade = massa.atividadeDeResenha(autora, livro, resenha);
    massa.segue(leitora, autora);
    UUID comentarista = massa.leitor("comentarista");
    UUID comentario = massa.comentario(atividade, comentarista, null, "Comentário");
    UUID primeira = denunciarResenha(leitora, resenha);
    UUID segunda = denunciarResenha(massa.leitor("outra"), resenha);
    UUID doComentario = denunciar(leitora, "comentario", comentario, "Também");
    removerComoOLeitura(resenha);

    HttpResponse<String> remocao = post("/admin/denuncias/" + primeira + "/remover", tokenAdmin(), chave());

    assertThat(remocao.statusCode()).isEqualTo(200);
    assertThat(List.of(estado(primeira), estado(segunda), estado(doComentario)))
        .containsOnly("removida");
    assertThat(massa.contar("SELECT count(*) FROM atividade WHERE id = ?", atividade)).isZero();
    Map<String, Object> log = jdbc.queryForMap("SELECT * FROM log_moderacao");
    assertThat(log.get("alvo_tipo")).isEqualTo("resenha");
    assertThat(log.get("alvo_autor_id")).isEqualTo(autora);
    assertThat(log.get("alvo_livro_id")).isEqualTo(livro);
    LeituraSimulada.Chamada chamada = LEITURA.chamadas().getFirst();
    assertThat(chamada.token()).isEqualTo(LeituraSimulada.TOKEN);
    assertThat(chamada.chave())
        .isEqualTo(
            UUID.nameUUIDFromBytes(("moderacao:resenha:" + resenha).getBytes(StandardCharsets.UTF_8))
                .toString());
  }

  @Test
  @DisplayName("Timeout depois de o leitura apagar: pendente, sem arquivar; o reenvio fecha com um log")
  void timeoutEReenvio() throws Exception {
    UUID resenha = massa.resenha(autora, livro, "Texto");
    UUID denuncia = denunciarResenha(leitora, resenha);
    removerComoOLeitura(resenha);
    LEITURA.modo(LeituraSimulada.Modo.REMOVE_E_DEMORA);
    LEITURA.demora(3_000);
    String chave = chave();

    HttpResponse<String> primeira = post("/admin/denuncias/" + denuncia + "/remover", tokenAdmin(), chave);

    assertThat(primeira.statusCode()).isEqualTo(504);
    assertThat(estado(denuncia)).isEqualTo("pendente");
    JsonNode item = corpo(get("/admin/denuncias", tokenAdmin())).get("itens").get(0);
    assertThat(item.get("remocaoNaoConfirmada").asBoolean()).isTrue();
    HttpResponse<String> arquivar = post("/admin/denuncias/" + denuncia + "/arquivar", tokenAdmin(), chave());
    assertThat(arquivar.statusCode()).isEqualTo(409);
    assertThat(corpo(arquivar).get("codigo").asString()).isEqualTo("REMOCAO_EM_ANDAMENTO");

    HttpResponse<String> reenvio = post("/admin/denuncias/" + denuncia + "/remover", tokenAdmin(), chave);

    assertThat(reenvio.statusCode()).isEqualTo(200);
    assertThat(estado(denuncia)).isEqualTo("removida");
    assertThat(massa.contar("SELECT count(*) FROM log_moderacao")).isEqualTo(1);
    assertThat(massa.contar("SELECT count(*) FROM denuncia WHERE remocao_solicitada_em IS NOT NULL"))
        .isZero();
  }

  @Test
  @DisplayName("leitura fora do ar: uma retentativa, 503 e a denúncia pendente")
  void leituraIndisponivel() throws Exception {
    UUID denuncia = denunciarResenha(leitora, massa.resenha(autora, livro, "Texto"));
    LEITURA.modo(LeituraSimulada.Modo.INDISPONIVEL);

    HttpResponse<String> remocao = post("/admin/denuncias/" + denuncia + "/remover", tokenAdmin(), chave());

    assertThat(remocao.statusCode()).isEqualTo(503);
    assertThat(LEITURA.chamadas()).hasSize(2);
    assertThat(estado(denuncia)).isEqualTo("pendente");
    assertThat(massa.contar("SELECT count(*) FROM log_moderacao")).isZero();
  }

  @Test
  @DisplayName("Resenha já excluída pela autora, ou recibo vencido: 409, marca limpa e sem log")
  void conteudoJaExcluido() throws Exception {
    for (LeituraSimulada.Modo modo :
        new LeituraSimulada.Modo[] {LeituraSimulada.Modo.JA_REMOVIDA, LeituraSimulada.Modo.CONFLITO}) {
      LEITURA.reiniciar();
      UUID resenha = massa.resenha(massa.leitor("a" + modo.ordinal()), livro, "Texto");
      UUID denuncia = denunciarResenha(leitora, resenha);
      LEITURA.modo(modo);

      HttpResponse<String> remocao = post("/admin/denuncias/" + denuncia + "/remover", tokenAdmin(), chave());

      assertThat(remocao.statusCode()).isEqualTo(409);
      assertThat(corpo(remocao).get("codigo").asString()).isEqualTo("CONTEUDO_JA_EXCLUIDO");
      assertThat(estado(denuncia)).isEqualTo("pendente");
      assertThat(
              massa.contar(
                  "SELECT count(*) FROM denuncia WHERE id = ? AND remocao_solicitada_em IS NULL",
                  denuncia))
          .isEqualTo(1);
    }
    assertThat(massa.contar("SELECT count(*) FROM log_moderacao")).isZero();
  }

  @Test
  @DisplayName("Dois cliques com chaves diferentes: o segundo é 409 e fica um log só")
  void doisCliques() throws Exception {
    UUID resenha = massa.resenha(autora, livro, "Texto");
    UUID denuncia = denunciarResenha(leitora, resenha);
    removerComoOLeitura(resenha);

    assertThat(post("/admin/denuncias/" + denuncia + "/remover", tokenAdmin(), chave()).statusCode())
        .isEqualTo(200);
    HttpResponse<String> segundo = post("/admin/denuncias/" + denuncia + "/remover", tokenAdmin(), chave());

    assertThat(segundo.statusCode()).isEqualTo(409);
    assertThat(corpo(segundo).get("codigo").asString()).isEqualTo("DENUNCIA_JA_RESOLVIDA");
    assertThat(massa.contar("SELECT count(*) FROM log_moderacao")).isEqualTo(1);
  }

  // ------------------------------------------------------------------ frase

  @Test
  @DisplayName("Remover frase sem denúncia: leitura com a chave fixa, 204 e um log de frase")
  void removerFrase() throws Exception {
    UUID frase = UUID.randomUUID();
    LEITURA.autoria(autora, livro);
    String chave = chave();

    HttpResponse<String> resposta = delete("/admin/frases/" + frase, tokenAdmin(), chave);
    HttpResponse<String> repeticao = delete("/admin/frases/" + frase, tokenAdmin(), chave);

    assertThat(resposta.statusCode()).isEqualTo(204);
    assertThat(repeticao.statusCode()).isEqualTo(204);
    assertThat(LEITURA.chamadas()).hasSize(1);
    LeituraSimulada.Chamada chamada = LEITURA.chamadas().getFirst();
    assertThat(chamada.colecao()).isEqualTo("frases");
    assertThat(chamada.chave())
        .isEqualTo(
            UUID.nameUUIDFromBytes(("moderacao:frase:" + frase).getBytes(StandardCharsets.UTF_8))
                .toString());
    Map<String, Object> log = jdbc.queryForMap("SELECT * FROM log_moderacao");
    assertThat(log.get("alvo_tipo")).isEqualTo("frase");
    assertThat(log.get("alvo_autor_id")).isEqualTo(autora);
    assertThat(log.get("alvo_livro_id")).isEqualTo(livro);
    assertThat(log.get("denuncia_id")).isNull();

    JsonNode registro = corpo(get("/admin/moderacao/logs", tokenAdmin())).get("itens").get(0);
    assertThat(registro.get("comDenuncia").asBoolean()).isFalse();
  }

  @Test
  @DisplayName("Frase que já não existe é 409; leitor recebe 403")
  void removerFraseInexistenteOuSemPapel() throws Exception {
    LEITURA.modo(LeituraSimulada.Modo.JA_REMOVIDA);

    HttpResponse<String> resposta = delete("/admin/frases/" + UUID.randomUUID(), tokenAdmin(), chave());

    assertThat(resposta.statusCode()).isEqualTo(409);
    assertThat(corpo(resposta).get("codigo").asString()).isEqualTo("CONTEUDO_JA_EXCLUIDO");
    assertThat(
            delete("/admin/frases/" + UUID.randomUUID(), token(leitora, "leitor"), chave()).statusCode())
        .isEqualTo(403);
    assertThat(massa.contar("SELECT count(*) FROM log_moderacao")).isZero();
  }

  // ------------------------------------------------------------------ registro

  @Test
  @DisplayName("Registro da mais recente para a mais antiga, sem motivo nem texto, e com cursor")
  void registro() throws Exception {
    UUID resenha = massa.resenha(autora, livro, "Texto");
    UUID arquivada = denunciarResenha(leitora, resenha);
    post("/admin/denuncias/" + arquivada + "/arquivar", tokenAdmin(), chave());
    UUID removida = denunciarResenha(leitora, resenha);
    removerComoOLeitura(resenha);
    post("/admin/denuncias/" + removida + "/remover", tokenAdmin(), chave());
    jdbc.update(
        "UPDATE log_moderacao SET criado_em = criado_em + interval '1 second'"
            + " WHERE acao = 'remover_conteudo'");

    JsonNode pagina = corpo(get("/admin/moderacao/logs?limite=1", tokenAdmin()));
    JsonNode maisRecente = pagina.get("itens").get(0);
    assertThat(maisRecente.get("acao").asString()).isEqualTo("remover_conteudo");
    assertThat(maisRecente.get("alvoTipo").asString()).isEqualTo("resenha");
    assertThat(maisRecente.get("alvoAutor").asString()).isEqualTo("autora");
    assertThat(maisRecente.get("livroTitulo").asString()).isEqualTo("Torto Arado");
    assertThat(maisRecente.get("comDenuncia").asBoolean()).isTrue();
    assertThat(maisRecente.toString()).doesNotContain("Motivo de teste").doesNotContain("Texto");
    assertThat(pagina.get("temMais").asBoolean()).isTrue();

    JsonNode seguinte =
        corpo(get("/admin/moderacao/logs?limite=1&cursor=" + pagina.get("proximoCursor").asString(), tokenAdmin()));
    assertThat(seguinte.get("itens").get(0).get("acao").asString()).isEqualTo("arquivar_denuncia");
    assertThat(seguinte.get("temMais").asBoolean()).isFalse();
  }

  // ------------------------------------------------------------------ apoio

  /** O que o leitura faz ao remover: a resenha some da VIEW, e o feed tira a atividade. */
  private void removerComoOLeitura(UUID resenha) {
    LEITURA.autoria(autora, livro);
    LEITURA.aoRemover(
        id -> {
          massa.apagarResenha(id);
          jdbc.update("DELETE FROM atividade WHERE tipo = 'resenha_publicada' AND origem_id = ?", id);
        });
  }

  private String tokenAdmin() throws Exception {
    return token(admin, "admin");
  }

  private static String chave() {
    return UUID.randomUUID().toString();
  }

  private String estado(UUID denuncia) {
    return jdbc.queryForObject("SELECT estado FROM denuncia WHERE id = ?", String.class, denuncia);
  }

  private UUID denunciarResenha(UUID quem, UUID resenha) throws Exception {
    return denunciar(quem, "resenha", resenha, "Motivo de teste");
  }

  private UUID denunciar(UUID quem, String tipo, UUID alvo, String motivo) throws Exception {
    String corpo =
        json.writeValueAsString(Map.of("alvoTipo", tipo, "alvoId", alvo.toString(), "motivo", motivo));
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
    List<String> cabecalhos = new ArrayList<>(List.of("Authorization", "Bearer " + token));
    if (chave != null) {
      cabecalhos.addAll(List.of("Idempotency-Key", chave));
    }
    return enviar(
        HttpRequest.newBuilder(uri(caminho))
            .headers(cabecalhos.toArray(String[]::new))
            .POST(HttpRequest.BodyPublishers.noBody())
            .build());
  }

  private HttpResponse<String> delete(String caminho, String token, String chave) {
    return enviar(
        HttpRequest.newBuilder(uri(caminho))
            .header("Authorization", "Bearer " + token)
            .header("Idempotency-Key", chave)
            .DELETE()
            .build());
  }

  private JsonNode corpo(HttpResponse<String> resposta) {
    return json.readTree(resposta.body());
  }
}
