package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.common.LimitesDeInteracao;
import br.com.leai.social.recomendacao.service.ServicoDeRecomendacao;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * {@code RecomendacaoController} contra Postgres real, HTTP de ponta a ponta (F-REC-P2P): regras
 * de envio de RN-22, idempotência, rate limiting, recebidas paginadas com expiração e descarte
 * exclusivo do destinatário. Recria o mínimo de {@code identidade}, {@code acervo} e {@code
 * leitura} que as VIEWs consumidas exigem, como {@link InteracaoControllerIntegracaoTest}.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class RecomendacaoControllerIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private JdbcTemplate jdbc;
  @Autowired private ObjectMapper json;

  @BeforeEach
  void preparaSchemaCrossServico() {
    jdbc.execute("CREATE SCHEMA IF NOT EXISTS identidade");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS identidade.usuario (
          id uuid PRIMARY KEY,
          suspenso boolean NOT NULL DEFAULT false,
          exclusao_solicitada_em timestamptz
        )
        """);
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS username text");
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS nome_exibicao text");
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS avatar_url text");
    jdbc.execute(
        "ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS privacidade text NOT NULL DEFAULT 'publico'");
    jdbc.execute(
        "ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS opt_out_recomendacao boolean NOT NULL DEFAULT false");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS identidade.seguidor (
          seguidor_id uuid NOT NULL,
          seguido_id uuid NOT NULL,
          PRIMARY KEY (seguidor_id, seguido_id)
        )
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW identidade.v_seguimento_aceito_v1 AS
        SELECT s.seguidor_id, s.seguido_id
          FROM identidade.seguidor s
          JOIN identidade.usuario u_seguidor ON u_seguidor.id = s.seguidor_id
          JOIN identidade.usuario u_seguido ON u_seguido.id = s.seguido_id
         WHERE u_seguidor.suspenso = false AND u_seguidor.exclusao_solicitada_em IS NULL
           AND u_seguido.suspenso = false AND u_seguido.exclusao_solicitada_em IS NULL
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW identidade.v_perfil_referencia_v1 AS
        SELECT id, username, nome_exibicao, avatar_url, privacidade, opt_out_recomendacao
          FROM identidade.usuario
         WHERE suspenso = false AND exclusao_solicitada_em IS NULL
        """);

    jdbc.execute("CREATE SCHEMA IF NOT EXISTS acervo");
    jdbc.execute("CREATE TABLE IF NOT EXISTS acervo.autor (id uuid PRIMARY KEY, nome text NOT NULL)");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS acervo.livro (
          id uuid PRIMARY KEY,
          tipo text NOT NULL,
          dono_id uuid,
          paginas integer,
          titulo text NOT NULL,
          autor_informado text,
          capa_url_propria text,
          capa_url_externa text,
          ativo boolean NOT NULL DEFAULT true
        )
        """);
    jdbc.execute(
        "CREATE TABLE IF NOT EXISTS acervo.livro_autor (livro_id uuid NOT NULL, autor_id uuid NOT NULL)");
    // Mesma definição, coluna a coluna, das outras classes de teste: CREATE OR REPLACE VIEW não
    // remove colunas e o contexto é compartilhado.
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW acervo.v_livro_referencia_v1 AS (
          SELECT
            l.id AS livro_id,
            l.tipo,
            l.dono_id,
            l.paginas,
            l.titulo,
            CASE
              WHEN l.tipo = 'pessoal' THEN l.autor_informado
              ELSE (
                SELECT string_agg(a.nome, ', ' ORDER BY a.nome)
                FROM acervo.livro_autor la
                JOIN acervo.autor a ON a.id = la.autor_id
                WHERE la.livro_id = l.id
              )
            END AS autor_exibicao,
            coalesce(l.capa_url_propria, l.capa_url_externa) AS capa_resolvida,
            l.ativo
          FROM acervo.livro l
        )
        """);

    jdbc.execute("CREATE SCHEMA IF NOT EXISTS leitura");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS leitura.estante (
          usuario_id uuid NOT NULL,
          livro_id uuid NOT NULL,
          status text NOT NULL,
          vezes_lido integer NOT NULL DEFAULT 0,
          PRIMARY KEY (usuario_id, livro_id)
        )
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW leitura.v_estante_publica_v1 AS (
          SELECT usuario_id, livro_id, status, vezes_lido FROM leitura.estante
        )
        """);

    jdbc.execute(
        "TRUNCATE identidade.seguidor, identidade.usuario, acervo.livro, leitura.estante CASCADE");
    jdbc.execute("TRUNCATE recomendacao, outbox_social");
  }

  @Test
  @DisplayName("Envio a vários cria só para os elegíveis e diz o motivo de cada bloqueio, na ordem")
  void envioMultiploComBloqueiosPorDestinatario() throws Exception {
    UUID ana = leitor("ana");
    UUID bia = mutuoDe(ana, "bia");
    UUID caio = mutuoDe(ana, "caio");
    UUID davi = leitor("davi");
    jdbc.update("INSERT INTO identidade.seguidor VALUES (?, ?)", ana, davi);
    UUID edu = mutuoDe(ana, "edu");
    UUID fabi = mutuoDe(ana, "fabi");
    UUID livro = livroOficial("Torto arado");
    naEstante(caio, livro);
    for (int i = 0; i < ServicoDeRecomendacao.LIMITE_ATIVAS_POR_PAR; i++) {
      recomendacaoNoBanco(ana, edu, livroOficial("Livro " + i), 0);
    }
    recomendacaoNoBanco(ana, fabi, livro, 0);

    HttpResponse<String> resposta =
        recomendar(ana, livro, List.of(bia, caio, davi, edu, fabi), "  Leia, é lindo.  ", chave());

    assertThat(resposta.statusCode()).isEqualTo(200);
    JsonNode corpo = json.readTree(resposta.body());
    assertThat(corpo.get("totalCriadas").asInt()).isEqualTo(1);
    List<String> situacoes = new ArrayList<>();
    corpo.get("resultados")
        .forEach(
            r ->
                situacoes.add(
                    r.get("destinatarioId").asString()
                        + ":"
                        + r.get("status").asString()
                        + ":"
                        + (r.hasNonNull("motivo") ? r.get("motivo").asString() : "")));
    assertThat(situacoes)
        .containsExactly(
            bia + ":CRIADA:",
            caio + ":BLOQUEADA:JA_TEM_LIVRO",
            davi + ":BLOQUEADA:SEM_MUTUO",
            edu + ":BLOQUEADA:LIMITE_ATINGIDO",
            fabi + ":BLOQUEADA:JA_RECOMENDADO");

    String recomendacaoId = corpo.get("resultados").get(0).get("recomendacaoId").asString();
    JsonNode evento =
        json.readTree(
            jdbc.queryForObject(
                "SELECT o.payload::text FROM outbox_social o"
                    + " JOIN recomendacao r ON r.event_id = o.event_id"
                    + " WHERE r.id = ?::uuid AND o.tipo = 'recomendacao.recebida'"
                    + " AND o.chave_negocio = 'recomendacao:' || r.id",
                String.class,
                recomendacaoId));
    assertThat(evento.get("destinatarioId").asString()).isEqualTo(bia.toString());
    assertThat(evento.get("mensagem").asString()).isEqualTo("Leia, é lindo.");
    assertThat(evento.get("autorAcao").get("username").asString()).isEqualTo("ana");
    assertThat(evento.get("livro").get("tipo").asString()).isEqualTo("oficial");
    assertThat(contar("SELECT count(*) FROM outbox_social")).isEqualTo(1L);
  }

  @Test
  @DisplayName("Livro pessoal responde 422 e livro inexistente 404, sem gravar nada")
  void livroPessoalOuInexistenteRejeitaOEnvioInteiro() throws Exception {
    UUID ana = leitor("ana");
    UUID bia = mutuoDe(ana, "bia");
    UUID pessoal = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO acervo.livro (id, tipo, dono_id, titulo) VALUES (?, 'pessoal', ?, 'Diário')",
        pessoal,
        ana);

    HttpResponse<String> doPessoal = recomendar(ana, pessoal, List.of(bia), null, chave());
    HttpResponse<String> inexistente = recomendar(ana, UUID.randomUUID(), List.of(bia), null, chave());
    HttpResponse<String> candidatos = candidatos(ana, pessoal);

    assertThat(doPessoal.statusCode()).isEqualTo(422);
    assertThat(doPessoal.body()).contains("\"codigo\":\"ENTIDADE_NAO_PROCESSAVEL\"");
    assertThat(inexistente.statusCode()).isEqualTo(404);
    assertThat(candidatos.statusCode()).isEqualTo(422);
    assertThat(contar("SELECT count(*) FROM recomendacao")).isZero();
    assertThat(contar("SELECT count(*) FROM outbox_social")).isZero();
  }

  @Test
  @DisplayName("Mesma Idempotency-Key reproduz a resposta sem duplicar recomendação nem evento")
  void mesmaChaveNaoDuplica() throws Exception {
    UUID ana = leitor("ana");
    UUID bia = mutuoDe(ana, "bia");
    UUID livro = livroOficial("Torto arado");
    String chave = chave();

    HttpResponse<String> primeira = recomendar(ana, livro, List.of(bia), null, chave);
    HttpResponse<String> replay = recomendar(ana, livro, List.of(bia), null, chave);
    HttpResponse<String> outroPayload = recomendar(ana, livro, List.of(bia), "Oi", chave);

    assertThat(replay.statusCode()).isEqualTo(200);
    assertThat(replay.body()).isEqualTo(primeira.body());
    assertThat(outroPayload.statusCode()).isEqualTo(409);
    assertThat(contar("SELECT count(*) FROM recomendacao")).isEqualTo(1L);
    assertThat(contar("SELECT count(*) FROM outbox_social")).isEqualTo(1L);
  }

  @Test
  @DisplayName("Corpo inválido responde 400: mensagem longa, leitor repetido e lote acima de 20")
  void corpoInvalido() throws Exception {
    UUID ana = leitor("ana");
    UUID bia = mutuoDe(ana, "bia");
    UUID livro = livroOficial("Torto arado");
    List<UUID> vinteEUm = new ArrayList<>();
    for (int i = 0; i < 21; i++) {
      vinteEUm.add(UUID.randomUUID());
    }

    assertThat(recomendar(ana, livro, List.of(bia), "a".repeat(281), chave()).statusCode())
        .isEqualTo(400);
    assertThat(recomendar(ana, livro, List.of(bia, bia), null, chave()).statusCode()).isEqualTo(400);
    assertThat(recomendar(ana, livro, vinteEUm, null, chave()).statusCode()).isEqualTo(400);
    assertThat(recomendar(ana, livro, List.of(), null, chave()).statusCode()).isEqualTo(400);
    assertThat(recomendar(ana, livro, List.of(bia), "a".repeat(280), chave()).statusCode())
        .isEqualTo(200);
  }

  @Test
  @DisplayName("Envios acima do limite por minuto respondem 429 (RNF-SEC-18)")
  void rateLimitingDoEnvio() throws Exception {
    UUID ana = leitor("ana");
    UUID livro = livroOficial("Torto arado");

    for (int i = 0; i < LimitesDeInteracao.RECOMENDACOES_POR_MINUTO; i++) {
      assertThat(recomendar(ana, livro, List.of(UUID.randomUUID()), null, chave()).statusCode())
          .isEqualTo(200);
    }
    HttpResponse<String> excedente = recomendar(ana, livro, List.of(UUID.randomUUID()), null, chave());

    assertThat(excedente.statusCode()).isEqualTo(429);
    assertThat(excedente.body()).contains("Muitas recomendações em pouco tempo");
  }

  @Test
  @DisplayName("Recebidas: paginadas, mais recentes primeiro, sem expiradas nem remetente suspenso")
  void recebidasPaginadasSemExpiradas() throws Exception {
    UUID bia = leitor("bia");
    UUID ana = mutuoDe(bia, "ana");
    UUID caio = mutuoDe(bia, "caio");
    UUID suspenso = mutuoDe(bia, "suspenso");
    UUID livro = livroOficial("Torto arado");
    UUID antiga = recomendacaoNoBanco(ana, bia, livroOficial("Antigo"), 3);
    UUID recente = recomendacaoNoBanco(ana, bia, livro, 1);
    UUID deOutro = recomendacaoNoBanco(caio, bia, livro, 2);
    recomendacaoNoBanco(ana, bia, livroOficial("Expirado"), 91);
    recomendacaoNoBanco(suspenso, bia, livroOficial("Do suspenso"), 1);
    jdbc.update("UPDATE identidade.usuario SET suspenso = true WHERE id = ?", suspenso);
    // RN-22.15: o mútuo desfeito depois do envio não remove a recomendação.
    jdbc.update("DELETE FROM identidade.seguidor WHERE seguidor_id = ? AND seguido_id = ?", bia, ana);

    JsonNode primeira = json.readTree(recebidas(bia, 0, 2).body());
    JsonNode segunda = json.readTree(recebidas(bia, 1, 2).body());

    assertThat(primeira.get("totalItens").asLong()).isEqualTo(3L);
    assertThat(primeira.get("totalPaginas").asInt()).isEqualTo(2);
    assertThat(primeira.get("ultima").asBoolean()).isFalse();
    assertThat(ids(primeira)).containsExactly(recente.toString(), deOutro.toString());
    assertThat(ids(segunda)).containsExactly(antiga.toString());
    assertThat(segunda.get("ultima").asBoolean()).isTrue();
    JsonNode item = primeira.get("itens").get(0);
    assertThat(item.get("remetente").get("username").asString()).isEqualTo("ana");
    assertThat(item.get("livro").get("titulo").asString()).isEqualTo("Torto arado");
    assertThat(item.get("livro").get("link").get("via").asString()).isEqualTo("catalogo");
    assertThat(item.get("mensagem").asString()).isEqualTo("Mensagem de teste");
    assertThat(recebidas(bia, 0, 51).statusCode()).isEqualTo(400);
  }

  @Test
  @DisplayName("Só o destinatário descarta; remetente e terceiro recebem 404 e nada muda")
  void descarteExclusivoDoDestinatario() throws Exception {
    UUID ana = leitor("ana");
    UUID bia = mutuoDe(ana, "bia");
    UUID intruso = leitor("intruso");
    UUID recomendacao = recomendacaoNoBanco(ana, bia, livroOficial("Torto arado"), 0);
    String chave = chave();

    assertThat(descartar(ana, recomendacao, chave()).statusCode()).isEqualTo(404);
    assertThat(descartar(intruso, recomendacao, chave()).statusCode()).isEqualTo(404);
    assertThat(contar("SELECT count(*) FROM recomendacao")).isEqualTo(1L);

    assertThat(descartar(bia, recomendacao, chave).statusCode()).isEqualTo(204);
    assertThat(descartar(bia, recomendacao, chave).statusCode()).isEqualTo(204);
    assertThat(descartar(bia, recomendacao, chave()).statusCode()).isEqualTo(404);
    assertThat(contar("SELECT count(*) FROM recomendacao")).isZero();
    assertThat(contar("SELECT count(*) FROM outbox_social")).isZero();
  }

  @Test
  @DisplayName("Candidatos: só mútuos, com quem já tem o livro e quem atingiu o limite")
  void candidatosComSituacaoParaOLivro() throws Exception {
    UUID ana = leitor("ana");
    mutuoDe(ana, "bia");
    UUID caio = mutuoDe(ana, "caio");
    UUID edu = mutuoDe(ana, "edu");
    UUID soSegue = leitor("so_segue");
    jdbc.update("INSERT INTO identidade.seguidor VALUES (?, ?)", ana, soSegue);
    UUID livro = livroOficial("Torto arado");
    naEstante(caio, livro);
    for (int i = 0; i < ServicoDeRecomendacao.LIMITE_ATIVAS_POR_PAR; i++) {
      recomendacaoNoBanco(ana, edu, livroOficial("Livro " + i), 0);
    }

    JsonNode corpo = json.readTree(candidatos(ana, livro).body());

    List<String> situacoes = new ArrayList<>();
    corpo.get("itens")
        .forEach(
            c ->
                situacoes.add(
                    c.get("leitor").get("username").asString()
                        + ":"
                        + c.get("jaTemLivro").asBoolean()
                        + ":"
                        + c.get("limiteAtingido").asBoolean()));
    assertThat(situacoes).containsExactly("bia:false:false", "caio:true:false", "edu:false:true");
  }

  private UUID leitor(String username) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO identidade.usuario (id, username, nome_exibicao) VALUES (?, ?, ?)",
        id,
        username,
        "Leitor " + username);
    return id;
  }

  private UUID mutuoDe(UUID outro, String username) {
    UUID id = leitor(username);
    jdbc.update("INSERT INTO identidade.seguidor VALUES (?, ?), (?, ?)", outro, id, id, outro);
    return id;
  }

  private UUID livroOficial(String titulo) {
    UUID id = UUID.randomUUID();
    jdbc.update("INSERT INTO acervo.livro (id, tipo, titulo) VALUES (?, 'oficial', ?)", id, titulo);
    return id;
  }

  private void naEstante(UUID usuario, UUID livro) {
    jdbc.update(
        "INSERT INTO leitura.estante (usuario_id, livro_id, status) VALUES (?, ?, 'quero_ler')",
        usuario,
        livro);
  }

  private UUID recomendacaoNoBanco(UUID remetente, UUID destinatario, UUID livro, int diasAtras) {
    return jdbc.queryForObject(
        "INSERT INTO recomendacao"
            + " (remetente_id, destinatario_id, livro_id, mensagem, criado_em, expira_em)"
            + " VALUES (?, ?, ?, 'Mensagem de teste', now() - make_interval(days => ?),"
            + "         now() - make_interval(days => ?) + interval '90 days')"
            + " RETURNING id",
        UUID.class,
        remetente,
        destinatario,
        livro,
        diasAtras,
        diasAtras);
  }

  private long contar(String sql) {
    return jdbc.queryForObject(sql, Long.class);
  }

  private static List<String> ids(JsonNode pagina) {
    List<String> ids = new ArrayList<>();
    pagina.get("itens").forEach(item -> ids.add(item.get("id").asString()));
    return ids;
  }

  private static String chave() {
    return UUID.randomUUID().toString();
  }

  private HttpResponse<String> recomendar(
      UUID remetente, UUID livro, List<UUID> destinatarios, String mensagem, String chave)
      throws Exception {
    String lista =
        destinatarios.stream().map(id -> "\"" + id + "\"").collect(Collectors.joining(","));
    String corpo =
        "{\"livroId\":\"" + livro + "\",\"destinatarios\":[" + lista + "]"
            + (mensagem == null ? "" : ",\"mensagem\":\"" + mensagem + "\"")
            + "}";
    return enviar(
        HttpRequest.newBuilder(uri("/recomendacoes"))
            .header("Authorization", "Bearer " + token(remetente))
            .header("Idempotency-Key", chave)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(corpo))
            .build());
  }

  private HttpResponse<String> candidatos(UUID leitor, UUID livro) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri("/recomendacoes/candidatos?livroId=" + livro))
            .header("Authorization", "Bearer " + token(leitor))
            .GET()
            .build());
  }

  private HttpResponse<String> recebidas(UUID leitor, int page, int size) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri("/recomendacoes/recebidas?page=" + page + "&size=" + size))
            .header("Authorization", "Bearer " + token(leitor))
            .GET()
            .build());
  }

  private HttpResponse<String> descartar(UUID leitor, UUID recomendacao, String chave)
      throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri("/recomendacoes/" + recomendacao))
            .header("Authorization", "Bearer " + token(leitor))
            .header("Idempotency-Key", chave)
            .DELETE()
            .build());
  }
}
