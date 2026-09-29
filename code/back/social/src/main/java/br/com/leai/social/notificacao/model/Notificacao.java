package br.com.leai.social.notificacao.model;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Linha de {@code social.notificacao} lida para a lista do destinatário. */
public record Notificacao(
    UUID id,
    TipoNotificacao tipo,
    Map<String, Object> dados,
    UUID leituraRef,
    Instant lidaEm,
    Instant criadoEm) {}
