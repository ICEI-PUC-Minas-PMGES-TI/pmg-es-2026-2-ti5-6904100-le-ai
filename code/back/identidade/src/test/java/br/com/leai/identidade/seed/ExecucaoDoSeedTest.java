package br.com.leai.identidade.seed;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

class ExecucaoDoSeedTest {

  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);

  private ExecucaoDoSeed execucao(MockEnvironment ambiente, String senha) {
    return new ExecucaoDoSeed(
        jdbc,
        mock(TransactionTemplate.class),
        mock(PasswordEncoder.class),
        ambiente,
        mock(ConfigurableApplicationContext.class),
        senha);
  }

  @Test
  @DisplayName("recusa o perfil prod antes de tocar o banco")
  void recusaProd() {
    MockEnvironment ambiente = new MockEnvironment();
    ambiente.setActiveProfiles("seed", "prod");

    assertThatThrownBy(
            () -> execucao(ambiente, "senha-comprida-bastante").run(new DefaultApplicationArguments()))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("prod");
    verifyNoInteractions(jdbc);
  }

  @Test
  @DisplayName("recusa SEED_SENHA vazia ou curta")
  void recusaSenhaCurta() {
    MockEnvironment ambiente = new MockEnvironment();
    ambiente.setActiveProfiles("seed");

    assertThatThrownBy(() -> execucao(ambiente, "").run(new DefaultApplicationArguments()))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("SEED_SENHA");
    assertThatThrownBy(() -> execucao(ambiente, "curta").run(new DefaultApplicationArguments()))
        .isInstanceOf(IllegalStateException.class);
    verifyNoInteractions(jdbc);
  }
}
