package br.com.leai.social.push.model;

import java.util.UUID;

public record DispositivoPush(UUID id, String token) {

  public static final String PLATAFORMA_ANDROID = "android";
}
