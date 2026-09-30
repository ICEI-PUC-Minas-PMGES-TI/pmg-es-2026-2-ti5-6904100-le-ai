package br.com.leai.identidade.perfil.config;

import br.com.leai.identidade.common.LimitePorUsuario;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Os dois limites por usuário de F-PERFIL. Nenhuma fonte fixa os números; 30 por minuto é folga
 * para uso humano e corta automação (decisão de 24/09/2026).
 */
@Configuration
public class LimitesDeUso {

  public static final int BUSCAS_POR_MINUTO = 30;
  public static final int SEGUIR_POR_MINUTO = 30;

  /**
   * Busca exata: a igualdade já impede varrer por prefixo; o limite impede montar diretório
   * testando nomes inteiros em massa (RNF-SEC-19/44). Não é o RNF-SEC-18.
   */
  @Bean
  LimitePorUsuario limiteDeBusca() {
    return new LimitePorUsuario(
        BUSCAS_POR_MINUTO,
        "Muitas buscas em pouco tempo. Tente de novo em instantes.",
        Clock.systemUTC());
  }

  /** Seguir e pedir para seguir (RNF-SEC-18): cada pedido gera notificação para outra pessoa. */
  @Bean
  LimitePorUsuario limiteDeSeguir() {
    return new LimitePorUsuario(
        SEGUIR_POR_MINUTO,
        "Muitas ações de seguir em pouco tempo. Tente de novo em instantes.",
        Clock.systemUTC());
  }
}
