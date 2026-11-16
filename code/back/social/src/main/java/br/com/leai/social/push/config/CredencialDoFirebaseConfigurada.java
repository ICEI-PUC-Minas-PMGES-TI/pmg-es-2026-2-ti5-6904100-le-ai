package br.com.leai.social.push.config;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

class CredencialDoFirebaseConfigurada implements Condition {

  static final String PROPRIEDADE = "leai.firebase-credentials-json";

  @Override
  public boolean matches(ConditionContext contexto, AnnotatedTypeMetadata metadados) {
    return StringUtils.hasText(contexto.getEnvironment().getProperty(PROPRIEDADE));
  }
}
