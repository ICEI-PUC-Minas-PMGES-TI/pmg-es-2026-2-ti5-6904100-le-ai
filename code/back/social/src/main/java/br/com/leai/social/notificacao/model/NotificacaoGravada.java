package br.com.leai.social.notificacao.model;

import java.util.UUID;

/**
 * Evento interno do processo: uma notificação nova foi gravada para {@code destinatarioId}. Não
 * sai para o broker; é o gatilho da entrega em tempo real (RF-NOT-06).
 */
public record NotificacaoGravada(UUID id, UUID destinatarioId) {}
