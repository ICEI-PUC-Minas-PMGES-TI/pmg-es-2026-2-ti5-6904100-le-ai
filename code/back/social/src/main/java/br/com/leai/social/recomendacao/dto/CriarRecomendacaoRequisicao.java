package br.com.leai.social.recomendacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Schema(name = "CriarRecomendacao")
public record CriarRecomendacaoRequisicao(
    @NotNull(message = "Informe o livro.") UUID livroId,
    @NotEmpty(message = "Escolha pelo menos um leitor.")
        @Size(
            max = CriarRecomendacaoRequisicao.DESTINATARIOS_MAXIMO,
            message = "Escolha até 20 leitores por envio.")
        List<@NotNull UUID> destinatarios,
    String mensagem) {

  public static final int DESTINATARIOS_MAXIMO = 20;
  public static final int MENSAGEM_MAXIMA = 280;
}
