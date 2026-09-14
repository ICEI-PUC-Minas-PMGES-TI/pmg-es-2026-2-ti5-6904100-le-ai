package br.com.leai.identidade.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Cadastro e login (RF-AUT-01, RF-AUT-02, RF-AUT-03). Rotas públicas por definição. */
@RestController
@RequestMapping("/auth")
@Tag(name = "auth", description = "Cadastro e autenticação")
public class AutenticacaoController {

  private final ServicoDeAutenticacao servico;

  public AutenticacaoController(ServicoDeAutenticacao servico) {
    this.servico = servico;
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(
      summary = "Cria uma conta de leitor (RF-AUT-01)",
      description =
          "Senha com hash bcrypt (RNF-SEC-09) e mínimo de 8 caracteres (RNF-SEC-27). "
              + "Recusa menores de 18 anos (RNF-SEC-43).")
  @ApiResponse(responseCode = "201", description = "Conta criada.")
  @ApiResponse(
      responseCode = "400",
      description = "Dados inválidos: senha curta, menor de 18, e-mail malformado.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "409",
      description = "E-mail ou nome de usuário já em uso.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public UsuarioResposta cadastrar(@Valid @RequestBody CadastroRequisicao requisicao) {
    return servico.cadastrar(requisicao);
  }

  @PostMapping("/login")
  @Operation(
      summary = "Autentica por e-mail ou nome de usuário (RF-AUT-02)",
      description =
          "Emite token de acesso de curta duração (RF-AUT-03). A resposta de credencial "
              + "inválida é a mesma para conta inexistente e senha errada (RNF-SEC-28).")
  @ApiResponse(responseCode = "200", description = "Token emitido.")
  @ApiResponse(
      responseCode = "401",
      description = "Credencial inválida.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public TokenResposta entrar(@Valid @RequestBody LoginRequisicao requisicao) {
    return servico.entrar(requisicao);
  }
}
