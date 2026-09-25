package br.com.leai.social.common;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limite de uso por usuário autenticado numa janela de um minuto, com {@code 429} na passagem.
 * Porte de {@code identidade.common.LimitePorUsuario}. Serve às escritas em que o limite por IP
 * do {@link RateLimitFilter} não basta, porque o abuso vem de uma conta: curtir e comentar
 * (RNF-SEC-18). As instâncias ficam em {@code LimitesDeInteracao}.
 *
 * <p>Em memória, de propósito: vale para uma instância, que é o que o Render roda no Período 0/1.
 */
public class LimitePorUsuario {

  private static final Duration JANELA = Duration.ofMinutes(1);

  private final int porMinuto;
  private final String mensagem;
  private final Clock relogio;
  private final Map<UUID, Deque<Instant>> usos = new ConcurrentHashMap<>();

  public LimitePorUsuario(int porMinuto, String mensagem, Clock relogio) {
    this.porMinuto = porMinuto;
    this.mensagem = mensagem;
    this.relogio = relogio;
  }

  /** Registra o uso, ou lança 429 se o usuário passou do limite na janela. */
  public void registrar(UUID usuarioId) {
    Instant agora = relogio.instant();
    Deque<Instant> doUsuario = usos.computeIfAbsent(usuarioId, id -> new ArrayDeque<>());
    synchronized (doUsuario) {
      while (!doUsuario.isEmpty() && !doUsuario.peekFirst().isAfter(agora.minus(JANELA))) {
        doUsuario.pollFirst();
      }
      if (doUsuario.size() >= porMinuto) {
        throw new ErroDeNegocioException(CodigoErro.MUITAS_REQUISICOES, mensagem);
      }
      doUsuario.addLast(agora);
    }
  }
}
