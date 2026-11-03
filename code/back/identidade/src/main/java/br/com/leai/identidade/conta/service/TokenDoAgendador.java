package br.com.leai.identidade.conta.service;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Autentica a chamada do agendador ao job de exclusão (F-CONTA-2, RN-23.5), no mesmo desenho do
 * {@code scheduler-token.guard.ts} do {@code leitura}: header {@code X-Scheduler-Token} comparado
 * com {@code SCHEDULER_TOKEN} em tempo constante, sobre os digests, para o tamanho também não vazar.
 *
 * <p>Sem {@code SCHEDULER_TOKEN} configurado, toda chamada é 401: o serviço sobe, mas o job não
 * roda. Valor curto demais é tratado como ausente.
 */
@Component
public class TokenDoAgendador {

  public static final String CABECALHO = "X-Scheduler-Token";

  private static final int TAMANHO_MINIMO = 32;

  private final byte[] esperado;

  public TokenDoAgendador(@Value("${leai.scheduler-token:}") String token) {
    this.esperado = token == null || token.length() < TAMANHO_MINIMO ? null : digest(token);
  }

  public void exigir(String recebido) {
    if (esperado == null
        || recebido == null
        || !MessageDigest.isEqual(esperado, digest(recebido))) {
      throw new ErroDeNegocioException(CodigoErro.NAO_AUTENTICADO, "Token do agendador inválido.");
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
