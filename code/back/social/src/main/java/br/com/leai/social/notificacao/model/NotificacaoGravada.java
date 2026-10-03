package br.com.leai.social.notificacao.model;

import java.util.UUID;

/** Evento interno (não vai ao broker): gatilho da entrega em tempo real (RF-NOT-06). */
public record NotificacaoGravada(UUID id, UUID destinatarioId) {}
