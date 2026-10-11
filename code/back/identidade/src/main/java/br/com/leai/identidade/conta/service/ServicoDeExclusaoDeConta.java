package br.com.leai.identidade.conta.service;

import br.com.leai.identidade.auth.service.ContaAdministradora;
import br.com.leai.identidade.auth.service.GestorDeRenovacao;
import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.CorrelationIdFilter;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.common.LimitePorUsuario;
import br.com.leai.identidade.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.identidade.conta.dto.ExclusaoSolicitadaResposta;
import br.com.leai.identidade.conta.dto.SolicitarExclusaoRequisicao;
import br.com.leai.identidade.usuario.Usuario;
import br.com.leai.identidade.usuario.UsuarioRepositorio;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

/**
 * Exclusão e recuperação de conta (F-CONTA-2, RF-AUT-07, RN-23).
 *
 * <p>Três momentos, cada um com a própria transação:
 *
 * <ol>
 *   <li><b>Solicitar</b>: abre a janela de 30 dias. Nada é apagado; a conta some para os outros
 *       porque as VIEWs de contrato já omitem {@code exclusao_solicitada_em} preenchida.
 *   <li><b>Cancelar</b>: fecha a janela sem recriar nada nem publicar evento (RN-23.4).
 *   <li><b>Finalizar</b> (job diário): remove a identidade, anonimiza os registros técnicos e
 *       grava {@code conta.excluida} na outbox; os demais serviços apagam o que é deles.
 * </ol>
 *
 * <p>Toda escrita é SQL parametrizado (RNF-SEC-12). As duas datas do usuário vão no mesmo
 * {@code UPDATE} com o mesmo {@code now()}, porque o CHECK do banco exige exatamente +30 dias.
 */
@Service
public class ServicoDeExclusaoDeConta {

  static final String SESSAO_EXPIRADA = "Sua sessão expirou. Entre novamente.";

  static final String SENHA_INCORRETA = "Senha incorreta. Sua conta continua como estava.";

  static final String CONTA_DO_ADMIN = "A conta administradora não pode ser excluída.";

  static final String PRAZO_VENCIDO =
      "O prazo para cancelar a exclusão terminou. A conta será removida.";

  /** Contas finalizadas por chamada do job; o restante fica para a execução seguinte. */
  static final int LOTE_DO_JOB = 100;

  private static final Logger log = LoggerFactory.getLogger(ServicoDeExclusaoDeConta.class);

  private final UsuarioRepositorio repositorio;
  private final JdbcTemplate jdbc;
  private final TransactionTemplate transacao;
  private final PasswordEncoder codificadorDeSenha;
  private final GestorDeRenovacao gestorDeRenovacao;
  private final ContaAdministradora contaAdministradora;
  private final LimitePorUsuario limiteDeSenha;
  private final ServicoDeIdempotencia idempotencia;
  private final RemocaoDeAsset remocaoDeAsset;
  private final ObjectMapper objectMapper;

  public ServicoDeExclusaoDeConta(
      UsuarioRepositorio repositorio,
      JdbcTemplate jdbc,
      TransactionTemplate transacao,
      PasswordEncoder codificadorDeSenha,
      GestorDeRenovacao gestorDeRenovacao,
      ContaAdministradora contaAdministradora,
      @Qualifier("limiteDeSenhaNaExclusao") LimitePorUsuario limiteDeSenha,
      ServicoDeIdempotencia idempotencia,
      RemocaoDeAsset remocaoDeAsset,
      ObjectMapper objectMapper) {
    this.repositorio = repositorio;
    this.jdbc = jdbc;
    this.transacao = transacao;
    this.codificadorDeSenha = codificadorDeSenha;
    this.gestorDeRenovacao = gestorDeRenovacao;
    this.contaAdministradora = contaAdministradora;
    this.limiteDeSenha = limiteDeSenha;
    this.idempotencia = idempotencia;
    this.remocaoDeAsset = remocaoDeAsset;
    this.objectMapper = objectMapper;
  }

