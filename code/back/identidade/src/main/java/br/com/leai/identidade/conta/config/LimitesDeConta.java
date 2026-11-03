package br.com.leai.identidade.conta.config;

import br.com.leai.identidade.common.LimitePorUsuario;
import java.time.Clock;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Limite de F-CONTA-2: senha errada ao pedir a exclusão (decisão do dono, 07/10/2026). */
@Configuration
public class LimitesDeConta {

  public static final int ERROS_DE_SENHA = 5;
  public static final Duration JANELA_DE_ERROS = Duration.ofMinutes(15);

  /** Cópia de {@code excluir-conta.md} §4.6. Conta só as falhas, não as tentativas. */
  @Bean
  LimitePorUsuario limiteDeSenhaNaExclusao() {
    return new LimitePorUsuario(
        ERROS_DE_SENHA,
        JANELA_DE_ERROS,
        "Muitas tentativas com a senha errada. Espere alguns minutos para tentar de novo.",
        Clock.systemUTC());
  }
}
