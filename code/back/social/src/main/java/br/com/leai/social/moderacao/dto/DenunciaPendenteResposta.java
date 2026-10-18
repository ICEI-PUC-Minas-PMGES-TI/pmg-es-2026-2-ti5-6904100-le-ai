package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Item da fila do painel (RF-MOD-02). {@code remocaoNaoConfirmada}: a remoção foi pedida ao
 * {@code leitura} e a confirmação não chegou; o painel oferece só tentar de novo.
 */
@Schema(name = "DenunciaPendente")
public record DenunciaPendenteResposta(
    String id,
    String tipo,
    Instant criadoEm,
    String motivo,
    PessoaDaModeracao denunciante,
    PessoaDaModeracao autor,
    LivroDaDenuncia livro,
    AtividadeDaDenuncia atividade,
    ConteudoDenunciado conteudo,
    boolean remocaoNaoConfirmada) {}
