package br.com.leai.identidade.auth;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Recusa data de nascimento de quem ainda não fez 18 anos (RNF-SEC-43).
 *
 * <p>A restrição é de produto, não de formulário: o cadastro é restrito a maiores de 18 por
 * LGPD, e por isso vive no servidor. A validação equivalente no cliente apenas reforça.
 */
@Documented
@Constraint(validatedBy = MaiorDeIdadeValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface MaiorDeIdade {

  String message() default "É necessário ter 18 anos ou mais para criar uma conta.";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
