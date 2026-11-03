package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Denúncias que a ação fechou, para o painel tirá-las da fila. Só ids: a resposta vai para o
 * recibo de idempotência.
 */
@Schema(name = "ResultadoModeracao")
public record ResultadoModeracaoResposta(List<String> denunciasFechadas) {}
