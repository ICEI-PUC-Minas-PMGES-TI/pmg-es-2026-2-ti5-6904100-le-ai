package br.com.leai.social.common.idempotencia;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Supplier;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

/**
 * Idempotência das escritas HTTP (RNF-ERR-04), sobre {@code social.idempotencia_social}. Porte de
 * {@code identidade.common.idempotencia.ServicoDeIdempotencia}, com duas simplificações:
 *
 * <ul>
 *   <li><b>Sem cifra de resposta.</b> Todas as operações de {@code social} exigem autenticação
 *       (curtir, descurtir, comentar): não existe operação pública cuja resposta carregue token
 *       ou segredo, então o recibo é gravado em claro — sem AES-GCM nem {@code respostaSensivel}.
 *   <li><b>Sem sujeito anônimo.</b> O sujeito do recibo é sempre o usuário autenticado
 *       ({@code subject_ref}), obtido do token; não há equivalente ao {@code sujeitoAnonimo} de
 *       {@code identidade}, usado lá só pelas rotas públicas de {@code /auth}.
 * </ul>
 *
 * <p>O hash do payload continua HMAC-SHA256 (não SHA-256 puro), derivado de {@code JWT_SECRET}: um
 * SHA-256 sem segredo seria testável offline, e a chave derivada garante que quem lê a tabela não
 * consegue reconstruir o payload por dicionário.
 *
 * <p>É serviço chamado pelo controller, não filtro nem interceptor: o recibo tem de ser gravado
 * na mesma transação do efeito. Se ficasse fora, um crash entre os dois commits deixaria o efeito
 * aplicado sem recibo, e a repetição da chave produziria um segundo efeito.
 */
@Service
public class ServicoDeIdempotencia {

  /** Janela de replay: cobre com folga a retentativa do cliente HTTP central (RNF-ERR-03). */
  static final int JANELA_REPLAY_HORAS = 24;

  private static final String ALGORITMO = "HmacSHA256";

  private final JdbcTemplate jdbc;
  private final TransactionTemplate transacao;
  private final ObjectMapper objectMapper;
  private final SecretKeySpec chaveHmac;

  public ServicoDeIdempotencia(
      JdbcTemplate jdbc,
      TransactionTemplate transacao,
      ObjectMapper objectMapper,
      AppProperties propriedades) {
    this.jdbc = jdbc;
    this.transacao = transacao;
    this.objectMapper = objectMapper;
    // Chave própria, derivada: o JWT_SECRET continua servindo só para assinar/validar token, e
    // um HMAC calculado aqui nunca coincide com uma assinatura de JWT.
    byte[] derivada =
        hmac(
            new SecretKeySpec(propriedades.jwtSecret().getBytes(StandardCharsets.UTF_8), ALGORITMO),
            "leai-social/idempotencia/v1");
    this.chaveHmac = new SecretKeySpec(derivada, ALGORITMO);
  }

  /**
   * Executa o efeito uma única vez por {@code (sujeito, operação, chave)}.
   *
   * <p>Repetir chave e payload devolve a resposta gravada sem executar de novo; mesma chave com
   * payload diferente, ou fora da janela de replay, é 409. Falha do efeito não grava recibo: a
   * repetição executa de novo, como se fosse a primeira vez.
   *
   * <p><b>Corrida entre duas requisições com a mesma chave</b> é serializada por um advisory lock
   * transacional do Postgres ({@code pg_advisory_xact_lock}), tomado antes de olhar o recibo e
   * liberado sozinho no fim da transação (commit ou rollback). Sem ele, duas requisições
   * simultâneas leriam "sem recibo" ao mesmo tempo e as duas rodariam o efeito antes de qualquer
   * uma chegar ao {@code INSERT} do recibo — o índice único de {@code idempotencia_social} evita
   * duas linhas, mas não evita o efeito rodar duas vezes. Com o lock, a segunda requisição só
   * prossegue depois que a primeira já comitou o recibo, e encontra o replay normalmente.
   */
  public <T> RespostaIdempotente<T> executar(
      UUID sujeito,
      OperacaoIdempotente operacao,
      String chave,
      Object payload,
      Class<T> tipoDoCorpo,
      Supplier<RespostaIdempotente<T>> efeito) {
    String payloadHash = hashDoPayload(payload);

    return transacao.execute(
        status -> {
          travar(sujeito, operacao, chave);

          Recibo anterior = buscarRecibo(sujeito, operacao, chave);
          if (anterior != null) {
            return replayOuConflito(anterior, payloadHash, tipoDoCorpo);
          }

          RespostaIdempotente<T> resposta = efeito.get();
          gravarRecibo(sujeito, operacao, chave, payloadHash, resposta);
          return resposta;
        });
  }