  /**
   * Abre a janela de recuperação (RN-23.1 a 23.3). Corre dentro da transação da idempotência:
   * recibo HTTP, datas, recibo técnico e revogação das renovações entram ou saem juntos.
   *
   * <p>O limite conta só as senhas erradas: 5 em 15 minutos e a sexta tentativa já é 429, antes
   * de qualquer comparação. Pedido repetido com a conta já pendente devolve a mesma janela, sem
   * abrir outra.
   */
  @Transactional
  public ExclusaoSolicitadaResposta solicitar(
      UUID usuarioId, String chave, SolicitarExclusaoRequisicao requisicao) {
    if (contaAdministradora.eh(usuarioId)) {
      throw new ErroDeNegocioException(CodigoErro.ACESSO_NEGADO, CONTA_DO_ADMIN);
    }
    limiteDeSenha.verificar(usuarioId);

    Usuario usuario =
        repositorio
            .buscarParaAtualizar(usuarioId)
            .orElseThrow(
                () ->
                    new ErroDeNegocioException(
                        CodigoErro.NAO_AUTENTICADO, SESSAO_EXPIRADA));

    if (!codificadorDeSenha.matches(requisicao.senha(), usuario.senhaHash())) {
      limiteDeSenha.registrar(usuarioId);
      // RNF-SEC-35: falha de autenticação registrada; RNF-SEC-36: nunca a senha tentada.
      log.warn("Exclusão de conta recusada: senha incorreta para o usuário {}", usuarioId);
      // 422 e não 401, como na troca de senha: o token é válido.
      throw new ErroDeNegocioException(CodigoErro.ENTIDADE_NAO_PROCESSAVEL, SENHA_INCORRETA);
    }

    if (usuario.exclusaoPendente()) {
      return new ExclusaoSolicitadaResposta(
          usuario.exclusaoSolicitadaEm(), usuario.exclusaoPrevistaEm());
    }

    Map<String, Object> datas =
        jdbc.queryForMap(
            "UPDATE usuario SET exclusao_solicitada_em = now(),"
                + " exclusao_prevista_em = now() + INTERVAL '30 days', atualizado_em = now()"
                + " WHERE id = ? RETURNING exclusao_solicitada_em, exclusao_prevista_em",
            usuarioId);
    jdbc.update(
        "INSERT INTO exclusao_conta (usuario_ref, chave_idempotencia, criado_em, prevista_em,"
            + " replay_ate) VALUES (?, ?, now(), now() + INTERVAL '30 days',"
            + " now() + INTERVAL '24 hours')",
        usuarioId,
        chave);
    int revogadas = gestorDeRenovacao.revogarAtivos(usuarioId);

    // RNF-SEC-35/36: auditoria só com o id, sem dado pessoal.
    log.info(
        "Exclusão de conta solicitada pelo usuário {}; {} renovação(ões) revogada(s)",
        usuarioId,
        revogadas);
    return new ExclusaoSolicitadaResposta(
        instante(datas.get("exclusao_solicitada_em")),
        instante(datas.get("exclusao_prevista_em")));
  }

  /**
   * Fecha a janela (RN-23.4). Conta que já não está pendente é sucesso sem efeito: o segundo
   * clique, ou o cancelamento repetido por outra aba, não é erro. Prazo vencido e conta ainda
   * não finalizada pelo job é 410: o cancelamento vale só dentro dos 30 dias.
   */
  @Transactional
  public void cancelar(UUID usuarioId) {
    Usuario usuario =
        repositorio
            .buscarParaAtualizar(usuarioId)
            .orElseThrow(
                () ->
                    new ErroDeNegocioException(
                        CodigoErro.NAO_AUTENTICADO, SESSAO_EXPIRADA));
    if (!usuario.exclusaoPendente()) {
      return;
    }
    Boolean vencido =
        jdbc.queryForObject(
            "SELECT exclusao_prevista_em <= now() FROM usuario WHERE id = ?",
            Boolean.class,
            usuarioId);
    if (Boolean.TRUE.equals(vencido)) {
      throw new ErroDeNegocioException(CodigoErro.RECURSO_EXPIRADO, PRAZO_VENCIDO);
    }

    jdbc.update(
        "UPDATE usuario SET exclusao_solicitada_em = NULL, exclusao_prevista_em = NULL,"
            + " atualizado_em = now() WHERE id = ?",
        usuarioId);
    jdbc.update(
        "UPDATE exclusao_conta SET status = 'cancelada', cancelada_em = now()"
            + " WHERE usuario_ref = ? AND status = 'pendente'",
        usuarioId);
    log.info("Exclusão de conta cancelada pelo usuário {}", usuarioId);
  }

