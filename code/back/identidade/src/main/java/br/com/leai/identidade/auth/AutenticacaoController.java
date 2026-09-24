package br.com.leai.identidade.auth;

import br.com.leai.identidade.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.identidade.common.idempotencia.OperacaoIdempotente;
import br.com.leai.identidade.common.idempotencia.RespostaIdempotente;
import br.com.leai.identidade.common.idempotencia.ServicoDeIdempotencia;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cadastro, login, renovação e logout (RF-AUT-01, 02, 03 e 06). Rotas públicas por definição.
 */
@RestController
@RequestMapping("/auth")
@Tag(name = "auth", description = "Cadastro e autenticação")
public class AutenticacaoController {

  private final ServicoDeAutenticacao servico;
  private final ServicoDeIdempotencia idempotencia;

  public AutenticacaoController(
      ServicoDeAutenticacao servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @PostMapping("/register")
  @Operation(
      summary = "Cria uma conta de leitor (RF-AUT-01)",
      description =
          "Senha com hash bcrypt (RNF-SEC-09), mínimo de 8 caracteres e fora da lista de "
              + "senhas comuns (RNF-SEC-27). "
              + "Recusa menores de 18 anos (RNF-SEC-43).")
  @ApiResponse(responseCode = "201", description = "Conta criada.")
  @ApiResponse(
      responseCode = "400",
      description =
          "Dados inválidos: senha curta ou comum, menor de 18, e-mail malformado, "
              + "Idempotency-Key vazia ou longa demais.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "409",
      description = "E-mail ou nome de usuário já em uso.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "429",
      description = "Limite de requisições por IP excedido (RNF-SEC-17).",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<UsuarioResposta> cadastrar(
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody CadastroRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.validarOpcional(chaveBruta);
    if (chave == null) {
      return ResponseEntity.status(HttpStatus.CREATED).body(servico.cadastrar(requisicao));
    }

    RespostaIdempotente<UsuarioResposta> resposta =
        idempotencia.executar(
            idempotencia.sujeitoAnonimo(requisicao.email()),
            OperacaoIdempotente.CADASTRAR_USUARIO,
            chave,
            requisicao,
            UsuarioResposta.class,
            () ->
                new RespostaIdempotente<>(
                    HttpStatus.CREATED.value(), servico.cadastrar(requisicao)));
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @PostMapping("/login")
  @Operation(
      summary = "Autentica por e-mail ou nome de usuário (RF-AUT-02)",
      description =
          "Emite token de acesso de curta duração e token de renovação rotativo (RF-AUT-03). A "
              + "resposta de credencial inválida é a mesma para conta inexistente e senha errada "
              + "(RNF-SEC-28).")
  @ApiResponse(responseCode = "200", description = "Sessão emitida.")
  @ApiResponse(
      responseCode = "401",
      description = "Credencial inválida.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "429",
      description =
          "Limite por IP excedido (RNF-SEC-17) ou identidade em bloqueio temporário "
              + "progressivo por falhas sucessivas (RNF-SEC-29).",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public SessaoResposta entrar(
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody LoginRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.validarOpcional(chaveBruta);
    if (chave == null) {
      return servico.entrar(requisicao);
    }
    return idempotencia
        .executar(
            idempotencia.sujeitoAnonimo(requisicao.identificador()),
            OperacaoIdempotente.AUTENTICAR_USUARIO,
            chave,
            requisicao,
            SessaoResposta.class,
            () -> new RespostaIdempotente<>(HttpStatus.OK.value(), servico.entrar(requisicao)))
        .corpo();
  }

  @PostMapping("/refresh")
  @Operation(
      summary = "Rotaciona o token de renovação e emite uma nova sessão (RF-AUT-03)",
      description =
          "O token apresentado é revogado no mesmo ato. Reapresentar um token já revogado "
              + "revoga todas as renovações do usuário (RNF-SEC-30). Exige Idempotency-Key: "
              + "repetir a mesma chave devolve a mesma sessão, sem contar como reuso.")
  @ApiResponse(responseCode = "200", description = "Sessão renovada.")
  @ApiResponse(
      responseCode = "400",
      description = "Corpo inválido ou Idempotency-Key ausente.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "401",
      description = "Token desconhecido, expirado, revogado ou já usado.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "409",
      description = "Idempotency-Key já usada com outro token.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public SessaoResposta renovar(
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody RefreshRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    try {
      return idempotencia
          .executar(
              idempotencia.sujeitoAnonimo(GestorDeRenovacao.hash(requisicao.refreshToken())),
              OperacaoIdempotente.RENOVAR_SESSAO,
              chave,
              requisicao,
              SessaoResposta.class,
              () -> new RespostaIdempotente<>(HttpStatus.OK.value(), servico.renovar(requisicao)))
          .corpo();
    } catch (RenovacaoReusadaException reuso) {
      // Só chega aqui sem recibo a devolver: não é a repetição desta requisição, é reuso.
      servico.encerrarRenovacoesPorReuso(reuso.usuarioId());
      throw reuso;
    }
  }

  @PostMapping("/logout")
  @Operation(
      summary = "Encerra a sessão revogando o token de renovação (RF-AUT-06)",
      description =
          "Sempre 204: token desconhecido ou já revogado não é erro, para não revelar o estado "
              + "do token. O token de acesso emitido antes continua válido até expirar (15 min), "
              + "por ser stateless (RNF-ARQ-04); o cliente o descarta. Exige Idempotency-Key.")
  @ApiResponse(responseCode = "204", description = "Sessão encerrada ou já encerrada.")
  @ApiResponse(
      responseCode = "400",
      description = "Corpo inválido ou Idempotency-Key ausente.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "409",
      description = "Idempotency-Key já usada com outro token.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<Void> sair(
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody RefreshRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    idempotencia.executar(
        idempotencia.sujeitoAnonimo(GestorDeRenovacao.hash(requisicao.refreshToken())),
        OperacaoIdempotente.ENCERRAR_SESSAO,
        chave,
        requisicao,
        Void.class,
        () -> {
          servico.sair(requisicao);
          return new RespostaIdempotente<>(HttpStatus.NO_CONTENT.value(), null);
        });
    return ResponseEntity.noContent().build();
  }
}
