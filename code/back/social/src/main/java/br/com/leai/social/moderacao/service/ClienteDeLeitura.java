package br.com.leai.social.moderacao.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.config.AppProperties;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Comando interno de remoção no {@code leitura} (F-MOD, arquitetura §3.1): HTTP autenticado pelo
 * {@code X-Moderacao-Token} e idempotente. É o único lugar em que o {@code social} chama outro
 * serviço.
 *
 * <ul>
 *   <li><b>Chave fixa por alvo</b> ({@code UUID} derivado de {@code moderacao:resenha:<id>}): se a
 *       primeira chamada apagou e a resposta se perdeu, a repetição recebe o mesmo {@code removida:
 *       true}, e não um {@code removida: false} que esconderia a remoção da auditoria.
 *   <li><b>Timeout de leitura de 60 s</b>, abaixo dos 90 s do cliente web: o {@code leitura} no
 *       plano gratuito do Render acorda em 50 a 100 s. Estourou, 504, e a denúncia continua pendente.
 *   <li><b>Uma retentativa</b> depois de 2 s, só em falha de conexão ou 503 (RNF-ERR-08). Timeout
 *       de leitura não repete: o pedido pode ter chegado, e o reenvio é do administrador.
 * </ul>
 */
@Component
public class ClienteDeLeitura {

  private static final Logger log = LoggerFactory.getLogger(ClienteDeLeitura.class);

  static final String CABECALHO_TOKEN = "X-Moderacao-Token";

  /** Resposta de {@code RemocaoPelaModeracao}; {@code recusada} marca o 409 do recibo vencido. */
  public record Remocao(boolean removida, UUID autorId, UUID livroId, boolean recusada) {

    static Remocao recusadaPeloRecibo() {
      return new Remocao(false, null, null, true);
    }
  }

  private record CorpoDaRemocao(boolean removida, UUID autorId, UUID livroId) {}

  private final RestClient http;
  private final String token;
  private final Duration esperaDaRetentativa;

  /**
   * Os tempos têm propriedade só para a base de integração, que testa o timeout de verdade sem
   * esperar um minuto; produção usa os padrões, sem variável de ambiente.
   */
  @Autowired
  public ClienteDeLeitura(
      AppProperties propriedades,
      @Value("${leai.moderacao.timeout-de-leitura:60s}") Duration leitura,
      @Value("${leai.moderacao.espera-da-retentativa:2s}") Duration esperaDaRetentativa) {
    this(propriedades, Duration.ofSeconds(5), leitura, esperaDaRetentativa);
  }

  ClienteDeLeitura(
      AppProperties propriedades,
      Duration conexao,
      Duration leitura,
      Duration esperaDaRetentativa) {
    JdkClientHttpRequestFactory fabrica =
        new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(conexao).build());
    fabrica.setReadTimeout(leitura);
    this.http =
        RestClient.builder()
            .requestFactory(fabrica)
            .baseUrl(propriedades.leituraBaseUrl() == null ? "" : propriedades.leituraBaseUrl())
            .build();
    this.token = propriedades.moderacaoConfigurada() ? propriedades.moderacaoToken() : null;
    this.esperaDaRetentativa = esperaDaRetentativa;
  }

  public Remocao removerResenha(UUID resenhaId) {
    return remover("resenhas", "resenha", resenhaId);
  }

  public Remocao removerFrase(UUID fraseId) {
    return remover("frases", "frase", fraseId);
  }

  /** A chave que o {@code leitura} recebe para o alvo: a mesma em toda tentativa. */
  static UUID chaveDoAlvo(String tipo, UUID id) {
    return UUID.nameUUIDFromBytes(("moderacao:" + tipo + ":" + id).getBytes(StandardCharsets.UTF_8));
  }

  private Remocao remover(String colecao, String tipo, UUID id) {
    if (token == null) {
      log.error("MODERACAO_TOKEN ausente: a remoção pela moderação está desligada");
      throw indisponivel();
    }
    try {
      return chamar(colecao, tipo, id);
    } catch (FalhaRetentavel primeira) {
      log.warn("leitura indisponível na remoção de {} {}; nova tentativa", tipo, id);
      esperar();
      try {
        return chamar(colecao, tipo, id);
      } catch (FalhaRetentavel segunda) {
        throw indisponivel();
      }
    }
  }

  private Remocao chamar(String colecao, String tipo, UUID id) {
    try {
      CorpoDaRemocao corpo =
          http.post()
              .uri("/internal/moderacao/{colecao}/{id}/remocao", colecao, id)
              .header(CABECALHO_TOKEN, token)
              .header("Idempotency-Key", chaveDoAlvo(tipo, id).toString())
              .retrieve()
              .body(CorpoDaRemocao.class);
      if (corpo == null) {
        throw indisponivel();
      }
      return new Remocao(corpo.removida(), corpo.autorId(), corpo.livroId(), false);
    } catch (RestClientResponseException erro) {
      HttpStatus status = HttpStatus.resolve(erro.getStatusCode().value());
      if (status == HttpStatus.CONFLICT) {
        return Remocao.recusadaPeloRecibo();
      }
      if (status == HttpStatus.SERVICE_UNAVAILABLE
          || status == HttpStatus.BAD_GATEWAY
          || status == HttpStatus.GATEWAY_TIMEOUT) {
        throw new FalhaRetentavel();
      }
      log.error("leitura recusou a remoção de {} {} com {}", tipo, id, erro.getStatusCode());
      throw indisponivel();
    } catch (ResourceAccessException erro) {
      if (causaDeTimeout(erro)) {
        log.warn("Remoção de {} {} sem resposta do leitura a tempo", tipo, id);
        throw new ErroDeNegocioException(
            CodigoErro.TEMPO_ESGOTADO,
            "A remoção não foi confirmada a tempo. A denúncia continua pendente.");
      }
      throw new FalhaRetentavel();
    }
  }

  private static boolean causaDeTimeout(Throwable erro) {
    for (Throwable causa = erro; causa != null; causa = causa.getCause()) {
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
        "Não foi possível falar com o serviço de leitura. A denúncia continua pendente.");
  }

  /** Falha antes de o {@code leitura} responder: conexão recusada ou 502/503/504. */
  private static final class FalhaRetentavel extends RuntimeException {
    FalhaRetentavel() {
      super(null, null, false, false);
    }
  }
}
