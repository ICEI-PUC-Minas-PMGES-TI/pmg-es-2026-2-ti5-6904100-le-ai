package br.com.leai.social.integracao;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller minúsculo, só de teste, para exercitar a cadeia de segurança (Task 1) antes de
 * qualquer controller de domínio existir — como o próprio brief da task sugere. Fica em
 * {@code src/test} e nunca compila no artefato principal.
 */
@RestController
class TesteProtegidoController {

  @GetMapping("/__teste/protegido")
  public String subject(@AuthenticationPrincipal Jwt jwt) {
    return jwt.getSubject();
  }
}
