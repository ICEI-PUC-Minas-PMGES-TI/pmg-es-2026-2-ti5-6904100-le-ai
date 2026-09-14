package br.com.leai.identidade.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Fronteira dos 18 anos (RNF-SEC-43), com "hoje" fixo para o teste não depender da data. */
class MaiorDeIdadeValidatorTest {

  private static final ZoneId FUSO = ZoneOffset.UTC;
  private static final LocalDate HOJE = LocalDate.of(2026, 9, 14);

  private final MaiorDeIdadeValidator validador =
      new MaiorDeIdadeValidator(Clock.fixed(HOJE.atStartOfDay(FUSO).toInstant(), FUSO));

  @Test
  @DisplayName("aceita quem fez 18 anos exatamente hoje")
  void aceitaNoDiaDoAniversarioDe18() {
    assertThat(validador.isValid(HOJE.minusYears(18), null)).isTrue();
  }

  @Test
  @DisplayName("recusa quem faz 18 anos amanhã")
  void recusaUmDiaAntes() {
    assertThat(validador.isValid(HOJE.minusYears(18).plusDays(1), null)).isFalse();
  }

  @Test
  @DisplayName("recusa data de nascimento no futuro")
  void recusaDataFutura() {
    assertThat(validador.isValid(HOJE.plusDays(1), null)).isFalse();
  }

  @Test
  @DisplayName("deixa passar data nula: quem reclama de ausência é o @NotNull")
  void nuloPassa() {
    assertThat(validador.isValid(null, null)).isTrue();
  }
}
