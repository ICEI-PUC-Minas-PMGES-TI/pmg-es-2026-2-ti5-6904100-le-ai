package br.com.leai.social.lista.repository;

import br.com.leai.social.lista.model.LivroDeReferencia;
import br.com.leai.social.lista.model.PerfilDoDono;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Leituras de outros schemas que as listas precisam, sempre pelas VIEWs de contrato (AGENTS.md
 * §3): perfil e seguimento em {@code identidade}, livro em {@code acervo}.
 */
@Repository
public class ReferenciasDeLista {

  private final JdbcTemplate jdbc;

  public ReferenciasDeLista(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<PerfilDoDono> perfil(UUID usuarioId) {
    return jdbc
        .query(
            "SELECT id, username, nome_exibicao, avatar_url, privacidade"
                + " FROM identidade.v_perfil_referencia_v1 WHERE id = ?",
            (rs, linha) ->
                new PerfilDoDono(
                    rs.getObject("id", UUID.class),
                    rs.getString("username"),
                    rs.getString("nome_exibicao"),
                    rs.getString("avatar_url"),
                    rs.getString("privacidade")),
            usuarioId)
        .stream()
        .findFirst();
  }

  /** Seguimento aceito de {@code seguidorId} para {@code seguidoId} (RN-08). */
  public boolean segue(UUID seguidorId, UUID seguidoId) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM identidade.v_seguimento_aceito_v1"
                + " WHERE seguidor_id = ? AND seguido_id = ?)",
            Boolean.class,
            seguidorId,
            seguidoId));
  }

  public Optional<LivroDeReferencia> livro(UUID livroId) {
    return jdbc
        .query(
            "SELECT livro_id, tipo, dono_id, titulo, autor_exibicao, capa_resolvida, ativo"
                + " FROM acervo.v_livro_referencia_v1 WHERE livro_id = ?",
            ListaRepository.LIVRO,
            livroId)
        .stream()
        .findFirst();
  }
}