  /**
   * Bloqueia até que nenhuma outra transação segure o lock da mesma tripla. {@code
   * hashtextextended} evita hashear a chave composta no lado do Java (uma colisão de hash só
   * serializaria triplas diferentes por um instante, nunca causaria efeito duplicado, porque o
   * recibo depois do lock ainda é conferido pela tripla exata).
   */
  private void travar(UUID sujeito, OperacaoIdempotente operacao, String chave) {
    jdbc.queryForList(
        "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
        sujeito + "\n" + operacao.operationId() + "\n" + chave);
  }

  /**
   * Hash canônico do payload: as chaves de objeto são ordenadas antes de serializar, então o
   * mesmo pedido serializado por dois clientes diferentes tem o mesmo hash.
   */
  String hashDoPayload(Object payload) {
    Object canonico = canonicalizar(objectMapper.convertValue(payload, Object.class));
    String json = objectMapper.writeValueAsString(canonico);
    return "hmac-sha256:" + HexFormat.of().formatHex(hmac(chaveHmac, json));
  }

  private static Object canonicalizar(Object valor) {
    if (valor instanceof Map<?, ?> mapa) {
      Map<String, Object> ordenado = new TreeMap<>();
      mapa.forEach((chave, v) -> ordenado.put(String.valueOf(chave), canonicalizar(v)));
      return ordenado;
    }
    if (valor instanceof List<?> lista) {
      return lista.stream().map(ServicoDeIdempotencia::canonicalizar).toList();
    }
    return valor;
  }

  private <T> RespostaIdempotente<T> replayOuConflito(
      Recibo recibo, String payloadHash, Class<T> tipoDoCorpo) {
    // Chave certa e payload certo, mas fora da janela: reexecutar seria pior do que recusar,
    // porque a resposta original já não é devolvível. O cliente gera uma chave nova.
    if (!recibo.payloadHash().equals(payloadHash) || recibo.vencido()) {
      throw new ErroDeNegocioException(
          CodigoErro.CONFLITO, "Essa chave de idempotência já foi usada com outros dados.");
    }
    // Resposta sem corpo (204) foi gravada como `{}` e volta como corpo nulo.
    T corpo = tipoDoCorpo == Void.class ? null : objectMapper.readValue(recibo.resposta(), tipoDoCorpo);
    return new RespostaIdempotente<>(recibo.statusHttp(), corpo);
  }

  private Recibo buscarRecibo(UUID sujeito, OperacaoIdempotente operacao, String chave) {
    List<Recibo> linhas =
        jdbc.query(
            """
            SELECT status_http, resposta::text AS resposta, payload_hash,
                   replay_ate < now() AS vencido
              FROM idempotencia_social
             WHERE subject_ref = ? AND operacao = ? AND chave = ? AND anonimizado_em IS NULL
            """,
            (linha, n) ->
                new Recibo(
                    linha.getInt("status_http"),
                    linha.getString("resposta"),
                    linha.getString("payload_hash"),
                    linha.getBoolean("vencido")),
            sujeito,
            operacao.operationId(),
            chave);
    return linhas.isEmpty() ? null : linhas.getFirst();
  }

  private void gravarRecibo(
      UUID sujeito,
      OperacaoIdempotente operacao,
      String chave,
      String payloadHash,
      RespostaIdempotente<?> resposta) {
    // O CHECK de anonimização exige `resposta` não nula em linha viva; resposta sem corpo
    // (204) grava `{}`.
    String corpo =
        resposta.corpo() == null ? "{}" : objectMapper.writeValueAsString(resposta.corpo());
    jdbc.update(
        """
        INSERT INTO idempotencia_social
          (subject_ref, operacao, chave, payload_hash, status_http, resposta, replay_ate)
        VALUES (?, ?, ?, ?, ?, ?::jsonb, now() + make_interval(hours => ?))
        """,
        sujeito,
        operacao.operationId(),
        chave,
        payloadHash,
        resposta.status(),
        corpo,
        JANELA_REPLAY_HORAS);
  }

  private static byte[] hmac(SecretKeySpec chave, String dado) {
    try {
      Mac mac = Mac.getInstance(ALGORITMO);
      mac.init(chave);
      return mac.doFinal(dado.getBytes(StandardCharsets.UTF_8));
    } catch (GeneralSecurityException impossivel) {
      // HmacSHA256 é algoritmo obrigatório em toda JVM (Java SE §Mac).
      throw new IllegalStateException("HmacSHA256 indisponível", impossivel);
    }
  }

  private record Recibo(int statusHttp, String resposta, String payloadHash, boolean vencido) {}
}
