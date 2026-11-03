package br.com.leai.social.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** {@code conta.excluida} de F-CONTA-2 contra o schema do catálogo, como o consumidor o recebe. */
class ContaExcluidaSchemaTest {

  private final MessageValidator validador = new MessageValidator();

  private static MessageEnvelope envelope(Map<String, Object> data) {
    return new MessageEnvelope(
        UUID.randomUUID(),
        MessagingConstants.EVENTO_CONTA_EXCLUIDA,
        1,
        OffsetDateTime.parse("2026-10-07T06:00:00Z"),
        UUID.randomUUID(),
        "conta:" + UUID.randomUUID(),
        data);
  }

  @Test
  @DisplayName("conta.excluida só com usuarioId passa")
  void valido() {
    assertThatCode(
            () -> validador.validate(envelope(Map.of("usuarioId", UUID.randomUUID().toString()))))
        .doesNotThrowAnyException();
  }

  @Test
  @DisplayName("conta.excluida com campo a mais ou sem usuarioId é recusado")
  void invalido() {
    assertThatThrownBy(
            () ->
                validador.validate(
                    envelope(
                        Map.of(
                            "usuarioId", UUID.randomUUID().toString(),
                            "email", "vazou@exemplo.com"))))
        .isInstanceOf(InvalidMessageException.class);
    assertThatThrownBy(() -> validador.validate(envelope(Map.of())))
        .isInstanceOf(InvalidMessageException.class);
  }

  @Test
  @DisplayName("a cópia do serviço é idêntica à fonte do catálogo em docs/mensageria/schemas")
  void copiaIgualAoCatalogo() throws IOException {
    String arquivo = "conta.excluida.v1.schema.json";
    Path fonte = Path.of("../../../docs/mensageria/schemas", arquivo);
    Path copia = Path.of("src/main/resources/messaging/schemas", arquivo);

    assertThat(Files.readString(copia).replace("\r\n", "\n").strip())
        .isEqualTo(Files.readString(fonte).replace("\r\n", "\n").strip());
  }
}
