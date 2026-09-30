package br.com.leai.identidade.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Os três eventos de F-PERFIL contra os schemas do catálogo. O publisher valida todo envelope antes
 * de publicar; schema não registrado prenderia o evento na outbox para sempre.
 */
class EventosDePerfilSchemaTest {

  private final MessageValidator validador = new MessageValidator();

  private static Map<String, Object> snapshot() {
    Map<String, Object> snapshot = new HashMap<>();
    snapshot.put("id", UUID.randomUUID().toString());
    snapshot.put("username", "marinableu");
    snapshot.put("displayName", "Marina Beltrão");
    snapshot.put("avatarUrl", null);
    return snapshot;
  }

  private static MessageEnvelope envelope(String tipo, Map<String, Object> data) {
    return new MessageEnvelope(
        UUID.randomUUID(),
        tipo,
        1,
        OffsetDateTime.parse("2026-09-24T12:00:00Z"),
        UUID.randomUUID(),
        "seguimento:" + UUID.randomUUID(),
        data);
  }

  @Test
  @DisplayName("seguidor.novo, solicitacao.criada e solicitacao.aceita bem formados passam")
  void eventosValidos() {
    assertThatCode(
            () ->
                validador.validate(
                    envelope(
                        "seguidor.novo",
                        Map.of(
                            "destinatarioId", UUID.randomUUID().toString(),
                            "seguimentoId", UUID.randomUUID().toString(),
                            "seguidor", snapshot()))))
        .doesNotThrowAnyException();
    assertThatCode(
            () ->
                validador.validate(
                    envelope(
                        "solicitacao.criada",
                        Map.of(
                            "destinatarioId", UUID.randomUUID().toString(),
                            "solicitacaoId", UUID.randomUUID().toString(),
                            "solicitante", snapshot()))))
        .doesNotThrowAnyException();
    assertThatCode(
            () ->
                validador.validate(
                    envelope(
                        "solicitacao.aceita",
                        Map.of(
                            "destinatarioId", UUID.randomUUID().toString(),
                            "solicitacaoId", UUID.randomUUID().toString(),
                            "seguimentoId", UUID.randomUUID().toString(),
                            "perfilAceitante", snapshot()))))
        .doesNotThrowAnyException();
  }

  @Test
  @DisplayName("snapshot sem avatarUrl ou com campo a mais é recusado (o $ref do common-v1 resolve)")
  void snapshotInvalido() {
    Map<String, Object> semAvatar = snapshot();
    semAvatar.remove("avatarUrl");
    Map<String, Object> comEmail = snapshot();
    comEmail.put("email", "vazou@exemplo.com");

    for (Map<String, Object> ruim : new Map[] {semAvatar, comEmail}) {
      assertThatThrownBy(
              () ->
                  validador.validate(
                      envelope(
                          "seguidor.novo",
                          Map.of(
                              "destinatarioId", UUID.randomUUID().toString(),
                              "seguimentoId", UUID.randomUUID().toString(),
                              "seguidor", ruim))))
          .isInstanceOf(InvalidMessageException.class);
    }
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "common-v1.schema.json",
        "seguidor.novo.v1.schema.json",
        "solicitacao.criada.v1.schema.json",
        "solicitacao.aceita.v1.schema.json"
      })
  @DisplayName("a cópia do serviço é idêntica à fonte do catálogo em docs/mensageria/schemas")
  void copiaIgualAoCatalogo(String arquivo) throws IOException {
    Path fonte = Path.of("../../../docs/mensageria/schemas", arquivo);
    Path copia = Path.of("src/main/resources/messaging/schemas", arquivo);

    assertThat(normalizar(Files.readString(copia))).isEqualTo(normalizar(Files.readString(fonte)));
  }

  /** Fim de linha do checkout no Windows não é divergência de conteúdo. */
  private static String normalizar(String texto) {
    return texto.replace("\r\n", "\n").strip();
  }
}
