package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.common.LimitesDeInteracao;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@code InteracaoController} contra Postgres real, HTTP de ponta a ponta (Task 4): confirma que o
 * fluxo inteiro (filtro de segurança, {@code ServicoDeIdempotencia}, {@code ServicoDeInteracao})
 * respeita a mesma {@code Idempotency-Key} sem duplicar efeito nem evento — o ponto que só um
 * teste no nível de controller consegue exercitar de verdade, já que {@code
 * ServicoDeInteracaoIntegracaoTest} chama o serviço diretamente, sem passar pela idempotência.
 *
 * <p>Recria só o mínimo de {@code identidade}/{@code acervo} necessário para uma atividade visível
 * (mesmo racional de {@link br.com.leai.social.feed.service.ServicoDeFeedIntegracaoTest}).
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class InteracaoControllerIntegracaoTest extends IntegracaoComPostgres {

  private static final Pattern ID_DO_CORPO = Pattern.compile("\"id\":\"([0-9a-f-]{36})\"");

  @Autowired private JdbcTemplate jdbc;

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
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS acervo.autor (
          id uuid PRIMARY KEY,
          nome text NOT NULL
        )
        """);
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
        """
        CREATE TABLE IF NOT EXISTS acervo.livro_autor (
          livro_id uuid NOT NULL,
          autor_id uuid NOT NULL
        )
        """);
    // Mesma definicao (coluna a coluna) usada pelas outras classes de teste deste modulo: CREATE
    // OR REPLACE VIEW nao pode remover colunas, entao a view precisa ficar identica entre as
    // classes que a recriam no mesmo contexto compartilhado.
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

    jdbc.execute("TRUNCATE identidade.seguidor, identidade.usuario, acervo.livro CASCADE");
  }

  private UUID novaAtividadeVisivelPara(UUID solicitante) {
    UUID autor = UUID.randomUUID();
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", solicitante);
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", autor);
    jdbc.update(
        "INSERT INTO identidade.seguidor (seguidor_id, seguido_id) VALUES (?, ?)", solicitante, autor);
    UUID livroId = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO acervo.livro (id, tipo, titulo, autor_informado, ativo)"
            + " VALUES (?, 'oficial', 'Torto arado', 'Itamar Vieira Junior', true)",
        livroId);
    return jdbc.queryForObject(
        """
        INSERT INTO atividade
          (id, autor_id, tipo, livro_id, event_id, chave_fato, origem_tipo, origem_id,
           snap_usuario_nome, snap_usuario_username, snap_livro_titulo, snap_livro_autor)
        VALUES (gen_random_uuid(), ?, 'leitura_iniciada', ?, gen_random_uuid(), ?, 'leitura',
                gen_random_uuid(), 'Autora Snapshot', 'autora_snapshot', 'Torto arado',
                'Itamar Vieira Junior')
        RETURNING id
        """,
        UUID.class,
        autor,
        livroId,
        "http-interacao-" + UUID.randomUUID());
  }

  @Test
  @DisplayName("POST curtir duas vezes com a mesma Idempotency-Key nao duplica curtida nem evento")
  void curtirDuasVezesComMesmaChaveNaoDuplica() throws Exception {
    UUID solicitante = UUID.randomUUID();
    UUID atividadeId = novaAtividadeVisivelPara(solicitante);
    String bearer = token(solicitante);
    String chaveIdempotencia = UUID.randomUUID().toString();

    HttpResponse<String> primeira = curtir(atividadeId, bearer, chaveIdempotencia);
    HttpResponse<String> segunda = curtir(atividadeId, bearer, chaveIdempotencia);

    assertThat(primeira.statusCode()).isEqualTo(201);
    assertThat(segunda.statusCode()).isEqualTo(201);
    assertThat(segunda.body()).isEqualTo(primeira.body());
    assertThat(primeira.body()).contains("\"totalCurtidas\":1");

    Long totalCurtidas =
        jdbc.queryForObject(
            "SELECT count(*) FROM curtida_atividade WHERE atividade_id = ? AND usuario_id = ?",
            Long.class,
            atividadeId,
            solicitante);
    assertThat(totalCurtidas).isEqualTo(1L);

    Long totalEventos =
        jdbc.queryForObject(
            "SELECT count(*) FROM outbox_social WHERE tipo = 'atividade.curtida' AND chave_negocio LIKE ?",
            Long.class,
            "atividade:" + atividadeId + ":curtida:%");
    assertThat(totalEventos).isEqualTo(1L);
  }

  @Test
  @DisplayName("POST curtir sem visibilidade responde 404 no corpo de erro padrao")
  void curtirSemVisibilidadeE404() throws Exception {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", solicitante);
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", autor);
    // Sem seguir: atividade nao visivel ao solicitante.
    UUID livroId = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO acervo.livro (id, tipo, titulo, autor_informado, ativo)"
            + " VALUES (?, 'oficial', 'Torto arado', 'Itamar Vieira Junior', true)",
        livroId);
    UUID atividadeId =
        jdbc.queryForObject(
            """
            INSERT INTO atividade
              (id, autor_id, tipo, livro_id, event_id, chave_fato, origem_tipo, origem_id,
               snap_usuario_nome, snap_usuario_username, snap_livro_titulo, snap_livro_autor)
            VALUES (gen_random_uuid(), ?, 'leitura_iniciada', ?, gen_random_uuid(), ?, 'leitura',
                    gen_random_uuid(), 'Autora Snapshot', 'autora_snapshot', 'Torto arado',
                    'Itamar Vieira Junior')
            RETURNING id
            """,
            UUID.class,
            autor,
            livroId,
            "http-interacao-invisivel-" + UUID.randomUUID());
    String bearer = token(solicitante);

    HttpResponse<String> resposta = curtir(atividadeId, bearer, UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(404);
    assertThat(resposta.body()).contains("\"codigo\":\"RECURSO_NAO_ENCONTRADO\"");
  }

  @Test
  @DisplayName("Menção existente vira link, inexistente fica texto e repetida notifica uma vez")
  void mencaoResolvidaNotificaUmaVezPorDestinatario() throws Exception {
    UUID solicitante = UUID.randomUUID();
    UUID atividadeId = novaAtividadeVisivelPara(solicitante);
    UUID nadia = leitor("nadiasampaio");
    String texto = "Indicação da @nadiasampaio e da @helenaprof. Valeu, @NadiaSampaio.";

    HttpResponse<String> resposta = comentar(atividadeId, token(solicitante), texto, null);

    assertThat(resposta.statusCode()).isEqualTo(201);
    assertThat(resposta.body())
        .contains("\"mencoes\":[{\"posicao\":13,\"comprimento\":13,\"usuarioId\":\"" + nadia)
        .contains("\"posicao\":52,\"comprimento\":13")
        .doesNotContain("helenaprof\"")
        .contains("\"editado\":false");
    assertThat(linhasDeMencao(idDe(resposta))).isEqualTo(2L);
    assertThat(eventosDeMencao(idDe(resposta))).isEqualTo(1L);
  }

  @Test
  @DisplayName("Resposta que menciona o alvo só gera comentario.respondido, sem dupla notificação")
  void respostaMencionandoOAlvoNaoDuplicaNotificacao() throws Exception {
    UUID solicitante = UUID.randomUUID();
    UUID atividadeId = novaAtividadeVisivelPara(solicitante);
    UUID julia = leitorQueVe("juwences", atividadeId);
    String raizId =
        idDe(comentar(atividadeId, token(julia), "Gostei muito deste livro.", null));

    HttpResponse<String> resposta =
        comentar(atividadeId, token(solicitante), "@juwences concordo.", raizId);

    assertThat(resposta.statusCode()).isEqualTo(201);
    assertThat(resposta.body()).contains("\"username\":\"juwences\"");
    assertThat(eventosDeMencao(idDe(resposta))).isZero();
    Long respondidos =
        jdbc.queryForObject(
            "SELECT count(*) FROM outbox_social WHERE tipo = 'comentario.respondido'"
                + " AND chave_negocio = ?",
            Long.class,
            "comentario:" + idDe(resposta));
    assertThat(respondidos).isEqualTo(1L);
  }

  @Test
  @DisplayName("PATCH reprocessa menções e só notifica destinatário novo")
  void edicaoNotificaSoDestinatarioNovo() throws Exception {
    UUID solicitante = UUID.randomUUID();
    UUID atividadeId = novaAtividadeVisivelPara(solicitante);
    leitor("nadiasampaio");
    leitor("rafaokamoto");
    String bearer = token(solicitante);
    String id = idDe(comentar(atividadeId, bearer, "Por indicação da @nadiasampaio.", null));

    HttpResponse<String> mesmaMencao =
        editar(id, bearer, "Por indicação da @nadiasampaio, obrigada.", UUID.randomUUID().toString());
    assertThat(mesmaMencao.statusCode()).isEqualTo(200);
    assertThat(mesmaMencao.body()).contains("\"editado\":true").contains("\"nivel\":\"RAIZ\"");
    assertThat(eventosDeMencao(id)).isEqualTo(1L);

    HttpResponse<String> semMencao = editar(id, bearer, "Sem menção agora.", UUID.randomUUID().toString());
    assertThat(semMencao.body()).contains("\"mencoes\":[]");
    assertThat(linhasDeMencao(id)).isZero();

    editar(id, bearer, "De volta, @nadiasampaio, e @rafaokamoto.", UUID.randomUUID().toString());
    assertThat(linhasDeMencao(id)).isEqualTo(2L);
    assertThat(eventosDeMencao(id)).isEqualTo(2L);
  }

  @Test
  @DisplayName("Editar e excluir comentário de outra pessoa responde 403 e não muda nada")
  void soOAutorEditaEExclui() throws Exception {
    UUID autor = UUID.randomUUID();
    UUID atividadeId = novaAtividadeVisivelPara(autor);
    String id = idDe(comentar(atividadeId, token(autor), "Texto original.", null));
    String outro = token(UUID.randomUUID());

    HttpResponse<String> edicao = editar(id, outro, "Texto alheio.", UUID.randomUUID().toString());
    HttpResponse<String> exclusao = excluir(id, outro, UUID.randomUUID().toString());

    assertThat(edicao.statusCode()).isEqualTo(403);
    assertThat(edicao.body()).contains("\"codigo\":\"ACESSO_NEGADO\"");
    assertThat(exclusao.statusCode()).isEqualTo(403);
    assertThat(
            jdbc.queryForObject(
                "SELECT texto FROM comentario WHERE id = ?::uuid", String.class, id))
        .isEqualTo("Texto original.");
  }

  @Test
  @DisplayName("DELETE da raiz remove respostas e menções por cascade e é idempotente pela chave")
  void excluirRaizLevaRespostasEMencoes() throws Exception {
    UUID autor = UUID.randomUUID();
    UUID atividadeId = novaAtividadeVisivelPara(autor);
    UUID rafa = leitorQueVe("rafaokamoto", atividadeId);
    String raizId = idDe(comentar(atividadeId, token(autor), "Fala, @rafaokamoto.", null));
    String respostaId =
        idDe(comentar(atividadeId, token(rafa), "A Terra engata depois.", raizId));
    String chave = UUID.randomUUID().toString();

    HttpResponse<String> primeira = excluir(raizId, token(autor), chave);
    HttpResponse<String> replay = excluir(raizId, token(autor), chave);
    HttpResponse<String> depois = excluir(raizId, token(autor), UUID.randomUUID().toString());

    assertThat(primeira.statusCode()).isEqualTo(204);
    assertThat(replay.statusCode()).isEqualTo(204);
    assertThat(depois.statusCode()).isEqualTo(404);
    Long restantes =
        jdbc.queryForObject(
            "SELECT count(*) FROM comentario WHERE id IN (?::uuid, ?::uuid)",
            Long.class,
            raizId,
            respostaId);
    assertThat(restantes).isZero();
    assertThat(linhasDeMencao(raizId)).isZero();
  }

  @Test
  @DisplayName("Menções acima do limite recusam a escrita com 429 sem gravar comentário")
  void limiteDeMencaoRecusaAEscrita() throws Exception {
    UUID solicitante = UUID.randomUUID();
    UUID atividadeId = novaAtividadeVisivelPara(solicitante);
    StringBuilder texto = new StringBuilder("Chamando");
    for (int i = 0; i <= LimitesDeInteracao.MENCOES_POR_MINUTO; i++) {
      leitor("leitor_" + i);
      texto.append(" @leitor_").append(i);
    }

    HttpResponse<String> resposta =
        comentar(atividadeId, token(solicitante), texto.toString(), null);

    assertThat(resposta.statusCode()).isEqualTo(429);
    assertThat(resposta.body()).contains("Muitas menções seguidas");
    Long comentarios =
        jdbc.queryForObject(
            "SELECT count(*) FROM comentario WHERE atividade_id = ?", Long.class, atividadeId);
    assertThat(comentarios).isZero();
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

  private UUID leitorQueVe(String username, UUID atividadeId) {
    UUID id = leitor(username);
    jdbc.update(
        "INSERT INTO identidade.seguidor (seguidor_id, seguido_id)"
            + " SELECT ?, autor_id FROM atividade WHERE id = ?",
        id,
        atividadeId);
    return id;
  }

  private long linhasDeMencao(String comentarioId) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM comentario_mencao WHERE comentario_id = ?::uuid", Long.class, comentarioId);
  }

  private long eventosDeMencao(String comentarioId) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM outbox_social WHERE tipo = 'usuario.mencionado' AND chave_negocio LIKE ?",
        Long.class,
        "mencao:" + comentarioId + ":%");
  }

  private static String idDe(HttpResponse<String> resposta) {
    Matcher id = ID_DO_CORPO.matcher(resposta.body());
    assertThat(id.find()).as("corpo sem id: %s", resposta.body()).isTrue();
    return id.group(1);
  }

  private HttpResponse<String> comentar(
      UUID atividadeId, String bearer, String texto, String comentarioRespondidoId) {
    String corpo =
        "{\"texto\":\"" + texto + "\""
            + (comentarioRespondidoId == null ? "" : ",\"comentarioRespondidoId\":\"" + comentarioRespondidoId + "\"")
            + "}";
    return enviar(
        HttpRequest.newBuilder(uri("/atividades/" + atividadeId + "/comentarios"))
            .header("Authorization", "Bearer " + bearer)
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(corpo))
            .build());
  }

  private HttpResponse<String> editar(String comentarioId, String bearer, String texto, String chave) {
    return enviar(
        HttpRequest.newBuilder(uri("/comentarios/" + comentarioId))
            .header("Authorization", "Bearer " + bearer)
            .header("Idempotency-Key", chave)
            .header("Content-Type", "application/json")
            .method("PATCH", HttpRequest.BodyPublishers.ofString("{\"texto\":\"" + texto + "\"}"))
            .build());
  }

  private HttpResponse<String> excluir(String comentarioId, String bearer, String chave) {
    return enviar(
        HttpRequest.newBuilder(uri("/comentarios/" + comentarioId))
            .header("Authorization", "Bearer " + bearer)
            .header("Idempotency-Key", chave)
            .DELETE()
            .build());
  }

  private HttpResponse<String> curtir(UUID atividadeId, String bearer, String chaveIdempotencia) {
    HttpRequest requisicao =
        HttpRequest.newBuilder(uri("/atividades/" + atividadeId + "/curtir"))
            .header("Authorization", "Bearer " + bearer)
            .header("Idempotency-Key", chaveIdempotencia)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();
    return enviar(requisicao);
  }
}
