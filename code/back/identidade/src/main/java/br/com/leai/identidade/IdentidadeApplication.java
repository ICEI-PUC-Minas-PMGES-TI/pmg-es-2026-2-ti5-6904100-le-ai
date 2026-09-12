package br.com.leai.identidade;

import br.com.leai.identidade.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/**
 * Serviço {@code identidade} — usuário, autenticação, perfil, privacidade, seguidores e
 * solicitações de seguir (requisitos AUT e SOC-01 a SOC-08).
 *
 * <p>{@code @EnableConfigurationProperties} em vez de {@code @ConfigurationPropertiesScan}: assim
 * o bean de configuração é registrado pela classe primária e validado antes de a
 * autoconfiguração montar o pool do banco. O que sobe na falha é a lista de variáveis de
 * ambiente faltando, não um erro obscuro de datasource.
 */
@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class IdentidadeApplication {

  public static void main(String[] args) {
    SpringApplication.run(IdentidadeApplication.class, args);
  }
}
