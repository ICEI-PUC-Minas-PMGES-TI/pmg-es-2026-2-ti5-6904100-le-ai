package br.com.leai.identidade.seguimento;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.common.LimitePorUsuario;
import br.com.leai.identidade.perfil.PerfilResumoResposta;
import br.com.leai.identidade.perfil.RelacaoEntrePerfis;
import br.com.leai.identidade.usuario.Usuario;
import br.com.leai.identidade.usuario.UsuarioRepositorio;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Grafo de seguidores (RF-SOC-05..07): seguir perfil público, pedir para seguir perfil privado,
 * aceitar ou recusar, deixar de seguir e remover seguidor.
 *
 * <p><b>Contadores.</b> `qtd_seguidores`/`qtd_seguidos` mudam por `UPDATE ... + 1`, que é atômico
 * na linha, e só quando a relação de fato mudou (o `INSERT ... ON CONFLICT` e o `DELETE ...
 * RETURNING` dizem se mudou). As duas linhas são sempre atualizadas na mesma ordem de id: dois
 * leitores que se seguem ao mesmo tempo, em sentidos opostos, não se travam.
 *
 * <p><b>Duplicidade.</b> Os índices únicos decidem, não uma leitura prévia: `seguidor_par_unico`
 * e `solicitacao_seguir_pendente_unica`. Seguir de novo, ou pedir de novo com pedido pendente, é
 * `409` como o contrato manda; a repetição da mesma `Idempotency-Key` não chega aqui.
 */
@Service
public class ServicoDeSeguimento {

  static final String NAO_ENCONTRADO = "Não encontramos esse leitor.";
  static final String SOLICITACAO_NAO_ENCONTRADA = "Não encontramos essa solicitação.";

  private final UsuarioRepositorio repositorio;
  private final JdbcTemplate jdbc;
  private final RelacaoEntrePerfis relacoes;
  private final EventosDeSeguimento eventos;
  private final LimitePorUsuario limiteDeSeguir;

  public ServicoDeSeguimento(
      UsuarioRepositorio repositorio,
      JdbcTemplate jdbc,
      RelacaoEntrePerfis relacoes,
      EventosDeSeguimento eventos,
      @Qualifier("limiteDeSeguir") LimitePorUsuario limiteDeSeguir) {
    this.repositorio = repositorio;
    this.jdbc = jdbc;
    this.relacoes = relacoes;
    this.eventos = eventos;
    this.limiteDeSeguir = limiteDeSeguir;
  }

  /** Perfil público: seguimento imediato (RF-SOC-05). Privado: pedido pendente (RF-SOC-06). */
  @Transactional
  public ResultadoSeguir seguir(UUID eu, String username) {
    limiteDeSeguir.registrar(eu);
    Usuario alvo = visivel(username);
    if (alvo.id().equals(eu)) {
      throw conflito("Você não pode seguir o próprio perfil.");
    }
    Usuario seguidor = conta(eu);
    if (RelacaoEntrePerfis.SEGUINDO.equals(relacoes.entre(eu, alvo.id()))) {
      throw conflito("Você já segue esse leitor.");
    }

    if (!alvo.ehPrivado()) {
      UUID seguimentoId =
          primeiro(
              jdbc.queryForList(
                  "INSERT INTO seguidor (seguidor_id, seguido_id) VALUES (?, ?)"
                      + " ON CONFLICT (seguidor_id, seguido_id) DO NOTHING RETURNING id",
                  UUID.class,
                  eu,
                  alvo.id()));
      if (seguimentoId == null) {
        throw conflito("Você já segue esse leitor.");
      }
      ajustarContadores(eu, alvo.id(), 1);
      eventos.seguidorNovo(seguimentoId, alvo.id(), seguidor);
      return ResultadoSeguir.seguindo();
    }

    UUID solicitacaoId =
        primeiro(
            jdbc.queryForList(
                "INSERT INTO solicitacao_seguir (solicitante_id, alvo_id) VALUES (?, ?)"
                    + " ON CONFLICT (solicitante_id, alvo_id) WHERE status = 'pendente'"
                    + " DO NOTHING RETURNING id",
                UUID.class,
                eu,
                alvo.id()));
    if (solicitacaoId == null) {
      throw conflito("Você já pediu para seguir esse leitor.");
    }
    eventos.solicitacaoCriada(solicitacaoId, alvo.id(), seguidor);
    return ResultadoSeguir.pendente(solicitacaoId.toString());
  }

