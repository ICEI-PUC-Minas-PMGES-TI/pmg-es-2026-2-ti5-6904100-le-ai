package br.com.leai.identidade.moderacao.service;

import br.com.leai.identidade.auth.service.ContaAdministradora;
import br.com.leai.identidade.auth.service.GestorDeRenovacao;
import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.moderacao.dto.EstadoDaSuspensaoResposta;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Suspende e reativa a conta (F-MOD-OPC, RF-MOD-04). Idempotente pelo estado, sem recibo: repetir
 * devolve o estado atual com {@code alterado = false}. Um recibo por alvo devolveria um episódio
 * velho depois de suspender, reativar e suspender de novo.
 *
 * <p>O {@code UPDATE} condicional resolve a corrida com o pedido de exclusão (que trava a mesma
 * linha): só suspende conta ativa e sem exclusão pendente. Quando não altera, um {@code SELECT}
 * decide entre o 404 e a repetição.
 */
@Service
public class ServicoDeSuspensao {

  static final String CONTA_DO_ADMIN = "A conta administradora não pode ser suspensa.";
  static final String CONTA_NAO_ENCONTRADA = "Não encontramos esta conta.";

  private static final Logger log = LoggerFactory.getLogger(ServicoDeSuspensao.class);

  private final JdbcTemplate jdbc;
  private final GestorDeRenovacao gestorDeRenovacao;
  private final ContaAdministradora contaAdministradora;

  public ServicoDeSuspensao(
      JdbcTemplate jdbc,
      GestorDeRenovacao gestorDeRenovacao,
      ContaAdministradora contaAdministradora) {
    this.jdbc = jdbc;
    this.gestorDeRenovacao = gestorDeRenovacao;
    this.contaAdministradora = contaAdministradora;
  }

  /** Suspende e revoga as renovações ativas (RNF-SEC-30). */
  @Transactional
  public EstadoDaSuspensaoResposta suspender(UUID usuarioId, UUID adminId) {
    recusarAdmin(usuarioId);
    List<Instant> suspensoEm =
        jdbc.query(
            "UPDATE usuario SET suspenso = true, suspenso_em = now(), atualizado_em = now()"
                + " WHERE id = ? AND NOT suspenso AND exclusao_solicitada_em IS NULL"
                + " RETURNING suspenso_em",
            (rs, linha) -> instante(rs, "suspenso_em"),
            usuarioId);
    if (suspensoEm.isEmpty()) {
      return estadoAtual(usuarioId);
    }
    int revogadas = gestorDeRenovacao.revogarAtivos(usuarioId);
    // RNF-SEC-35: a ação administrativa fica no log; o motivo é da auditoria do social.
    log.info(
        "Conta {} suspensa pelo admin {}; {} renovação(ões) ativa(s) revogada(s)",
        usuarioId,
        adminId,
        revogadas);
    EstadoDaSuspensaoResposta atual = estadoAtual(usuarioId);
    return new EstadoDaSuspensaoResposta(
        usuarioId, true, suspensoEm.getFirst(), atual.reativadoEm(), true);
  }

  /** Reativa: login e VIEWs voltam a valer, com a privacidade e os seguidores de antes. */
  @Transactional
  public EstadoDaSuspensaoResposta reativar(UUID usuarioId, UUID adminId) {
    recusarAdmin(usuarioId);
    // As renovações que a suspensão revogou saem: reapresentada depois da reativação, uma delas
    // seria lida como reuso de token vazado, com WARN e as sessões novas derrubadas. Desconhecida,
    // é o 401 comum de sessão expirada. Só as revogadas a partir de `suspenso_em` (a suspensão
    // grava as duas datas com o mesmo now()): as revogadas antes continuam provando reuso.
    // Antes do UPDATE, que apaga `suspenso_em`; a linha da conta fica travada pelo FOR UPDATE.
    List<Instant> suspensaDesde =
        jdbc.query(
            "SELECT suspenso_em FROM usuario"
                + " WHERE id = ? AND suspenso AND exclusao_solicitada_em IS NULL FOR UPDATE",
            (rs, linha) -> instante(rs, "suspenso_em"),
            usuarioId);
    if (suspensaDesde.isEmpty()) {
      return estadoAtual(usuarioId);
    }
    int apagadas =
        jdbc.update(
            "DELETE FROM refresh_token r USING usuario u"
                + " WHERE r.usuario_id = u.id AND u.id = ? AND r.revogado"
                + " AND r.revogado_em >= u.suspenso_em",
            usuarioId);
    Instant reativadoEm =
        jdbc.queryForObject(
            "UPDATE usuario SET suspenso = false, suspenso_em = NULL, reativado_em = now(),"
                + " atualizado_em = now() WHERE id = ? RETURNING reativado_em",
            (rs, linha) -> instante(rs, "reativado_em"),
            usuarioId);
    log.info(
        "Conta {} reativada pelo admin {}; {} renovação(ões) revogada(s) pela suspensão apagada(s)",
        usuarioId,
        adminId,
        apagadas);
    return new EstadoDaSuspensaoResposta(usuarioId, false, null, reativadoEm, true);
  }

  private void recusarAdmin(UUID usuarioId) {
    if (contaAdministradora.eh(usuarioId)) {
      throw new ErroDeNegocioException(CodigoErro.ENTIDADE_NAO_PROCESSAVEL, CONTA_DO_ADMIN);
    }
  }

  /** Repetição, ou conta inexistente ou em exclusão pendente (404). */
  private EstadoDaSuspensaoResposta estadoAtual(UUID usuarioId) {
    return jdbc
        .query(
            "SELECT suspenso, suspenso_em, reativado_em FROM usuario"
                + " WHERE id = ? AND exclusao_solicitada_em IS NULL",
            (rs, linha) ->
                new EstadoDaSuspensaoResposta(
                    usuarioId,
                    rs.getBoolean("suspenso"),
                    instante(rs, "suspenso_em"),
                    instante(rs, "reativado_em"),
                    false),
            usuarioId)
        .stream()
        .findFirst()
        .orElseThrow(
            () ->
                new ErroDeNegocioException(
                    CodigoErro.RECURSO_NAO_ENCONTRADO, CONTA_NAO_ENCONTRADA));
  }

  private static Instant instante(ResultSet rs, String coluna) throws SQLException {
    Timestamp valor = rs.getTimestamp(coluna);
    return valor == null ? null : valor.toInstant();
  }
}
