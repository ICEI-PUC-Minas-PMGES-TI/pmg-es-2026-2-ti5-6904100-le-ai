package br.com.leai.identidade.auth.service;

import br.com.leai.identidade.auth.dto.RedefinirSenhaRequisicao;
import br.com.leai.identidade.auth.validacao.PoliticaDeSenha;
import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.email.EnvioDeRecuperacao;
import br.com.leai.identidade.usuario.Usuario;
import br.com.leai.identidade.usuario.UsuarioRepositorio;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Recuperação de senha por e-mail (RF-AUT-04, RNF-SEC-10), sobre {@code reset_token}.
 *
 * <p><b>Pedido.</b> A requisição não consulta a conta: só agenda, depois do commit do recibo de
 * idempotência, o trabalho que procura a conta, grava o token e envia o link. Assim conta
 * existente e inexistente custam o mesmo na requisição, em status, corpo e tempo (RNF-SEC-28), e
 * a mesma {@code Idempotency-Key} não reenvia o e-mail, porque o replay não chega aqui.
 *
 * <p><b>Token.</b> 256 bits de {@link SecureRandom} em base64url, validade de 1 hora, banco com
 * só o SHA-256, como o de renovação ({@link GestorDeRenovacao}). O link leva o token no
 * fragmento ({@code #token=}), que o navegador não manda ao servidor da web nem põe no
 * {@code Referer}: não fica em log de acesso de ninguém.
 *
 * <p><b>Redefinição.</b> Consumir é um {@code UPDATE ... RETURNING} só, então duas requisições
 * com o mesmo token não redefinem as duas. Sucesso consome também os outros links ainda válidos
 * da conta e revoga todas as renovações (RNF-SEC-30).
 */
@Service
public class RecuperacaoDeSenha {

  private static final Logger log = LoggerFactory.getLogger(RecuperacaoDeSenha.class);

  static final Duration VALIDADE = Duration.ofHours(1);

  /**
   * Teto de links por conta em uma hora. O limite por IP não protege a caixa de entrada de
   * alguém: pedidos vindos de vários IPs para o mesmo e-mail passariam. Acima disso o pedido é
   * descartado em silêncio, com a mesma resposta 202.
   */
  static final int LINKS_POR_HORA = 5;

  /** Mesma frase para link vencido, usado ou adulterado: redefinir-senha.md §4.6. */
  static final String LINK_INVALIDO =
      "O link de recuperação vale por 1 hora e só pode ser usado uma vez. "
          + "Peça um link novo para continuar.";

  private static final int BYTES_DO_TOKEN = 32;

  private final UsuarioRepositorio repositorio;
  private final JdbcTemplate jdbc;
  private final TransactionTemplate transacao;
  private final PasswordEncoder codificadorDeSenha;
  private final PoliticaDeSenha politicaDeSenha;
  private final GestorDeRenovacao gestorDeRenovacao;
  private final EnvioDeRecuperacao envio;
  private final ContaAdministradora contaAdministradora;
  private final String urlDaWeb;
  private final SecureRandom aleatorio = new SecureRandom();

  public RecuperacaoDeSenha(
      UsuarioRepositorio repositorio,
      JdbcTemplate jdbc,
      TransactionTemplate transacao,
      PasswordEncoder codificadorDeSenha,
      PoliticaDeSenha politicaDeSenha,
      GestorDeRenovacao gestorDeRenovacao,
      EnvioDeRecuperacao envio,
      ContaAdministradora contaAdministradora,
      @Value("${leai.web-base-url}") String urlDaWeb) {
    this.repositorio = repositorio;
    this.jdbc = jdbc;
    this.transacao = transacao;
    this.codificadorDeSenha = codificadorDeSenha;
    this.politicaDeSenha = politicaDeSenha;
    this.gestorDeRenovacao = gestorDeRenovacao;
    this.envio = envio;
    this.contaAdministradora = contaAdministradora;
    this.urlDaWeb = urlDaWeb.replaceAll("/+$", "");
  }

  /**
   * Agenda o pedido para depois do commit da transação corrente. Chamar dentro do efeito
   * idempotente: se o recibo não for gravado, nada sai.
   */
  public void solicitar(String email) {
    String normalizado = email.trim();
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            envio.emSegundoPlano(() -> processar(normalizado));
          }
        });
  }

  /** O trabalho do pedido, já fora da requisição. */
  void processar(String email) {
    Optional<Usuario> conta = repositorio.findByEmailIgnoreCase(email);
    if (conta.isEmpty()) {
      // RNF-SEC-36: nem o e-mail pedido vai para o log.
      log.info("Recuperação de senha pedida para e-mail sem conta");
      return;
    }
    Usuario usuario = conta.get();
    if (contaAdministradora.eh(usuario.id())) {
      // A senha do admin vem do ambiente (RNF-SEC-31): um link por e-mail seria um segundo
      // caminho até ela, que só depende de a caixa de entrada estar segura.
      log.warn("Recuperação de senha pedida para a conta administradora; ignorada");
      return;
    }

    String token = transacao.execute(status -> emitir(usuario.id()));
    if (token == null) {
      log.warn(
          "Recuperação de senha descartada: limite de {} links por hora do usuário {}",
          LINKS_POR_HORA,
          usuario.id());
      return;
    }
    log.info("Link de recuperação de senha emitido para o usuário {}", usuario.id());
    envio.enviar(usuario.email(), usuario.nomeExibicao(), urlDaWeb + "/redefinir-senha#token=" + token);
  }

  /** Grava um token novo, ou devolve {@code null} se a conta já passou do teto da hora. */
  private String emitir(UUID usuarioId) {
    // Trava a conta: dois pedidos simultâneos não passam os dois pela contagem abaixo.
    repositorio.buscarParaAtualizar(usuarioId);
    Integer recentes =
        jdbc.queryForObject(
            "SELECT count(*) FROM reset_token WHERE usuario_id = ?"
                + " AND criado_em > now() - interval '1 hour'",
            Integer.class,
            usuarioId);
    if (recentes != null && recentes >= LINKS_POR_HORA) {
      return null;
    }

    byte[] bytes = new byte[BYTES_DO_TOKEN];
    aleatorio.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    jdbc.update(
        """
        INSERT INTO reset_token (usuario_id, token_hash, expira_em)
        VALUES (?, ?, now() + make_interval(secs => ?))
        """,
        usuarioId,
        GestorDeRenovacao.hash(token),
        VALIDADE.toSeconds());
    return token;
  }

  /**
   * Troca a senha pelo link (RF-AUT-04). Link desconhecido, vencido ou já usado é sempre 410 com
   * a mesma frase: distinguir os três diria a quem tem o link o que aconteceu com ele.
   */
  @Transactional
  public void redefinir(RedefinirSenhaRequisicao requisicao) {
    politicaDeSenha.recusarSeComum(requisicao.novaSenha());

    List<UUID> dono =
        jdbc.queryForList(
            """
            UPDATE reset_token SET consumido = true
             WHERE token_hash = ? AND consumido = false AND expira_em > now()
            RETURNING usuario_id
            """,
            UUID.class,
            GestorDeRenovacao.hash(requisicao.token()));
    if (dono.isEmpty()) {
      throw new ErroDeNegocioException(CodigoErro.RECURSO_EXPIRADO, LINK_INVALIDO);
    }
    UUID usuarioId = dono.getFirst();

    Usuario usuario =
        repositorio
            .buscarParaAtualizar(usuarioId)
            .orElseThrow(() -> new ErroDeNegocioException(CodigoErro.RECURSO_EXPIRADO, LINK_INVALIDO));
    usuario.trocarSenha(codificadorDeSenha.encode(requisicao.novaSenha()));

    // Outro link da mesma conta que ainda valesse redefiniria a senha de novo.
    jdbc.update(
        "UPDATE reset_token SET consumido = true WHERE usuario_id = ? AND consumido = false",
        usuarioId);
    int revogadas = gestorDeRenovacao.revogarAtivos(usuarioId);
    log.info(
        "Senha redefinida pelo link de recuperação do usuário {}; {} renovação(ões) ativa(s)"
            + " revogada(s)",
        usuarioId,
        revogadas);
  }
}
