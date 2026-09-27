package br.com.leai.social.common;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.RelogioDeTeste;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

/**
 * Rate limiting por IP nas escritas de interação do feed (RNF-SEC-18): curtir, descurtir e
 * comentar. Porte de {@code identidade.common.RateLimitFilterTest}, com as rotas generalizadas.
 */
class RateLimitFilterTest {

  private static final int LIMITE = 3;
  private static final Duration JANELA = Duration.ofMinutes(1);
  private static final String IP = "203.0.113.7";
  private static final String CURTIR = "/atividades/" + UUID.randomUUID() + "/curtir";
  private static final String COMENTARIOS = "/atividades/" + UUID.randomUUID() + "/comentarios";

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

  private MockHttpServletResponse curtir(String ip) throws Exception {
    return executar("POST", CURTIR, ip);
  }

  @Test
  @DisplayName("requisição dentro do limite segue para a cadeia")
  void dentroDoLimitePassa() throws Exception {
    for (int i = 0; i < LIMITE; i++) {
      assertThat(curtir(IP).getStatus()).isEqualTo(HttpStatus.OK.value());
    }

    assertThat(cadeia.chamadas).isEqualTo(LIMITE);
  }

  @Test
  @DisplayName("a requisição seguinte ao limite devolve 429 no corpo de erro padrão")
  void acimaDoLimiteDevolve429() throws Exception {
    for (int i = 0; i < LIMITE; i++) {
      curtir(IP);
    }

    MockHttpServletResponse resposta = curtir(IP);

    assertThat(resposta.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
    assertThat(resposta.getContentAsString())
        .contains(CodigoErro.MUITAS_REQUISICOES.name())
        .contains(RateLimitFilter.MUITAS_TENTATIVAS)
        .contains("correlationId");
    assertThat(cadeia.chamadas).isEqualTo(LIMITE);
  }

  @Test
  @DisplayName("a janela expira e a contagem recomeça do zero")
  void janelaExpiraELibera() throws Exception {
    for (int i = 0; i <= LIMITE; i++) {
      curtir(IP);
    }

    relogio.avancar(JANELA);

    assertThat(curtir(IP).getStatus()).isEqualTo(HttpStatus.OK.value());
  }

  @Test
  @DisplayName("a contagem é por IP, não global: um cliente bloqueado não bloqueia o outro")
  void contagemEhPorIp() throws Exception {
    for (int i = 0; i <= LIMITE; i++) {
      curtir(IP);
    }

    assertThat(curtir(IP).getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
    assertThat(curtir("198.51.100.4").getStatus()).isEqualTo(HttpStatus.OK.value());
  }

  @Test
  @DisplayName("DELETE em /curtir também é limitado (descurtir)")
  void deleteCurtirTambemEhLimitado() throws Exception {
    for (int i = 0; i < LIMITE; i++) {
      executar("DELETE", CURTIR, IP);
    }

    assertThat(executar("DELETE", CURTIR, IP).getStatus())
        .isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
  }

  @Test
  @DisplayName("POST em /comentarios é limitado, mas GET (listagem) não")
  void postComentariosEhLimitadoMasGetNao() throws Exception {
    for (int i = 0; i < LIMITE; i++) {
      executar("POST", COMENTARIOS, IP);
    }

    assertThat(executar("POST", COMENTARIOS, IP).getStatus())
        .isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
    for (int i = 0; i < LIMITE * 3; i++) {
      assertThat(executar("GET", COMENTARIOS, IP).getStatus()).isEqualTo(HttpStatus.OK.value());
    }
  }

  @Test
  @DisplayName("rota fora do feed não é limitada")
  void foraDoFeedNaoEhLimitado() throws Exception {
    for (int i = 0; i < LIMITE * 3; i++) {
      assertThat(executar("GET", "/health", IP).getStatus()).isEqualTo(HttpStatus.OK.value());
    }

    assertThat(cadeia.chamadas).isEqualTo(LIMITE * 3);
  }

  @Test
  @DisplayName("preflight não consome a cota do usuário")
  void preflightNaoConsomeCota() throws Exception {
    for (int i = 0; i < LIMITE * 3; i++) {
      executar("OPTIONS", CURTIR, IP);
    }

    assertThat(curtir(IP).getStatus()).isEqualTo(HttpStatus.OK.value());
  }

  @Test
  @DisplayName("atrás do proxy o cliente é o X-Forwarded-For, não o socket do proxy")
  void clienteVemDoForwardedFor() throws Exception {
    for (int i = 0; i <= LIMITE; i++) {
      requisicaoEncaminhada("203.0.113.9, 10.0.0.1");
    }

    assertThat(requisicaoEncaminhada("203.0.113.9, 10.0.0.1").getStatus())
        .isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
    assertThat(requisicaoEncaminhada("203.0.113.55, 10.0.0.1").getStatus())
        .isEqualTo(HttpStatus.OK.value());
  }

  private MockHttpServletResponse requisicaoEncaminhada(String encaminhado) throws Exception {
    MockHttpServletRequest requisicao = new MockHttpServletRequest("POST", CURTIR);
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
