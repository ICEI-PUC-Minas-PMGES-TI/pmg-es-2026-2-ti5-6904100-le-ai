package br.com.leai.social;

import br.com.leai.social.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/**
 * Serviço {@code social} — feed e atividades, curtidas de atividade, comentários, listas,
 * recomendações, notificações e moderação (requisitos SOC-09 a 15, LST, REC, NOT e MOD).
 *
 * <p>{@code @EnableConfigurationProperties} em vez de {@code @ConfigurationPropertiesScan}: assim
 * o bean de configuração é registrado pela classe primária e validado antes de a
 * autoconfiguração montar o pool do banco. O que sobe na falha é a lista de variáveis de
 * ambiente faltando, não um erro obscuro de datasource.
 */
@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class SocialApplication {

  public static void main(String[] args) {
    SpringApplication.run(SocialApplication.class, args);
  }
}
