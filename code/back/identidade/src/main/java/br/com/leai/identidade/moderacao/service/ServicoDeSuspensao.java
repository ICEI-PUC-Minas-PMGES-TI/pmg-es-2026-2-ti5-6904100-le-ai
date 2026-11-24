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
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Suspende e reativa a conta (F-MOD-OPC, RF-MOD-04). Idempotente pelo estado: um comando novo
 * sobre a conta que já está no estado pedido devolve o estado atual com {@code alterado = false}.
 *
 * <p><b>Identidade do comando</b> (revisão do PR #61): cada intenção do administrador chega com o
 * id que o {@code social} gerou para ela, e o resultado fica em {@code comando_de_conta}. Repetir o
 * mesmo id devolve o resultado gravado sem executar de novo, mesmo que outra ação tenha mudado a
 * conta depois: uma suspensão reenviada após a reativação não suspende outra vez. O id é por
 * intenção, não por alvo, então suspender, reativar e suspender de novo são três episódios. A
 * {@link #resolver resolução} conclui ou cancela um comando cujo resultado o {@code social}
 * perdeu, antes de uma ação nova sobre a mesma conta.
 *
 * <p>Toda escrita começa travando a linha da conta: o comando atrasado e a resolução do mesmo id
 * se serializam ali, e o pedido de exclusão (que trava a mesma linha) também. Só suspende conta
 * ativa e sem exclusão pendente; quando não altera, um {@code SELECT} decide entre o 404 e a
 * repetição.
 */
@Service
public class ServicoDeSuspensao {

  static final String CONTA_DO_ADMIN = "A conta administradora não pode ser suspensa.";
  static final String CONTA_NAO_ENCONTRADA = "Não encontramos esta conta.";
  static final String SUSPENSAO = "suspensao";
  static final String REATIVACAO = "reativacao";

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
  public EstadoDaSuspensaoResposta suspender(UUID usuarioId, UUID adminId, UUID comandoId) {
    recusarAdmin(usuarioId);
    travarConta(usuarioId);
    Optional<EstadoDaSuspensaoResposta> anterior =
        comandoAplicado(comandoId, usuarioId, SUSPENSAO);
    if (anterior.isPresent()) {
      return anterior.get();
    }
    return gravar(comandoId, SUSPENSAO, aplicarSuspensao(usuarioId, adminId));
  }

  private EstadoDaSuspensaoResposta aplicarSuspensao(UUID usuarioId, UUID adminId) {
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
  public EstadoDaSuspensaoResposta reativar(UUID usuarioId, UUID adminId, UUID comandoId) {
    recusarAdmin(usuarioId);
    travarConta(usuarioId);
    Optional<EstadoDaSuspensaoResposta> anterior =
        comandoAplicado(comandoId, usuarioId, REATIVACAO);
    if (anterior.isPresent()) {
      return anterior.get();
    }
    return gravar(comandoId, REATIVACAO, aplicarReativacao(usuarioId, adminId));
  }

  /**
   * Resolve um comando cujo resultado o {@code social} não recebeu: o estado gravado, se ele já
   * rodou; vazio, se não, e então ele fica cancelado e nunca mais roda (o atrasado recebe 409).
   * Não lança o 409 aqui dentro, porque a exceção desfaria o cancelamento: quem responde é o
   * controller, depois do commit.
   */
  @Transactional
  public Optional<EstadoDaSuspensaoResposta> resolver(
      UUID usuarioId, UUID adminId, UUID comandoId) {
    travarConta(usuarioId);
    Optional<Comando> gravado = comando(comandoId);
    if (gravado.isPresent()) {
      exigirMesmaConta(gravado.get(), usuarioId);
      return gravado.get().aplicado() ? Optional.of(gravado.get().estado()) : Optional.empty();
    }
    jdbc.update(
        "INSERT INTO comando_de_conta (id, usuario_id, estado) VALUES (?, ?, 'cancelado')",
        comandoId,
        usuarioId);
    log.info(
        "Comando {} da conta {} cancelado pelo admin {} antes de rodar",
        comandoId,
        usuarioId,
        adminId);
    return Optional.empty();
  }

  private EstadoDaSuspensaoResposta aplicarReativacao(UUID usuarioId, UUID adminId) {
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

  /**
   * Trava a linha da conta até o fim da transação; conta inexistente é 404. A conta em exclusão
   * pendente passa daqui: o comando decide o 404 dela, e a resolução ainda conclui o que já rodou.
   */
  private void travarConta(UUID usuarioId) {
    if (jdbc.queryForList("SELECT id FROM usuario WHERE id = ? FOR UPDATE", usuarioId).isEmpty()) {
      throw new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, CONTA_NAO_ENCONTRADA);
    }
  }

  /** O resultado gravado do mesmo comando, se ele já rodou; 409 se ele foi cancelado. */
  private Optional<EstadoDaSuspensaoResposta> comandoAplicado(
      UUID comandoId, UUID usuarioId, String acao) {
    Optional<Comando> gravado = comando(comandoId);
    if (gravado.isEmpty()) {
      return Optional.empty();
    }
    exigirMesmaConta(gravado.get(), usuarioId);
    if (!gravado.get().aplicado()) {
      log.info("Comando {} da conta {} chegou depois de cancelado; não roda", comandoId, usuarioId);
      throw new ErroDeNegocioException(
          CodigoErro.COMANDO_CANCELADO, CodigoErro.COMANDO_CANCELADO.mensagem());
    }
    if (!acao.equals(gravado.get().acao())) {
      throw comandoDivergente(comandoId);
    }
    return Optional.of(gravado.get().estado());
  }

  private static void exigirMesmaConta(Comando gravado, UUID usuarioId) {
    if (!gravado.estado().usuarioId().equals(usuarioId)) {
      throw comandoDivergente(gravado.id());
    }
  }

  /** O social deriva o id da intenção: o mesmo id com outra conta ou ação é defeito dele. */
  private static ErroDeNegocioException comandoDivergente(UUID comandoId) {
    log.error("Comando {} reapresentado com outra conta ou outra ação", comandoId);
    return new ErroDeNegocioException(CodigoErro.CONFLITO, CodigoErro.CONFLITO.mensagem());
  }

  private EstadoDaSuspensaoResposta gravar(
      UUID comandoId, String acao, EstadoDaSuspensaoResposta estado) {
    jdbc.update(
        "INSERT INTO comando_de_conta"
            + " (id, usuario_id, acao, estado, suspenso, suspenso_em, reativado_em, alterado)"
            + " VALUES (?, ?, ?, 'aplicado', ?, ?, ?, ?)",
        comandoId,
        estado.usuarioId(),
        acao,
        estado.suspenso(),
        estado.suspensoEm() == null ? null : Timestamp.from(estado.suspensoEm()),
        estado.reativadoEm() == null ? null : Timestamp.from(estado.reativadoEm()),
        estado.alterado());
    return estado;
  }

  private Optional<Comando> comando(UUID comandoId) {
    return jdbc
        .query(
            "SELECT id, usuario_id, acao, estado, suspenso, suspenso_em, reativado_em, alterado"
                + " FROM comando_de_conta WHERE id = ?",
            (rs, linha) ->
                new Comando(
                    rs.getObject("id", UUID.class),
                    rs.getString("acao"),
                    "aplicado".equals(rs.getString("estado")),
                    new EstadoDaSuspensaoResposta(
                        rs.getObject("usuario_id", UUID.class),
                        rs.getBoolean("suspenso"),
                        instante(rs, "suspenso_em"),
                        instante(rs, "reativado_em"),
                        rs.getBoolean("alterado"))),
            comandoId)
        .stream()
        .findFirst();
  }

  private record Comando(
      UUID id, String acao, boolean aplicado, EstadoDaSuspensaoResposta estado) {}

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
