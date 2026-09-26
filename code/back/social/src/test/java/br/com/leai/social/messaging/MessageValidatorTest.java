package br.com.leai.social.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.rabbitmq.client.AMQP.BasicProperties;
import com.rabbitmq.client.Delivery;
import com.rabbitmq.client.Envelope;
import com.rabbitmq.client.impl.LongStringHelper;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MessageValidatorTest {

  private static final UUID EVENT_ID = UUID.randomUUID();
  private static final UUID CORRELATION_ID = UUID.randomUUID();
  private static final String BUSINESS_KEY = "ping:" + EVENT_ID;

  @Test
  @DisplayName("valida envelope, schema de dados e headers AMQP")
  void validaMensagemCompleta() {
    MessageEnvelope envelope = envelope();

    MessageValidator validator = new MessageValidator();
    validator.validate(envelope);
    MessageEnvelope parsed = validator.parse(delivery(envelope, properties(envelope)));

    assertThat(parsed).isEqualTo(envelope);
  }

  @Test
  @DisplayName("aceita x-business-key como LongString, que é como o broker entrega headers de texto")
  void aceitaBusinessKeyComoLongString() {
    MessageEnvelope envelope = envelope();
    BasicProperties comoDoBroker =
        properties(envelope)
            .builder()
            .headers(
                Map.of(
                    "x-event-version", (long) envelope.version(),
                    "x-business-key", LongStringHelper.asLongString(envelope.businessKey())))
            .build();

    MessageEnvelope parsed = new MessageValidator().parse(delivery(envelope, comoDoBroker));

    assertThat(parsed).isEqualTo(envelope);
  }

  @Test
  @DisplayName("valida os 6 eventos de leitura/resenha consumidos pelo feed (RF-SOC-10)")
  void validaEventosDoFeed() {
    UUID leituraId = UUID.randomUUID();
    UUID resenhaId = UUID.randomUUID();
    Map<String, Object> usuario =
        Map.of(
            "id", UUID.randomUUID().toString(),
            "username", "autora1",
            "displayName", "Autora Um",
            "avatarUrl", "https://cdn.leai.app/a.png");
    Map<String, Object> livro =
        Map.of(
            "id", UUID.randomUUID().toString(),
            "tipo", "oficial",
            "titulo", "Livro Um",
            "autor", "Escritor Um",
            "capaUrl", "https://cdn.leai.app/l.png");

    validaTipo(
        "leitura.iniciada",
        Map.of(
            "usuarioId", UUID.randomUUID().toString(),
            "leituraId", leituraId.toString(),
            "livroId", UUID.randomUUID().toString(),
            "releitura", false,
            "usuario", usuario,
            "livro", livro));
    validaTipo(
        "leitura.retomada",
        Map.of(
            "usuarioId", UUID.randomUUID().toString(),
            "leituraId", leituraId.toString(),
            "livroId", UUID.randomUUID().toString(),
            "paginaRetomada", 10,
            "usuario", usuario,
            "livro", livro));
    validaTipo(
        "leitura.finalizada",
        Map.of(
            "usuarioId", UUID.randomUUID().toString(),
            "leituraId", leituraId.toString(),
            "livroId", UUID.randomUUID().toString(),
            "releitura", false,
            "dataFim", "2026-09-20",
            "finalizadaEm", "2026-09-20T12:00:00Z",
            "finalizacaoFusoHorario", "America/Sao_Paulo",
            "finalizacaoDataLocal", "2026-09-20",
            "usuario", usuario,
            "livro", livro));
    validaTipo(
        "leitura.abandonada",
        Map.of(
            "usuarioId", UUID.randomUUID().toString(),
            "leituraId", leituraId.toString(),
            "livroId", UUID.randomUUID().toString(),
            "releitura", false,
            "incompleta", true,
            "paginaParada", 5,
            "usuario", usuario,
            "livro", livro));
    validaTipo(
        "resenha.publicada",
        Map.of(
            "usuarioId", UUID.randomUUID().toString(),
            "resenhaId", resenhaId.toString(),
            "livroId", UUID.randomUUID().toString(),
            "atualizacao", false,
            "usuario", usuario,
            "livro", livro));
    validaTipo(
        "resenha.excluida",
        Map.of(
            "usuarioId", UUID.randomUUID().toString(),
            "resenhaId", resenhaId.toString(),
            "livroId", UUID.randomUUID().toString()));
  }

  @Test
  @DisplayName("rejeita leitura.iniciada sem o snapshot de usuario exigido pelo schema")
  void rejeitaLeituraIniciadaSemUsuario() {
    MessageEnvelope envelope =
        new MessageEnvelope(
            EVENT_ID,
            "leitura.iniciada",
            1,
            OffsetDateTime.parse("2026-09-16T12:00:00Z"),
            CORRELATION_ID,
            "leitura:" + UUID.randomUUID() + ":iniciada",
            Map.of(
                "usuarioId", UUID.randomUUID().toString(),
                "leituraId", UUID.randomUUID().toString(),
                "livroId", UUID.randomUUID().toString(),
                "releitura", false));

    assertThatThrownBy(() -> new MessageValidator().validate(envelope))
        .isInstanceOf(InvalidMessageException.class)
        .hasMessageContaining("Schema invalido");
  }

  private static void validaTipo(String tipo, Map<String, Object> dados) {
    MessageEnvelope envelope =
        new MessageEnvelope(
            UUID.randomUUID(),
            tipo,
            1,
            OffsetDateTime.parse("2026-09-16T12:00:00Z"),
            CORRELATION_ID,
            "teste:" + tipo + ":" + UUID.randomUUID(),
            dados);

    new MessageValidator().validate(envelope);
  }

  @Test
  @DisplayName("rejeita schema de dados desconhecido")
  void rejeitaSchemaDesconhecido() {
    MessageEnvelope envelope =
        new MessageEnvelope(
            EVENT_ID,
            "evento.futuro",
            1,
            OffsetDateTime.parse("2026-09-16T12:00:00Z"),
            CORRELATION_ID,
            BUSINESS_KEY,
            Map.of());

    assertThatThrownBy(() -> new MessageValidator().parse(delivery(envelope, properties(envelope))))
        .isInstanceOf(InvalidMessageException.class)
        .hasMessageContaining("Schema nao registrado");
  }

  private static MessageEnvelope envelope() {
    return new MessageEnvelope(
        EVENT_ID,
        "ping.teste",
        1,
        OffsetDateTime.parse("2026-09-16T12:00:00Z"),
        CORRELATION_ID,
        BUSINESS_KEY,
        Map.of("mensagem", "ping"));
  }

  private static BasicProperties properties(MessageEnvelope envelope) {
    return new BasicProperties.Builder()
        .messageId(envelope.eventId().toString())
        .correlationId(envelope.correlationId().toString())
        .type(envelope.type())
        .contentType("application/json")
        .deliveryMode(2)
        .headers(Map.of("x-event-version", envelope.version(), "x-business-key", envelope.businessKey()))
        .build();
  }

  private static Delivery delivery(MessageEnvelope envelope, BasicProperties properties) {
    String body =
        "{\"eventId\":\""
            + envelope.eventId()
            + "\",\"type\":\""
            + envelope.type()
            + "\",\"version\":"
            + envelope.version()
            + ",\"occurredAt\":\""
            + envelope.occurredAt()
            + "\",\"correlationId\":\""
            + envelope.correlationId()
            + "\",\"businessKey\":\""
            + envelope.businessKey()
            + "\",\"data\":"
            + (envelope.data().isEmpty() ? "{}" : "{\"mensagem\":\"ping\"}")
            + "}";
    return new Delivery(
        new Envelope(1L, false, MessagingConstants.SOCIAL_EXCHANGE, envelope.type()),
        properties,
        body.getBytes(StandardCharsets.UTF_8));
  }
}
