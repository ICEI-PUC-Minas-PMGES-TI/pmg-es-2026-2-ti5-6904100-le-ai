package br.com.leai.identidade.auth.controller;

import br.com.leai.identidade.auth.dto.AlterarSenhaRequisicao;
import br.com.leai.identidade.auth.dto.CadastroRequisicao;
import br.com.leai.identidade.auth.dto.EsqueciSenhaRequisicao;
import br.com.leai.identidade.auth.dto.LoginRequisicao;
import br.com.leai.identidade.auth.dto.MensagemResposta;
import br.com.leai.identidade.auth.dto.RedefinirSenhaRequisicao;
import br.com.leai.identidade.auth.dto.RefreshRequisicao;
import br.com.leai.identidade.auth.dto.RespostaDeLogin;
import br.com.leai.identidade.auth.dto.SessaoResposta;
import br.com.leai.identidade.auth.dto.UsuarioResposta;
import br.com.leai.identidade.auth.service.GestorDeRenovacao;
import br.com.leai.identidade.auth.service.RecuperacaoDeSenha;
import br.com.leai.identidade.auth.service.RenovacaoReusadaException;
import br.com.leai.identidade.auth.service.ServicoDeAutenticacao;
import br.com.leai.identidade.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.identidade.common.idempotencia.OperacaoIdempotente;
import br.com.leai.identidade.common.idempotencia.RespostaIdempotente;
import br.com.leai.identidade.common.idempotencia.ServicoDeIdempotencia;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cadastro, login, renovação, logout, recuperação e troca de senha (RF-AUT-01 a 06). Todas
 * públicas, menos a troca de senha, que exige token (a lista fica no {@code SecurityConfig}).
 */
@RestController
@RequestMapping("/auth")
@Tag(name = "auth", description = "Cadastro e autenticação")
public class AutenticacaoController {

  /** Frase do contrato: confirma o recebimento, nunca a conta nem o envio (RNF-SEC-28). */
  static final String PEDIDO_RECEBIDO =
      "Se o e-mail estiver cadastrado, você receberá as instruções em breve.";

  private final ServicoDeAutenticacao servico;
  private final RecuperacaoDeSenha recuperacao;
  private final ServicoDeIdempotencia idempotencia;

  public AutenticacaoController(
      ServicoDeAutenticacao servico,
      RecuperacaoDeSenha recuperacao,
      ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.recuperacao = recuperacao;
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
              + "Idempotency-Key ausente, vazia ou longa demais.",
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
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
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
  @ApiResponse(
      responseCode = "200",
      description =
          "Sessão emitida; para conta com exclusão pendente, acesso de recuperação "
              + "(F-CONTA-2), distinguido pelo campo tipo.")
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
  public RespostaDeLogin entrar(
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody LoginRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    return idempotencia
        .executar(
            idempotencia.sujeitoAnonimo(requisicao.identificador()),
            OperacaoIdempotente.AUTENTICAR_USUARIO,
            chave,
            requisicao,
            RespostaDeLogin.class,
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

  @PostMapping("/password/forgot")
  @Operation(
      summary = "Pede o link de recuperação de senha por e-mail (RF-AUT-04)",
      description =
          "Sempre 202 com o mesmo corpo, exista ou não a conta e qualquer que seja o resultado "
              + "do envio (RNF-SEC-28). O link vale 1 hora e um uso (RNF-SEC-10). A mesma "
              + "Idempotency-Key não reenvia o e-mail. Exige Idempotency-Key.")
  @ApiResponse(responseCode = "202", description = "Pedido recebido, sem confirmar conta ou envio.")
  @ApiResponse(
      responseCode = "400",
      description = "E-mail inválido ou Idempotency-Key ausente.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "409",
      description = "Idempotency-Key já usada com outro e-mail.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<MensagemResposta> solicitarRecuperacao(
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody EsqueciSenhaRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    RespostaIdempotente<MensagemResposta> resposta =
        idempotencia.executar(
            idempotencia.sujeitoAnonimo(requisicao.email()),
            OperacaoIdempotente.SOLICITAR_RECUPERACAO,
            chave,
            requisicao,
            MensagemResposta.class,
            () -> {
              recuperacao.solicitar(requisicao.email());
              return new RespostaIdempotente<>(
                  HttpStatus.ACCEPTED.value(), new MensagemResposta(PEDIDO_RECEBIDO));
            });
    return ResponseEntity.status(resposta.status()).body(resposta.corpo());
  }

  @PostMapping("/password/reset")
  @Operation(
      summary = "Redefine a senha pelo link de recuperação (RF-AUT-04)",
      description =
          "Consome o link, troca a senha (RNF-SEC-27) e revoga todas as renovações da conta "
              + "(RNF-SEC-30). Link desconhecido, vencido ou já usado é sempre 410 com a mesma "
              + "mensagem, sem dado da conta. Exige Idempotency-Key.")
  @ApiResponse(responseCode = "204", description = "Senha redefinida e renovações revogadas.")
  @ApiResponse(
      responseCode = "400",
      description = "Senha nova curta ou comum, corpo inválido ou Idempotency-Key ausente.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "409",
      description = "Idempotency-Key já usada com outro corpo.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "410",
      description = "Link desconhecido, vencido ou já usado.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<Void> redefinirSenha(
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody RedefinirSenhaRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    idempotencia.executar(
        idempotencia.sujeitoAnonimo(GestorDeRenovacao.hash(requisicao.token())),
        OperacaoIdempotente.REDEFINIR_SENHA,
        chave,
        requisicao,
        Void.class,
        () -> {
          recuperacao.redefinir(requisicao);
          return new RespostaIdempotente<>(HttpStatus.NO_CONTENT.value(), null);
        });
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/password/change")
  @SecurityRequirement(name = "bearerAuth")
  @Operation(
      summary = "Altera a senha do usuário autenticado (RF-AUT-05)",
      description =
          "Exige a senha atual. A nova segue a mesma política do cadastro (RNF-SEC-27). O "
              + "sucesso revoga todas as renovações da conta, inclusive a deste aparelho "
              + "(RNF-SEC-30), e é registrado em log sem senha, token ou hash (RNF-SEC-35/36). "
              + "Exige Idempotency-Key.")
  @ApiResponse(responseCode = "204", description = "Senha alterada e renovações revogadas.")
  @ApiResponse(
      responseCode = "400",
      description = "Corpo inválido, senha nova curta ou Idempotency-Key ausente.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "401",
      description = "Token de acesso ausente, inválido ou expirado.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "409",
      description = "Idempotency-Key já usada com outro corpo.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "422",
      description = "Senha atual incorreta ou senha nova na lista de senhas comuns.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public ResponseEntity<Void> alterarSenha(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody AlterarSenhaRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    UUID usuarioId = UUID.fromString(token.getSubject());
    idempotencia.executar(
        usuarioId,
        OperacaoIdempotente.ALTERAR_SENHA,
        chave,
        requisicao,
        Void.class,
        () -> {
          servico.alterarSenha(usuarioId, requisicao);
          return new RespostaIdempotente<>(HttpStatus.NO_CONTENT.value(), null);
        });
    return ResponseEntity.noContent().build();
  }
}
