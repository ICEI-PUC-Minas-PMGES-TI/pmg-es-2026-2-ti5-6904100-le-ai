package br.com.leai.identidade.messaging;

import com.fasterxml.jackson.core.type.TypeReference;
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
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Validates the canonical envelope, AMQP headers and registered data schemas. */
public final class MessageValidator {

  private final ObjectMapper mapper =
      new ObjectMapper()
          .findAndRegisterModules()
          .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
  private final JsonSchema envelopeSchema;
  private final Map<String, JsonSchema> dataSchemas;

  public MessageValidator() {
    // Os schemas de F-PERFIL são cópias fiéis de docs/mensageria/schemas, com $id em
    // https://leai.app/schemas/mensageria/ e $ref para o common-v1: o prefixo é mapeado para o
    // classpath, para o $ref resolver sem rede.
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
        Map.of(
            "ping.teste:1", load(factory, "messaging/schemas/ping.teste.v1.schema.json"),
            "seguidor.novo:1", load(factory, "messaging/schemas/seguidor.novo.v1.schema.json"),
            "solicitacao.criada:1",
                load(factory, "messaging/schemas/solicitacao.criada.v1.schema.json"),
            "solicitacao.aceita:1",
                load(factory, "messaging/schemas/solicitacao.aceita.v1.schema.json"),
            "conta.excluida:1", load(factory, "messaging/schemas/conta.excluida.v1.schema.json"));
  }

  public void validate(MessageEnvelope envelope) {
    JsonNode node = mapper.valueToTree(envelope);
    validateSchema(envelopeSchema, node, "envelope");
    JsonSchema dataSchema = dataSchema(envelope.type(), envelope.version());
    validateSchema(dataSchema, mapper.valueToTree(envelope.data()), "data");
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
      JsonNode schemaNode = mapper.readTree(stream);
      return factory.getSchema(schemaNode);
    } catch (IOException exception) {
      throw new IllegalStateException("Nao foi possivel carregar o schema " + path, exception);
    }
  }
}
