package br.com.leai.identidade.auth;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Lista de senhas comuns de RNF-SEC-27, aplicada no cadastro e, com F-AUT, na troca e na
 * redefinição de senha.
 *
 * <p>O mínimo de 8 caracteres continua no Bean Validation de cada requisição; aqui mora só a
 * lista, porque ela precisa de mensagem própria. A validação declarativa sai com a mensagem
 * genérica de dados inválidos, e os protótipos pedem "Essa senha é muito comum..." no campo.
 *
 * <p>A comparação ignora caixa: {@code Password123} é tão previsível quanto {@code password123}.
 * A lista é carregada uma vez, no arranque; se o arquivo faltar, o serviço não sobe, em vez de
 * subir aceitando qualquer senha.
 */
@Component
public class PoliticaDeSenha {

  static final String RECURSO = "/seguranca/senhas-comuns.txt";

  static final String SENHA_COMUM =
      "Essa senha é muito comum. Escolha uma que não esteja em listas conhecidas.";

  private final Set<String> comuns;

  public PoliticaDeSenha() {
    this.comuns = carregar();
  }

  /** Recusa a senha se ela estiver na lista. Não loga nem devolve a senha (RNF-SEC-36). */
  public void recusarSeComum(String senha) {
    recusarSeComum(senha, CodigoErro.REQUISICAO_INVALIDA);
  }

  /**
   * Mesma recusa, com o código que o contrato da rota pede: o cadastro responde 400, a troca de
   * senha 422, como está em {@code docs/api/identidade.yaml}.
   */
  public void recusarSeComum(String senha, CodigoErro codigo) {
    // strip() só na comparação: a senha gravada continua exatamente a digitada, mas o espaço
    // que o teclado do celular ou o preenchimento automático acrescenta no fim não tira
    // "leai2026 " da lista.
    if (comuns.contains(senha.strip().toLowerCase(Locale.ROOT))) {
      throw new ErroDeNegocioException(codigo, SENHA_COMUM);
    }
  }

  int tamanho() {
    return comuns.size();
  }

  private static Set<String> carregar() {
    InputStream entrada = PoliticaDeSenha.class.getResourceAsStream(RECURSO);
    if (entrada == null) {
      throw new IllegalStateException("Lista de senhas comuns ausente: " + RECURSO);
    }
    try (BufferedReader leitor =
        new BufferedReader(new InputStreamReader(entrada, StandardCharsets.UTF_8))) {
      return leitor
          .lines()
          .map(String::trim)
          .filter(linha -> !linha.isEmpty() && !linha.startsWith("#"))
          .map(linha -> linha.toLowerCase(Locale.ROOT))
          .collect(Collectors.toUnmodifiableSet());
    } catch (IOException erro) {
      throw new UncheckedIOException(erro);
    }
  }
}
