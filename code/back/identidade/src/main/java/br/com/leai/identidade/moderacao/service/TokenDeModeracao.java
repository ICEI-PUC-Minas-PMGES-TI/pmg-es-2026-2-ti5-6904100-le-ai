package br.com.leai.identidade.moderacao.service;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Segredo compartilhado das rotas {@code /internal/moderacao} (F-MOD-OPC), no desenho do {@link
 * br.com.leai.identidade.conta.service.TokenDoAgendador}: header {@code X-Moderacao-Token}
 * comparado em tempo constante, sobre os digests. É o mesmo {@code MODERACAO_TOKEN} que o {@code
 * social} já usa com o {@code leitura} (F-MOD).
 *
 * <p>Sozinho não autoriza nada: o controller exige também o JWT do admin repassado pelo {@code
 * social} (decisão 2). Sem o segredo configurado, as rotas respondem 503 e a partida registra WARN.
 */
@Component
public class TokenDeModeracao {

  public static final String CABECALHO = "X-Moderacao-Token";

  private static final Logger log = LoggerFactory.getLogger(TokenDeModeracao.class);

  private final byte[] esperado;

  public TokenDeModeracao(AppProperties propriedades) {
    String token = propriedades.moderacaoToken();
    this.esperado = token == null || token.isEmpty() ? null : digest(token);
    if (esperado == null) {
      log.warn(
          "MODERACAO_TOKEN não configurado: suspender e reativar conta responderão 503 até"
              + " ele ser definido (o mesmo valor do social)");
    }
  }

  public void exigir(String recebido) {
    if (esperado == null) {
      throw new ErroDeNegocioException(
          CodigoErro.SERVICO_INDISPONIVEL, "A moderação de contas não está configurada.");
    }
    if (recebido == null || !MessageDigest.isEqual(esperado, digest(recebido))) {
      throw new ErroDeNegocioException(CodigoErro.NAO_AUTENTICADO, "Token de moderação inválido.");
    }
  }

  private static byte[] digest(String valor) {
    try {
      return MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
    } catch (NoSuchAlgorithmException erro) {
      throw new IllegalStateException("SHA-256 indisponível na JVM", erro);
    }
  }
}
