package br.com.leai.social.notificacao.repository;

import br.com.leai.social.notificacao.model.TipoNotificacao;
import br.com.leai.social.notificacao.model.TipoPreferenciaNotificacao;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PreferenciaNotificacaoRepository {

  private final JdbcTemplate jdbc;

  public PreferenciaNotificacaoRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public boolean desabilitou(UUID usuarioId, TipoNotificacao tipo) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            """
            SELECT EXISTS (
              SELECT 1 FROM preferencia_notificacao
               WHERE usuario_id = ? AND tipo = ? AND NOT habilitada
            )
            """,
            Boolean.class,
            usuarioId,
            tipo.literal()));
  }

  public Map<TipoPreferenciaNotificacao, Boolean> gravadas(UUID usuarioId) {
    Map<TipoPreferenciaNotificacao, Boolean> estados = new EnumMap<>(TipoPreferenciaNotificacao.class);
    jdbc.query(
        "SELECT tipo, habilitada FROM preferencia_notificacao WHERE usuario_id = ?",
        rs -> {
          estados.put(
              TipoPreferenciaNotificacao.deLiteral(rs.getString("tipo")),
              rs.getBoolean("habilitada"));
        },
        usuarioId);
    return estados;
  }

  public void gravar(UUID usuarioId, Map<TipoPreferenciaNotificacao, Boolean> alteracoes) {
    List<Object[]> parametros =
        alteracoes.entrySet().stream()
            .map(
                alteracao ->
                    new Object[] {usuarioId, alteracao.getKey().literal(), alteracao.getValue()})
            .toList();
    jdbc.batchUpdate(
        """
        INSERT INTO preferencia_notificacao (usuario_id, tipo, habilitada)
        VALUES (?, ?, ?)
        ON CONFLICT (usuario_id, tipo) DO UPDATE SET habilitada = EXCLUDED.habilitada
        """,
        parametros);
  }
}
