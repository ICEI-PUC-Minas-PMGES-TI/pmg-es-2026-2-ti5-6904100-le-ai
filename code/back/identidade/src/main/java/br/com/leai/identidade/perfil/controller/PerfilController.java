package br.com.leai.identidade.perfil.controller;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.common.idempotencia.ChaveDeIdempotencia;
import br.com.leai.identidade.common.idempotencia.OperacaoIdempotente;
import br.com.leai.identidade.common.idempotencia.RespostaIdempotente;
import br.com.leai.identidade.common.idempotencia.ServicoDeIdempotencia;
import br.com.leai.identidade.perfil.dto.EditarPerfilRequisicao;
import br.com.leai.identidade.perfil.dto.PerfilResposta;
import br.com.leai.identidade.perfil.dto.PerfilResumoResposta;
import br.com.leai.identidade.perfil.service.ServicoDePerfil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Perfil próprio, de outro leitor e busca exata (RF-SOC-01..04). Quem pergunta vem do token. */
@RestController
@Tag(name = "perfil", description = "Perfil público, edição e busca exata")
@SecurityRequirement(name = "bearerAuth")
public class PerfilController {

  /** Mesmo padrão do cadastro e do schema `Username` do contrato. */
  private static final Pattern FORMATO_DE_USERNAME = Pattern.compile("^[A-Za-z0-9._]{3,30}$");

  private final ServicoDePerfil servico;
  private final ServicoDeIdempotencia idempotencia;

  public PerfilController(ServicoDePerfil servico, ServicoDeIdempotencia idempotencia) {
    this.servico = servico;
    this.idempotencia = idempotencia;
  }

  @GetMapping("/me/perfil")
  @Operation(summary = "Consulta o próprio perfil (RF-SOC-01)")
  @ApiResponse(responseCode = "200", description = "Perfil do usuário autenticado.")
  public PerfilResposta meu(@AuthenticationPrincipal Jwt token) {
    return servico.meu(UUID.fromString(token.getSubject()));
  }

  @GetMapping("/perfis/{username}")
  @Operation(
      summary = "Consulta o perfil de outro leitor (RF-SOC-02, RN-08)",
      description =
          "Identidade, biografia e contadores são públicos. Em perfil privado, quem não é o dono "
              + "nem seguidor aceito recebe conteudoRestrito true, e os serviços donos recusam o "
              + "conteúdo social. Conta suspensa ou em exclusão é 404, como a inexistente.")
  @ApiResponse(responseCode = "200", description = "Perfil e estado de acesso.")
  @ApiResponse(
      responseCode = "404",
      description = "Leitor inexistente ou oculto.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public PerfilResposta deOutro(@AuthenticationPrincipal Jwt token, @PathVariable String username) {
    return servico.deOutro(UUID.fromString(token.getSubject()), username);
  }

  @GetMapping("/perfis")
  @Operation(
      summary = "Busca um perfil por username exato (RF-SOC-03)",
      description =
          "Só o username completo, sem diferenciar maiúsculas. Sem prefixo, parcial, sugestão ou "
              + "listagem (RNF-SEC-19/44): devolve zero ou um perfil. Limite defensivo de 30 buscas "
              + "por minuto por usuário.")
  @ApiResponse(responseCode = "200", description = "Zero ou um perfil.")
  @ApiResponse(
      responseCode = "400",
      description = "Username fora do formato.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  @ApiResponse(
      responseCode = "429",
      description = "Buscas demais em pouco tempo.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public List<PerfilResumoResposta> buscar(
      @AuthenticationPrincipal Jwt token, @RequestParam(required = false) String username) {
    if (username == null || !FORMATO_DE_USERNAME.matcher(username.strip()).matches()) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA,
          "Digite o nome de usuário completo: de 3 a 30 letras, números, ponto ou traço baixo.");
    }
    return servico.buscar(UUID.fromString(token.getSubject()), username.strip());
  }

  @PutMapping("/me/perfil")
  @Operation(
      summary = "Substitui os campos editáveis do próprio perfil (RF-SOC-01/04)",
      description =
          "Nome de exibição, biografia (texto, nunca HTML), avatar e privacidade. O avatar é a URL "
              + "e o publicId do upload direto ao Cloudinary; o servidor confere a origem e nunca "
              + "baixa a imagem (RNF-SEC-38). Mudar para privado não remove seguidores. Exige "
              + "Idempotency-Key.")
  @ApiResponse(responseCode = "200", description = "Perfil atualizado.")
  @ApiResponse(
      responseCode = "422",
      description = "Avatar fora do Cloudinary do projeto, da pasta de avatares ou dos formatos.",
      content = @Content(schema = @Schema(ref = "#/components/schemas/Erro")))
  public PerfilResposta editar(
      @AuthenticationPrincipal Jwt token,
      @RequestHeader(name = ChaveDeIdempotencia.CABECALHO, required = false) String chaveBruta,
      @Valid @RequestBody EditarPerfilRequisicao requisicao) {
    String chave = ChaveDeIdempotencia.exigir(chaveBruta);
    UUID usuarioId = UUID.fromString(token.getSubject());
    return idempotencia
        .executar(
            usuarioId,
            OperacaoIdempotente.ATUALIZAR_PERFIL,
            chave,
            requisicao,
            PerfilResposta.class,
            () -> new RespostaIdempotente<>(HttpStatus.OK.value(), servico.editar(usuarioId, requisicao)))
        .corpo();
  }
}
