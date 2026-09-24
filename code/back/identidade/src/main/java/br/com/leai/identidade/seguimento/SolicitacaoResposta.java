package br.com.leai.identidade.seguimento;

import br.com.leai.identidade.perfil.PerfilResumoResposta;
import io.swagger.v3.oas.annotations.media.Schema;

/** Schema `SolicitacaoSeguir`: o pedido pendente e quem pediu, só com a identidade pública. */
@Schema(name = "SolicitacaoSeguir")
public record SolicitacaoResposta(String id, PerfilResumoResposta solicitante, String criadaEm) {}
