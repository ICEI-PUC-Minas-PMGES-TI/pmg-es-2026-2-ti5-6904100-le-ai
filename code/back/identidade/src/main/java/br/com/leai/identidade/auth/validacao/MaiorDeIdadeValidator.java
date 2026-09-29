package br.com.leai.identidade.auth.validacao;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;

/**
 * Implementação de {@link MaiorDeIdade}.
 *
 * <p>O {@link Clock} é injetável para o teste conseguir fixar "hoje" e exercitar a fronteira dos
 * 18 anos sem depender da data em que roda. Data nula passa: quem reclama de ausência é o
 * {@code @NotNull}, e acumular as duas mensagens no mesmo campo confundiria a tela.
 */
public class MaiorDeIdadeValidator implements ConstraintValidator<MaiorDeIdade, LocalDate> {

  private static final int IDADE_MINIMA = 18;

  private final Clock relogio;

  public MaiorDeIdadeValidator() {
    this(Clock.systemDefaultZone());
  }

  MaiorDeIdadeValidator(Clock relogio) {
    this.relogio = relogio;
  }

  @Override
  public boolean isValid(LocalDate dataNascimento, ConstraintValidatorContext contexto) {
    if (dataNascimento == null) {
      return true;
    }
    LocalDate hoje = LocalDate.now(relogio);
    if (dataNascimento.isAfter(hoje)) {
      return false;
    }
    return Period.between(dataNascimento, hoje).getYears() >= IDADE_MINIMA;
  }
}
