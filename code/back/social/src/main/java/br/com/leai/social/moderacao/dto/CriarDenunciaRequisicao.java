package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

/**
 * Pedido de denúncia (RF-MOD-01). O motivo é um texto livre único, sem enum nem descrição
 * separada; o limite em code points é conferido no serviço, como na resenha. {@code via} e {@code
 * referenciaId} só valem para resenha de livro pessoal (RN-15.4) e são ignorados nos demais casos.
 */
@Schema(name = "CriarDenuncia")
public record CriarDenunciaRequisicao(
    @NotNull(message = "Informe o que está sendo denunciado.")
        @Pattern(regexp = "resenha|comentario", message = "Só resenhas e comentários são denunciáveis.")
        String alvoTipo,
    @NotNull(message = "Informe o que está sendo denunciado.") UUID alvoId,
    String motivo,
    @Pattern(regexp = "feed|lista", message = "A via de acesso deve ser feed ou lista.") String via,
    UUID referenciaId) {

  public static final int MOTIVO_MAXIMO = 500;
}
