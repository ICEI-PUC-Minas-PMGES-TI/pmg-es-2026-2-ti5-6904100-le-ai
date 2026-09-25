package br.com.leai.social.feed;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.integracao.IntegracaoComPostgres;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@link AtividadeRepository#buscarFeed} contra Postgres real (RF-SOC-08), incluindo as views
 * cross-schema de verdade.
 *
 * <p><b>Por que recriar `identidade`/`acervo` aqui:</b> o Postgres efêmero do CI (veja {@code
 * .github/workflows/ci-back-social.yml}) só recebe as migrations do próprio `social`; os schemas
 * `identidade` e `acervo` não existem nele. {@link #preparaViewsCrossSchema()} recria, com o mesmo
 * SQL, {@code identidade.v_seguimento_aceito_v1} (confirmada em {@code
 * V20260915120000__completa_schema_identidade.sql}) e {@code acervo.v_livro_referencia_v1}
 * (confirmada em {@code 0001_20260916110700_modelo_der.sql}), para o teste exercitar a mesma
 * definição de view usada em produção, e não uma tabela solta fingindo ser ela.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class FeedRepositorioIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private JdbcTemplate jdbc;
  @Autowired private AtividadeRepository atividadeRepository;

  @BeforeEach
  void preparaViewsCrossSchema() {
    jdbc.execute("CREATE SCHEMA IF NOT EXISTS identidade");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS identidade.usuario (
          id uuid PRIMARY KEY,
          suspenso boolean NOT NULL DEFAULT false,
          exclusao_solicitada_em timestamptz
        )
        """);
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS identidade.seguidor (
          seguidor_id uuid NOT NULL,
          seguido_id uuid NOT NULL,
          PRIMARY KEY (seguidor_id, seguido_id)
        )
        """);
    // Mesma definicao de identidade.v_seguimento_aceito_v1 (confirmada na migration de identidade).
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
    // Mesma definicao de acervo.v_livro_referencia_v1 (confirmada na migration drizzle de acervo).
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

    // identidade/acervo nao sao apagados pelo flyway.clean() do teste (so limpa `social`), entao
    // cada metodo comeca isolando os proprios dados.
    jdbc.execute("TRUNCATE identidade.seguidor, identidade.usuario, acervo.livro CASCADE");
  }

  private void seguir(UUID seguidor, UUID seguido) {
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?) ON CONFLICT DO NOTHING", seguidor);
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?) ON CONFLICT DO NOTHING", seguido);
    jdbc.update(
        "INSERT INTO identidade.seguidor (seguidor_id, seguido_id) VALUES (?, ?)", seguidor, seguido);
  }

  private void livro(UUID livroId, boolean ativo) {
    jdbc.update(
        "INSERT INTO acervo.livro (id, tipo, titulo, autor_informado, ativo)"
            + " VALUES (?, 'pessoal', 'Torto arado', 'Itamar Vieira Junior', ?)",
        livroId,
        ativo);
  }

  private Atividade novaAtividade(UUID autor, UUID livroId, String chaveFato) {
    return Atividade.nova(
        autor,
        TipoAtividade.LEITURA_CONCLUIDA,
        livroId,
        UUID.randomUUID(),
        chaveFato,
        "leitura",
        UUID.randomUUID(),
        "Autora Snapshot",
        "autora_snapshot",
        null,
        "Torto arado",
        "Itamar Vieira Junior",
        null);
  }

  @Test
  @DisplayName("feed traz atividade de quem o solicitante segue, com livro ativo no acervo")
  void buscarFeedTrazAtividadeDeQuemSolicitanteSegue() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, true);
    Atividade atividade = atividadeRepository.save(novaAtividade(autor, livroId, "chave-1"));

    Page<Atividade> pagina = atividadeRepository.buscarFeed(solicitante, PageRequest.of(0, 20));

    assertThat(pagina.getTotalElements()).isEqualTo(1);
    assertThat(pagina.getContent()).extracting(Atividade::id).containsExactly(atividade.id());
  }

  @Test
  @DisplayName("feed nao traz atividade de quem o solicitante nao segue")
  void buscarFeedNaoTrazAtividadeDeQuemNaoSegue() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", solicitante);
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", autor);
    livro(livroId, true);
    atividadeRepository.save(novaAtividade(autor, livroId, "chave-2"));

    Page<Atividade> pagina = atividadeRepository.buscarFeed(solicitante, PageRequest.of(0, 20));

    assertThat(pagina.getTotalElements()).isZero();
  }

  @Test
  @DisplayName("feed nao traz atividade cujo livro esta inativo no acervo")
  void buscarFeedNaoTrazAtividadeDeLivroInativo() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, false);
    atividadeRepository.save(novaAtividade(autor, livroId, "chave-3"));

    Page<Atividade> pagina = atividadeRepository.buscarFeed(solicitante, PageRequest.of(0, 20));

    assertThat(pagina.getTotalElements()).isZero();
  }

  @Test
  @DisplayName("feed nao traz atividade inativa (exclusao logica)")
  void buscarFeedNaoTrazAtividadeInativa() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, true);
    Atividade atividade = atividadeRepository.save(novaAtividade(autor, livroId, "chave-4"));
    jdbc.update("UPDATE atividade SET ativo = false WHERE id = ?", atividade.id());

    Page<Atividade> pagina = atividadeRepository.buscarFeed(solicitante, PageRequest.of(0, 20));

    assertThat(pagina.getTotalElements()).isZero();
  }

  @Test
  @DisplayName("feed ordena mais recente primeiro e pagina com LIMIT/OFFSET parametrizados")
  void buscarFeedOrdenaEPagina() throws InterruptedException {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, true);
    Atividade primeira = atividadeRepository.save(novaAtividade(autor, livroId, "chave-5a"));
    Thread.sleep(5);
    Atividade segunda = atividadeRepository.save(novaAtividade(autor, livroId, "chave-5b"));
    Thread.sleep(5);
    Atividade terceira = atividadeRepository.save(novaAtividade(autor, livroId, "chave-5c"));

    Page<Atividade> paginaUm = atividadeRepository.buscarFeed(solicitante, PageRequest.of(0, 2));
    Page<Atividade> paginaDois = atividadeRepository.buscarFeed(solicitante, PageRequest.of(1, 2));

    assertThat(paginaUm.getTotalElements()).isEqualTo(3);
    assertThat(paginaUm.getContent())
        .extracting(Atividade::id)
        .containsExactly(terceira.id(), segunda.id());
    assertThat(paginaDois.getContent()).extracting(Atividade::id).containsExactly(primeira.id());
  }
}
