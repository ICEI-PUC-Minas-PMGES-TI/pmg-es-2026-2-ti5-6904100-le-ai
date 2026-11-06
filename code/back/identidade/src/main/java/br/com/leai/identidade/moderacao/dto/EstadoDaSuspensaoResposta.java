package br.com.leai.identidade.moderacao.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Estado da conta depois do comando (F-MOD-OPC). {@code alterado} é falso na repetição: a conta
 * já estava no estado pedido e nada foi gravado. O {@code social} usa {@code suspensoEm} ou {@code
 * reativadoEm} como o instante do log, para que a repetição caia no mesmo episódio.
 */
public record EstadoDaSuspensaoResposta(
    UUID usuarioId, boolean suspenso, Instant suspensoEm, Instant reativadoEm, boolean alterado) {}
