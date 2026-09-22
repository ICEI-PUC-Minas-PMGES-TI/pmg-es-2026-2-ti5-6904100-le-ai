package br.com.leai.identidade.email;

import br.com.leai.identidade.config.AppProperties;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class EmailNotificationService {
  private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);
  private static final String ASSUNTO_RECUPERACAO = "Recuperação de senha | Lê Ai";

  private final AppProperties propriedades;
  private final RestClient brevoClient;

  public EmailNotificationService(AppProperties propriedades, RestClient brevoClient) {
    this.propriedades = propriedades;
    this.brevoClient = brevoClient;
  }

  public void enviarRecuperacaoSenha(String destinatario, String nome, String link) {
    if (!temTexto(destinatario) || !temTexto(link)) {
      log.warn("Envio de recuperação de senha ignorado: destinatário ou link ausente");
      return;
    }
    if (!configurado()) {
      log.warn("Envio de recuperação de senha desabilitado: credenciais ou remetente ausentes");
      return;
    }

    Map<String, Object> mensagem =
        Map.of(
            "sender",
            Map.of(
                "name", nomeRemetente(), "email", propriedades.brevoSenderEmail()),
            "to", List.of(Map.of("email", destinatario, "name", nomeDestinatario(nome))),
            "subject", ASSUNTO_RECUPERACAO,
            "textContent", corpoRecuperacao(nome, link));

    try {
      brevoClient
          .post()
          .uri("/v3/smtp/email")
          .header("api-key", propriedades.brevoApiKey())
          .contentType(MediaType.APPLICATION_JSON)
          .accept(MediaType.APPLICATION_JSON)
          .body(mensagem)
          .retrieve()
          .toBodilessEntity();
      log.info("E-mail de recuperação de senha aceito pelo provedor");
    } catch (RestClientException | IllegalArgumentException exception) {
      log.error(
          "Falha ao enviar e-mail de recuperação de senha: {}",
          exception.getClass().getSimpleName());
    }
  }

  private boolean configurado() {
    return temTexto(propriedades.brevoApiKey()) && temTexto(propriedades.brevoSenderEmail());
  }

  private String nomeRemetente() {
    return temTexto(propriedades.brevoSenderName()) ? propriedades.brevoSenderName() : "Lê Ai";
  }

  private String nomeDestinatario(String nome) {
    return temTexto(nome) ? nome : "Leitor";
  }

  private String corpoRecuperacao(String nome, String link) {
    String saudacao = temTexto(nome) ? "Olá, " + nome + "!" : "Olá!";
    return """
        %s

        Recebemos uma solicitação para redefinir sua senha no Lê Ai.

        Acesse o link abaixo para criar uma nova senha:
        %s

        Este link expira em 1 hora e pode ser usado uma única vez.
        Se você não solicitou a redefinição, ignore este e-mail.

        Equipe Lê Ai
        """
        .formatted(saudacao, link);
  }

  private boolean temTexto(String valor) {
    return valor != null && !valor.isBlank();
  }
}
