package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Linha do registro de auditoria (RF-MOD-05, RNF-SEC-37): autor, ação, alvo e momento. Sem o
 * texto removido, o motivo nem quem denunciou (RNF-SEC-36). O autor é sempre o administrador,
 * conta única. {@code anonimizado}: o alvo era de conta excluída (RN-23.7).
 */
@Schema(name = "RegistroDeModeracao")
public record RegistroDeModeracaoResposta(
    String id,
    Instant criadoEm,
    String acao,
    String alvoTipo,
    boolean comDenuncia,
    String alvoAutor,
    String atividadeAutor,
    String livroTitulo,
    boolean anonimizado) {}
