package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.common.LimitesDeInteracao;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * {@code POST /denuncias} (F-MOD, RF-MOD-01) de ponta a ponta. Os casos de acesso à resenha
 * espelham os de {@code leitura/test/integracao/reacoes.int-spec.ts}: a regra é a mesma, portada.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class DenunciaIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private JdbcTemplate jdbc;
  @Autowired private ObjectMapper json;
  private MassaDeModeracao massa;

  private UUID autora;
  private UUID leitora;

  @BeforeEach
  void preparaMassa() {
    massa = new MassaDeModeracao(jdbc);
    massa.preparar();
    autora = massa.leitor("autora");
    leitora = massa.leitor("leitora");
  }

  // ---------------------------------------------------------------- comentário

  @Test
  @DisplayName("Comentário em atividade visível é denunciado, com autor, livro e atividade gravados")
  void denunciaComentarioVisivel() throws Exception {
    UUID livro = massa.livroOficial("Torto arado");
    UUID atividade = massa.atividadeDeLeitura(autora, livro);
    UUID comentarista = massa.leitor("comentarista");
    UUID comentario = massa.comentario(atividade, comentarista, null, "Que livro chato");
    massa.segue(leitora, autora);

    HttpResponse<String> resposta =
        denunciar(leitora, corpo("comentario", comentario, "  Ofensivo com quem gostou.  "), chave());

    assertThat(resposta.statusCode()).isEqualTo(201);
    JsonNode denuncia = json.readTree(resposta.body());
    assertThat(denuncia.get("estado").asString()).isEqualTo("pendente");
    assertThat(denuncia.has("motivo")).isFalse();
    Map<String, Object> linha =
        jdbc.queryForMap("SELECT * FROM denuncia WHERE id = ?::uuid", denuncia.get("id").asString());
    assertThat(linha.get("motivo")).isEqualTo("Ofensivo com quem gostou.");
    assertThat(linha.get("alvo_autor_id")).isEqualTo(comentarista);
    assertThat(linha.get("alvo_livro_id")).isEqualTo(livro);
    assertThat(linha.get("atividade_id")).isEqualTo(atividade);
    assertThat(linha.get("atividade_autor_id")).isEqualTo(autora);
  }

  @Test
  @DisplayName("Comentário em atividade que o leitor não vê é 404, igual a inexistente")
  void comentarioInvisivelOuInexistente() throws Exception {
    UUID atividade = massa.atividadeDeLeitura(autora, massa.livroOficial("Livro"));
    UUID comentario = massa.comentario(atividade, autora, null, "Oi");

    assertThat(denunciar(leitora, corpo("comentario", comentario, "Spam"), chave()).statusCode())
        .isEqualTo(404);
    assertThat(
            denunciar(leitora, corpo("comentario", UUID.randomUUID(), "Spam"), chave()).statusCode())
        .isEqualTo(404);
    assertThat(massa.contar("SELECT count(*) FROM denuncia")).isZero();
  }

  @Test
  @DisplayName("Denunciar o próprio comentário é 422")
  void comentarioProprio() throws Exception {
    UUID atividade = massa.atividadeDeLeitura(autora, massa.livroOficial("Livro"));
    UUID comentario = massa.comentario(atividade, leitora, null, "Meu");
    massa.segue(leitora, autora);

    assertThat(denunciar(leitora, corpo("comentario", comentario, "Teste"), chave()).statusCode())
        .isEqualTo(422);
  }

  // ---------------------------------------------------------------- resenha de livro oficial

  @Test
  @DisplayName("Resenha de autora pública em livro oficial: qualquer leitor denuncia")
  void resenhaOficialDePerfilPublico() throws Exception {
    UUID livro = massa.livroOficial("Livro");
    UUID resenha = massa.resenha(autora, livro, "Conta o final.");
    UUID atividade = massa.atividadeDeResenha(autora, livro, resenha);

    HttpResponse<String> resposta =
        denunciar(leitora, corpo("resenha", resenha, "Conta o final sem aviso"), chave());

    assertThat(resposta.statusCode()).isEqualTo(201);
    Map<String, Object> linha = jdbc.queryForMap("SELECT * FROM denuncia");
    assertThat(linha.get("alvo_autor_id")).isEqualTo(autora);
    assertThat(linha.get("atividade_id")).isEqualTo(atividade);
  }

  @Test
  @DisplayName("Resenha de autora privada: 404 sem seguir, 201 com seguimento aceito")
  void resenhaOficialDePerfilPrivado() throws Exception {
    UUID privada = massa.leitorPrivado("privada");
    UUID resenha = massa.resenha(privada, massa.livroOficial("Livro"), "Texto");

    assertThat(denunciar(leitora, corpo("resenha", resenha, "Motivo"), chave()).statusCode())
        .isEqualTo(404);
    massa.segue(leitora, privada);
    assertThat(denunciar(leitora, corpo("resenha", resenha, "Motivo"), chave()).statusCode())
        .isEqualTo(201);
  }

  @Test
  @DisplayName("Resenha inexistente, de livro inativo ou de autora em exclusão é 404")
  void resenhaIndisponivel() throws Exception {
    UUID livroInativo = massa.livroOficial("Inativo");
    UUID deLivroInativo = massa.resenha(autora, livroInativo, "Texto");
    massa.desativarLivro(livroInativo);
    UUID emExclusao = massa.leitor("saindo");
    UUID deQuemSai = massa.resenha(emExclusao, massa.livroOficial("Outro"), "Texto");
    massa.emExclusao(emExclusao);

    for (UUID alvo : new UUID[] {UUID.randomUUID(), deLivroInativo, deQuemSai}) {
      assertThat(denunciar(leitora, corpo("resenha", alvo, "Motivo"), chave()).statusCode())
          .isEqualTo(404);
    }
  }

  @Test
  @DisplayName("A própria resenha é 422; leitor fora da VIEW de perfil é 403")
  void resenhaPropriaEDenuncianteForaDaView() throws Exception {
    UUID resenha = massa.resenha(autora, massa.livroOficial("Livro"), "Texto");

    assertThat(denunciar(autora, corpo("resenha", resenha, "Motivo"), chave()).statusCode())
        .isEqualTo(422);
    massa.emExclusao(leitora);
    assertThat(denunciar(leitora, corpo("resenha", resenha, "Motivo"), chave()).statusCode())
        .isEqualTo(403);
  }

  // ---------------------------------------------------------------- resenha de livro pessoal

  @Test
  @DisplayName("Livro pessoal pelo feed exige seguir, mesmo com perfil público")
  void livroPessoalPeloFeed() throws Exception {
    UUID livro = massa.livroPessoal(autora, "Meu diário");
    UUID resenha = massa.resenha(autora, livro, "Texto");
    UUID atividade = massa.atividadeDeResenha(autora, livro, resenha);

    assertThat(
            denunciar(leitora, comVia(corpo("resenha", resenha, "M"), "feed", atividade), chave())
                .statusCode())
        .isEqualTo(404);
    massa.segue(leitora, autora);
    assertThat(
            denunciar(leitora, comVia(corpo("resenha", resenha, "M"), "feed", atividade), chave())
                .statusCode())
        .isEqualTo(201);
  }

  @Test
  @DisplayName("Livro pessoal pela lista: perfil público basta; privada exige seguir")
  void livroPessoalPelaLista() throws Exception {
    UUID livro = massa.livroPessoal(autora, "Meu diário");
    UUID resenha = massa.resenha(autora, livro, "Texto");
    UUID lista = massa.lista(autora, livro);
    UUID privada = massa.leitorPrivado("privada");
    UUID livroDaPrivada = massa.livroPessoal(privada, "Outro diário");
    UUID resenhaDaPrivada = massa.resenha(privada, livroDaPrivada, "Texto");
    UUID listaDaPrivada = massa.lista(privada, livroDaPrivada);

    assertThat(
            denunciar(leitora, comVia(corpo("resenha", resenha, "M"), "lista", lista), chave())
                .statusCode())
        .isEqualTo(201);
    assertThat(
            denunciar(
                    leitora,
                    comVia(corpo("resenha", resenhaDaPrivada, "M"), "lista", listaDaPrivada),
                    chave())
                .statusCode())
        .isEqualTo(404);
  }

  @Test
  @DisplayName("Livro pessoal sem via, com via de outro livro ou de quem não é dona é 404")
  void livroPessoalComViaInvalida() throws Exception {
    UUID livro = massa.livroPessoal(autora, "Meu diário");
    UUID resenha = massa.resenha(autora, livro, "Texto");
    UUID outroLivro = massa.livroPessoal(autora, "Outro");
    UUID listaDeOutroLivro = massa.lista(autora, outroLivro);
    UUID terceira = massa.leitor("terceira");
    UUID listaDaTerceira = massa.lista(terceira, livro);
    // Resenha de quem não é dona do livro pessoal: RN-07 não deixaria, mas a regra recusa.
    UUID intrusa = massa.leitor("intrusa");
    UUID resenhaDaIntrusa = massa.resenha(intrusa, livro, "Texto");
    UUID listaDaAutora = massa.lista(autora, livro);

    assertThat(denunciar(leitora, corpo("resenha", resenha, "M"), chave()).statusCode())
        .isEqualTo(404);
    assertThat(
            denunciar(leitora, comVia(corpo("resenha", resenha, "M"), "lista", listaDeOutroLivro), chave())
                .statusCode())
        .isEqualTo(404);
    assertThat(
            denunciar(leitora, comVia(corpo("resenha", resenha, "M"), "lista", listaDaTerceira), chave())
                .statusCode())
        .isEqualTo(404);
    assertThat(
            denunciar(
                    leitora,
                    comVia(corpo("resenha", resenhaDaIntrusa, "M"), "lista", listaDaAutora),
                    chave())
                .statusCode())
        .isEqualTo(404);
  }

  // ---------------------------------------------------------------- repetição e validação

  @Test
  @DisplayName("Repetir a denúncia pendente devolve a existente com 200, sem outra linha")
  void denunciaRepetida() throws Exception {
    UUID resenha = massa.resenha(autora, massa.livroOficial("Livro"), "Texto");

    HttpResponse<String> primeira = denunciar(leitora, corpo("resenha", resenha, "Um"), chave());
    HttpResponse<String> segunda = denunciar(leitora, corpo("resenha", resenha, "Dois"), chave());

    assertThat(primeira.statusCode()).isEqualTo(201);
    assertThat(segunda.statusCode()).isEqualTo(200);
    assertThat(json.readTree(segunda.body()).get("id").asString())
        .isEqualTo(json.readTree(primeira.body()).get("id").asString());
    assertThat(massa.contar("SELECT count(*) FROM denuncia")).isEqualTo(1);
    assertThat(jdbc.queryForObject("SELECT motivo FROM denuncia", String.class)).isEqualTo("Um");
  }

  @Test
  @DisplayName("Mesma chave e mesmo corpo repetem a resposta; outra pessoa denuncia à parte")
  void replayEOutroDenunciante() throws Exception {
    UUID resenha = massa.resenha(autora, massa.livroOficial("Livro"), "Texto");
    String chave = chave();

    HttpResponse<String> primeira = denunciar(leitora, corpo("resenha", resenha, "Um"), chave);
    HttpResponse<String> replay = denunciar(leitora, corpo("resenha", resenha, "Um"), chave);
    HttpResponse<String> outra =
        denunciar(massa.leitor("outra"), corpo("resenha", resenha, "Um"), chave());

    assertThat(replay.statusCode()).isEqualTo(201);
    assertThat(replay.body()).isEqualTo(primeira.body());
    assertThat(outra.statusCode()).isEqualTo(201);
    assertThat(massa.contar("SELECT count(*) FROM denuncia")).isEqualTo(2);
  }

  @Test
  @DisplayName("Motivo vazio, com 501 caracteres, tipo inválido ou sem chave é 400")
  void validacao() throws Exception {
    UUID resenha = massa.resenha(autora, massa.livroOficial("Livro"), "Texto");
    String quinhentos = "😀".repeat(500);

    assertThat(denunciar(leitora, corpo("resenha", resenha, "   "), chave()).statusCode())
        .isEqualTo(400);
    assertThat(denunciar(leitora, corpo("resenha", resenha, quinhentos + "a"), chave()).statusCode())
        .isEqualTo(400);
    assertThat(denunciar(leitora, corpo("lista", resenha, "M"), chave()).statusCode())
        .isEqualTo(400);
    assertThat(denunciar(leitora, corpo("resenha", resenha, "M"), null).statusCode())
        .isEqualTo(400);
    assertThat(denunciar(leitora, corpo("resenha", resenha, quinhentos), chave()).statusCode())
        .isEqualTo(201);
  }

  @Test
  @DisplayName("Passar de dez denúncias por minuto é 429 (RNF-SEC-18)")
  void limitePorUsuario() throws Exception {
    UUID livro = massa.livroOficial("Livro");
    UUID apressada = massa.leitor("apressada");
    for (int i = 0; i < LimitesDeInteracao.DENUNCIAS_POR_MINUTO; i++) {
      UUID resenha = massa.resenha(massa.leitor("autor" + i), livro, "Texto");
      assertThat(denunciar(apressada, corpo("resenha", resenha, "M"), chave()).statusCode())
          .isEqualTo(201);
    }
    UUID mais = massa.resenha(massa.leitor("mais"), livro, "Texto");

    assertThat(denunciar(apressada, corpo("resenha", mais, "M"), chave()).statusCode())
        .isEqualTo(429);
  }

  // ---------------------------------------------------------------- apoio

  private static String chave() {
    return UUID.randomUUID().toString();
  }

  private static Map<String, Object> corpo(String tipo, UUID alvo, String motivo) {
    Map<String, Object> corpo = new LinkedHashMap<>();
    corpo.put("alvoTipo", tipo);
    corpo.put("alvoId", alvo.toString());
    corpo.put("motivo", motivo);
    return corpo;
  }

  private static Map<String, Object> comVia(Map<String, Object> corpo, String via, UUID referencia) {
    corpo.put("via", via);
    corpo.put("referenciaId", referencia.toString());
    return corpo;
  }

  private HttpResponse<String> denunciar(UUID quem, Map<String, Object> corpo, String chave)
      throws Exception {
    HttpRequest.Builder requisicao =
        HttpRequest.newBuilder(uri("/denuncias"))
            .header("Authorization", "Bearer " + token(quem))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(corpo)));
    if (chave != null) {
      requisicao.header("Idempotency-Key", chave);
    }
    return enviar(requisicao.build());
  }
}
