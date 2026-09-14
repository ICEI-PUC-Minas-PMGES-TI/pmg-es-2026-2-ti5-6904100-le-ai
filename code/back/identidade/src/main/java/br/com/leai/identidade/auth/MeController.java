package br.com.leai.identidade.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Rota protegida de exemplo: prova o middleware de autenticação de ponta a ponta.
 *
 * <p>Sem {@code Authorization} válido a requisição nem chega aqui: o Spring Security responde
 * 401 antes, pelo {@code AuthenticationEntryPoint} configurado em {@code SecurityConfig}.
 */
@RestController
@Tag(name = "usuario", description = "Identidade do leitor autenticado")
public class MeController {

  private final ServicoDeAutenticacao servico;

  public MeController(ServicoDeAutenticacao servico) {
    this.servico = servico;
  }

  @GetMapping("/me")
  @SecurityRequirement(name = "bearerAuth")
  @Operation(summary = "Devolve o leitor dono do token de acesso")
  public UsuarioResposta eu(@AuthenticationPrincipal Jwt token) {
    return servico.doToken(UUID.fromString(token.getSubject()));
  }
}
