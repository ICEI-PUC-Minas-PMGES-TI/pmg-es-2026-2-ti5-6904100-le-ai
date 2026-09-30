package br.com.leai.identidade.common;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limite de uso por usuário autenticado numa janela de um minuto, com `429` na passagem. Serve às
 * rotas em que o limite por IP do `RateLimitFilter` não basta, porque o abuso vem de uma conta:
 * a busca exata de perfis (RNF-SEC-19/44) e seguir (RNF-SEC-18). As instâncias ficam em
 * `perfil/LimitesDeUso`.
 *
 * <p>Em memória, como o `ControleDeTentativas`: vale para uma instância, que é o que o Render roda.
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
