package br.com.leai.social.health;

import br.com.leai.social.common.ServicoIndisponivelException;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Indicador de saúde do banco: um {@code SELECT 1}. Compõe o {@code GET /health} (RNF-OBS-02) —
 * o serviço só está "ok" se o banco responde.
 *
 * <p>Vai por {@code JdbcTemplate}, e não por JPA: o esqueleto ainda não tem nenhuma entidade, e
 * a checagem precisa funcionar de qualquer forma. Consulta estática, nunca concatenação de
 * entrada (RNF-SEC-12).
 */
@Component
public class DatabaseHealthChecker {

  private static final int TIMEOUT_SEGUNDOS = 3;

  private final JdbcTemplate jdbcTemplate;

  public DatabaseHealthChecker(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
    // Banco pendurado vira 503 rápido, em vez de segurar a thread da requisição.
    this.jdbcTemplate.setQueryTimeout(TIMEOUT_SEGUNDOS);
  }

  public void verificar() {
    try {
      jdbcTemplate.queryForObject("SELECT 1", Integer.class);
    } catch (DataAccessException erro) {
      throw new ServicoIndisponivelException("Banco indisponível", erro);
    }
  }
}
