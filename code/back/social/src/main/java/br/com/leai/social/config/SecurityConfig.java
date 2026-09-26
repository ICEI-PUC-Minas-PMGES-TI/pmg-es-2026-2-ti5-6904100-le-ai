package br.com.leai.social.config;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.EscritorDeErro;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Cadeia de segurança do serviço. Porte de {@code identidade.config.SecurityConfig}: toda rota de
 * domínio do feed exige JWT ({@code bearerAuth} em {@code docs/api/social.yaml}).
 *
 * <p>Serviço sem estado de sessão em memória (RNF-ARQ-04): nada de {@code JSESSIONID}, nada de
 * CSRF. A identidade de cada requisição vem inteira do token de acesso emitido por
 * {@code identidade}.
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
   * Rotas abertas. {@code /health} e {@code /actuator/health} são sondadas pelo Render sem
   * credencial; o spec e o Swagger UI são documentação pública (RNF-ARQ-03); {@code /error} é o
   * despacho interno do contêiner e, se exigisse autenticação, transformaria todo erro em 401.
   * Sem rotas {@code /auth/*}: `social` não emite nem gerencia sessão, isso é de `identidade`.
   */
  private static final String[] ROTAS_PUBLICAS = {
    "/health",
    "/actuator/**",
    "/v3/api-docs/**",
    "/docs/**",
    "/swagger-ui/**",
    "/error"
  };

  @Bean
  SecurityFilterChain cadeiaDeFiltros(HttpSecurity http, EscritorDeErro escritorDeErro)
      throws Exception {
    return http.csrf(csrf -> csrf.disable())
        .cors(cors -> cors.disable())
        .headers(headers -> headers.disable())
        .sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            rotas -> rotas.requestMatchers(ROTAS_PUBLICAS).permitAll().anyRequest().authenticated())
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .jwt(Customizer.withDefaults())
                    // O resource server instala um entry point próprio, que ganha do global
                    // abaixo quando o token existe mas é inválido ou expirou. Sem esta linha,
                    // esse 401 sai com corpo vazio e quebra o contrato de erro (RNF-ERR-01).
                    .authenticationEntryPoint(
                        (requisicao, resposta, excecao) ->
                            escritorDeErro.escrever(resposta, CodigoErro.NAO_AUTENTICADO))
                    .accessDeniedHandler(
                        (requisicao, resposta, excecao) ->
                            escritorDeErro.escrever(resposta, CodigoErro.ACESSO_NEGADO)))
        // Cobre o caso sem Authorization nenhum, que nem chega ao filtro de bearer token.
        .exceptionHandling(
            erros ->
                erros
                    .authenticationEntryPoint(
                        (requisicao, resposta, excecao) ->
                            escritorDeErro.escrever(resposta, CodigoErro.NAO_AUTENTICADO))
                    .accessDeniedHandler(
                        (requisicao, resposta, excecao) ->
                            escritorDeErro.escrever(resposta, CodigoErro.ACESSO_NEGADO)))
        .build();
  }
}
