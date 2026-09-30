package br.com.leai.identidade.common.idempotencia;

/**
 * O que o efeito devolve e o que fica gravado para o replay: status HTTP e corpo.
 *
 * <p>O status entra no recibo porque o replay precisa responder exatamente como a primeira vez,
 * e o cadastro responde 201, não 200.
 */
public record RespostaIdempotente<T>(int status, T corpo) {}
