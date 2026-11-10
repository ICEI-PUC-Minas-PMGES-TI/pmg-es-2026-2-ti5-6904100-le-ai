package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** F-REC-ALG: sugestões em tempo de consulta, descarte de sugestão e descarte em lote da P2P. */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class SugestaoControllerIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private JdbcTemplate jdbc;
  @Autowired private ObjectMapper json;
  private MassaDeSugestao massa;

  @BeforeEach
  void preparaMassa() {
    massa = new MassaDeSugestao(jdbc);
    massa.preparar();
  }

  @Test
  @DisplayName("Quem você segue leu: só seguido aceito, com nota alta, fora estante, pessoal e opt-out")
  void seguidosRespeitamPisosEExclusoes() throws Exception {
    UUID ana = massa.leitor("ana");
    UUID bia = massa.leitor("bia");
    UUID caio = massa.leitor("caio");
    UUID eva = massa.leitor("eva");
    UUID fabi = massa.leitor("fabi");
    UUID gui = massa.leitor("gui");
    massa.segue(ana, bia);
    massa.segue(ana, caio);
    massa.segue(ana, fabi);
    massa.segue(ana, gui);
    massa.optOut(fabi);
    massa.base().suspender(gui);

    UUID doisLeram = massa.livro("Mulheres Empilhadas");
    massa.leu(bia, doisLeram, "5.0");
    massa.leu(caio, doisLeram, "4.0");
    UUID umLeu = massa.livro("Solitária");
    massa.leu(bia, umLeu, "4.5");
    UUID notaBaixa = massa.livro("Nota baixa");
    massa.leu(bia, notaBaixa, "2.0");
    UUID semNota = massa.livro("Sem nota");
    massa.leu(caio, semNota, null);
    UUID soQueroLer = massa.livro("Só quero ler");
    massa.naEstante(bia, soQueroLer, "quero_ler");
    UUID deNaoSeguido = massa.livro("De não seguido");
    massa.leu(eva, deNaoSeguido, "5.0");
    UUID jaTenho = massa.livro("Já tenho");
    massa.leu(bia, jaTenho, "5.0");
    massa.naEstante(ana, jaTenho, "abandonado");
    UUID deOptOut = massa.livro("De quem pediu opt-out");
    massa.leu(fabi, deOptOut, "5.0");
    UUID deSuspenso = massa.livro("De conta suspensa");
    massa.leu(gui, deSuspenso, "5.0");
    UUID pessoal = massa.livroPessoal(bia, "Pessoal da Bia");
    massa.leu(bia, pessoal, "5.0");
    UUID inativo = massa.livro("Inativo");
    massa.leu(bia, inativo, "5.0");
    massa.inativar(inativo);

    HttpResponse<String> resposta = sugestoes(ana, "");

    assertThat(resposta.statusCode()).isEqualTo(200);
    JsonNode seguidos = json.readTree(resposta.body()).get("seguidos");
    assertThat(titulosEMotivos(seguidos))
        .containsExactly(
            "Mulheres Empilhadas|SEGUIDOS|2 pessoas que você segue leram",
            "Solitária|SEGUIDOS|1 pessoa que você segue leu");
    assertThat(seguidos.get("proximoOffset").isNull()).isTrue();
    JsonNode livro = seguidos.get("itens").get(0).get("livro");
    assertThat(livro.get("id").asString()).isEqualTo(doisLeram.toString());
    assertThat(livro.get("tipo").asString()).isEqualTo("OFICIAL");
    // RN-08: o motivo diz quantos, nunca quem.
    assertThat(resposta.body()).doesNotContain("bia", "caio", bia.toString(), caio.toString());
  }

  @Test
  @DisplayName("Do seu gosto: série, autor e assunto frequente da estante, com o motivo do critério")
  void gostoTrazMotivoDoCriterio() throws Exception {
    UUID ana = massa.leitor("ana");
    UUID continente = massa.livro("O Continente");
    UUID poncia = massa.livro("Ponciá Vicêncio");
    UUID abandonado = massa.livro("Abandonado");
    massa.naEstante(ana, continente, "lido");
    massa.naEstante(ana, poncia, "lendo");
    massa.naEstante(ana, abandonado, "abandonado");

    UUID arquipelago = massa.livro("O Arquipélago");
    UUID insubmissas = massa.livro("Insubmissas Lágrimas de Mulheres");
    UUID ursula = massa.livro("Úrsula");
    UUID soConto = massa.livro("Só conto");
    UUID soTerror = massa.livro("Só terror");
    UUID pessoal = massa.livroPessoal(massa.leitor("bia"), "Pessoal de romance");

    massa.serie("O Tempo e o Vento", continente, arquipelago);
    massa.autor("Erico Verissimo", continente, arquipelago);
    massa.autor("Conceição Evaristo", poncia, insubmissas);
    massa.assunto("Romance", continente, poncia, ursula, insubmissas, pessoal);
    // Um livro só na estante: abaixo do piso de dois por assunto.
    massa.assunto("Conto", poncia, soConto);
    // O abandonado não entra no gosto.
    massa.assunto("Terror", abandonado, soTerror);

    JsonNode gosto = json.readTree(sugestoes(ana, "").body()).get("gosto");

    // Série vence autor no mesmo livro; autor vence assunto.
    assertThat(titulosEMotivos(gosto))
        .containsExactly(
            "O Arquipélago|SERIE|Continuação de O Tempo e o Vento",
            "Insubmissas Lágrimas de Mulheres|AUTOR|Do mesmo autor de Ponciá Vicêncio",
            "Úrsula|ASSUNTO|Você lê muito Romance");
    assertThat(gosto.get("itens").get(0).get("livro").get("autor").asString())
        .isEqualTo("Erico Verissimo");
    assertThat(gosto.get("itens").get(0).get("livro").get("link").get("via").asString())
        .isEqualTo("catalogo");
  }

  @Test
  @DisplayName("Seção sem sinal vem vazia e a outra continua (RF-REC-14)")
  void secaoSemSinalVemVazia() throws Exception {
    UUID ana = massa.leitor("ana");

    JsonNode corpo = json.readTree(sugestoes(ana, "").body());

    assertThat(corpo.get("seguidos").get("itens")).isEmpty();
    assertThat(corpo.get("gosto").get("itens")).isEmpty();
  }

  @Test
  @DisplayName("Descartar tira a sugestão das duas seções, só do próprio leitor, e repetir não é erro")
  void descarteNaoReaparece() throws Exception {
    UUID ana = massa.leitor("ana");
    UUID bia = massa.leitor("bia");
    UUID dan = massa.leitor("dan");
    massa.segue(ana, bia);
    massa.segue(dan, bia);
    UUID meu = massa.livro("Da estante");
    UUID outroMeu = massa.livro("Outro da estante");
    massa.naEstante(ana, meu, "lido");
    massa.naEstante(ana, outroMeu, "lido");
    UUID sugerido = massa.livro("Sugerido");
    massa.leu(bia, sugerido, "5.0");
    massa.assunto("Romance", meu, outroMeu, sugerido);

    JsonNode antes = json.readTree(sugestoes(ana, "").body());
    assertThat(titulos(antes.get("seguidos"))).containsExactly("Sugerido");
    assertThat(titulos(antes.get("gosto"))).containsExactly("Sugerido");

    assertThat(descartar(ana, sugerido).statusCode()).isEqualTo(204);
    assertThat(descartar(ana, sugerido).statusCode()).isEqualTo(204);

    JsonNode depois = json.readTree(sugestoes(ana, "").body());
    assertThat(depois.get("seguidos").get("itens")).isEmpty();
    assertThat(depois.get("gosto").get("itens")).isEmpty();
    assertThat(massa.contar("SELECT count(*) FROM sugestao_descartada")).isEqualTo(1L);
    // O descarte é de quem descartou.
    assertThat(titulos(json.readTree(sugestoes(dan, "").body()).get("seguidos")))
        .containsExactly("Sugerido");
  }

  @Test
  @DisplayName("Descartar livro pessoal ou inexistente responde 404 e não grava nada")
  void descarteDeLivroForaDoCatalogo() throws Exception {
    UUID ana = massa.leitor("ana");
    UUID pessoal = massa.livroPessoal(massa.leitor("bia"), "Pessoal");

    assertThat(descartar(ana, pessoal).statusCode()).isEqualTo(404);
    assertThat(descartar(ana, UUID.randomUUID()).statusCode()).isEqualTo(404);
    assertThat(massa.contar("SELECT count(*) FROM sugestao_descartada")).isZero();
  }

  @Test
  @DisplayName("A seção pagina por offset, com o tamanho e o teto do servidor")
  void paginacaoDentroDaSecao() throws Exception {
    UUID ana = massa.leitor("ana");
    UUID um = massa.livro("Da estante 1");
    UUID dois = massa.livro("Da estante 2");
    massa.naEstante(ana, um, "lido");
    massa.naEstante(ana, dois, "lido");
    List<UUID> romances = new ArrayList<>(List.of(um, dois));
    for (int i = 0; i < 6; i++) {
      romances.add(massa.livro("Romance " + i));
    }
    massa.assunto("Romance", romances.toArray(UUID[]::new));

    JsonNode primeira = json.readTree(sugestoes(ana, "").body()).get("gosto");
    assertThat(primeira.get("itens")).hasSize(4);
    assertThat(primeira.get("proximoOffset").asInt()).isEqualTo(4);

    JsonNode corpo = json.readTree(sugestoes(ana, "?secao=gosto&offset=4").body());
    JsonNode segunda = corpo.get("gosto");
    assertThat(corpo.get("seguidos").isNull()).isTrue();
    assertThat(segunda.get("itens")).hasSize(2);
    assertThat(segunda.get("proximoOffset").isNull()).isTrue();
    List<String> todos = new ArrayList<>(titulos(primeira));
    todos.addAll(titulos(segunda));
    assertThat(todos)
        .containsExactlyInAnyOrder(
            "Romance 0", "Romance 1", "Romance 2", "Romance 3", "Romance 4", "Romance 5");

    // Além do teto da seção não há nada, e não é erro.
    assertThat(json.readTree(sugestoes(ana, "?secao=gosto&offset=500").body()).get("gosto").get("itens"))
        .isEmpty();
    assertThat(sugestoes(ana, "?offset=4").statusCode()).isEqualTo(400);
    assertThat(sugestoes(ana, "?secao=outra").statusCode()).isEqualTo(400);
    assertThat(sugestoes(ana, "?secao=gosto&offset=-1").statusCode()).isEqualTo(400);
  }

  @Test
  @DisplayName("Descarte em lote remove só as recomendações daquele livro do próprio destinatário")
  void descarteEmLote() throws Exception {
    UUID ana = massa.leitor("ana");
    UUID bia = massa.base().mutuoDe(ana, "bia");
    UUID caio = massa.base().mutuoDe(ana, "caio");
    UUID davi = massa.base().mutuoDe(ana, "davi");
    UUID rio = massa.livro("Tudo É Rio");
    UUID outro = massa.livro("Um Defeito de Cor");
    massa.base().recomendacao(bia, ana, rio, 0);
    massa.base().recomendacao(caio, ana, rio, 1);
    massa.base().recomendacao(davi, ana, rio, 2);
    massa.base().recomendacao(bia, ana, outro, 0);
    massa.base().recomendacao(ana, bia, rio, 0);

    assertThat(restantes(ana, rio)).isEqualTo(3L);

    // Lote de outro leitor não toca nas recomendações da Ana.
    assertThat(removidas(descartarLote(caio, rio, chave()))).isZero();
    assertThat(restantes(ana, rio)).isEqualTo(3L);

    String chave = chave();
    HttpResponse<String> resposta = descartarLote(ana, rio, chave);
    assertThat(resposta.statusCode()).isEqualTo(200);
    assertThat(removidas(resposta)).isEqualTo(3L);
    // Reenvio da mesma operação devolve a mesma contagem; operação nova encontra o lote vazio.
    assertThat(removidas(descartarLote(ana, rio, chave))).isEqualTo(3L);
    assertThat(removidas(descartarLote(ana, rio, chave()))).isZero();

    assertThat(restantes(ana, rio)).isZero();
    assertThat(restantes(ana, outro)).isEqualTo(1L);
    assertThat(restantes(bia, rio)).isEqualTo(1L);
    // RN-22.11: nada é publicado para os remetentes.
    assertThat(massa.contar("SELECT count(*) FROM outbox_social")).isZero();
  }

  @Test
  @DisplayName("Sem token, as rotas respondem 401; lote sem chave ou sem livro responde 400")
  void exigeAutenticacaoEEntradaValida() throws Exception {
    UUID ana = massa.leitor("ana");

    assertThat(
            enviar(HttpRequest.newBuilder(uri("/recomendacoes/sugestoes")).GET().build())
                .statusCode())
        .isEqualTo(401);
    assertThat(
            enviar(
                    HttpRequest.newBuilder(
                            uri("/recomendacoes/sugestoes/" + UUID.randomUUID() + "/descartar"))
                        .POST(HttpRequest.BodyPublishers.noBody())
                        .build())
                .statusCode())
        .isEqualTo(401);
    assertThat(descartarLote(ana, UUID.randomUUID(), null).statusCode()).isEqualTo(400);
    assertThat(
            enviar(
                    HttpRequest.newBuilder(uri("/recomendacoes/descartar-lote"))
                        .header("Authorization", "Bearer " + token(ana))
                        .header("Idempotency-Key", chave())
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString("{}"))
                        .build())
                .statusCode())
        .isEqualTo(400);
  }

  private static List<String> titulos(JsonNode secao) {
    List<String> titulos = new ArrayList<>();
    secao.get("itens").forEach(item -> titulos.add(item.get("livro").get("titulo").asString()));
    return titulos;
  }

  private static List<String> titulosEMotivos(JsonNode secao) {
    List<String> linhas = new ArrayList<>();
    secao
        .get("itens")
        .forEach(
            item ->
                linhas.add(
                    item.get("livro").get("titulo").asString()
                        + "|"
                        + item.get("motivo").get("tipo").asString()
                        + "|"
                        + item.get("motivo").get("texto").asString()));
    return linhas;
  }

  private static String chave() {
    return UUID.randomUUID().toString();
  }

  private long removidas(HttpResponse<String> resposta) {
    return json.readTree(resposta.body()).get("removidas").asLong();
  }

  private long restantes(UUID leitor, UUID livro) throws Exception {
    HttpResponse<String> resposta =
        enviar(
            HttpRequest.newBuilder(uri("/recomendacoes/recebidas/restantes?livroId=" + livro))
                .header("Authorization", "Bearer " + token(leitor))
                .GET()
                .build());
    assertThat(resposta.statusCode()).isEqualTo(200);
    return json.readTree(resposta.body()).get("restantes").asLong();
  }

  private HttpResponse<String> sugestoes(UUID leitor, String consulta) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri("/recomendacoes/sugestoes" + consulta))
            .header("Authorization", "Bearer " + token(leitor))
            .GET()
            .build());
  }

  private HttpResponse<String> descartar(UUID leitor, UUID livro) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri("/recomendacoes/sugestoes/" + livro + "/descartar"))
            .header("Authorization", "Bearer " + token(leitor))
            .POST(HttpRequest.BodyPublishers.noBody())
            .build());
  }

  private HttpResponse<String> descartarLote(UUID leitor, UUID livro, String chave)
      throws Exception {
    HttpRequest.Builder requisicao =
        HttpRequest.newBuilder(uri("/recomendacoes/descartar-lote"))
            .header("Authorization", "Bearer " + token(leitor))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"livroId\":\"" + livro + "\"}"));
    if (chave != null) {
      requisicao.header("Idempotency-Key", chave);
    }
    return enviar(requisicao.build());
  }
}
