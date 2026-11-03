package br.com.leai.identidade.conta.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.util.HexFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Apaga o avatar no Cloudinary na exclusão definitiva (RN-23.7), pela Upload API {@code destroy}
 * com assinatura SHA-1 ({@code public_id} e {@code timestamp} mais o segredo).
 *
 * <p>Roda depois do commit da exclusão e nunca a desfaz: a conta já não existe e o asset ficou
 * sem referência. Falha de rede, credencial ausente ou resposta inesperada vão para o log com o
 * {@code publicId}, que não identifica o leitor, para limpeza manual.
 */
@Component
public class RemocaoDeAsset {

  private static final Logger log = LoggerFactory.getLogger(RemocaoDeAsset.class);

  private final String cloudName;
  private final String apiKey;
  private final String apiSecret;
  private final Clock relogio;
  private final HttpClient http =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

  @Autowired
  public RemocaoDeAsset(
      @Value("${leai.cloudinary-cloud-name:}") String cloudName,
      @Value("${leai.cloudinary-api-key:}") String apiKey,
      @Value("${leai.cloudinary-api-secret:}") String apiSecret) {
    this(cloudName, apiKey, apiSecret, Clock.systemUTC());
  }

  RemocaoDeAsset(String cloudName, String apiKey, String apiSecret, Clock relogio) {
    this.cloudName = cloudName;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.relogio = relogio;
  }

  public boolean configurada() {
    return !cloudName.isBlank() && !apiKey.isBlank() && !apiSecret.isBlank();
  }

  /** Devolve {@code true} se o Cloudinary confirmou a remoção (ou o asset já não existia). */
  public boolean apagar(String publicId) {
    if (publicId == null || publicId.isBlank()) {
      return true;
    }
    if (!configurada()) {
      log.warn("Asset {} não removido: credencial do Cloudinary ausente", publicId);
      return false;
    }
    try {
      long timestamp = relogio.instant().getEpochSecond();
      String assinatura =
          sha1("public_id=" + publicId + "&timestamp=" + timestamp + apiSecret);
      String corpo =
          "public_id="
              + URLEncoder.encode(publicId, StandardCharsets.UTF_8)
              + "&timestamp="
              + timestamp
              + "&api_key="
              + URLEncoder.encode(apiKey, StandardCharsets.UTF_8)
              + "&signature="
              + assinatura;
      HttpRequest requisicao =
          HttpRequest.newBuilder(
                  URI.create("https://api.cloudinary.com/v1_1/" + cloudName + "/image/destroy"))
              .timeout(Duration.ofSeconds(10))
              .header("Content-Type", "application/x-www-form-urlencoded")
              .POST(HttpRequest.BodyPublishers.ofString(corpo))
              .build();
      HttpResponse<String> resposta = http.send(requisicao, HttpResponse.BodyHandlers.ofString());
      // "ok" removeu; "not found" já não existia. Os dois cumprem o RN-23.7.
      boolean removido =
          resposta.statusCode() == 200
              && (resposta.body().contains("\"ok\"") || resposta.body().contains("not found"));
      if (!removido) {
        log.warn(
            "Asset {} não removido: Cloudinary respondeu {}", publicId, resposta.statusCode());
      }
      return removido;
    } catch (java.io.IOException erro) {
      log.warn("Asset {} não removido: falha de rede com o Cloudinary", publicId);
      return false;
    } catch (InterruptedException erro) {
      Thread.currentThread().interrupt();
      log.warn("Asset {} não removido: chamada interrompida", publicId);
      return false;
    }
  }

  private static String sha1(String valor) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-1").digest(valor.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException erro) {
      throw new IllegalStateException("SHA-1 indisponível na JVM", erro);
    }
  }
}
