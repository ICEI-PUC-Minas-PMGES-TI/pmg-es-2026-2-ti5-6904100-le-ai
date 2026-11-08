package br.com.leai.social.push.repository;

import br.com.leai.social.push.model.DispositivoPush;
import br.com.leai.social.push.model.RegistroDeDispositivo;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DispositivoPushRepository {

  private static final String INATIVAR =
      """
      UPDATE dispositivo_push
         SET ativo = false, revogado_em = COALESCE(revogado_em, now()), atualizado_em = now()
       WHERE id = ?
      """;

  private final JdbcTemplate jdbc;

  public DispositivoPushRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public RegistroDeDispositivo registrar(UUID usuarioId, String token) {
    return jdbc.queryForObject(
        """
        INSERT INTO dispositivo_push (usuario_id, fcm_token, plataforma)
        VALUES (?, ?, ?)
        ON CONFLICT (fcm_token) DO UPDATE
           SET usuario_id = EXCLUDED.usuario_id,
               ativo = true,
               revogado_em = NULL,
               atualizado_em = now()
        RETURNING id, ativo, (xmax = 0) AS criado
        """,
        (rs, linha) ->
            new RegistroDeDispositivo(
                rs.getObject("id", UUID.class), rs.getBoolean("ativo"), rs.getBoolean("criado")),
        usuarioId,
        token,
        DispositivoPush.PLATAFORMA_ANDROID);
  }

  public boolean revogar(UUID usuarioId, UUID id) {
    return jdbc.update(INATIVAR + " AND usuario_id = ?", id, usuarioId) == 1;
  }

  public void inativar(UUID id) {
    jdbc.update(INATIVAR, id);
  }

  public List<DispositivoPush> ativosDe(UUID usuarioId) {
    return jdbc.query(
        "SELECT id, fcm_token FROM dispositivo_push WHERE usuario_id = ? AND ativo ORDER BY id",
        (rs, linha) -> new DispositivoPush(rs.getObject("id", UUID.class), rs.getString("fcm_token")),
        usuarioId);
  }

  public boolean reservarEnvio(UUID notificacaoId, UUID dispositivoId) {
    return jdbc.update(
            """
            INSERT INTO envio_push (notificacao_id, dispositivo_id)
            VALUES (?, ?)
            ON CONFLICT DO NOTHING
            """,
            notificacaoId,
            dispositivoId)
        == 1;
  }

  public void liberarEnvio(UUID notificacaoId, UUID dispositivoId) {
    jdbc.update(
        "DELETE FROM envio_push WHERE notificacao_id = ? AND dispositivo_id = ?",
        notificacaoId,
        dispositivoId);
  }
}
