package br.com.leai.identidade.common.idempotencia;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.config.AppProperties;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Supplier;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

/**
 * Idempotência das escritas HTTP (RNF-ERR-04), sobre {@code identidade.idempotencia_identidade}.
 * Porte do {@code IdempotenciaService} do {@code acervo}, com três diferenças que vêm do serviço.
 *
 * <p><b>O escopo nem sempre é um usuário autenticado.</b> {@code register}, {@code login},
 * {@code refresh} e a recuperação de senha são públicas, mas {@code subject_ref} é NOT NULL. Para
 * elas o sujeito é derivado do identificador que a própria operação recebe ({@link
 * #sujeitoAnonimo}).
 *
 * <p><b>O hash do payload é HMAC, não SHA-256 puro.</b> Aqui o payload carrega senha. Um SHA-256
 * sem segredo gravado no banco seria um hash rápido da senha, testável offline por dicionário, e
 * anularia o bcrypt (RNF-SEC-09). Com a chave derivada do {@code JWT_SECRET}, quem lê a tabela
 * não consegue testar palpites. Trocar o segredo só faz os recibos vivos responderem 409 no
 * replay, dentro da janela de 24 horas.
 *
 * <p><b>Resposta com token é gravada cifrada</b> (AES-GCM), nas operações marcadas em {@link
 * OperacaoIdempotente#respostaSensivel()}: o replay precisa devolver a mesma sessão, mas o refresh
 * em claro no recibo anularia o hash de {@code refresh_token}.
 *
 * <p>É serviço chamado pelo controller, não filtro nem interceptor: o recibo tem de ser gravado
 * na mesma transação do efeito. Se ficasse fora, um crash entre os dois commits deixaria o efeito
 * aplicado sem recibo, e a repetição da chave produziria um segundo efeito.
 */
@Service
public class ServicoDeIdempotencia {

  /**
   * Janela de replay. Cobre com folga a retentativa do cliente HTTP central (RNF-ERR-03), mesmo
   * valor do {@code acervo}.
   */
  static final int JANELA_REPLAY_HORAS = 24;

  private static final String ALGORITMO = "HmacSHA256";
  private static final String CIFRA = "AES/GCM/NoPadding";
  private static final int TAMANHO_IV = 12;
  private static final int TAG_BITS = 128;
  private static final String CAMPO_CIFRADO = "cifrado";

  private final JdbcTemplate jdbc;
  private final TransactionTemplate transacao;
  private final ObjectMapper objectMapper;
  private final SecretKeySpec chaveHmac;
  private final SecretKeySpec chaveCifra;
  private final SecureRandom aleatorio = new SecureRandom();

  public ServicoDeIdempotencia(
      JdbcTemplate jdbc,
      TransactionTemplate transacao,
      ObjectMapper objectMapper,
      AppProperties propriedades) {
    this.jdbc = jdbc;
    this.transacao = transacao;
    this.objectMapper = objectMapper;
    // Chave própria, derivada: o JWT_SECRET continua servindo só para assinar token, e um
    // HMAC calculado aqui nunca coincide com uma assinatura de JWT.
    byte[] derivada =
        hmac(
            new SecretKeySpec(propriedades.jwtSecret().getBytes(StandardCharsets.UTF_8), ALGORITMO),
            "leai-identidade/idempotencia/v1");
    this.chaveHmac = new SecretKeySpec(derivada, ALGORITMO);
    // Terceira chave, também derivada e distinta das outras duas: cifra a resposta das
    // operações que devolvem token (OperacaoIdempotente#respostaSensivel).
    this.chaveCifra = new SecretKeySpec(hmac(chaveHmac, "cifra-de-resposta/v1"), "AES");
  }

  /**
   * Executa o efeito uma única vez por {@code (sujeito, operação, chave)}.
   *
   * <p>Repetir chave e payload devolve a resposta gravada sem executar de novo; mesma chave com
   * payload diferente, ou fora da janela de replay, é 409. Falha do efeito não grava recibo: a
   * repetição executa de novo, como se fosse a primeira vez.
   */
  public <T> RespostaIdempotente<T> executar(
      UUID sujeito,
      OperacaoIdempotente operacao,
      String chave,
      Object payload,
      Class<T> tipoDoCorpo,
      Supplier<RespostaIdempotente<T>> efeito) {
    String payloadHash = hashDoPayload(payload);

    Recibo anterior = buscarRecibo(sujeito, operacao, chave);
    if (anterior != null) {
      return replayOuConflito(anterior, operacao, chave, payloadHash, tipoDoCorpo);
    }

    try {
      return transacao.execute(
          status -> {
            RespostaIdempotente<T> resposta = efeito.get();
            gravarRecibo(sujeito, operacao, chave, payloadHash, resposta);
            return resposta;
          });
    } catch (RuntimeException erro) {
      // Duas requisições com a mesma chave passaram juntas pela leitura acima. A perdedora
      // bate num índice único: o do recibo ou, antes dele, o do próprio domínio (no cadastro,
      // e-mail e username). Nos dois casos o Postgres a faz esperar o commit da vencedora, então
      // quando o erro chega aqui o recibo vencedor já está visível e basta devolvê-lo. Sem
      // recibo, o erro é do próprio efeito e sobe como veio.
      Recibo vencedor = buscarRecibo(sujeito, operacao, chave);
      if (vencedor == null) {
        throw erro;
      }
      return replayOuConflito(vencedor, operacao, chave, payloadHash, tipoDoCorpo);
    }
  }