  /** Deixar de seguir (RF-SOC-07). Sem relação é `204` do mesmo jeito: o estado final é o pedido. */
  @Transactional
  public void deixarDeSeguir(UUID eu, String username) {
    Usuario alvo = visivel(username);
    desfazer(eu, alvo.id());
  }

  /** Remover um seguidor (RF-SOC-07): só a relação em que o autenticado é o seguido. */
  @Transactional
  public void removerSeguidor(UUID eu, String username) {
    Usuario seguidor = visivel(username);
    desfazer(seguidor.id(), eu);
  }

  /** Caixa de pedidos recebidos, só do destinatário, mais recentes primeiro. Conta oculta some. */
  @Transactional(readOnly = true)
  public Pagina<SolicitacaoResposta> solicitacoes(UUID eu, int page, int size) {
    Pagina.validar(page, size);
    String deQuem =
        " FROM solicitacao_seguir s JOIN usuario u ON u.id = s.solicitante_id"
            + " WHERE s.alvo_id = ? AND s.status = 'pendente'"
            + " AND u.suspenso = false AND u.exclusao_solicitada_em IS NULL";
    Long total = jdbc.queryForObject("SELECT count(*)" + deQuem, Long.class, eu);
    List<Map<String, Object>> linhas =
        jdbc.queryForList(
            "SELECT s.id, s.solicitante_id, s.criado_em"
                + deQuem
                + " ORDER BY s.criado_em DESC, s.id LIMIT ? OFFSET ?",
            eu,
            size,
            (long) page * size);
    List<SolicitacaoResposta> itens =
        linhas.stream()
            .map(
                linha -> {
                  Usuario solicitante = conta((UUID) linha.get("solicitante_id"));
                  return new SolicitacaoResposta(
                      linha.get("id").toString(),
                      PerfilResumoResposta.de(solicitante, relacoes.entre(eu, solicitante.id())),
                      ((Timestamp) linha.get("criado_em")).toInstant().toString());
                })
            .toList();
    return Pagina.de(itens, page, size, total == null ? 0 : total);
  }

  /** Quem segue o autenticado (RF-SOC-08), mais recentes primeiro. Só do próprio dono. */
  @Transactional(readOnly = true)
  public Pagina<PerfilResumoResposta> seguidores(UUID eu, int page, int size) {
    return relacionados(eu, "seguido_id", "seguidor_id", page, size);
  }

  /** Quem o autenticado segue (RF-SOC-08), mais recentes primeiro. Só do próprio dono. */
  @Transactional(readOnly = true)
  public Pagina<PerfilResumoResposta> seguidos(UUID eu, int page, int size) {
    return relacionados(eu, "seguidor_id", "seguido_id", page, size);
  }

  /**
   * Página de um lado do grafo do autenticado. Não há versão para terceiros (SEC-19/44): o dono
   * vem sempre do token. Conta suspensa ou com exclusão pendente some, como nas VIEWs, e por isso
   * o total pode ser menor que o contador do perfil. As colunas vêm só das duas chamadas acima.
   */
  private Pagina<PerfilResumoResposta> relacionados(
      UUID eu, String colunaDoDono, String colunaDoOutro, int page, int size) {
    Pagina.validar(page, size);
    String deQuem =
        " FROM seguidor s JOIN usuario u ON u.id = s."
            + colunaDoOutro
            + " WHERE s."
            + colunaDoDono
            + " = ? AND u.suspenso = false AND u.exclusao_solicitada_em IS NULL";
    Long total = jdbc.queryForObject("SELECT count(*)" + deQuem, Long.class, eu);
    List<UUID> ids =
        jdbc.queryForList(
            "SELECT u.id" + deQuem + " ORDER BY s.criado_em DESC, s.id LIMIT ? OFFSET ?",
            UUID.class,
            eu,
            size,
            (long) page * size);
    List<PerfilResumoResposta> itens =
        ids.stream()
            .map(id -> PerfilResumoResposta.de(conta(id), relacoes.entre(eu, id)))
            .toList();
    return Pagina.de(itens, page, size, total == null ? 0 : total);
  }

