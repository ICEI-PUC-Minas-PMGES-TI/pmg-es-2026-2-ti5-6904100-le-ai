package br.com.leai.social.notificacao.model;

import java.util.Map;
import java.util.UUID;

/**
 * Notificação derivada de um evento, pronta para gravar. {@code dados} é o snapshot guardado em
 * {@code notificacao.dados} (chaves em {@link DadosDeNotificacao}); a unicidade de efeito é
 * {@code (destinatarioId, tipo, chaveNegocio)} e a de entrega é {@code eventId}.
 */
public record NovaNotificacao(
    UUID destinatarioId,
    TipoNotificacao tipo,
    UUID leituraRef,
    Map<String, Object> dados,
    UUID eventId,
    String chaveNegocio) {}
