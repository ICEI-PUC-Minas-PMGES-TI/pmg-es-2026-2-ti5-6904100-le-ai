package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.feed.entity.Comentario;
import br.com.leai.social.feed.repository.ComentarioRepository;
import br.com.leai.social.notificacao.dto.NotificacaoResposta;
import br.com.leai.social.notificacao.service.ServicoDeNotificacao;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Ocultação no {@code social} da conta suspensa (F-MOD-OPC, parte 3): comentários, respostas,
 * contagens, responder e denunciar, e as notificações que citam a conta. A suspensão é simulada na
 * VIEW falsa do {@code identidade}, como o serviço real faria; a reativação devolve tudo.
 *
 * <p>Massa: {@code dona} publica a atividade; {@code suspensa} comenta (raiz) e recebe a resposta
 * de {@code terceira}; {@code leitora} segue a dona e vê a atividade.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class OcultacaoDeContaSuspensaIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private JdbcTemplate jdbc;
  @Autowired private ObjectMapper json;
  @Autowired private ServicoDeNotificacao notificacoes;
  @Autowired private ComentarioRepository comentarios;

  private MassaDeModeracao massa;
  private MassaDeRecomendacao base;
  private UUID dona;
  private UUID suspensa;
  private UUID terceira;
  private UUID leitora;
  private UUID atividade;
  private UUID raizDaSuspensa;
  private UUID respostaDaTerceira;
  private UUID raizDaTerceira;

  @BeforeEach
  void preparar() {
    massa = new MassaDeModeracao(jdbc);
    massa.preparar();
    base = new MassaDeRecomendacao(jdbc);
    jdbc.execute("TRUNCATE notificacao");
    dona = massa.leitor("dona");
    suspensa = massa.leitor("suspensa");
    terceira = massa.leitor("terceira");
    leitora = massa.leitor("leitora");
    massa.segue(leitora, dona);
    massa.segue(suspensa, dona);
    massa.segue(terceira, dona);
    atividade = massa.atividadeDeLeitura(dona, massa.livroOficial("Torto Arado"));
    raizDaSuspensa = massa.comentario(atividade, suspensa, null, "Raiz da suspensa");
    respostaDaTerceira = massa.comentario(atividade, terceira, raizDaSuspensa, "Resposta");
    raizDaTerceira = massa.comentario(atividade, terceira, null, "Raiz da terceira");
    massa.comentario(atividade, suspensa, raizDaTerceira, "Resposta da suspensa");
  }

  @Test
  @DisplayName("Raiz de conta suspensa some com a thread inteira, e as contagens a acompanham")
  void comentariosEContagens() throws Exception {
    assertThat(raizes(leitora)).hasSize(2);
    assertThat(totalComentarios(leitora)).isEqualTo(4);

    base.suspender(suspensa);

    List<JsonNode> raizes = raizes(leitora);
    assertThat(raizes).hasSize(1);
    assertThat(raizes.getFirst().get("id").asString()).isEqualTo(raizDaTerceira.toString());
    // Só a resposta da suspensa sob a raiz visível some.
    assertThat(raizes.getFirst().get("totalRespostas").asInt()).isZero();
    assertThat(totalComentarios(leitora)).isEqualTo(1);
    assertThat(
            corpo(get("/atividades/" + atividade + "/comentarios", leitora))
                .get("totalItens")
                .asLong())
        .isEqualTo(1);
    assertThat(respostas(raizDaTerceira, leitora)).isEmpty();
    // A thread da raiz oculta, mesmo com a resposta de uma conta ativa: 404.
    assertThat(get("/comentarios/" + raizDaSuspensa + "/respostas", leitora).statusCode())
        .isEqualTo(404);

    base.reativar(suspensa);
    assertThat(raizes(leitora)).hasSize(2);
    assertThat(totalComentarios(leitora)).isEqualTo(4);
    assertThat(respostas(raizDaSuspensa, leitora)).hasSize(1);
  }

  @Test
  @DisplayName("Responder ou denunciar comentário oculto é 404, sem evento para a conta suspensa")
  void responderEDenunciarOculto() throws Exception {
    base.suspender(suspensa);
    long eventosAntes = massa.contar("SELECT count(*) FROM outbox_social");

    assertThat(comentar(leitora, raizDaSuspensa).statusCode()).isEqualTo(404);
    assertThat(comentar(leitora, respostaDaTerceira).statusCode()).isEqualTo(404);
    assertThat(denunciar(leitora, raizDaSuspensa).statusCode()).isEqualTo(404);
    assertThat(denunciar(leitora, respostaDaTerceira).statusCode()).isEqualTo(404);
    assertThat(massa.contar("SELECT count(*) FROM outbox_social")).isEqualTo(eventosAntes);

    base.reativar(suspensa);
    assertThat(comentar(leitora, raizDaSuspensa).statusCode()).isEqualTo(201);
    assertThat(denunciar(leitora, raizDaSuspensa).statusCode()).isEqualTo(201);
  }

  @Test
  @DisplayName("O próprio autor ainda vê os seus comentários")
  void autorVeOsSeus() throws Exception {
    base.suspender(terceira);
    // Pelo repositório: a conta suspensa também sai do seguimento e não chegaria à atividade
    // pela rota. O filtro de comentário, sozinho, ainda mostra a ela o que ela escreveu.
    assertThat(
            comentarios
                .buscarRaizesPorAtividade(atividade, terceira, PageRequest.of(0, 10))
                .getContent())
        .extracting(Comentario::id)
        .contains(raizDaTerceira);
    assertThat(comentarios.visivelPara(respostaDaTerceira, terceira)).isTrue();
    assertThat(comentarios.visivelPara(respostaDaTerceira, leitora)).isFalse();
    assertThat(comentarios.visivelPara(raizDaTerceira, leitora)).isFalse();
    assertThat(raizes(leitora))
        .extracting(r -> r.get("id").asString())
        .containsExactly(raizDaSuspensa.toString());
  }

  @Test
  @DisplayName("Notificação: autor da atividade oculto vira \"um leitor\", sem links")
  void notificacaoComAutorDaAtividadeOculto() throws Exception {
    // A terceira foi respondida pela leitora na atividade da suspensa.
    UUID atividadeDaSuspensa =
        massa.atividadeDeLeitura(suspensa, massa.livroOficial("Vidas Secas"));
    massa.segue(terceira, suspensa);
    UUID comentario = massa.comentario(atividadeDaSuspensa, terceira, null, "Oi");
    notificar(
        terceira,
        "comentario_respondido",
        Map.of(
            "ator", Map.of("id", leitora.toString(), "username", "leitora", "nomeExibicao", "Leitora"),
            "atividadeId", atividadeDaSuspensa.toString(),
            "comentarioId", comentario.toString(),
            "atividade",
                Map.of(
                    "tipo", "leitura_iniciada",
                    "livroTitulo", "Vidas Secas",
                    "autorId", suspensa.toString(),
                    "autorNome", "Nome Antigo")));

    NotificacaoResposta antes = unica(terceira);
    assertThat(antes.mensagem()).contains("na atividade de Nome Antigo");
    assertThat(antes.atividadeId()).isEqualTo(atividadeDaSuspensa.toString());

    base.suspender(suspensa);
    NotificacaoResposta depois = unica(terceira);
    assertThat(depois.mensagem())
        .isEqualTo("Leitora respondeu ao seu comentário na atividade de um leitor.");
    assertThat(depois.atividadeId()).isNull();
    assertThat(depois.comentarioId()).isNull();
    // A lista HTTP usa o mesmo mapeamento.
    JsonNode item = corpo(get("/notificacoes", terceira)).get("itens").get(0);
    assertThat(item.get("mensagem").asString()).doesNotContain("Nome Antigo");
    assertThat(item.get("atividadeId").isNull()).isTrue();
  }

  @Test
  @DisplayName("Notificação: comentário em thread de raiz oculta perde o link, a atividade não")
  void notificacaoComComentarioEmThreadOculta() throws Exception {
    notificar(
        dona,
        "atividade_comentada",
        Map.of(
            "ator", Map.of("id", terceira.toString(), "username", "terceira", "nomeExibicao", "T"),
            "atividadeId", atividade.toString(),
            "comentarioId", respostaDaTerceira.toString()));

    assertThat(unica(dona).comentarioId()).isEqualTo(respostaDaTerceira.toString());

    base.suspender(suspensa);
    NotificacaoResposta depois = unica(dona);
    assertThat(depois.ator()).isNotNull();
    assertThat(depois.atividadeId()).isEqualTo(atividade.toString());
    assertThat(depois.comentarioId()).isNull();

    base.reativar(suspensa);
    assertThat(unica(dona).comentarioId()).isEqualTo(respostaDaTerceira.toString());
  }

  @Test
  @DisplayName("Curtida de conta suspensa sai do total da atividade e volta na reativação")
  void curtidaDeContaSuspensa() throws Exception {
    jdbc.update(
        "INSERT INTO curtida_atividade (atividade_id, usuario_id) VALUES (?, ?), (?, ?)",
        atividade, suspensa, atividade, terceira);
    assertThat(totalCurtidas(leitora)).isEqualTo(2);

    base.suspender(suspensa);
    assertThat(totalCurtidas(leitora)).isEqualTo(1);

    base.reativar(suspensa);
    assertThat(totalCurtidas(leitora)).isEqualTo(2);
  }

  @Test
  @DisplayName("Menção a conta suspensa vira \"um leitor\" no texto, sem link, e volta na reativação")
  void mencaoDeContaSuspensa() throws Exception {
    HttpResponse<String> criado =
        enviar(
            HttpRequest.newBuilder(uri("/atividades/" + atividade + "/comentarios"))
                .header("Authorization", "Bearer " + token(leitora))
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .POST(
                    HttpRequest.BodyPublishers.ofString(
                        json.writeValueAsString(
                            Map.of("texto", "Concordo com @suspensa e com @terceira."))))
                .build());
    assertThat(criado.statusCode()).as(criado.body()).isEqualTo(201);
    String id = corpo(criado).get("id").asString();

    base.suspender(suspensa);
    JsonNode comentario = comentarioPorId(id, dona);
    assertThat(comentario.get("texto").asString())
        .isEqualTo("Concordo com um leitor e com @terceira.");
    assertThat(comentario.get("mencoes")).hasSize(1);
    JsonNode visivel = comentario.get("mencoes").get(0);
    assertThat(visivel.get("username").asString()).isEqualTo("terceira");
    String texto = comentario.get("texto").asString();
    int posicao = visivel.get("posicao").asInt();
    assertThat(texto.substring(posicao, posicao + visivel.get("comprimento").asInt()))
        .isEqualTo("@terceira");

    base.reativar(suspensa);
    assertThat(comentarioPorId(id, dona).get("texto").asString())
        .isEqualTo("Concordo com @suspensa e com @terceira.");
  }

  @Test
  @DisplayName("Editar comentário com menção a conta suspensa mantém a menção, na posição nova")
  void edicaoMantemMencaoOculta() throws Exception {
    HttpResponse<String> criado =
        enviar(
            HttpRequest.newBuilder(uri("/atividades/" + atividade + "/comentarios"))
                .header("Authorization", "Bearer " + token(leitora))
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .POST(
                    HttpRequest.BodyPublishers.ofString(
                        json.writeValueAsString(Map.of("texto", "Oi @suspensa"))))
                .build());
    assertThat(criado.statusCode()).as(criado.body()).isEqualTo(201);
    String id = corpo(criado).get("id").asString();
    base.suspender(suspensa);
    long eventosAntes = massa.contar("SELECT count(*) FROM outbox_social");

    String versao = comentarioPorId(id, leitora).get("versao").asString();
    editar(id, leitora, "Olá de novo, @SUSPENSA e @terceira!", versao);

    JsonNode durante = comentarioPorId(id, dona);
    assertThat(durante.get("texto").asString()).isEqualTo("Olá de novo, um leitor e @terceira!");
    assertThat(durante.get("mencoes")).hasSize(1);
    // Só a menção nova à terceira notifica; a conta suspensa não recebe nada.
    assertThat(massa.contar("SELECT count(*) FROM outbox_social")).isEqualTo(eventosAntes + 1);

    base.reativar(suspensa);
    JsonNode depois = comentarioPorId(id, dona);
    assertThat(depois.get("texto").asString()).isEqualTo("Olá de novo, @SUSPENSA e @terceira!");
    assertThat(depois.get("mencoes")).extracting(m -> m.get("username").asString())
        .containsExactly("suspensa", "terceira");
    assertThat(depois.get("mencoes").get(0).get("posicao").asInt()).isEqualTo(13);
  }

  @Test
  @DisplayName("Editar pelo texto mascarado da listagem, como a web e o app, mantém a menção oculta")
  void edicaoPeloTextoDaListagem() throws Exception {
    HttpResponse<String> criado =
        enviar(
            HttpRequest.newBuilder(uri("/atividades/" + atividade + "/comentarios"))
                .header("Authorization", "Bearer " + token(leitora))
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .POST(
                    HttpRequest.BodyPublishers.ofString(
                        json.writeValueAsString(
                            Map.of("texto", "Oi @suspensa, @terceira e @Suspensa"))))
                .build());
    assertThat(criado.statusCode()).as(criado.body()).isEqualTo(201);
    String id = corpo(criado).get("id").asString();
    base.suspender(suspensa);
    long eventosAntes = massa.contar("SELECT count(*) FROM outbox_social");

    // O que os dois editores fazem: partem do `texto` que a listagem devolveu ao próprio autor.
    JsonNode carregado = comentarioPorId(id, leitora);
    String exibido = carregado.get("texto").asString();
    assertThat(exibido).isEqualTo("Oi um leitor, @terceira e um leitor");
    editar(id, leitora, exibido + "!", carregado.get("versao").asString());

    assertThat(textoGravado(id)).isEqualTo("Oi @suspensa, @terceira e @Suspensa!");
    assertThat(mencoesGravadas(id)).isEqualTo(3);
    assertThat(massa.contar("SELECT count(*) FROM outbox_social")).isEqualTo(eventosAntes);
    JsonNode durante = comentarioPorId(id, leitora);
    assertThat(durante.get("texto").asString()).isEqualTo("Oi um leitor, @terceira e um leitor!");
    assertThat(durante.get("mencoes")).hasSize(1);

    // Apagar um dos trechos mascarados tira só aquela menção; editar de novo continua estável.
    JsonNode deNovo = comentarioPorId(id, leitora);
    String semOPrimeiro = deNovo.get("texto").asString().replace("Oi um leitor, ", "Oi ");
    editar(id, leitora, semOPrimeiro, deNovo.get("versao").asString());
    assertThat(textoGravado(id)).isEqualTo("Oi @terceira e @Suspensa!");
    assertThat(mencoesGravadas(id)).isEqualTo(2);

    base.reativar(suspensa);
    JsonNode depois = comentarioPorId(id, leitora);
    assertThat(depois.get("texto").asString()).isEqualTo("Oi @terceira e @Suspensa!");
    assertThat(depois.get("mencoes")).extracting(m -> m.get("username").asString())
        .containsExactly("terceira", "suspensa");
  }

  @Test
  @DisplayName("Editor aberto com 'um leitor' e a conta reativada antes de salvar: 409, a menção fica")
  void edicaoDepoisDaReativacaoPedeRecarga() throws Exception {
    String id = criarComentario(leitora, "Oi @suspensa");
    base.suspender(suspensa);
    JsonNode carregado = comentarioPorId(id, leitora);
    assertThat(carregado.get("texto").asString()).isEqualTo("Oi um leitor");

    base.reativar(suspensa);
    HttpResponse<String> salvo =
        patch(id, leitora, carregado.get("texto").asString() + "!", carregado.get("versao").asString());

    assertThat(salvo.statusCode()).isEqualTo(409);
    assertThat(corpo(salvo).get("codigo").asString()).isEqualTo("COMENTARIO_DESATUALIZADO");
    assertThat(textoGravado(id)).isEqualTo("Oi @suspensa");
    assertThat(mencoesGravadas(id)).isEqualTo(1);
    // Recarregado, o editor recebe a apresentação nova e a edição passa.
    JsonNode recarregado = comentarioPorId(id, leitora);
    editar(id, leitora, recarregado.get("texto").asString() + "!", recarregado.get("versao").asString());
    assertThat(textoGravado(id)).isEqualTo("Oi @suspensa!");
  }

  @Test
  @DisplayName("Editor aberto com a conta ativa e suspensa antes de salvar: 409, sem menção nova")
  void edicaoDepoisDaSuspensaoPedeRecarga() throws Exception {
    String id = criarComentario(leitora, "Oi @suspensa e um leitor");
    JsonNode carregado = comentarioPorId(id, leitora);
    assertThat(carregado.get("texto").asString()).isEqualTo("Oi @suspensa e um leitor");

    base.suspender(suspensa);
    HttpResponse<String> salvo =
        patch(id, leitora, carregado.get("texto").asString() + "!", carregado.get("versao").asString());

    assertThat(salvo.statusCode()).isEqualTo(409);
    assertThat(textoGravado(id)).isEqualTo("Oi @suspensa e um leitor");
    assertThat(mencoesGravadas(id)).isEqualTo(1);
  }

  @Test
  @DisplayName("Com menção gravada, editar sem versão é 409; versão só para o autor")
  void versaoObrigatoriaComMencao() throws Exception {
    String id = criarComentario(leitora, "Oi @terceira");
    HttpResponse<String> semVersao = patch(id, leitora, "Oi @terceira!", null);
    assertThat(semVersao.statusCode()).isEqualTo(409);
    assertThat(textoGravado(id)).isEqualTo("Oi @terceira");
    assertThat(comentarioPorId(id, dona).get("versao").isNull()).isTrue();

    // Sem menção gravada, o cliente antigo (sem versão) continua editando.
    String semMencao = criarComentario(leitora, "Sem menção");
    assertThat(patch(semMencao, leitora, "Sem menção!", null).statusCode()).isEqualTo(200);
  }

  private String criarComentario(UUID quem, String texto) throws Exception {
    HttpResponse<String> criado =
        enviar(
            HttpRequest.newBuilder(uri("/atividades/" + atividade + "/comentarios"))
                .header("Authorization", "Bearer " + token(quem))
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .POST(
                    HttpRequest.BodyPublishers.ofString(
                        json.writeValueAsString(Map.of("texto", texto))))
                .build());
    assertThat(criado.statusCode()).as(criado.body()).isEqualTo(201);
    return corpo(criado).get("id").asString();
  }

  private HttpResponse<String> editar(String id, UUID quem, String texto, String versao)
      throws Exception {
    HttpResponse<String> resposta = patch(id, quem, texto, versao);
    assertThat(resposta.statusCode()).as(resposta.body()).isEqualTo(200);
    return resposta;
  }

  private HttpResponse<String> patch(String id, UUID quem, String texto, String versao)
      throws Exception {
    Map<String, Object> corpo = new java.util.HashMap<>();
    corpo.put("texto", texto);
    if (versao != null) {
      corpo.put("versao", versao);
    }
    return enviar(
        HttpRequest.newBuilder(uri("/comentarios/" + id))
            .header("Authorization", "Bearer " + token(quem))
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .method("PATCH", HttpRequest.BodyPublishers.ofString(json.writeValueAsString(corpo)))
            .build());
  }

  private String textoGravado(String id) {
    return jdbc.queryForObject(
        "SELECT texto FROM comentario WHERE id = ?::uuid", String.class, id);
  }

  private long mencoesGravadas(String id) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM comentario_mencao WHERE comentario_id = ?::uuid", Long.class, id);
  }

  private long totalCurtidas(UUID quem) throws Exception {
    return corpo(get("/atividades/" + atividade, quem)).get("totalCurtidas").asLong();
  }

  private JsonNode comentarioPorId(String id, UUID quem) throws Exception {
    for (JsonNode raiz : raizes(quem)) {
      if (raiz.get("id").asString().equals(id)) {
        return raiz;
      }
    }
    throw new AssertionError("comentário não encontrado");
  }

  // ------------------------------------------------------------------ apoio

  private void notificar(UUID destinatario, String tipo, Map<String, Object> dados)
      throws Exception {
    jdbc.update(
        "INSERT INTO notificacao (destinatario_id, tipo, dados, event_id, chave_negocio)"
            + " VALUES (?, ?, ?::jsonb, ?, ?)",
        destinatario,
        tipo,
        json.writeValueAsString(dados),
        UUID.randomUUID(),
        "teste:" + UUID.randomUUID());
  }

  /** O mesmo caminho do SSE ({@code CanaisDeNotificacao} usa {@code buscar}). */
  private NotificacaoResposta unica(UUID destinatario) {
    UUID id =
        jdbc.queryForObject(
            "SELECT id FROM notificacao WHERE destinatario_id = ?", UUID.class, destinatario);
    return notificacoes.buscar(destinatario, id).orElseThrow();
  }

  private List<JsonNode> raizes(UUID quem) throws Exception {
    List<JsonNode> itens = new ArrayList<>();
    corpo(get("/atividades/" + atividade + "/comentarios", quem)).get("itens").forEach(itens::add);
    return itens;
  }

  private List<JsonNode> respostas(UUID raiz, UUID quem) throws Exception {
    HttpResponse<String> resposta = get("/comentarios/" + raiz + "/respostas", quem);
    assertThat(resposta.statusCode()).as(resposta.body()).isEqualTo(200);
    List<JsonNode> itens = new ArrayList<>();
    corpo(resposta).get("itens").forEach(itens::add);
    return itens;
  }

  private long totalComentarios(UUID quem) throws Exception {
    return corpo(get("/atividades/" + atividade, quem)).get("totalComentarios").asLong();
  }

  private HttpResponse<String> comentar(UUID quem, UUID alvo) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri("/atividades/" + atividade + "/comentarios"))
            .header("Authorization", "Bearer " + token(quem))
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .POST(
                HttpRequest.BodyPublishers.ofString(
                    json.writeValueAsString(
                        Map.of("texto", "Resposta", "comentarioRespondidoId", alvo.toString()))))
            .build());
  }

  private HttpResponse<String> denunciar(UUID quem, UUID comentario) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri("/denuncias"))
            .header("Authorization", "Bearer " + token(quem))
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .POST(
                HttpRequest.BodyPublishers.ofString(
                    json.writeValueAsString(
                        Map.of(
                            "alvoTipo", "comentario",
                            "alvoId", comentario.toString(),
                            "motivo", "Spam"))))
            .build());
  }

  private HttpResponse<String> get(String caminho, UUID quem) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri(caminho))
            .header("Authorization", "Bearer " + token(quem))
            .GET()
            .build());
  }

  private JsonNode corpo(HttpResponse<String> resposta) {
    return json.readTree(resposta.body());
  }
}