  /**
   * Sujeito de uma operação pública, derivado do identificador que ela recebe (e-mail do
   * cadastro, identificador do login, token apresentado).
   *
   * <p>HMAC e não {@code UUID.nameUUIDFromBytes}: o MD5 sem segredo deixaria qualquer um com
   * acesso à tabela confirmar quais e-mails tentaram se cadastrar.
   */
  public UUID sujeitoAnonimo(String identificador) {
    byte[] digest = hmac(chaveHmac, "sujeito\n" + identificador.trim().toLowerCase(Locale.ROOT));
    ByteBuffer bytes = ByteBuffer.wrap(digest);
    return new UUID(bytes.getLong(), bytes.getLong());
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
      Recibo recibo,
      OperacaoIdempotente operacao,
      String chave,
      String payloadHash,
      Class<T> tipoDoCorpo) {
    // Chave certa e payload certo, mas fora da janela: reexecutar seria pior do que recusar,
    // porque a resposta original já não é devolvível. O cliente gera uma chave nova.
    if (!recibo.payloadHash().equals(payloadHash) || recibo.vencido()) {
      throw new ErroDeNegocioException(
          CodigoErro.CONFLITO, "Essa chave de idempotência já foi usada com outros dados.");
    }
    String json = recibo.resposta();
    if (operacao.respostaSensivel()) {
      String cifrado = objectMapper.readTree(json).get(CAMPO_CIFRADO).asString();
      json = decifrar(cifrado, operacao, chave);
    }
    T corpo = objectMapper.readValue(json, tipoDoCorpo);
    return new RespostaIdempotente<>(recibo.statusHttp(), corpo);
  }

  /**
   * AES-GCM com IV aleatório de 96 bits. Operação e chave entram como dado associado: um recibo
   * copiado para outra linha não decifra, e o replay de uma chave nunca devolve a sessão de outra.
   */
  private String cifrar(String json, OperacaoIdempotente operacao, String chave) {
    try {
      byte[] iv = new byte[TAMANHO_IV];
      aleatorio.nextBytes(iv);
      Cipher cifra = Cipher.getInstance(CIFRA);
      cifra.init(Cipher.ENCRYPT_MODE, chaveCifra, new GCMParameterSpec(TAG_BITS, iv));
      cifra.updateAAD(dadoAssociado(operacao, chave));
      byte[] texto = cifra.doFinal(json.getBytes(StandardCharsets.UTF_8));
      byte[] saida = ByteBuffer.allocate(iv.length + texto.length).put(iv).put(texto).array();
      return Base64.getEncoder().encodeToString(saida);
    } catch (GeneralSecurityException erro) {
      throw new IllegalStateException("Falha ao cifrar recibo de idempotência", erro);
    }
  }

  private String decifrar(String base64, OperacaoIdempotente operacao, String chave) {
    try {
      ByteBuffer entrada = ByteBuffer.wrap(Base64.getDecoder().decode(base64));
      byte[] iv = new byte[TAMANHO_IV];
      entrada.get(iv);
      byte[] texto = new byte[entrada.remaining()];
      entrada.get(texto);
      Cipher cifra = Cipher.getInstance(CIFRA);
      cifra.init(Cipher.DECRYPT_MODE, chaveCifra, new GCMParameterSpec(TAG_BITS, iv));
      cifra.updateAAD(dadoAssociado(operacao, chave));
      return new String(cifra.doFinal(texto), StandardCharsets.UTF_8);
    } catch (GeneralSecurityException erro) {
      // Recibo gravado com outro JWT_SECRET: sem como devolver a resposta original, recusa como
      // chave já usada, o mesmo tratamento da janela vencida.
      throw new ErroDeNegocioException(
          CodigoErro.CONFLITO, "Essa chave de idempotência já foi usada com outros dados.");
    }
  }

  private static byte[] dadoAssociado(OperacaoIdempotente operacao, String chave) {
    return (operacao.operationId() + "\n" + chave).getBytes(StandardCharsets.UTF_8);
  }

  private Recibo buscarRecibo(UUID sujeito, OperacaoIdempotente operacao, String chave) {
    List<Recibo> linhas =
        jdbc.query(
            """
            SELECT status_http, resposta::text AS resposta, payload_hash,
                   replay_ate < now() AS vencido
              FROM idempotencia_identidade
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
    if (operacao.respostaSensivel()) {
      corpo =
          objectMapper.writeValueAsString(Map.of(CAMPO_CIFRADO, cifrar(corpo, operacao, chave)));
    }
    jdbc.update(
        """
        INSERT INTO idempotencia_identidade
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
