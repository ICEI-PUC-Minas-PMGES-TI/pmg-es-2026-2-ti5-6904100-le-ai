package br.com.leai.identidade.common;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.identidade.RelogioDeTeste;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

/**
 * Rate limiting por IP nas rotas de auth (RNF-SEC-17).
 *
 * <p>Limite de 3 por minuto em vez dos 60 de produção: o que está sendo testado é a mecânica da
 * janela, e um teste que precisa de 61 requisições para dizer a mesma coisa só fica ilegível.
 */
class RateLimitFilterTest {

  private static final int LIMITE = 3;
  private static final Duration JANELA = Duration.ofMinutes(1);
  private static final String IP = "203.0.113.7";

  private RelogioDeTeste relogio;
  private CadeiaContadora cadeia;
  private RateLimitFilter filtro;

  @BeforeEach
  void montar() {
    relogio = new RelogioDeTeste();
    cadeia = new CadeiaContadora();
    filtro =
        new RateLimitFilter(
            new EscritorDeErro(JsonMapper.builder().build()), LIMITE, JANELA, relogio);
  }

  private MockHttpServletResponse executar(String metodo, String caminho, String ip)
      throws Exception {
    MockHttpServletRequest requisicao = new MockHttpServletRequest(metodo, caminho);
    requisicao.setRemoteAddr(ip);
    MockHttpServletResponse resposta = new MockHttpServletResponse();
    filtro.doFilter(requisicao, resposta, cadeia);
    return resposta;
  }

  private MockHttpServletResponse login(String ip) throws Exception {
    return executar("POST", "/auth/login", ip);
  }

  @Test
  @DisplayName("requisição dentro do limite segue para a cadeia")
  void dentroDoLimitePassa() throws Exception {
    for (int i = 0; i < LIMITE; i++) {
      assertThat(login(IP).getStatus()).isEqualTo(HttpStatus.OK.value());
    }

    assertThat(cadeia.chamadas).isEqualTo(LIMITE);
  }

  @Test
  @DisplayName("a requisição seguinte ao limite devolve 429 no corpo de erro padrão")
  void acimaDoLimiteDevolve429() throws Exception {
    for (int i = 0; i < LIMITE; i++) {
      login(IP);
    }

    MockHttpServletResponse resposta = login(IP);

    assertThat(resposta.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
    assertThat(resposta.getContentAsString())
        .contains(CodigoErro.MUITAS_REQUISICOES.name())
        .contains(RateLimitFilter.MUITAS_TENTATIVAS)
        .contains("correlationId");
    // Recusa antes do controller: a requisição barrada não chega a custar nada ao serviço.
    assertThat(cadeia.chamadas).isEqualTo(LIMITE);
  }

  @Test
  @DisplayName("a janela expira e a contagem recomeça do zero")
  void janelaExpiraELibera() throws Exception {
    for (int i = 0; i <= LIMITE; i++) {
      login(IP);
    }

    relogio.avancar(JANELA);

    assertThat(login(IP).getStatus()).isEqualTo(HttpStatus.OK.value());
  }

  @Test
  @DisplayName("a contagem é por IP, não global: um cliente bloqueado não bloqueia o outro")
  void contagemEhPorIp() throws Exception {
    for (int i = 0; i <= LIMITE; i++) {
      login(IP);
    }

    assertThat(login(IP).getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
    assertThat(login("198.51.100.4").getStatus()).isEqualTo(HttpStatus.OK.value());
  }

  @Test
  @DisplayName("rota fora de /auth não é limitada")
  void foraDeAuthNaoEhLimitado() throws Exception {
    for (int i = 0; i < LIMITE * 3; i++) {
      assertThat(executar("GET", "/health", IP).getStatus()).isEqualTo(HttpStatus.OK.value());
    }

    assertThat(cadeia.chamadas).isEqualTo(LIMITE * 3);
  }

  @Test
  @DisplayName("preflight não consome a cota do usuário")
  void preflightNaoConsomeCota() throws Exception {
    for (int i = 0; i < LIMITE * 3; i++) {
      executar("OPTIONS", "/auth/login", IP);
    }

    assertThat(login(IP).getStatus()).isEqualTo(HttpStatus.OK.value());
  }

  @Test
  @DisplayName("atrás do proxy o cliente é o X-Forwarded-For, não o socket do proxy")
  void clienteVemDoForwardedFor() throws Exception {
    for (int i = 0; i <= LIMITE; i++) {
      requisicaoEncaminhada("203.0.113.9, 10.0.0.1");
    }

    assertThat(requisicaoEncaminhada("203.0.113.9, 10.0.0.1").getStatus())
        .isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
    // Mesmo proxy, cliente diferente: sem ler o header, os dois contariam como um só e o
    // limite estouraria para o serviço inteiro em DES.
    assertThat(requisicaoEncaminhada("203.0.113.55, 10.0.0.1").getStatus())
        .isEqualTo(HttpStatus.OK.value());
  }

  private MockHttpServletResponse requisicaoEncaminhada(String encaminhado) throws Exception {
    MockHttpServletRequest requisicao = new MockHttpServletRequest("POST", "/auth/login");
    requisicao.setRemoteAddr("10.0.0.1");
    requisicao.addHeader("X-Forwarded-For", encaminhado);
    MockHttpServletResponse resposta = new MockHttpServletResponse();
    filtro.doFilter(requisicao, resposta, cadeia);
    return resposta;
  }

  /** {@code MockFilterChain} só aceita uma chamada por instância; aqui contamos várias. */
  private static final class CadeiaContadora implements FilterChain {
    private int chamadas;

    @Override
    public void doFilter(ServletRequest requisicao, ServletResponse resposta) {
      chamadas++;
    }
  }
}
