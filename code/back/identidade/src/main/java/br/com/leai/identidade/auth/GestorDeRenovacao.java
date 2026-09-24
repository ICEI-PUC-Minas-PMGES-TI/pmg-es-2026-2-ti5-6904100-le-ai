package br.com.leai.identidade.auth;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Token de renovação rotativo e revogável (RF-AUT-03, RNF-SEC-30), sobre {@code refresh_token}.
 *
 * <p><b>Formato e armazenamento.</b> 256 bits de {@link SecureRandom} em base64url, opaco para o
 * cliente. O banco guarda só o SHA-256 do token. Hash rápido e sem sal é suficiente aqui, ao
 * contrário da senha: com 256 bits de entropia não há dicionário a testar, e o hash determinístico
 * é o que permite achar a linha pelo token apresentado.
 *
 * <p><b>Rotação.</b> Cada uso revoga o token apresentado e emite outro, num {@code UPDATE ...
 * RETURNING} só: duas requisições com o mesmo token não conseguem as duas renovar, porque a
 * segunda encontra a linha já revogada.
 *
 * <p><b>Detecção de reuso.</b> Token já revogado reapresentado é sinal de que ele vazou: ou quem
 * o roubou já renovou, ou o dono legítimo está usando um que o ladrão renovou. Nos dois casos não
 * dá para saber quem é quem, então todas as renovações do usuário caem e ele precisa entrar de
 * novo (decisão de 24/09/2026, registrada em F-AUT). O custo é que dois usos legítimos simultâneos
 * do mesmo token, como duas abas renovando juntas, também derrubam a sessão; por isso o cliente
 * web serializa a renovação entre abas. A repetição da mesma requisição, com a mesma
 * {@code Idempotency-Key}, não conta como reuso: a revogação só acontece depois que a
 * idempotência confirma que não há recibo a devolver ({@link RenovacaoReusadaException}).
 */
@Component
public class GestorDeRenovacao {

  private static final Logger log = LoggerFactory.getLogger(GestorDeRenovacao.class);

  /**
   * Validade de cada token de renovação. Os documentos não fixam valor; 30 dias foi a decisão de
   * 24/09/2026. Como cada uso emite um token novo, quem usa o app ao menos uma vez por mês não
   * precisa entrar de novo.
   */
  static final Duration VALIDADE = Duration.ofDays(30);

  static final String SESSAO_EXPIRADA = "Sua sessão expirou. Entre novamente.";

  private static final int BYTES_DO_TOKEN = 32;

  private final JdbcTemplate jdbc;
  private final SecureRandom aleatorio = new SecureRandom();

  public GestorDeRenovacao(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** Emite um token novo para o usuário. Chamar dentro da transação do login ou da rotação. */
  public String emitir(UUID usuarioId) {
    byte[] bytes = new byte[BYTES_DO_TOKEN];
    aleatorio.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    jdbc.update(
        """
        INSERT INTO refresh_token (usuario_id, token_hash, expira_em)
        VALUES (?, ?, now() + make_interval(secs => ?))
        """,
        usuarioId,
        hash(token),
        VALIDADE.toSeconds());
    return token;
  }

  /**
   * Revoga o token apresentado e devolve o dono, para quem chamou emitir o par novo na mesma
   * transação. Token desconhecido, expirado ou já revogado é 401, sempre com a mesma mensagem.
   */
  public UUID consumir(String token) {
    String tokenHash = hash(token);
    List<UUID> dono =
        jdbc.queryForList(
            """
            UPDATE refresh_token SET revogado = true
             WHERE token_hash = ? AND revogado = false AND expira_em > now()
            RETURNING usuario_id
            """,
            UUID.class,
            tokenHash);
    if (!dono.isEmpty()) {
      return dono.getFirst();
    }

    List<UUID> revogado =
        jdbc.queryForList(
            "SELECT usuario_id FROM refresh_token WHERE token_hash = ? AND revogado = true",
            UUID.class,
            tokenHash);
    if (!revogado.isEmpty()) {
      // Não revoga aqui: esta transação é desfeita pelo 401, e a mesma requisição repetida com
      // a mesma Idempotency-Key também chega neste ponto enquanto a primeira ainda não
      // commitou. Quem revoga é revogarPorReuso, chamado só quando não há recibo para devolver.
      throw new RenovacaoReusadaException(revogado.getFirst());
    }
    throw new ErroDeNegocioException(CodigoErro.NAO_AUTENTICADO, SESSAO_EXPIRADA);
  }

  /**
   * Resposta ao reuso confirmado: todas as renovações do usuário caem. Fora de transação de
   * quem chama, para sobreviver ao 401.
   */
  public void revogarPorReuso(UUID usuarioId) {
    int derrubados = revogarAtivos(usuarioId);
    // RNF-SEC-35: registra a suspeita; RNF-SEC-36: nunca o token nem o hash.
    log.warn(
        "Reuso de token de renovação revogado; {} renovação(ões) ativa(s) do usuário {}"
            + " revogada(s)",
        derrubados,
        usuarioId);
  }

  /** Revoga todas as renovações ativas do usuário. Devolve quantas estavam ativas. */
  public int revogarAtivos(UUID usuarioId) {
    return jdbc.update(
        "UPDATE refresh_token SET revogado = true WHERE usuario_id = ? AND revogado = false",
        usuarioId);
  }

  static String hash(String token) {
    try {
      byte[] digest =
          MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (NoSuchAlgorithmException impossivel) {
      throw new IllegalStateException("SHA-256 indisponível", impossivel);
    }
  }
}