  /** Aceitar (RF-SOC-06): encerra o pedido e cria o seguimento, com evento para quem pediu. */
  @Transactional
  public void aceitar(UUID eu, UUID solicitacaoId) {
    UUID solicitanteId = pendenteRecebida(eu, solicitacaoId);
    jdbc.update(
        "UPDATE solicitacao_seguir SET status = 'aceita', resolvido_em = now() WHERE id = ?",
        solicitacaoId);
    List<UUID> criado =
        jdbc.queryForList(
            "INSERT INTO seguidor (seguidor_id, seguido_id) VALUES (?, ?)"
                + " ON CONFLICT (seguidor_id, seguido_id) DO NOTHING RETURNING id",
            UUID.class,
            solicitanteId,
            eu);
    UUID seguimentoId;
    if (criado.isEmpty()) {
      // Já seguia (o perfil era público quando seguiu): o pedido fecha, sem contar de novo.
      seguimentoId =
          jdbc.queryForObject(
              "SELECT id FROM seguidor WHERE seguidor_id = ? AND seguido_id = ?",
              UUID.class,
              solicitanteId,
              eu);
    } else {
      seguimentoId = criado.getFirst();
      ajustarContadores(solicitanteId, eu, 1);
    }
    eventos.solicitacaoAceita(solicitacaoId, seguimentoId, solicitanteId, conta(eu));
  }

  /** Recusar (RF-SOC-06): encerra o pedido sem seguimento e sem evento. */
  @Transactional
  public void recusar(UUID eu, UUID solicitacaoId) {
    pendenteRecebida(eu, solicitacaoId);
    jdbc.update(
        "UPDATE solicitacao_seguir SET status = 'recusada', resolvido_em = now() WHERE id = ?",
        solicitacaoId);
  }

  /**
   * Trava o pedido e confere que é um pendente recebido pelo autenticado. Pedido de outra pessoa
   * é `404`, igual ao inexistente: o id não confirma que o pedido existe (sem IDOR).
   */
  private UUID pendenteRecebida(UUID eu, UUID solicitacaoId) {
    List<Map<String, Object>> linha =
        jdbc.queryForList(
            "SELECT s.solicitante_id, s.status FROM solicitacao_seguir s"
                + " JOIN usuario u ON u.id = s.solicitante_id"
                + " WHERE s.id = ? AND s.alvo_id = ?"
                + " AND u.suspenso = false AND u.exclusao_solicitada_em IS NULL"
                + " FOR UPDATE OF s",
            solicitacaoId,
            eu);
    if (linha.isEmpty()) {
      throw new ErroDeNegocioException(
          CodigoErro.RECURSO_NAO_ENCONTRADO, SOLICITACAO_NAO_ENCONTRADA);
    }
    if (!"pendente".equals(linha.getFirst().get("status"))) {
      throw conflito("Essa solicitação já foi respondida.");
    }
    return (UUID) linha.getFirst().get("solicitante_id");
  }

  private void desfazer(UUID seguidorId, UUID seguidoId) {
    int removidos =
        jdbc.update(
            "DELETE FROM seguidor WHERE seguidor_id = ? AND seguido_id = ?", seguidorId, seguidoId);
    if (removidos > 0) {
      ajustarContadores(seguidorId, seguidoId, -1);
    }
  }

  /** Um lado ganha ou perde um seguidor, o outro um seguido, sempre na mesma ordem de id. */
  private void ajustarContadores(UUID seguidorId, UUID seguidoId, int delta) {
    boolean seguidorPrimeiro = seguidorId.compareTo(seguidoId) < 0;
    if (seguidorPrimeiro) {
      somarSeguidos(seguidorId, delta);
      somarSeguidores(seguidoId, delta);
    } else {
      somarSeguidores(seguidoId, delta);
      somarSeguidos(seguidorId, delta);
    }
  }

  private void somarSeguidos(UUID id, int delta) {
    jdbc.update("UPDATE usuario SET qtd_seguidos = qtd_seguidos + ? WHERE id = ?", delta, id);
  }

  private void somarSeguidores(UUID id, int delta) {
    jdbc.update("UPDATE usuario SET qtd_seguidores = qtd_seguidores + ? WHERE id = ?", delta, id);
  }

  private Usuario visivel(String username) {
    return repositorio
        .buscarVisivelPorUsername(username)
        .orElseThrow(
            () -> new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, NAO_ENCONTRADO));
  }

  private Usuario conta(UUID id) {
    return repositorio
        .findById(id)
        .orElseThrow(
            () -> new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, NAO_ENCONTRADO));
  }

  private static UUID primeiro(List<UUID> linhas) {
    return linhas.isEmpty() ? null : linhas.getFirst();
  }

  private static ErroDeNegocioException conflito(String mensagem) {
    return new ErroDeNegocioException(CodigoErro.CONFLITO, mensagem);
  }
}
