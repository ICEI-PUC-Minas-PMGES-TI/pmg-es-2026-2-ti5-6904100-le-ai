package br.com.leai.social.lista.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** Schema {@code Lista} de {@code docs/api/social.yaml}: metadados de uma lista visível. */
@Schema(name = "Lista")
public record ListaResposta(
    String id,
    DonoDaListaResposta dono,
    String titulo,
    String descricao,
    long quantidadeLivros,
    boolean pertenceAoSolicitante,
    Instant criadaEm,
    Instant atualizadaEm) {}
