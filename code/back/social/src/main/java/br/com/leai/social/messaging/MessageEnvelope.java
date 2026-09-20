package br.com.leai.social.messaging;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/** Canonical v1 envelope. The outbox stores only {@link #data()}. */
public record MessageEnvelope(
    UUID eventId,
    String type,
    int version,
    OffsetDateTime occurredAt,
    UUID correlationId,
    String businessKey,
    Map<String, Object> data) {}
