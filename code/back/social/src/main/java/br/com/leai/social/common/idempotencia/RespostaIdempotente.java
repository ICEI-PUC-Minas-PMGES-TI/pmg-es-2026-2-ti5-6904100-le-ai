package br.com.leai.social.common.idempotencia;

/**
 * O que o efeito devolve e o que fica gravado para o replay: status HTTP e corpo. Porte de
 * {@code identidade.common.idempotencia.RespostaIdempotente}.
 *
 * <p>O status entra no recibo porque o replay precisa responder exatamente como a primeira vez —
 * curtir responde 201/204, comentar responde 201.
 */
public record RespostaIdempotente<T>(int status, T corpo) {}
