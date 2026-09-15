package br.com.leai.identidade.auth;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.common.RateLimitFilter;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Bloqueio temporário progressivo por identidade depois de falhas sucessivas de login
 * (RNF-SEC-29 no {@code REQUISITOS.md}; o {@code login.md} numera o mesmo comportamento como
 * RNF-SEC-28 — a divergência de numeração está registrada nas pendências da P0-NAV).
 *
 * <p>É também a metade "por identidade" do rate limiting de RNF-SEC-17: o {@link RateLimitFilter}
 * limita por origem, este limita por conta alvo. São controles complementares, e é o de identidade
 * que segura um ataque distribuído, em que cada requisição vem de um IP diferente.
 *
 * <p><b>A chave é o identificador digitado, não o usuário encontrado.</b> Conta inexistente é
 * contada e bloqueada igual a conta real, porque o contrário transformaria o bloqueio num oráculo
 * de quem tem cadastro e desfaria o anti-enumeração de RNF-SEC-28 que a mensagem única garante.
 *
 * <p><b>Consequência aceita:</b> quem souber o username de outra pessoa consegue deixar a conta
 * dela bloqueada errando a senha de propósito. É inerente a qualquer bloqueio por identidade, e o
 * requisito pede o bloqueio; o dano fica limitado porque o bloqueio é temporário, nunca
 * permanente, e some sozinho.
 *
 * <p>Estado em memória pelo mesmo motivo do {@link RateLimitFilter}: uma instância só no Período 0.
 * Reiniciar o serviço zera os bloqueios.
 */
@Component
public class ControleDeTentativas {

  /** Falhas toleradas antes de cada bloqueio. */
  static final int FALHAS_ATE_BLOQUEIO = 5;

  /**
   * Progressão da punição (RNF-SEC-29). Cada novo bloqueio da mesma identidade usa a duração
   * seguinte, e a última se repete daí em diante. O primeiro degrau é curto de propósito: quem
   * errou a senha cinco vezes quase sempre é o dono da conta, e um minuto o incomoda pouco
   * enquanto já derruba a velocidade de um ataque por força bruta.
   */
  static final Duration[] DURACOES = {
    Duration.ofMinutes(1), Duration.ofMinutes(5), Duration.ofMinutes(15), Duration.ofMinutes(30)
  };

  /**
   * Quanto tempo a contagem sobrevive sem nenhum evento novo. Segura a progressão de pé depois
   * que o bloqueio cai — sem isso, esperar o bloqueio acabar devolveria a identidade ao primeiro
   * degrau e a palavra "progressivo" perderia o sentido. Também impede que dois erros de senha
   * separados por semanas sejam somados.
   */
  static final Duration MEMORIA = Duration.ofHours(1);

  /**
   * Teto de identidades vigiadas ao mesmo tempo. A chave vem do corpo da requisição, então sem
   * teto o mapa cresce sem limite. Ao estourar, saem primeiro os registros de menor contagem: as
   * identidades sob ataque são justamente as de contagem alta, e são as que não podem sumir.
   */
  private static final int CAPACIDADE = 20_000;

  /** O identificador pode ser um e-mail; 320 é o limite de tamanho de um endereço. */
  private static final int TAMANHO_MAXIMO_DA_CHAVE = 320;

  private static final Logger log = LoggerFactory.getLogger(ControleDeTentativas.class);

  private final Clock relogio;
  private final ConcurrentHashMap<String, Registro> registros = new ConcurrentHashMap<>();

  @Autowired
  public ControleDeTentativas() {
    this(Clock.systemUTC());
  }

  ControleDeTentativas(Clock relogio) {
    this.relogio = relogio;
  }

  /**
   * Barra a tentativa enquanto a identidade estiver bloqueada. Chamada <b>antes</b> de comparar a
   * senha: enquanto o bloqueio vale, nem o dono com a senha certa entra, que é o que impede o
   * atacante de continuar adivinhando.
   */
  public void verificar(String identificador) {
    Registro registro = registros.get(chave(identificador));
    if (registro != null && registro.bloqueado(relogio.instant())) {
      throw new ErroDeNegocioException(
          CodigoErro.MUITAS_REQUISICOES, RateLimitFilter.MUITAS_TENTATIVAS);
    }
  }

