package br.com.leai.identidade.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Resposta só com texto, como a do pedido de recuperação, que não confirma nada. */
@Schema(name = "MensagemResposta")
public record MensagemResposta(String mensagem) {}
