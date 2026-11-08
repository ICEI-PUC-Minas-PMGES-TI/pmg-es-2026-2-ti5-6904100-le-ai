package br.com.leai.social.push.config;

import br.com.leai.social.config.AppProperties;
import br.com.leai.social.push.service.EnviadorDePush;
import br.com.leai.social.push.service.EnviadorDesativado;
import br.com.leai.social.push.service.EnviadorFcm;
import br.com.leai.social.push.service.EnviadorResiliente;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ConfiguracaoDePush {

  static final String NOME_DO_APP = "leai-social-fcm";
  static final Duration TIMEOUT_DE_CONEXAO = Duration.ofSeconds(3);
  static final Duration TIMEOUT_DE_LEITURA = Duration.ofSeconds(5);

  @Bean(destroyMethod = "delete")
  @Conditional(CredencialDoFirebaseConfigurada.class)
  FirebaseApp firebaseApp(AppProperties propriedades) throws IOException {
    GoogleCredentials credencial =
        GoogleCredentials.fromStream(
            new ByteArrayInputStream(
                propriedades.firebaseCredentialsJson().getBytes(StandardCharsets.UTF_8)));
    FirebaseOptions opcoes =
        FirebaseOptions.builder()
            .setCredentials(credencial)
            .setConnectTimeout((int) TIMEOUT_DE_CONEXAO.toMillis())
            .setReadTimeout((int) TIMEOUT_DE_LEITURA.toMillis())
            .build();
    return FirebaseApp.initializeApp(opcoes, NOME_DO_APP);
  }

  @Bean
  EnviadorDePush enviadorDePush(ObjectProvider<FirebaseApp> firebase) {
    FirebaseApp app = firebase.getIfAvailable();
    if (app == null) {
      return new EnviadorDesativado();
    }
    return new EnviadorResiliente(new EnviadorFcm(FirebaseMessaging.getInstance(app)));
  }
}
