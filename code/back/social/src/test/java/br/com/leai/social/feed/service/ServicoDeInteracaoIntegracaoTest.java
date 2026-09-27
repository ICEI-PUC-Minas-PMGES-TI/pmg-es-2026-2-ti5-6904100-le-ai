package br.com.leai.social.feed.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.feed.dto.ComentarioResposta;
import br.com.leai.social.feed.dto.EstadoCurtidaResposta;
import br.com.leai.social.feed.dto.ListaRespostasResposta;
import br.com.leai.social.feed.dto.PaginaComentariosResposta;
import br.com.leai.social.feed.entity.Atividade;
import br.com.leai.social.feed.entity.Comentario;
import br.com.leai.social.feed.entity.TipoAtividade;
import br.com.leai.social.feed.repository.AtividadeRepository;
import br.com.leai.social.feed.repository.ComentarioRepository;
import br.com.leai.social.feed.repository.CurtidaAtividadeRepository;
import br.com.leai.social.integracao.IntegracaoComPostgres;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@link ServicoDeInteracao} contra Postgres real (Task 4): curtir/descurtir, comentar/responder
 * com derivação de raiz (RN-10), revalidação de visibilidade e publicação de exatamente um evento
 * por escrita em {@code outbox_social}.
 *
 * <p>Recria as views cross-schema de {@code identidade}/{@code acervo} com o mesmo racional de
 * {@link ServicoDeFeedIntegracaoTest} (o Postgres efêmero de teste só recebe as migrations de
 * `social`), acrescentando {@code identidade.v_perfil_referencia_v1} — usada aqui para o snapshot
 * de autor/autorAcao nos comentários e nos eventos.
 *
 * <p><b>Chaves únicas por teste:</b> {@code chave_fato} de cada atividade nasce de {@code
 * UUID.randomUUID()} para nunca colidir com literais curtos usados por outras classes de teste
 * deste módulo, que compartilham o mesmo schema Postgres ao longo da suíte inteira.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ServicoDeInteracaoIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private JdbcTemplate jdbc;
  @Autowired private AtividadeRepository atividadeRepository;
  @Autowired private ComentarioRepository comentarioRepository;
  @Autowired private CurtidaAtividadeRepository curtidaRepository;
  @Autowired private ServicoDeInteracao servico;

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
    // Colunas do snapshot de perfil (Task 4): outras classes de teste deste módulo já podem ter
    // criado `identidade.usuario` sem elas (CREATE TABLE IF NOT EXISTS acima é no-op nesse caso),
    // então entram por ALTER ... ADD COLUMN IF NOT EXISTS, idempotente independente da ordem.
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
    // Mesma definicao de identidade.v_perfil_referencia_v1 (confirmada em
    // V20260915120000__completa_schema_identidade.sql).
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
    // Mesma definicao (coluna a coluna) de acervo.v_livro_referencia_v1 usada por
    // FeedRepositorioIntegracaoTest/ServicoDeFeedIntegracaoTest: CREATE OR REPLACE VIEW nao pode
    // remover colunas, entao a view precisa ficar identica entre as classes que a recriam no mesmo
    // contexto compartilhado.
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

  private void usuario(UUID id, String username, String nomeExibicao) {
    jdbc.update(
        "INSERT INTO identidade.usuario (id, username, nome_exibicao) VALUES (?, ?, ?)"
            + " ON CONFLICT (id) DO UPDATE SET username = excluded.username,"
            + " nome_exibicao = excluded.nome_exibicao",
        id,
        username,
        nomeExibicao);
  }

  private void seguir(UUID seguidor, UUID seguido) {
    jdbc.update(
        "INSERT INTO identidade.seguidor (seguidor_id, seguido_id) VALUES (?, ?)", seguidor, seguido);
  }

  private UUID livroAtivo() {
    UUID livroId = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO acervo.livro (id, tipo, titulo, autor_informado, ativo)"
            + " VALUES (?, 'oficial', 'Torto arado', 'Itamar Vieira Junior', true)",
        livroId);
    return livroId;
  }

  private Atividade novaAtividade(UUID autor, UUID livroId) {
    return atividadeRepository.save(
        Atividade.nova(
            autor,
            TipoAtividade.LEITURA_INICIADA,
            livroId,
            UUID.randomUUID(),
            "interacao-" + UUID.randomUUID(),
            "leitura",
            UUID.randomUUID(),
            "Autora Snapshot",
            "autora_snapshot",
            null,
            "Torto arado",
            "Itamar Vieira Junior",
            null));
  }

  /** Monta um cenário visível: solicitante segue autor, autor tem uma atividade com livro ativo. */
  private Atividade cenarioVisivel(UUID solicitante, UUID autor) {
    usuario(solicitante, "solicitante_" + solicitante, "Solicitante");
    usuario(autor, "autor_" + autor, "Autora");
    seguir(solicitante, autor);
    return novaAtividade(autor, livroAtivo());
  }

  // ---------------------------------------------------------------------------------------
  // autor interagindo com a propria atividade
  // ---------------------------------------------------------------------------------------

  @Test
  @DisplayName("autor curte, comenta e lista comentarios da propria atividade sem se seguir")
  void autorInterageComAPropriaAtividade() {
    UUID autor = UUID.randomUUID();
    usuario(autor, "autor_" + autor, "Autora");
    Atividade atividade = novaAtividade(autor, livroAtivo());

    assertThat(servico.curtir(autor, atividade.id()).totalCurtidas()).isEqualTo(1);
    ComentarioResposta comentario = servico.comentar(autor, atividade.id(), "Meu livro!", null);
    assertThat(comentario.pertenceAoSolicitante()).isTrue();
    assertThat(servico.listarComentariosRaiz(autor, atividade.id(), 0, 20).itens()).hasSize(1);
  }

  @Test
  @DisplayName("autor nao interage com a propria atividade se o livro foi excluido (RN-09)")
  void autorNaoInterageComAtividadeDeLivroExcluido() {
    UUID autor = UUID.randomUUID();
    usuario(autor, "autor_" + autor, "Autora");
    UUID livroId = livroAtivo();
    Atividade atividade = novaAtividade(autor, livroId);
    jdbc.update("UPDATE acervo.livro SET ativo = false WHERE id = ?", livroId);

    assertThatThrownBy(() -> servico.curtir(autor, atividade.id()))
        .isInstanceOf(ErroDeNegocioException.class);
  }

  // ---------------------------------------------------------------------------------------
  // curtir / descurtir
  // ---------------------------------------------------------------------------------------

  @Test
  @DisplayName("curtir uma atividade visivel cria a curtida e publica atividade.curtida uma vez")
  void curtirCriaECurtidaEPublicaEvento() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    Atividade atividade = cenarioVisivel(solicitante, autor);

    EstadoCurtidaResposta resposta = servico.curtir(solicitante, atividade.id());

    assertThat(resposta.curtida()).isTrue();
    assertThat(resposta.totalCurtidas()).isEqualTo(1);
    assertThat(curtidaRepository.existsByAtividadeIdAndUsuarioId(atividade.id(), solicitante)).isTrue();
    List<Map<String, Object>> eventos =
        jdbc.queryForList(
            "SELECT tipo, chave_negocio FROM outbox_social WHERE tipo = 'atividade.curtida'"
                + " AND chave_negocio LIKE ?",
            "atividade:" + atividade.id() + ":curtida:%");
    assertThat(eventos).hasSize(1);
  }

  @Test
  @DisplayName("curtir a mesma atividade duas vezes e idempotente: nao duplica linha nem evento")
  void curtirDuasVezesNaoDuplicaNemRepeteEvento() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    Atividade atividade = cenarioVisivel(solicitante, autor);

    EstadoCurtidaResposta primeira = servico.curtir(solicitante, atividade.id());
    EstadoCurtidaResposta segunda = servico.curtir(solicitante, atividade.id());

    assertThat(primeira.totalCurtidas()).isEqualTo(1);
    assertThat(segunda.totalCurtidas()).isEqualTo(1);
    assertThat(curtidaRepository.countByAtividadeId(atividade.id())).isEqualTo(1);
    Long totalEventos =
        jdbc.queryForObject(
            "SELECT count(*) FROM outbox_social WHERE tipo = 'atividade.curtida' AND chave_negocio LIKE ?",
            Long.class,
            "atividade:" + atividade.id() + ":curtida:%");
    assertThat(totalEventos).isEqualTo(1L);
  }

  @Test
  @DisplayName("curtir atividade sem visibilidade responde como nao encontrado (404)")
  void curtirSemVisibilidadeE404() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    usuario(solicitante, "sol", "Sol");
    usuario(autor, "aut", "Aut");
    // Sem seguir: atividade nao visivel.
    Atividade atividade = novaAtividade(autor, livroAtivo());

    assertThatThrownBy(() -> servico.curtir(solicitante, atividade.id()))
        .isInstanceOf(ErroDeNegocioException.class)
        .satisfies(
            erro ->
                assertThat(((ErroDeNegocioException) erro).codigo().name())
                    .isEqualTo("RECURSO_NAO_ENCONTRADO"));
  }

  @Test
  @DisplayName("descurtir remove a propria curtida e e idempotente quando ja ausente")
  void descurtirRemoveEIdempotente() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    Atividade atividade = cenarioVisivel(solicitante, autor);
    servico.curtir(solicitante, atividade.id());

    servico.descurtir(solicitante, atividade.id());
    assertThat(curtidaRepository.existsByAtividadeIdAndUsuarioId(atividade.id(), solicitante)).isFalse();

    // Repetir sem curtida existente continua sendo sucesso (idempotente).
    servico.descurtir(solicitante, atividade.id());
    assertThat(curtidaRepository.existsByAtividadeIdAndUsuarioId(atividade.id(), solicitante)).isFalse();
  }

  // ---------------------------------------------------------------------------------------
  // comentar / RN-10
  // ---------------------------------------------------------------------------------------

  @Test
  @DisplayName("comentario-raiz e criado sem comentarioRaizId e publica atividade.comentada")
  void comentarSemAlvoCriaRaizEPublicaAtividadeComentada() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    Atividade atividade = cenarioVisivel(solicitante, autor);

    ComentarioResposta resposta = servico.comentar(solicitante, atividade.id(), "Muito bom!", null);

    assertThat(resposta.nivel()).isEqualTo("RAIZ");
    assertThat(resposta.comentarioRaizId()).isNull();
    assertThat(resposta.totalRespostas()).isZero();
    assertThat(resposta.pertenceAoSolicitante()).isTrue();

    List<Map<String, Object>> eventos =
        jdbc.queryForList(
            "SELECT tipo FROM outbox_social WHERE chave_negocio = ?", "comentario:" + resposta.id());
    assertThat(eventos).hasSize(1);
    assertThat(eventos.get(0).get("tipo")).isEqualTo("atividade.comentada");
  }

  @Test
  @DisplayName("responder um comentario-raiz cria resposta com raiz/respondido derivados e publica comentario.respondido")
  void responderRaizCriaRespostaEPublicaComentarioRespondido() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID terceiro = UUID.randomUUID();
    Atividade atividade = cenarioVisivel(solicitante, autor);
    usuario(terceiro, "terceiro", "Terceira Pessoa");
    seguir(terceiro, autor);
    // Quem comenta precisa ver a atividade no proprio feed (mesma regra de ServicoDeFeed): o
    // proprio autor da atividade nao a comenta aqui, so quem o segue.
    ComentarioResposta raiz = servico.comentar(solicitante, atividade.id(), "Comentario raiz", null);

    ComentarioResposta resposta =
        servico.comentar(terceiro, atividade.id(), "Concordo!", UUID.fromString(raiz.id()));

    assertThat(resposta.nivel()).isEqualTo("RESPOSTA");
    assertThat(resposta.comentarioRaizId()).isEqualTo(raiz.id());
    // comentarioRespondidoId e o id do comentario-alvo em si (a raiz, neste caso); o autor do
    // alvo vem separado em usuarioRespondido.
    assertThat(resposta.comentarioRespondidoId()).isEqualTo(raiz.id());
    assertThat(resposta.usuarioRespondido()).isNotNull();
    assertThat(resposta.usuarioRespondido().id()).isEqualTo(solicitante.toString());

    List<Map<String, Object>> eventos =
        jdbc.queryForList(
            "SELECT tipo FROM outbox_social WHERE chave_negocio = ?", "comentario:" + resposta.id());
    assertThat(eventos).hasSize(1);
    assertThat(eventos.get(0).get("tipo")).isEqualTo("comentario.respondido");
  }

  @Test
  @DisplayName(
      "RN-10: responder a uma resposta cria uma comentario irmao sob a mesma raiz, nunca um "
          + "terceiro nivel")
  void responderUmaRespostaViraIrmaoSobAMesmaRaiz() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    UUID terceiro = UUID.randomUUID();
    UUID quarto = UUID.randomUUID();
    Atividade atividade = cenarioVisivel(solicitante, autor);
    usuario(terceiro, "terceiro", "Terceira Pessoa");
    usuario(quarto, "quarto", "Quarta Pessoa");
    seguir(terceiro, autor);
    seguir(quarto, autor);

    // Todo mundo que interage segue o autor da atividade (mesma regra de visibilidade de
    // ServicoDeFeed); o proprio autor nunca comenta aqui, so quem o segue.
    ComentarioResposta raiz = servico.comentar(solicitante, atividade.id(), "Comentario raiz", null);
    ComentarioResposta primeiraResposta =
        servico.comentar(terceiro, atividade.id(), "Primeira resposta", UUID.fromString(raiz.id()));

    // Responde a resposta, nao a raiz: RN-10 diz que isso vira irma sob a mesma raiz.
    ComentarioResposta respostaDaResposta =
        servico.comentar(
            quarto, atividade.id(), "Resposta a resposta", UUID.fromString(primeiraResposta.id()));

    assertThat(respostaDaResposta.nivel()).isEqualTo("RESPOSTA");
    // A raiz continua sendo a raiz original, nunca a resposta que foi respondida.
    assertThat(respostaDaResposta.comentarioRaizId()).isEqualTo(raiz.id());
    // O alvo contextual e a resposta respondida em si (primeiraResposta), nao a raiz; quem a
    // respondeu (terceiro) aparece em usuarioRespondido.
    assertThat(respostaDaResposta.comentarioRespondidoId()).isEqualTo(primeiraResposta.id());
    assertThat(respostaDaResposta.usuarioRespondido().id()).isEqualTo(terceiro.toString());

    // As duas respostas sao irmas sob a mesma raiz no banco: nunca um terceiro nivel.
    Comentario entidadeResposta =
        comentarioRepository.findById(UUID.fromString(respostaDaResposta.id())).orElseThrow();
    assertThat(entidadeResposta.comentarioRaizId()).isEqualTo(UUID.fromString(raiz.id()));
    assertThat(comentarioRepository.countByComentarioRaizId(UUID.fromString(raiz.id()))).isEqualTo(2);

    // Exatamente um evento por escrita: 3 comentarios (1 raiz + 2 respostas) => 3 linhas na outbox.
    Long totalEventosDaAtividade =
        jdbc.queryForObject(
            "SELECT count(*) FROM outbox_social WHERE chave_negocio IN (?, ?, ?)",
            Long.class,
            "comentario:" + raiz.id(),
            "comentario:" + primeiraResposta.id(),
            "comentario:" + respostaDaResposta.id());
    assertThat(totalEventosDaAtividade).isEqualTo(3L);
  }

  @Test
  @DisplayName("comentar com comentarioRespondidoId de outra atividade e 404")
  void comentarComAlvoDeOutraAtividadeE404() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    Atividade atividade = cenarioVisivel(solicitante, autor);
    Atividade outraAtividade = novaAtividade(autor, livroAtivo());
    ComentarioResposta comentarioDeOutraAtividade =
        servico.comentar(solicitante, outraAtividade.id(), "De outra atividade", null);

    assertThatThrownBy(
            () ->
                servico.comentar(
                    solicitante,
                    atividade.id(),
                    "resposta invalida",
                    UUID.fromString(comentarioDeOutraAtividade.id())))
        .isInstanceOf(ErroDeNegocioException.class)
        .satisfies(
            erro ->
                assertThat(((ErroDeNegocioException) erro).codigo().name())
                    .isEqualTo("RECURSO_NAO_ENCONTRADO"));
  }

  // ---------------------------------------------------------------------------------------
  // listagens
  // ---------------------------------------------------------------------------------------

  @Test
  @DisplayName("listarComentariosRaiz pagina e revalida visibilidade da atividade")
  void listarComentariosRaizPaginaERevalidaVisibilidade() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    Atividade atividade = cenarioVisivel(solicitante, autor);
    servico.comentar(solicitante, atividade.id(), "primeiro", null);
    servico.comentar(solicitante, atividade.id(), "segundo", null);
    servico.comentar(solicitante, atividade.id(), "terceiro", null);

    PaginaComentariosResposta primeiraPagina =
        servico.listarComentariosRaiz(solicitante, atividade.id(), 0, 2);
    PaginaComentariosResposta segundaPagina =
        servico.listarComentariosRaiz(solicitante, atividade.id(), 1, 2);

    assertThat(primeiraPagina.totalItens()).isEqualTo(3);
    assertThat(primeiraPagina.itens()).hasSize(2);
    assertThat(primeiraPagina.ultima()).isFalse();
    assertThat(segundaPagina.itens()).hasSize(1);
    assertThat(segundaPagina.ultima()).isTrue();

    UUID estranho = UUID.randomUUID();
    usuario(estranho, "estranho", "Estranho");
    assertThatThrownBy(() -> servico.listarComentariosRaiz(estranho, atividade.id(), 0, 20))
        .isInstanceOf(ErroDeNegocioException.class);
  }

  @Test
  @DisplayName("listarRespostas pagina por cursor as respostas de uma raiz, sem repetir nem pular")
  void listarRespostasPaginaPorCursor() {
    UUID solicitante = UUID.randomUUID();
    UUID autor = UUID.randomUUID();
    Atividade atividade = cenarioVisivel(solicitante, autor);
    ComentarioResposta raiz = servico.comentar(solicitante, atividade.id(), "raiz", null);
    for (int i = 0; i < 3; i++) {
      servico.comentar(solicitante, atividade.id(), "resposta " + i, UUID.fromString(raiz.id()));
    }

    ListaRespostasResposta primeiraPagina =
        servico.listarRespostas(solicitante, UUID.fromString(raiz.id()), null, 2);
    assertThat(primeiraPagina.itens()).hasSize(2);
    assertThat(primeiraPagina.temMais()).isTrue();
    assertThat(primeiraPagina.proximoCursor()).isNotBlank();

    ListaRespostasResposta segundaPagina =
        servico.listarRespostas(
            solicitante, UUID.fromString(raiz.id()), primeiraPagina.proximoCursor(), 2);
    assertThat(segundaPagina.itens()).hasSize(1);
    assertThat(segundaPagina.temMais()).isFalse();
    assertThat(segundaPagina.proximoCursor()).isNull();
  }
}
