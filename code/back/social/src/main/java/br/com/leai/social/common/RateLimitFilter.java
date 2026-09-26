package br.com.leai.social.common;

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
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rate limiting por IP nas escritas de interação do feed (RNF-SEC-18): curtir, descurtir e
 * comentar. Excedido o limite, a requisição nem chega ao controller e volta 429 no corpo de erro
 * padrão (RNF-ERR-01). Porte de {@code identidade.common.RateLimitFilter}, com a lista de rotas
 * generalizada: lá era {@code /auth/**} (rotas públicas); aqui são as escritas de
 * {@code docs/api/social.yaml} que todas exigem JWT.
 *
 * <p>É a metade "por IP" do requisito. A metade "por identidade" é o {@link LimitePorUsuario},
 * que roda dentro do serviço de domínio, onde o usuário autenticado já foi resolvido.
 *
 * <p><b>Contagem em memória, de propósito.</b> Uma instância só, como no Período 0/1 de
 * `identidade`; a decisão entre Redis ou banco fica para quando houver escala que a justifique.
 *
 * <p>Roda antes da cadeia do Spring Security (ordem {@code -100}) para não gastar validação de
 * token em requisição que já vai ser recusada.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 15)
public class RateLimitFilter extends OncePerRequestFilter {

  public static final String MUITAS_TENTATIVAS =
      "Muitas interações em pouco tempo. Tente de novo em alguns instantes.";

  /** Sufixo de curtir/descurtir: {@code POST}/{@code DELETE} em {@code /atividades/{id}/curtir}. */
  private static final String SUFIXO_CURTIR = "/curtir";

  /**
   * Sufixo de comentar: só {@code POST} em {@code /atividades/{id}/comentarios} — o {@code GET}
   * do mesmo caminho é listagem e não é escrita.
   */
  private static final String SUFIXO_COMENTARIOS = "/comentarios";

  private static final Set<HttpMethod> METODOS_CURTIR = Set.of(HttpMethod.POST, HttpMethod.DELETE);

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

  /**
   * O limite vem de {@code leai.rate-limit.interacoes-por-minuto}, com 60 como padrão e sem
   * variável de ambiente em {@code application.yml}: produção usa o padrão. A propriedade existe
   * para a base de integração, em que dezenas de chamadas às mesmas rotas saem do mesmo
   * 127.0.0.1 em segundos e bateriam no limite antes do que está sendo testado.
   */
  @Autowired
  public RateLimitFilter(
      EscritorDeErro escritorDeErro,
      @Value("${leai.rate-limit.interacoes-por-minuto:" + LIMITE_PADRAO + "}") int limite) {
    this(escritorDeErro, limite, JANELA_PADRAO, Clock.systemUTC());
  }

  RateLimitFilter(EscritorDeErro escritorDeErro, int limite, Duration janela, Clock relogio) {
    this.escritorDeErro = escritorDeErro;
    this.limite = limite;
    this.janela = janela;
    this.relogio = relogio;
  }

  /** Só as escritas de interação (RNF-SEC-18). O preflight não carrega credencial e não custa. */
  @Override
  protected boolean shouldNotFilter(HttpServletRequest requisicao) {
    return HttpMethod.OPTIONS.matches(requisicao.getMethod()) || !rotaLimitada(requisicao);
  }

  private static boolean rotaLimitada(HttpServletRequest requisicao) {
    String caminho = caminho(requisicao);
    HttpMethod metodo = HttpMethod.valueOf(requisicao.getMethod());
    if (caminho.endsWith(SUFIXO_CURTIR)) {
      return METODOS_CURTIR.contains(metodo);
    }
    if (caminho.endsWith(SUFIXO_COMENTARIOS)) {
      return HttpMethod.POST.equals(metodo);
    }
    return false;
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
   * Endereço de origem da requisição. Atrás do proxy do Render o socket é sempre o do proxy,
   * então lê-se o {@code X-Forwarded-For} — mesma ressalva de melhor esforço do porte original em
   * `identidade`: quem quiser trocar de "IP" a cada requisição consegue.
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
