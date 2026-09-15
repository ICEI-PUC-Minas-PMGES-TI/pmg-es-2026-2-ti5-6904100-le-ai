package br.com.leai.identidade.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rate limiting por IP nas rotas de autenticação e cadastro (RNF-SEC-17). Excedido o limite, a
 * requisição nem chega ao controller e volta 429 no corpo de erro padrão (RNF-ERR-01).
 *
 * <p>É a metade "por IP" do requisito. A metade "por identidade" é o {@code ControleDeTentativas},
 * que roda no serviço, onde o identificador do corpo já foi desserializado — lê-lo aqui exigiria
 * consumir o fluxo da requisição e reempacotá-lo, sem ganho nenhum.
 *
 * <p><b>Contagem em memória, de propósito.</b> O Período 0 roda uma instância só no Render free,
 * então um mapa local conta certo. Com mais de uma instância a contagem passa a ser por instância
 * e o limite efetivo multiplica — é uma tensão registrada com RNF-ARQ-04 na P0-NAV, e a decisão
 * entre Redis ou banco fica para F-AUT, quando houver escala para justificá-la.
 *
 * <p><b>Limite propositalmente folgado.</b> 60 requisições por minuto por IP é muito para uma
 * pessoa e pouco para um ataque, e a escolha alta é deliberada: a rede de uma faculdade sai toda
 * pelo mesmo IP, e um limite apertado transformaria uma aula inteira num único cliente bloqueado.
 * O freio que realmente protege uma conta é o bloqueio progressivo por identidade, que não depende
 * da origem da requisição.
 *
 * <p>Roda depois do {@code CorsFilter} (ordem {@code +10}) para que a recusa saia com os
 * cabeçalhos de CORS e o navegador consiga lê-la, e antes da cadeia do Spring Security (ordem
 * {@code -100}) para não gastar validação de token em requisição que já vai ser recusada.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 15)
public class RateLimitFilter extends OncePerRequestFilter {

  /**
   * Copy fixada em {@code docs/design/periodo-0/P0-NAV/login.md} §8. A mensagem genérica do
   * {@link CodigoErro#MUITAS_REQUISICOES} fala em "requisições", vocabulário de API; a tela fala
   * em tentativas. É a mesma frase do bloqueio por identidade: para quem está na tela, os dois
   * limites são o mesmo acontecimento.
   */
  public static final String MUITAS_TENTATIVAS =
      "Muitas tentativas. Tente de novo em alguns minutos.";

  private static final String PREFIXO_PROTEGIDO = "/auth/";
  private static final int LIMITE_PADRAO = 60;
  private static final Duration JANELA_PADRAO = Duration.ofMinutes(1);

  /**
   * Teto de chaves vivas. O mapa é indexado por um valor que vem do cliente, então sem teto ele é
   * um vetor de exaustão de memória. Ao estourar, as janelas de menor contagem são descartadas
   * primeiro: são as que menos importam para o limite e as mais prováveis de ser de gente normal.
   */
  private static final int CAPACIDADE = 20_000;

  /** IPv6 completo cabe em 45 caracteres; o resto é lixo ou tentativa de inflar o mapa. */
  private static final int TAMANHO_MAXIMO_DA_CHAVE = 45;

  private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

  private final EscritorDeErro escritorDeErro;
  private final int limite;
  private final Duration janela;
  private final Clock relogio;
  private final ConcurrentHashMap<String, Janela> janelas = new ConcurrentHashMap<>();

  @Autowired
  public RateLimitFilter(EscritorDeErro escritorDeErro) {
    this(escritorDeErro, LIMITE_PADRAO, JANELA_PADRAO, Clock.systemUTC());
  }

  RateLimitFilter(EscritorDeErro escritorDeErro, int limite, Duration janela, Clock relogio) {
    this.escritorDeErro = escritorDeErro;
    this.limite = limite;
    this.janela = janela;
    this.relogio = relogio;
  }

