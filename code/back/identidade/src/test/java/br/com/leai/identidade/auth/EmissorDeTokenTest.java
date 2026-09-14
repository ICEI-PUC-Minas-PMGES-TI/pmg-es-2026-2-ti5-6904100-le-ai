package br.com.leai.identidade.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.identidade.config.AppProperties;
import br.com.leai.identidade.config.JwtConfig;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

/**
 * Ida e volta do token de acesso, sem contexto Spring: monta o {@link JwtConfig} à mão, como o
 * {@code AppPropertiesTest} faz com a configuração. Nenhum teste toca banco ou rede.
 */
class EmissorDeTokenTest {

  private static final String SEGREDO = "segredo-de-teste-com-32-caracteres";
  private static final String SEGREDO_DE_OUTRO_SERVICO = "outro-segredo-de-teste-com-32-chars";

  private final JwtConfig config = new JwtConfig();

  private static AppProperties propriedadesCom(String segredo) {
    return new AppProperties(
        "identidade",
        "identidade",
        "jdbc:postgresql://localhost:5432/leai",
        "http://localhost:5173",
        null,
        segredo,
        null,
        null);
  }

  private EmissorDeToken emissorCom(String segredo) {
    SecretKey chave = config.chaveDeAssinatura(propriedadesCom(segredo));
    return new EmissorDeToken(config.jwtEncoder(chave));
  }

  private JwtDecoder decodificadorCom(String segredo) {
    return config.jwtDecoder(config.chaveDeAssinatura(propriedadesCom(segredo)));
  }

  @Test
  @DisplayName("o token emitido volta com o id do usuário no subject e o username na claim")
  void tokenCarregaIdentidadeDoUsuario() {
    UUID usuarioId = UUID.randomUUID();

    String token = emissorCom(SEGREDO).emitir(usuarioId, "marinableu");
    Jwt decodificado = decodificadorCom(SEGREDO).decode(token);

    assertThat(decodificado.getSubject()).isEqualTo(usuarioId.toString());
    assertThat(decodificado.getClaimAsString("username")).isEqualTo("marinableu");
    // getIssuer() converteria para URL e estouraria: o emissor é o nome do serviço, não um
    // endereço. O JWT aceita StringOrURI no `iss`, então a leitura correta aqui é como texto.
    assertThat(decodificado.getClaimAsString("iss")).isEqualTo("identidade");
  }

  @Test
  @DisplayName("o token expira em 15 minutos, a validade anunciada no login")
  void tokenExpiraEmQuinzeMinutos() {
    EmissorDeToken emissor = emissorCom(SEGREDO);

    Jwt decodificado = decodificadorCom(SEGREDO).decode(emissor.emitir(UUID.randomUUID(), "aluno"));

    assertThat(ChronoUnit.SECONDS.between(decodificado.getIssuedAt(), decodificado.getExpiresAt()))
        .isEqualTo(900L);
    assertThat(emissor.validadeEmSegundos()).isEqualTo(900L);
  }

  @Test
  @DisplayName("token assinado com outro segredo é recusado")
  void tokenDeOutroSegredoNaoPassa() {
    String token = emissorCom(SEGREDO_DE_OUTRO_SERVICO).emitir(UUID.randomUUID(), "aluno");

    assertThatThrownBy(() -> decodificadorCom(SEGREDO).decode(token))
        .isInstanceOf(JwtException.class);
  }
}
