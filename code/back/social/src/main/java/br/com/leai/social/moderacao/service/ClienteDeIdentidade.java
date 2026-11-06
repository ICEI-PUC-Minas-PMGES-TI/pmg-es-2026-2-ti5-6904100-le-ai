package br.com.leai.social.moderacao.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.config.AppProperties;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Comando interno de suspensão e reativação no {@code identidade} (F-MOD-OPC). Mesmo molde do
 * {@link ClienteDeLeitura} (F-MOD): {@code X-Moderacao-Token}, timeout de leitura de 60 s e uma
 * retentativa depois de 2 s só em falha de conexão ou 502/503/504.
 *
 * <p>Além do segredo, repassa o JWT do administrador: o {@code identidade} revalida o papel e não
 * aceita só o segredo (decisão 2). Sem chave de idempotência: o {@code identidade} é idempotente
 * pelo estado, e a repetição devolve o mesmo instante.
 *
 * <ul>
 *   <li>404 e 422 continuam 404 e 422, com a mensagem do painel.
 *   <li>401 ou 403 do {@code identidade} é configuração divergente (segredo ou admin): ERROR no log
 *       e 503 para o painel.
 *   <li>Timeout de leitura é 504 e não repete: o comando pode ter chegado. A repetição do admin
 *       cai no mesmo episódio.
 * </ul>
 */
@Component
public class ClienteDeIdentidade {

  private static final Logger log = LoggerFactory.getLogger(ClienteDeIdentidade.class);

  static final String CABECALHO_TOKEN = "X-Moderacao-Token";

  /** Resposta de {@code EstadoDaSuspensao} do {@code identidade}. */
  public record EstadoDaConta(
      UUID usuarioId,
      boolean suspenso,
      Instant suspensoEm,
      Instant reativadoEm,
      boolean alterado) {}

  private final RestClient http;
  private final String token;
  private final Duration esperaDaRetentativa;

  @Autowired
  public ClienteDeIdentidade(
      AppProperties propriedades,
      @Value("${leai.moderacao.timeout-de-leitura:60s}") Duration leitura,
      @Value("${leai.moderacao.espera-da-retentativa:2s}") Duration esperaDaRetentativa) {
    JdkClientHttpRequestFactory fabrica =
        new JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
    fabrica.setReadTimeout(leitura);
    this.http =
        RestClient.builder()
            .requestFactory(fabrica)
            .baseUrl(
                propriedades.identidadeBaseUrl() == null ? "" : propriedades.identidadeBaseUrl())
            .build();
    this.token = propriedades.moderacaoConfigurada() ? propriedades.moderacaoToken() : null;
    this.esperaDaRetentativa = esperaDaRetentativa;
    if (token == null) {
      log.warn(
          "MODERACAO_TOKEN não configurado: remover resenha e frase, suspender e reativar conta"
              + " responderão 503 até ele ser definido");
    }
  }

  public EstadoDaConta suspender(UUID usuarioId, String jwtDoAdmin) {
    return comandar("suspensao", usuarioId, jwtDoAdmin);
  }

  public EstadoDaConta reativar(UUID usuarioId, String jwtDoAdmin) {
    return comandar("reativacao", usuarioId, jwtDoAdmin);
  }

  private EstadoDaConta comandar(String acao, UUID usuarioId, String jwtDoAdmin) {
    if (token == null) {
      log.error("MODERACAO_TOKEN ausente: a suspensão de conta está desligada");
      throw indisponivel();
    }
    try {
      return chamar(acao, usuarioId, jwtDoAdmin);
    } catch (FalhaRetentavel primeira) {
      log.warn("identidade indisponível na {} da conta {}; nova tentativa", acao, usuarioId);
      esperar();
      try {
        return chamar(acao, usuarioId, jwtDoAdmin);
      } catch (FalhaRetentavel segunda) {
        throw indisponivel();
      }
    }
  }

  private EstadoDaConta chamar(String acao, UUID usuarioId, String jwtDoAdmin) {
    try {
      EstadoDaConta corpo =
          http.post()
              .uri("/internal/moderacao/usuarios/{id}/{acao}", usuarioId, acao)
              .header(CABECALHO_TOKEN, token)
              .header("Authorization", "Bearer " + jwtDoAdmin)
              .retrieve()
              .body(EstadoDaConta.class);
      if (corpo == null) {
        throw indisponivel();
      }
      return corpo;
    } catch (RestClientResponseException erro) {
      // Pelo número: no Spring 7 o 422 resolve para UNPROCESSABLE_CONTENT.
      int status = erro.getStatusCode().value();
      if (status == 404) {
        throw new ErroDeNegocioException(
            CodigoErro.RECURSO_NAO_ENCONTRADO,
            "Esta conta não existe mais ou está em exclusão.");
      }
      if (status == 422) {
        throw new ErroDeNegocioException(
            CodigoErro.ENTIDADE_NAO_PROCESSAVEL, "A conta administradora não pode ser suspensa.");
      }
      if (status == 502 || status == 503 || status == 504) {
        throw new FalhaRetentavel();
      }
      // 401/403: segredo ou admin divergente entre os serviços. Não é falha do administrador.
      log.error(
          "identidade recusou a {} da conta {} com {}", acao, usuarioId, erro.getStatusCode());
      throw indisponivel();
    } catch (ResourceAccessException erro) {
      if (causaDeTimeout(erro)) {
        log.warn("{} da conta {} sem resposta do identidade a tempo", acao, usuarioId);
        throw new ErroDeNegocioException(
            CodigoErro.TEMPO_ESGOTADO,
            "A ação não foi confirmada a tempo. Tente de novo; ela não se repete.");
      }
      throw new FalhaRetentavel();
    }
  }

  /**
   * Só o timeout de <b>leitura</b>: o pedido pode ter chegado. O de conexão é subclasse de {@link
   * HttpTimeoutException}, mas nele o pedido certamente não saiu, então é falha de conexão, com a
   * retentativa (RNF-ERR-08). Achado da validação da F-MOD-OPC, 06/11/2026.
   */
  static boolean causaDeTimeout(Throwable erro) {
    for (Throwable causa = erro; causa != null; causa = causa.getCause()) {
      if (causa instanceof HttpConnectTimeoutException) {
        return false;
      }
      if (causa instanceof HttpTimeoutException) {
        return true;
      }
    }
    return false;
  }

  private void esperar() {
    try {
      Thread.sleep(esperaDaRetentativa);
    } catch (InterruptedException interrompido) {
      Thread.currentThread().interrupt();
      throw indisponivel();
    }
  }

  private static ErroDeNegocioException indisponivel() {
    return new ErroDeNegocioException(
        CodigoErro.SERVICO_INDISPONIVEL,
        "Não foi possível falar com o serviço de contas. Nada foi alterado.");
  }

  /** Falha antes de o {@code identidade} responder: conexão recusada ou 502/503/504. */
  private static final class FalhaRetentavel extends RuntimeException {
    FalhaRetentavel() {
      super(null, null, false, false);
    }
  }
}
