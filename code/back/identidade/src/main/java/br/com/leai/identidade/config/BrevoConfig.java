package br.com.leai.identidade.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** Cliente HTTP do Brevo com limites finitos para não prender a requisição de autenticação. */
@Configuration
public class BrevoConfig {

  @Bean
  RestClient brevoRestClient() {
    HttpClient httpClient =
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
    requestFactory.setReadTimeout(Duration.ofSeconds(10));

    return RestClient.builder()
        .baseUrl("https://api.brevo.com")
        .requestFactory(requestFactory)
        .build();
  }
}