  /**
   * Job diário (RN-23.5): finaliza as solicitações vencidas, uma transação por conta, para que a
   * falha de uma não desfaça as outras. O avatar é apagado no Cloudinary depois de cada commit.
   *
   * <p>Antes, anonimiza o que já pode ser anonimizado: envelopes de {@code conta.excluida} já
   * publicados e recibos de idempotência fora da janela de replay, que não servem mais a nada e
   * podem carregar resposta de conta que já não existe.
   */
  public int finalizarVencidas() {
    transacao.executeWithoutResult(status -> anonimizarRegistrosVencidos());

    List<UUID> recibos =
        jdbc.queryForList(
            "SELECT id FROM exclusao_conta WHERE status = 'pendente' AND prevista_em <= now()"
                + " ORDER BY prevista_em LIMIT ?",
            UUID.class,
            LOTE_DO_JOB);

    int finalizadas = 0;
    List<String> assets = new ArrayList<>();
    for (UUID reciboId : recibos) {
      String[] asset = new String[1];
      Boolean finalizou =
          transacao.execute(
              status -> {
                Finalizacao resultado = finalizar(reciboId);
                asset[0] = resultado.avatarAssetId();
                return resultado.finalizou();
              });
      if (Boolean.TRUE.equals(finalizou)) {
        finalizadas++;
        if (asset[0] != null) {
          assets.add(asset[0]);
        }
      }
    }
    assets.forEach(remocaoDeAsset::apagar);
    log.info("Job de exclusão de conta: {} conta(s) finalizada(s)", finalizadas);
    return finalizadas;
  }

  private record Finalizacao(boolean finalizou, String avatarAssetId) {}

  private Finalizacao finalizar(UUID reciboId) {
    List<UUID> travado =
        jdbc.queryForList(
            "SELECT usuario_ref FROM exclusao_conta WHERE id = ? AND status = 'pendente'"
                + " AND prevista_em <= now() FOR UPDATE SKIP LOCKED",
            UUID.class,
            reciboId);
    if (travado.isEmpty()) {
      // Outra execução pegou, ou o leitor cancelou entre a listagem e aqui.
      return new Finalizacao(false, null);
    }
    UUID usuarioId = travado.get(0);

    List<Map<String, Object>> conta =
        jdbc.queryForList(
            "SELECT email::text AS email, username::text AS username, avatar_asset_id,"
                + " exclusao_solicitada_em FROM usuario"
                + " WHERE id = ? FOR UPDATE",
            usuarioId);
    String avatarAssetId = null;
    if (!conta.isEmpty()) {
      Map<String, Object> linha = conta.get(0);
      if (linha.get("exclusao_solicitada_em") == null) {
        // Recibo pendente de conta que não está mais em exclusão: estado inconsistente. Não
        // apagar nada; o recibo fica para inspeção.
        log.warn("Recibo de exclusão {} pendente para conta fora de exclusão", reciboId);
        return new Finalizacao(false, null);
      }
      String email = (String) linha.get("email");
      String username = (String) linha.get("username");
      avatarAssetId = (String) linha.get("avatar_asset_id");

      jdbc.update(
          "DELETE FROM tentativa_login WHERE lower(identidade::text) IN (lower(?), lower(?))",
          email,
          username);
      anonimizarRecibosDoSujeito(idempotencia.sujeitoAnonimo(email));
      anonimizarRecibosDoSujeito(idempotencia.sujeitoAnonimo(username));
      // ON DELETE CASCADE leva refresh_token, reset_token, seguidor e solicitacao_seguir.
      jdbc.update("DELETE FROM usuario WHERE id = ?", usuarioId);
    }

    anonimizarRecibosDoSujeito(usuarioId);
    limparOutbox(usuarioId);
    // Recibos cancelados antes não podem ser anonimizados (o CHECK só aceita os concluídos) e
    // guardariam a referência à conta: saem.
    jdbc.update(
        "DELETE FROM exclusao_conta WHERE usuario_ref = ? AND status = 'cancelada'", usuarioId);
    jdbc.update(
        "UPDATE exclusao_conta SET status = 'concluida', concluida_em = now(),"
            + " usuario_ref = NULL, chave_idempotencia = NULL, anonimizado_em = now()"
            + " WHERE id = ?",
        reciboId);
    gravarContaExcluida(usuarioId);

    log.info("Exclusão de conta finalizada pelo recibo {}", reciboId);
    return new Finalizacao(true, avatarAssetId);
  }

