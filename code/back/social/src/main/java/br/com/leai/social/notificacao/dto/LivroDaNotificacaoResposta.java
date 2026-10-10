package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema {@code LivroDaNotificacao}: snapshot do livro das notificações de inatividade e da curtida
 * em resenha, para o título da confirmação de abandono e o destino da notificação (a página do
 * livro oficial ou do livro pessoal, pelo {@code tipo}).
 */
@Schema(name = "LivroDaNotificacao")
public record LivroDaNotificacaoResposta(String id, String tipo, String titulo) {}
