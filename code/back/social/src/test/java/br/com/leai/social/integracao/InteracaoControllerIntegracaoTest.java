package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
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

  private String token(UUID subject) throws Exception {
    JWTClaimsSet claims =
        new JWTClaimsSet.Builder()
            .subject(subject.toString())
            .issueTime(Date.from(Instant.now().minusSeconds(1)))
            .expirationTime(Date.from(Instant.now().plusSeconds(900)))
            .build();
    SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
    jwt.sign(new MACSigner(JWT_SECRET_TESTE.getBytes(StandardCharsets.UTF_8)));
    return jwt.serialize();
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