  /** Conta mais uma falha e, ao chegar no limiar, bloqueia pela duração do degrau seguinte. */
  public void registrarFalha(String identificador) {
    Instant agora = relogio.instant();
    String chave = chave(identificador);
    controlarTamanho(agora);

    Registro atualizado =
        registros.compute(
            chave,
            (ignorada, anterior) -> {
              Registro base =
                  anterior == null || anterior.expirou(agora) ? Registro.zerado() : anterior;
              return base.comMaisUmaFalha(agora);
            });

    if (atualizado.bloqueado(agora)) {
      // Log de segurança (RNF-OBS-01). O identificador NÃO entra no log: é dado pessoal e o
      // número do bloqueio já diz o que precisa ser monitorado.
      log.warn("Identidade bloqueada por tentativas sucessivas (bloqueio nº {})",
          atualizado.bloqueios());
    }
  }

  /** Login bem-sucedido limpa tudo, inclusive a progressão: o dono da conta apareceu. */
  public void registrarSucesso(String identificador) {
    registros.remove(chave(identificador));
  }

  /**
   * O login resolve e-mail e username sem diferenciar maiúscula de minúscula, e o identificador
   * chega com o espaçamento que o teclado do celular deixou. A chave precisa normalizar os dois,
   * senão alternar a caixa de uma letra a cada tentativa contorna o bloqueio inteiro.
   */
  private static String chave(String identificador) {
    String limpo = identificador.trim().toLowerCase(Locale.ROOT);
    return limpo.length() > TAMANHO_MAXIMO_DA_CHAVE
        ? limpo.substring(0, TAMANHO_MAXIMO_DA_CHAVE)
        : limpo;
  }

  private void controlarTamanho(Instant agora) {
    if (registros.size() < CAPACIDADE) {
      return;
    }
    registros.values().removeIf(existente -> existente.expirou(agora));
    if (registros.size() < CAPACIDADE) {
      return;
    }
    // Desempata pelas falhas em curso: uma identidade com quatro erros ainda não foi bloqueada,
    // mas está a um erro de ser, e descartá-la devolveria o atacante ao começo da contagem.
    Comparator<Map.Entry<String, Registro>> menosRelevante =
        Comparator.<Map.Entry<String, Registro>>comparingInt(entrada -> entrada.getValue().bloqueios())
            .thenComparingInt(entrada -> entrada.getValue().falhas());

    registros.entrySet().stream()
        .sorted(menosRelevante)
        .limit(CAPACIDADE / 2L)
        .map(Map.Entry::getKey)
        .toList()
        .forEach(registros::remove);
  }

  /**
   * Estado de uma identidade. {@code falhas} conta só as do bloqueio em formação e zera a cada
   * bloqueio aplicado; {@code bloqueios} nunca zera enquanto o registro vive, porque é ele que
   * escolhe o degrau da progressão.
   */
  private record Registro(int falhas, int bloqueios, Instant bloqueadoAte, Instant expiraEm) {

    static Registro zerado() {
      return new Registro(0, 0, Instant.EPOCH, Instant.EPOCH);
    }

    Registro comMaisUmaFalha(Instant agora) {
      int acumuladas = falhas + 1;
      if (acumuladas < FALHAS_ATE_BLOQUEIO) {
        return new Registro(acumuladas, bloqueios, bloqueadoAte, agora.plus(MEMORIA));
      }
      int aplicados = bloqueios + 1;
      Instant ate = agora.plus(DURACOES[Math.min(aplicados, DURACOES.length) - 1]);
      // A memória conta a partir do fim do bloqueio: o registro precisa sobreviver a ele para
      // que a próxima rodada de falhas caia no degrau seguinte, e não no primeiro.
      return new Registro(0, aplicados, ate, ate.plus(MEMORIA));
    }

    boolean bloqueado(Instant agora) {
      return agora.isBefore(bloqueadoAte);
    }

    boolean expirou(Instant agora) {
      return !agora.isBefore(expiraEm);
    }
  }
}
