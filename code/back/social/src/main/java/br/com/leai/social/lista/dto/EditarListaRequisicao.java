package br.com.leai.social.lista.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/**
 * Schema {@code EditarLista} de {@code docs/api/social.yaml}: campo omitido permanece, {@code
 * descricao} nula apaga a descrição.
 *
 * <p>Classe com setters, e não record, porque o PATCH precisa distinguir "omitido" de "nulo": o
 * Jackson só chama o setter quando a propriedade está no corpo, inclusive com {@code null}.
 */
@Schema(name = "EditarLista")
public final class EditarListaRequisicao {

  @Size(max = CriarListaRequisicao.TITULO_MAXIMO, message = "Use até 80 caracteres no título.")
  private String titulo;

  private boolean tituloInformado;

  @Size(
      max = CriarListaRequisicao.DESCRICAO_MAXIMA,
      message = "Use até 300 caracteres na descrição.")
  private String descricao;

  private boolean descricaoInformada;

  @JsonProperty("titulo")
  public void setTitulo(String titulo) {
    this.titulo = titulo;
    this.tituloInformado = true;
  }

  @JsonProperty("descricao")
  public void setDescricao(String descricao) {
    this.descricao = descricao;
    this.descricaoInformada = true;
  }

  public String titulo() {
    return titulo;
  }

  public boolean tituloInformado() {
    return tituloInformado;
  }

  public String descricao() {
    return descricao;
  }

  public boolean descricaoInformada() {
    return descricaoInformada;
  }
}
