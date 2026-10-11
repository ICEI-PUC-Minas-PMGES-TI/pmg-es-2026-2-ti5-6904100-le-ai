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
 * Limite de uso por usuário autenticado numa janela deslizante (um minuto, por padrão), com `429`
 * na passagem. Serve às rotas em que o limite por IP do `RateLimitFilter` não basta, porque o
 * abuso vem de uma conta: a busca exata de perfis (RNF-SEC-19/44), seguir (RNF-SEC-18) e a senha
 * errada na exclusão de conta (F-CONTA-2). As instâncias ficam em `perfil/LimitesDeUso` e
 * `conta/config/LimitesDeConta`.
 *
 * <p>Em memória, como o `ControleDeTentativas`: vale para uma instância, que é o que o Render roda.
 */
public class LimitePorUsuario {

  private static final Duration JANELA_PADRAO = Duration.ofMinutes(1);

  private final int limite;
  private final Duration janela;
  private final String mensagem;
  private final Clock relogio;
  private final Map<UUID, Deque<Instant>> usos = new ConcurrentHashMap<>();

  public LimitePorUsuario(int porMinuto, String mensagem, Clock relogio) {
    this(porMinuto, JANELA_PADRAO, mensagem, relogio);
  }

  public LimitePorUsuario(int limite, Duration janela, String mensagem, Clock relogio) {
    this.limite = limite;
    this.janela = janela;
    this.mensagem = mensagem;
    this.relogio = relogio;
  }

  /** Registra o uso, ou lança 429 se o usuário passou do limite na janela. */
  public void registrar(UUID usuarioId) {
    Instant agora = relogio.instant();
    Deque<Instant> doUsuario = usos.computeIfAbsent(usuarioId, id -> new ArrayDeque<>());
    synchronized (doUsuario) {
      descartarVencidos(doUsuario, agora);
      if (doUsuario.size() >= limite) {
        throw new ErroDeNegocioException(CodigoErro.MUITAS_REQUISICOES, mensagem);
      }
      doUsuario.addLast(agora);
    }
  }

  /**
   * Lança 429 se o limite já foi atingido, sem contar este uso. Para limitar só as falhas: o
   * chamador verifica antes da operação e {@link #registrar registra} quando ela falha.
   */
  public void verificar(UUID usuarioId) {
    Deque<Instant> doUsuario = usos.get(usuarioId);
    if (doUsuario == null) {
      return;
    }
    synchronized (doUsuario) {
      descartarVencidos(doUsuario, relogio.instant());
      if (doUsuario.size() >= limite) {
        throw new ErroDeNegocioException(CodigoErro.MUITAS_REQUISICOES, mensagem);
      }
    }
  }

  private void descartarVencidos(Deque<Instant> doUsuario, Instant agora) {
    while (!doUsuario.isEmpty() && !doUsuario.peekFirst().isAfter(agora.minus(janela))) {
      doUsuario.pollFirst();
    }
  }
}
