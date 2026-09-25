package br.com.leai.social.feed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.feed.dto.AtividadeResposta;
import br.com.leai.social.feed.dto.PaginaAtividadesResposta;
import br.com.leai.social.integracao.IntegracaoComPostgres;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@link ServicoDeFeed} contra Postgres real, incluindo as views cross-schema de verdade (mesmo
 * racional de {@link FeedRepositorioIntegracaoTest}: recria, com o mesmo SQL de produção,
 * {@code identidade.v_seguimento_aceito_v1}, {@code acervo.v_livro_referencia_v1} e {@code
 * leitura.v_resenha_publicacao_v1}, já que o Postgres efêmero do CI só recebe as migrations do
 * próprio `social`).
 *
 * <p>Cobre RN-08 (perfil privado sem seguimento aceito não aparece — via o próprio `buscarFeed`,
 * que já exige seguimento aceito), RN-09 (deixar de seguir tira a atividade do feed), livro
 * excluído/inativo, paginação (`page`/`size`/`ultima`), o 404 disfarçado de {@code obter} para
 * atividade existente mas não visível, e a decisão documentada do link do livro (OFICIAL vs
 * PESSOAL, lida de {@code acervo.v_livro_referencia_v1.tipo}).
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ServicoDeFeedIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private JdbcTemplate jdbc;
  @Autowired private AtividadeRepository atividadeRepository;
  @Autowired private CurtidaAtividadeRepository curtidaRepository;
  @Autowired private ServicoDeFeed servico;

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
        CREATE TABLE IF NOT EXISTS leitura.resenha (
          id uuid PRIMARY KEY,
          usuario_id uuid NOT NULL,
          livro_id uuid NOT NULL,
          texto text NOT NULL,
          spoiler boolean NOT NULL DEFAULT false,
          criado_em timestamptz NOT NULL DEFAULT now(),
          atualizado_em timestamptz NOT NULL DEFAULT now()
        )
        """);
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS leitura.reacao_resenha (
          id uuid PRIMARY KEY,
          resenha_id uuid NOT NULL,
          usuario_id uuid NOT NULL,
          tipo text NOT NULL,
          ativa boolean NOT NULL DEFAULT true
        )
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW leitura.v_resenha_publicacao_v1 AS (
          SELECT
            r.id AS resenha_id,
            r.usuario_id,
            r.livro_id,
            r.texto,
            r.spoiler,
            r.criado_em,
            r.atualizado_em,
            count(rr.id) FILTER (WHERE rr.ativa AND rr.tipo = 'curtida') AS curtidas,
            count(rr.id) FILTER (WHERE rr.ativa AND rr.tipo = 'descurtida') AS descurtidas
          FROM leitura.resenha r
          LEFT JOIN leitura.reacao_resenha rr ON rr.resenha_id = r.id
          GROUP BY r.id
        )
        """);

    jdbc.execute(
        "TRUNCATE identidade.seguidor, identidade.usuario, acervo.livro, leitura.resenha CASCADE");
  }

  private void seguir(UUID seguidor, UUID seguido) {
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?) ON CONFLICT DO NOTHING", seguidor);
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?) ON CONFLICT DO NOTHING", seguido);
    jdbc.update(
        "INSERT INTO identidade.seguidor (seguidor_id, seguido_id) VALUES (?, ?)", seguidor, seguido);
  }

  private void deixarDeSeguir(UUID seguidor, UUID seguido) {
    jdbc.update(
        "DELETE FROM identidade.seguidor WHERE seguidor_id = ? AND seguido_id = ?", seguidor, seguido);
  }

  private void livro(UUID livroId, String tipo, boolean ativo) {
    jdbc.update(
        "INSERT INTO acervo.livro (id, tipo, titulo, autor_informado, ativo)"
            + " VALUES (?, ?, 'Torto arado', 'Itamar Vieira Junior', ?)",
        livroId,
        tipo,
        ativo);
  }

  private UUID resenha(UUID usuarioId, UUID livroId, String texto, boolean spoiler) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO leitura.resenha (id, usuario_id, livro_id, texto, spoiler) VALUES (?, ?, ?, ?, ?)",
        id,
        usuarioId,
        livroId,
        texto,
        spoiler);
    return id;
  }

  private Atividade leitura(UUID autor, UUID livroId, String chaveFato) {
    return atividadeRepository.save(
        Atividade.nova(
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
            null));
  }

  private Atividade resenhaPublicada(UUID autor, UUID livroId, UUID resenhaId, String chaveFato) {
    return atividadeRepository.save(
        Atividade.nova(
            autor,
            TipoAtividade.RESENHA_PUBLICADA,
            livroId,
            UUID.randomUUID(),
            chaveFato,
            "resenha",
            resenhaId,
            "Autora Snapshot",
            "autora_snapshot",
            null,
            "Torto arado",
            "Itamar Vieira Junior",
            null));
  }

  @Test
  @DisplayName("listar traz atividade de quem o solicitante segue, com link de livro oficial")
  void listarTrazAtividadeComLinkOficial() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, "oficial", true);
    Atividade atividade = leitura(autor, livroId, "servico-chave-1");

    PaginaAtividadesResposta pagina = servico.listar(solicitante, 0, 20);

    assertThat(pagina.totalItens()).isEqualTo(1);
    assertThat(pagina.itens()).hasSize(1);
    AtividadeResposta resposta = pagina.itens().get(0);
    assertThat(resposta.id()).isEqualTo(atividade.id().toString());
    assertThat(resposta.livro().tipo()).isEqualTo("OFICIAL");
    assertThat(resposta.livro().link().via()).isEqualTo("catalogo");
    assertThat(resposta.livro().link().referenciaId()).isNull();
    assertThat(resposta.totalCurtidas()).isZero();
    assertThat(resposta.totalComentarios()).isZero();
    assertThat(resposta.curtidaPeloSolicitante()).isFalse();
  }

  @Test
  @DisplayName("listar traz link via=feed e referenciaId=atividadeId para livro pessoal")
  void listarTrazLinkFeedParaLivroPessoal() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, "pessoal", true);
    Atividade atividade = leitura(autor, livroId, "servico-chave-2");

    PaginaAtividadesResposta pagina = servico.listar(solicitante, 0, 20);

    AtividadeResposta resposta = pagina.itens().get(0);
    assertThat(resposta.livro().tipo()).isEqualTo("PESSOAL");
    assertThat(resposta.livro().link().via()).isEqualTo("feed");
    assertThat(resposta.livro().link().referenciaId()).isEqualTo(atividade.id().toString());
  }

  @Test
  @DisplayName("listar preenche o snapshot de resenha a partir de leitura.v_resenha_publicacao_v1")
  void listarPreencheSnapshotDeResenha() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, "oficial", true);
    UUID resenhaId = resenha(autor, livroId, "Um livro que dói e cura ao mesmo tempo.", true);
    resenhaPublicada(autor, livroId, resenhaId, "servico-chave-resenha-1");

    PaginaAtividadesResposta pagina = servico.listar(solicitante, 0, 20);

    AtividadeResposta resposta = pagina.itens().get(0);
    assertThat(resposta.tipo()).isEqualTo("RESENHA_PUBLICADA");
    assertThat(resposta.resenha()).isNotNull();
    assertThat(resposta.resenha().id()).isEqualTo(resenhaId.toString());
    assertThat(resposta.resenha().texto()).isEqualTo("Um livro que dói e cura ao mesmo tempo.");
    assertThat(resposta.resenha().spoiler()).isTrue();
  }

  @Test
  @DisplayName("listar nao traz atividade de autor nao seguido (RN-08)")
  void listarNaoTrazAtividadeDeAutorNaoSeguido() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", solicitante);
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", autor);
    livro(livroId, "oficial", true);
    leitura(autor, livroId, "servico-chave-3");

    PaginaAtividadesResposta pagina = servico.listar(solicitante, 0, 20);

    assertThat(pagina.totalItens()).isZero();
    assertThat(pagina.itens()).isEmpty();
  }

  @Test
  @DisplayName("deixar de seguir tira a atividade do feed (RN-09)")
  void deixarDeSeguirTiraAtividadeDoFeed() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, "oficial", true);
    leitura(autor, livroId, "servico-chave-4");
    assertThat(servico.listar(solicitante, 0, 20).totalItens()).isEqualTo(1);

    deixarDeSeguir(solicitante, autor);

    assertThat(servico.listar(solicitante, 0, 20).totalItens()).isZero();
  }

  @Test
  @DisplayName("listar nao traz atividade cujo livro foi excluido/inativado no acervo")
  void listarNaoTrazAtividadeDeLivroInativo() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, "oficial", false);
    leitura(autor, livroId, "servico-chave-5");

    PaginaAtividadesResposta pagina = servico.listar(solicitante, 0, 20);

    assertThat(pagina.totalItens()).isZero();
  }

  @Test
  @DisplayName("listar pagina com page/size e calcula ultima corretamente")
  void listarPaginaEIndicaUltimaPagina() throws InterruptedException {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, "oficial", true);
    leitura(autor, livroId, "servico-chave-6a");
    Thread.sleep(5);
    leitura(autor, livroId, "servico-chave-6b");
    Thread.sleep(5);
    leitura(autor, livroId, "servico-chave-6c");

    PaginaAtividadesResposta paginaUm = servico.listar(solicitante, 0, 2);
    PaginaAtividadesResposta paginaDois = servico.listar(solicitante, 1, 2);

    assertThat(paginaUm.itens()).hasSize(2);
    assertThat(paginaUm.totalItens()).isEqualTo(3);
    assertThat(paginaUm.totalPaginas()).isEqualTo(2);
    assertThat(paginaUm.ultima()).isFalse();

    assertThat(paginaDois.itens()).hasSize(1);
    assertThat(paginaDois.ultima()).isTrue();
  }

  @Test
  @DisplayName("listar recusa page negativa ou size fora de 1..50")
  void listarRecusaPaginacaoInvalida() {
    UUID solicitante = UUID.randomUUID();

    assertThatThrownBy(() -> servico.listar(solicitante, -1, 20))
        .isInstanceOf(ErroDeNegocioException.class);
    assertThatThrownBy(() -> servico.listar(solicitante, 0, 0)).isInstanceOf(ErroDeNegocioException.class);
    assertThatThrownBy(() -> servico.listar(solicitante, 0, 51)).isInstanceOf(ErroDeNegocioException.class);
  }

  @Test
  @DisplayName("obter retorna a atividade visivel com contadores atuais")
  void obterRetornaAtividadeVisivel() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    seguir(solicitante, autor);
    livro(livroId, "oficial", true);
    Atividade atividade = leitura(autor, livroId, "servico-chave-7");
    curtidaRepository.save(CurtidaAtividade.nova(atividade.id(), solicitante));

    AtividadeResposta resposta = servico.obter(solicitante, atividade.id());

    assertThat(resposta.id()).isEqualTo(atividade.id().toString());
    assertThat(resposta.totalCurtidas()).isEqualTo(1);
    assertThat(resposta.curtidaPeloSolicitante()).isTrue();
  }

  @Test
  @DisplayName("obter responde como nao encontrado (nunca 403) para atividade existente mas nao visivel")
  void obterDisfarca404ParaAtividadeNaoVisivel() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID livroId = UUID.randomUUID();
    // Sem seguir: autor privado/nao seguido nunca autoriza a leitura da atividade (RN-08).
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", solicitante);
    jdbc.update("INSERT INTO identidade.usuario (id) VALUES (?)", autor);
    livro(livroId, "oficial", true);
    Atividade atividade = leitura(autor, livroId, "servico-chave-8");

    assertThatThrownBy(() -> servico.obter(solicitante, atividade.id()))
        .isInstanceOf(ErroDeNegocioException.class)
        .satisfies(
            erro ->
                assertThat(((ErroDeNegocioException) erro).codigo().name())
                    .isEqualTo("RECURSO_NAO_ENCONTRADO"));
  }

  @Test
  @DisplayName("obter responde como nao encontrado para atividade inexistente")
  void obterDisfarca404ParaAtividadeInexistente() {
    UUID solicitante = UUID.randomUUID();

    assertThatThrownBy(() -> servico.obter(solicitante, UUID.randomUUID()))
        .isInstanceOf(ErroDeNegocioException.class)
        .satisfies(
            erro ->
                assertThat(((ErroDeNegocioException) erro).codigo().name())
                    .isEqualTo("RECURSO_NAO_ENCONTRADO"));
  }
}
