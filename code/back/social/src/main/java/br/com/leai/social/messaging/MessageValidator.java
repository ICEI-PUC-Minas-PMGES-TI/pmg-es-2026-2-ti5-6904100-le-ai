package br.com.leai.social.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import com.rabbitmq.client.AMQP.BasicProperties;
import com.rabbitmq.client.Delivery;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Validates the canonical envelope, AMQP headers and registered data schemas. */
public final class MessageValidator {

  /**
   * Eventos v1 que este serviço publica ou consome: os do feed, os de interação que ele mesmo
   * publica e os de notificação (F-NOT). Cada um tem o schema {@code <tipo>.v1.schema.json}.
   */
  private static final List<String> EVENTOS_V1 =
      List.of(
          "ping.teste",
          MessagingConstants.EVENTO_LEITURA_INICIADA,
          MessagingConstants.EVENTO_LEITURA_RETOMADA,
          MessagingConstants.EVENTO_LEITURA_FINALIZADA,
          MessagingConstants.EVENTO_LEITURA_ABANDONADA,
          MessagingConstants.EVENTO_RESENHA_PUBLICADA,
          MessagingConstants.EVENTO_RESENHA_EXCLUIDA,
          MessagingConstants.EVENTO_SEGUIDOR_NOVO,
          MessagingConstants.EVENTO_SOLICITACAO_CRIADA,
          MessagingConstants.EVENTO_SOLICITACAO_ACEITA,
          MessagingConstants.EVENTO_ATIVIDADE_CURTIDA,
          MessagingConstants.EVENTO_ATIVIDADE_COMENTADA,
          MessagingConstants.EVENTO_COMENTARIO_RESPONDIDO,
          MessagingConstants.EVENTO_USUARIO_MENCIONADO,
          MessagingConstants.EVENTO_LEITURA_EM_RISCO,
          MessagingConstants.EVENTO_LEITURA_EXPIRADA,
          MessagingConstants.EVENTO_RESENHA_CURTIDA,
          MessagingConstants.EVENTO_CONTA_EXCLUIDA);

  private final ObjectMapper mapper =
      new ObjectMapper()
          .findAndRegisterModules()
          .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
  private final JsonSchema envelopeSchema;
  private final Map<String, JsonSchema> dataSchemas;

  public MessageValidator() {
    // Os schemas de F-SOC/consumo de leitura são cópias fiéis de docs/mensageria/schemas, com $id
    // em https://leai.app/schemas/mensageria/ e $ref para o common-v1: o prefixo é mapeado para o
    // classpath, para o $ref resolver sem rede (mesmo racional de identidade.MessageValidator).
    JsonSchemaFactory factory =
        JsonSchemaFactory.getInstance(
            SpecVersion.VersionFlag.V202012,
            builder ->
                builder.schemaMappers(
                    mappers ->
                        mappers.mapPrefix(
                            "https://leai.app/schemas/mensageria/", "classpath:messaging/schemas/")));
    envelopeSchema = load(factory, "messaging/schemas/envelope-v1.schema.json");
    dataSchemas =
        EVENTOS_V1.stream()
            .collect(
                Collectors.toUnmodifiableMap(
                    tipo -> tipo + ":1",
                    tipo -> load(factory, "messaging/schemas/" + tipo + ".v1.schema.json")));
  }

  public void validate(MessageEnvelope envelope) {
    JsonNode node = mapper.valueToTree(envelope);
    validateSchema(envelopeSchema, node, "envelope");
    validateSchema(dataSchema(envelope.type(), envelope.version()), mapper.valueToTree(envelope.data()), "data");
  }

  public MessageEnvelope parse(Delivery delivery) {
    try {
      JsonNode node = mapper.readTree(delivery.getBody());
      validateSchema(envelopeSchema, node, "envelope");
      MessageEnvelope envelope = mapper.convertValue(node, MessageEnvelope.class);
      validateHeaders(delivery.getProperties(), envelope);
      validateSchema(dataSchema(envelope.type(), envelope.version()), node.get("data"), "data");
      return envelope;
    } catch (InvalidMessageException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new InvalidMessageException("Mensagem nao e JSON valido: " + exception.getMessage());
    }
  }

  private void validateHeaders(BasicProperties properties, MessageEnvelope envelope) {
    Map<String, Object> headers = properties.getHeaders() == null ? Map.of() : properties.getHeaders();
    Object version = headers.get("x-event-version");
    Object businessKey = headers.get("x-business-key");
    if (!envelope.eventId().toString().equals(properties.getMessageId())
        || !envelope.correlationId().toString().equals(properties.getCorrelationId())
        || !envelope.type().equals(properties.getType())
        || !"application/json".equals(properties.getContentType())
        || !Integer.valueOf(2).equals(properties.getDeliveryMode())
        || !(version instanceof Number number && number.intValue() == envelope.version())
        || businessKey == null
        || !envelope.businessKey().equals(businessKey.toString())) {
      throw new InvalidMessageException("Headers AMQP divergem do envelope");
    }
  }

  private JsonSchema dataSchema(String type, int version) {
    JsonSchema schema = dataSchemas.get(type + ":" + version);
    if (schema == null) {
      throw new InvalidMessageException("Schema nao registrado para " + type + " v" + version);
    }
    return schema;
  }

  private void validateSchema(JsonSchema schema, JsonNode node, String part) {
    Set<ValidationMessage> errors = schema.validate(node);
    if (!errors.isEmpty()) {
      throw new InvalidMessageException(
          "Schema invalido (" + part + "): " + errors.stream().map(ValidationMessage::getMessage).toList());
    }
  }

  private JsonSchema load(JsonSchemaFactory factory, String path) {
    try (InputStream stream = MessageValidator.class.getClassLoader().getResourceAsStream(path)) {
      if (stream == null) {
        throw new IllegalStateException("Schema ausente: " + path);
      }
      return factory.getSchema(mapper.readTree(stream));
    } catch (IOException exception) {
      throw new IllegalStateException("Nao foi possivel carregar o schema " + path, exception);
    }
  }
}
