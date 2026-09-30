package br.com.leai.identidade.seed;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Roda o {@link SeedDeIdentidade} e encerra o processo, só sob o perfil {@code seed}: {@code
 * SEED_SENHA=... ./mvnw spring-boot:run -Dspring-boot.run.profiles=seed}. O Flyway aplica as
 * migrations antes, e o perfil desliga o servidor HTTP e a mensageria.
 *
 * <p>Recusa o perfil {@code prod}, como o seed do {@code acervo} recusa {@code NODE_ENV=production}.
 * O banco é o do {@code DATABASE_URL}: com o {@code .env} local, é o Neon de DES.
 */
@Component
@Profile("seed")
public class ExecucaoDoSeed implements ApplicationRunner {

  static final int TAMANHO_MINIMO_DA_SENHA = 12;

  private static final Logger log = LoggerFactory.getLogger(ExecucaoDoSeed.class);

  private final SeedDeIdentidade seed;
  private final Environment ambiente;
  private final ConfigurableApplicationContext contexto;
  private final String senha;

  public ExecucaoDoSeed(
      JdbcTemplate jdbc,
      TransactionTemplate transacao,
      PasswordEncoder codificadorDeSenha,
      Environment ambiente,
      ConfigurableApplicationContext contexto,
      @Value("${leai.seed-senha:}") String senha) {
    this.seed = new SeedDeIdentidade(jdbc, transacao, codificadorDeSenha);
    this.ambiente = ambiente;
    this.contexto = contexto;
    this.senha = senha;
  }

  @Override
  public void run(ApplicationArguments argumentos) {
    if (ambiente.acceptsProfiles(Profiles.of("prod"))) {
      throw new IllegalStateException("Seed recusado no perfil prod.");
    }
    if (senha.length() < TAMANHO_MINIMO_DA_SENHA || senha.length() > 72) {
      throw new IllegalStateException(
          "SEED_SENHA precisa ter de " + TAMANHO_MINIMO_DA_SENHA + " a 72 caracteres.");
    }
    seed.semear(senha);
    log.info("Seed de identidade aplicado (RNF-TST-08): seed.ana, seed.bruno, seed.caio, seed.duda");
    System.exit(SpringApplication.exit(contexto, () -> 0));
  }
}
