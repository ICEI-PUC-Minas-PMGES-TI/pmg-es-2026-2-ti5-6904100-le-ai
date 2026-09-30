package br.com.leai.identidade.perfil.validacao;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Validação do avatar enviado direto ao Cloudinary (RF-SOC-01, RNF-SEC-20/38). Mesma regra da
 * capa de livro pessoal no `acervo` (`url-capa.ts`), decidida para o avatar em 24/09/2026.
 *
 * <p><b>O servidor nunca baixa a URL.</b> Conferir tipo real, tamanho e dimensões exigiria fazer
 * fetch de uma URL vinda do cliente, que é o SSRF que RNF-SEC-38 proíbe. O que o servidor garante
 * é a origem: HTTPS, host exato do Cloudinary, o cloud do projeto, a pasta de avatares e um
 * `publicId` coerente com a URL. Tipo, tamanho e dimensões ficam no upload preset
 * `leai_avatares` (formatos jpg/png/webp, redução para 1024 px) e na validação do cliente.
 *
 * <p>A pasta aparece no caminho porque o preset prefixa o `publicId` com {@value #PASTA}: o cloud
 * usa pastas dinâmicas, em que a pasta do painel não entra na URL (registrado em F-ACV-CADASTRO).
 */
@Component
public class ValidadorDeAvatar {

  private static final Logger log = LoggerFactory.getLogger(ValidadorDeAvatar.class);

  static final String HOST = "res.cloudinary.com";
  static final String PASTA = "avatares/";
  static final List<String> EXTENSOES = List.of("jpg", "jpeg", "png", "webp");
  static final int TAMANHO_MAXIMO_DA_URL = 2048;

  /** Cópia de editar-perfil.md §8. */
  static final String IMAGEM_RECUSADA =
      "Não foi possível usar essa imagem. Envie um JPG ou PNG de até 5 MB.";

  private final String cloudName;

  public ValidadorDeAvatar(@Value("${leai.cloudinary-cloud-name:}") String cloudName) {
    this.cloudName = cloudName == null ? "" : cloudName.trim();
    if (this.cloudName.isEmpty()) {
      // Não derruba o serviço: sem o cloud, só a troca de avatar fica indisponível, e login e
      // cadastro continuam. Todo avatar é recusado até a variável existir.
      log.warn("CLOUDINARY_CLOUD_NAME ausente: avatares serão recusados");
    }
  }

  /** Devolve a URL normalizada, ou lança 422 com a mensagem do protótipo. */
  public String validar(String url, String publicId) {
    if (cloudName.isEmpty() || url == null || publicId == null) {
      throw recusa();
    }
    if (url.length() > TAMANHO_MAXIMO_DA_URL) {
      throw recusa();
    }
    URI uri;
    try {
      uri = new URI(url);
    } catch (URISyntaxException invalida) {
      throw recusa();
    }
    // Credencial, porta e fragmento não aparecem em URL legítima do Cloudinary e são os
    // disfarces clássicos de uma URL forjada.
    if (!"https".equalsIgnoreCase(uri.getScheme())
        || uri.getRawUserInfo() != null
        || uri.getPort() != -1
        || uri.getRawFragment() != null
        || uri.getRawQuery() != null) {
      throw recusa();
    }
    // Igualdade exata, nunca sufixo: `res.cloudinary.com.invasor.com` passaria por `endsWith`.
    if (uri.getHost() == null || !HOST.equals(uri.getHost().toLowerCase(Locale.ROOT))) {
      throw recusa();
    }
    String prefixo = "/" + cloudName + "/image/upload/";
    String caminho = uri.getPath();
    if (caminho == null || !caminho.startsWith(prefixo)) {
      throw recusa();
    }

    String idDaUrl = publicIdDo(caminho.substring(prefixo.length()));
    if (idDaUrl == null || !idDaUrl.equals(publicId) || !idDaUrl.startsWith(PASTA)) {
      throw recusa();
    }
    String extensao = caminho.substring(caminho.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    if (!EXTENSOES.contains(extensao)) {
      throw recusa();
    }
    return uri.toString();
  }

  /**
   * `publicId` do asset: o caminho depois de `/upload/`, sem o segmento de versão
   * (`v1699999999/`) e sem a extensão. Transformações antes da versão não identificam o asset.
   */
  static String publicIdDo(String resto) {
    List<String> segmentos = Arrays.stream(resto.split("/")).filter(s -> !s.isEmpty()).toList();
    int inicio = 0;
    for (int i = 0; i < segmentos.size(); i++) {
      if (segmentos.get(i).matches("v[0-9]+")) {
        inicio = i + 1;
        break;
      }
    }
    if (inicio >= segmentos.size()) {
      return null;
    }
    String completo = String.join("/", segmentos.subList(inicio, segmentos.size()));
    int ponto = completo.lastIndexOf('.');
    String semExtensao = ponto > completo.lastIndexOf('/') ? completo.substring(0, ponto) : completo;
    return semExtensao.isEmpty() ? null : semExtensao;
  }

  private static ErroDeNegocioException recusa() {
    return new ErroDeNegocioException(CodigoErro.ENTIDADE_NAO_PROCESSAVEL, IMAGEM_RECUSADA);
  }
}
