package br.com.leai.identidade.perfil;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Limite defensivo da busca por username (RF-SOC-03), por usuário: {@value #BUSCAS_POR_MINUTO}
 * buscas por minuto. A busca exata já impede varrer por prefixo; o limite impede testar milhares
 * de nomes inteiros para montar um diretório por força bruta (RNF-SEC-19/44). Não é o RNF-SEC-18,
 * que trata ações sociais.
 *
 * <p>Em memória, como o `ControleDeTentativas`: vale para uma instância, que é o que o Render roda.
 */
@Component
public class LimiteDeBusca {

  static final int BUSCAS_POR_MINUTO = 30;
  private static final Duration JANELA = Duration.ofMinutes(1);

  private final Clock relogio;
  private final Map<UUID, Deque<Instant>> buscas = new ConcurrentHashMap<>();

  @Autowired
  public LimiteDeBusca() {
    this(Clock.systemUTC());
  }

  LimiteDeBusca(Clock relogio) {
    this.relogio = relogio;
  }

  /** Registra a busca, ou lança 429 se o usuário passou do limite na janela. */
  public void registrar(UUID usuarioId) {
    Instant agora = relogio.instant();
    Deque<Instant> doUsuario = buscas.computeIfAbsent(usuarioId, id -> new ArrayDeque<>());
    synchronized (doUsuario) {
      while (!doUsuario.isEmpty() && !doUsuario.peekFirst().isAfter(agora.minus(JANELA))) {
        doUsuario.pollFirst();
      }
      if (doUsuario.size() >= BUSCAS_POR_MINUTO) {
        throw new ErroDeNegocioException(
            CodigoErro.MUITAS_REQUISICOES,
            "Muitas buscas em pouco tempo. Tente de novo em instantes.");
      }
      doUsuario.addLast(agora);
    }
  }
}
