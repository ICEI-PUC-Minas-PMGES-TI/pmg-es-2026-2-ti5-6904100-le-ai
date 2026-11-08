package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(name = "PreferenciasDeNotificacao")
public record PreferenciasDeNotificacaoResposta(List<PreferenciaDeNotificacaoResposta> preferencias) {}
