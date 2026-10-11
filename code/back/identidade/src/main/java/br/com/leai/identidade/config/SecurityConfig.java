package br.com.leai.identidade.config;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.EscritorDeErro;
import br.com.leai.identidade.conta.service.TokenDeRecuperacao;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Cadeia de segurança do serviço (P0-NAV).
 *
 * <p>Serviço sem estado de sessão em memória (RNF-ARQ-04): nada de {@code JSESSIONID}, nada de
 * CSRF. A identidade de cada requisição vem inteira do token de acesso.
 *
 * <p>Duas responsabilidades ficaram deliberadamente <b>fora</b> desta cadeia:
 *
 * <ul>
 *   <li><b>CORS</b> continua no {@link CorsConfig}, num filtro que roda antes do Spring Security.
 *       Precisa ser assim: a recusa de origem desconhecida tem de responder com o corpo de erro
 *       padrão, e o {@code cors()} do Security usaria o processador default, que devolve texto
 *       puro. O filtro próprio também garante que o preflight seja resolvido antes da
 *       autorização, sem virar 401.
 *   <li><b>Cabeçalhos de segurança</b> continuam no {@code SecurityHeadersFilter}, pelo mesmo
 *       motivo do CORS: o {@code headers()} do Security só cobre o que entra na cadeia, e
 *       deixaria sem cabeçalho justamente as respostas produzidas antes dela (recusa de CORS,
 *       erro do contêiner). O filtro cobre toda resposta. Os defaults do Security são
 *       desligados aqui para não duplicar cabeçalho.
 * </ul>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  /**
   * Rotas abertas. As de {@code /auth} vão uma a uma, e não como {@code /auth/**}: é onde a
   * sessão nasce, mas {@code /auth/password/change} também mora ali e exige token (RF-AUT-05).
   * Rota nova de {@code /auth} nasce protegida até entrar nesta lista. {@code /health} e
   * {@code /actuator/health} são sondadas pelo Render sem credencial; o spec e o Swagger UI são
   * documentação pública (RNF-ARQ-03); {@code /error} é o despacho interno do contêiner e, se
   * exigisse autenticação, transformaria todo erro em 401.
   */
  private static final String[] ROTAS_PUBLICAS = {
    "/health",
    "/actuator/**",
    "/auth/register",
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/auth/password/forgot",
    "/auth/password/reset",
    // Sem JWT: o job se autentica pelo X-Scheduler-Token, conferido no controller.
    "/internal/jobs/exclusao-conta",
    "/v3/api-docs/**",
    "/docs/**",
    "/swagger-ui/**",
    "/error"
  };

  /** Única rota que aceita o acesso de recuperação (F-CONTA-2, RN-23.3). */
  public static final String ROTA_CANCELAR_EXCLUSAO = "/me/conta/cancelar-exclusao";

  /**
   * Cadeia do acesso de recuperação, avaliada antes da principal. Só cobre a rota de cancelar e
   * valida com o decoder de recuperação: o token de acesso normal falha aqui pela assinatura, e o
   * de recuperação falha em todas as outras rotas, que usam o decoder normal.
   */
  @Bean
  @Order(1)
  SecurityFilterChain cadeiaDeRecuperacao(
      HttpSecurity http, EscritorDeErro escritorDeErro, TokenDeRecuperacao tokenDeRecuperacao)
      throws Exception {
    return base(http.securityMatcher(ROTA_CANCELAR_EXCLUSAO), escritorDeErro)
        .authorizeHttpRequests(rotas -> rotas.anyRequest().authenticated())
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .jwt(jwt -> jwt.decoder(tokenDeRecuperacao.decodificador()))
                    .authenticationEntryPoint(
                        (requisicao, resposta, excecao) ->
                            escritorDeErro.escrever(resposta, CodigoErro.NAO_AUTENTICADO))
                    .accessDeniedHandler(
                        (requisicao, resposta, excecao) ->
                            escritorDeErro.escrever(resposta, CodigoErro.ACESSO_NEGADO)))
        .build();
  }

  @Bean
  @Order(2)
  SecurityFilterChain cadeiaDeFiltros(HttpSecurity http, EscritorDeErro escritorDeErro)
      throws Exception {
    return base(http, escritorDeErro)
        .authorizeHttpRequests(
            rotas -> rotas.requestMatchers(ROTAS_PUBLICAS).permitAll().anyRequest().authenticated())
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .jwt(Customizer.withDefaults())
                    // O resource server instala um entry point próprio, que ganha do global
                    // abaixo quando o token existe mas é inválido ou expirou. Sem esta linha,
                    // esse 401 sai com corpo vazio e quebra o contrato de erro (RNF-ERR-01):
                    // o cliente receberia um 401 que não sabe exibir.
                    .authenticationEntryPoint(
                        (requisicao, resposta, excecao) ->
                            escritorDeErro.escrever(resposta, CodigoErro.NAO_AUTENTICADO))
                    .accessDeniedHandler(
                        (requisicao, resposta, excecao) ->
                            escritorDeErro.escrever(resposta, CodigoErro.ACESSO_NEGADO)))
        .build();
  }

  /** O que as duas cadeias têm em comum: sem estado, sem CSRF e com o corpo de erro padrão. */
  private static HttpSecurity base(HttpSecurity http, EscritorDeErro escritorDeErro)
      throws Exception {
    return http.csrf(csrf -> csrf.disable())
        .cors(cors -> cors.disable())
        .headers(headers -> headers.disable())
        .sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        // Cobre o caso sem Authorization nenhum, que nem chega ao filtro de bearer token.
        .exceptionHandling(
            erros ->
                erros
                    .authenticationEntryPoint(
                        (requisicao, resposta, excecao) ->
                            escritorDeErro.escrever(resposta, CodigoErro.NAO_AUTENTICADO))
                    .accessDeniedHandler(
                        (requisicao, resposta, excecao) ->
                            escritorDeErro.escrever(resposta, CodigoErro.ACESSO_NEGADO)));
  }

  /**
   * Hash de senha com bcrypt e sal por senha (RNF-SEC-09). Custo 12, acima do default 10: o
   * cadastro e o login são as únicas rotas que pagam esse custo, e o atraso extra é o que torna
   * o vazamento do banco caro de explorar.
   *
   * <p>Bcrypt e não Argon2 porque o {@code Argon2PasswordEncoder} do Spring exige BouncyCastle,
   * uma dependência a mais para um ganho que o RNF-SEC-09 não pede: ele aceita os três.
   */
  @Bean
  PasswordEncoder codificadorDeSenha() {
    return new BCryptPasswordEncoder(12);
  }
}