  /**
   * Só as rotas de auth (RNF-SEC-17). O preflight fica de fora porque não carrega credencial e
   * não custa nada ao servidor: contá-lo faria o navegador consumir a cota do usuário sozinho.
   */
  @Override
  protected boolean shouldNotFilter(HttpServletRequest requisicao) {
    return HttpMethod.OPTIONS.matches(requisicao.getMethod())
        || !caminho(requisicao).startsWith(PREFIXO_PROTEGIDO);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest requisicao, HttpServletResponse resposta, FilterChain cadeia)
      throws ServletException, IOException {

    Instant agora = relogio.instant();
    String chave = enderecoDoCliente(requisicao);
    controlarTamanho(agora);

    Janela atual =
        janelas.compute(
            chave,
            (ignorada, anterior) ->
                anterior == null || anterior.expirou(agora, janela)
                    ? new Janela(agora, 1)
                    : new Janela(anterior.inicio(), anterior.contagem() + 1));

    if (atual.contagem() > limite) {
      // Log de segurança (RNF-OBS-01): o correlationId já está no MDC. O endereço vai sanitizado
      // porque pode ter vindo de header do cliente.
      log.warn("Limite por IP excedido em {} (origem {})", caminho(requisicao), chave);
      escritorDeErro.escrever(resposta, CodigoErro.MUITAS_REQUISICOES, MUITAS_TENTATIVAS);
      return;
    }

    cadeia.doFilter(requisicao, resposta);
  }

  private static String caminho(HttpServletRequest requisicao) {
    String uri = requisicao.getRequestURI();
    String contexto = requisicao.getContextPath();
    return contexto != null && !contexto.isEmpty() && uri.startsWith(contexto)
        ? uri.substring(contexto.length())
        : uri;
  }

  /**
   * Endereço de origem da requisição.
   *
   * <p>Atrás do proxy do Render o socket é sempre o do proxy, então sem ler o
   * {@code X-Forwarded-For} o serviço inteiro contaria como um cliente só e o limite estouraria
   * para todo mundo junto. Lê-se a primeira entrada, que é a convenção do header e a mesma que o
   * {@code ForwardedHeaderFilter} usa — o header é lido aqui, em vez de depender de
   * {@code getRemoteAddr()}, para não ficar refém da ordem em que aquele filtro é registrado.
   *
   * <p><b>Ressalva conhecida:</b> a primeira entrada é preenchida pelo cliente quando ele manda o
   * header, então quem quiser trocar de "IP" a cada requisição consegue. Isto é limite de melhor
   * esforço contra abuso acidental e ruído, não contra adversário dedicado; o controle que
   * realmente segura uma conta é o bloqueio por identidade.
   */
  static String enderecoDoCliente(HttpServletRequest requisicao) {
    String encaminhado = requisicao.getHeader("X-Forwarded-For");
    if (encaminhado != null && !encaminhado.isBlank()) {
      String limpo = sanitizar(encaminhado.split(",")[0]);
      if (!limpo.isEmpty()) {
        return limpo;
      }
    }
    String remoto = requisicao.getRemoteAddr();
    return remoto == null ? "desconhecido" : sanitizar(remoto);
  }

  /** O valor vira chave de mapa e vai para o log: sem caractere de controle e com tamanho preso. */
  private static String sanitizar(String valor) {
    String limpo = valor.replaceAll("\\p{Cntrl}", "").trim();
    return limpo.length() > TAMANHO_MAXIMO_DA_CHAVE
        ? limpo.substring(0, TAMANHO_MAXIMO_DA_CHAVE)
        : limpo;
  }

  private void controlarTamanho(Instant agora) {
    if (janelas.size() < CAPACIDADE) {
      return;
    }
    janelas.values().removeIf(existente -> existente.expirou(agora, janela));
    if (janelas.size() < CAPACIDADE) {
      return;
    }
    // Ainda cheio depois da limpeza: alguém está inundando com origens novas. Derruba metade,
    // começando pelas janelas de menor contagem, para o mapa não crescer sem limite.
    janelas.entrySet().stream()
        .sorted(Comparator.comparingInt(entrada -> entrada.getValue().contagem()))
        .limit(CAPACIDADE / 2L)
        .map(Map.Entry::getKey)
        .toList()
        .forEach(janelas::remove);
  }

  /** Janela fixa: quando a duração passa, a contagem recomeça do zero. */
  private record Janela(Instant inicio, int contagem) {
    boolean expirou(Instant agora, Duration duracao) {
      return !agora.isBefore(inicio.plus(duracao));
    }
  }
}