  private void anonimizarRecibosDoSujeito(UUID sujeito) {
    jdbc.update(
        "UPDATE idempotencia_identidade SET subject_ref = NULL, chave = NULL,"
            + " payload_hash = NULL, resposta = NULL, anonimizado_em = now()"
            + " WHERE subject_ref = ? AND anonimizado_em IS NULL",
        sujeito);
  }

  /**
   * Eventos que citam a conta: os pendentes saem, porque publicá-los republicaria dado de quem
   * foi excluído; os publicados são anonimizados (o CHECK só permite isso depois de publicar).
   * A busca é textual porque a outbox não tem coluna de usuário.
   */
  private void limparOutbox(UUID usuarioId) {
    String padrao = "%" + usuarioId + "%";
    jdbc.update(
        "DELETE FROM outbox_identidade WHERE status = 'pendente'"
            + " AND (payload::text LIKE ? OR chave_negocio LIKE ?)",
        padrao,
        padrao);
    jdbc.update(
        "UPDATE outbox_identidade SET chave_negocio = NULL, correlation_id = NULL,"
            + " payload = NULL, anonimizado_em = now()"
            + " WHERE status = 'publicado' AND anonimizado_em IS NULL"
            + " AND (payload::text LIKE ? OR chave_negocio LIKE ?)",
        padrao,
        padrao);
  }

  private void anonimizarRegistrosVencidos() {
    jdbc.update(
        "UPDATE outbox_identidade SET chave_negocio = NULL, correlation_id = NULL,"
            + " payload = NULL, anonimizado_em = now()"
            + " WHERE tipo = 'conta.excluida' AND status = 'publicado' AND anonimizado_em IS NULL");
    jdbc.update(
        "UPDATE idempotencia_identidade SET subject_ref = NULL, chave = NULL,"
            + " payload_hash = NULL, resposta = NULL, anonimizado_em = now()"
            + " WHERE replay_ate < now() AND anonimizado_em IS NULL");
  }

  /** `conta.excluida` v1 na outbox, na transação da remoção (RNF-ERR-10). */
  private void gravarContaExcluida(UUID usuarioId) {
    jdbc.update(
        "INSERT INTO outbox_identidade (event_id, tipo, versao, chave_negocio, correlation_id,"
            + " payload) VALUES (?, 'conta.excluida', 1, ?, ?, ?::jsonb)",
        UUID.randomUUID(),
        "conta:" + usuarioId,
        correlationId(),
        objectMapper.writeValueAsString(Map.of("usuarioId", usuarioId.toString())));
  }

  private static UUID correlationId() {
    try {
      return UUID.fromString(CorrelationIdFilter.atual());
    } catch (IllegalArgumentException | NullPointerException semCorrelationValido) {
      return UUID.randomUUID();
    }
  }

  private static java.time.Instant instante(Object valor) {
    if (valor instanceof Timestamp timestamp) {
      return timestamp.toInstant();
    }
    if (valor instanceof java.time.OffsetDateTime data) {
      return data.toInstant();
    }
    return (java.time.Instant) valor;
  }
}
