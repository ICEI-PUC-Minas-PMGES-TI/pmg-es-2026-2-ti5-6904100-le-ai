package br.com.leai.social.common;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Limites por usuário (RNF-SEC-18) para as escritas de interação que as próximas tasks vão
 * implementar: curtir/descurtir uma atividade e comentar. Porte do racional de
 * {@code identidade.perfil.LimitesDeUso#limiteDeSeguir}.
 *
 * <p>Nenhuma fonte fixa um número diferente para curtir/comentar — 30 por minuto é o mesmo valor
 * usado para seguir em `identidade`, mantido aqui por ausência de valor específico na spec
 * (decisão registrada no relatório da Task 1).
 */
@Configuration
public class LimitesDeInteracao {

  public static final int INTERACOES_POR_MINUTO = 30;

  /** Curtir e descurtir uma atividade (`curtirAtividade`/`descurtirAtividade`). */
  @Bean
  LimitePorUsuario limiteDeCurtir() {
    return new LimitePorUsuario(
        INTERACOES_POR_MINUTO,
        "Muitas curtidas em pouco tempo. Tente de novo em instantes.",
        Clock.systemUTC());
  }

  /** Criar comentário (`criarComentario`), inclusive respostas. */
  @Bean
  LimitePorUsuario limiteDeComentar() {
    return new LimitePorUsuario(
        INTERACOES_POR_MINUTO,
        "Muitos comentários em pouco tempo. Tente de novo em instantes.",
        Clock.systemUTC());
  }
}
