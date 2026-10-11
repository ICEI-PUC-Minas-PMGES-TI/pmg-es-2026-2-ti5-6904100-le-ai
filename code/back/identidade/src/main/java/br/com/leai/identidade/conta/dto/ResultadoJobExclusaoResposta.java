package br.com.leai.identidade.conta.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Resposta do job diário de exclusão (RN-23.5). */
@Schema(name = "ResultadoJobExclusao")
public record ResultadoJobExclusaoResposta(
    @Schema(description = "Contas finalizadas nesta execução") int finalizadas) {}
