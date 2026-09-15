package br.com.leai.identidade.usuario;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Acesso à tabela {@code usuario}. Consultas derivadas, nunca SQL concatenado (RNF-SEC-12).
 *
 * <p>Todas as buscas ignoram caixa, espelhando os índices funcionais {@code lower(email)} e
 * {@code lower(username)} criados pela migration. Divergir disso deixaria o login rejeitando uma
 * conta que o cadastro considera duplicada.
 */
public interface UsuarioRepositorio extends JpaRepository<Usuario, UUID> {

  /**
   * Resolve o identificador do login, que pode ser e-mail <b>ou</b> username (RF-AUT-02), numa
   * consulta só. O chamador passa o mesmo valor nos dois parâmetros.
   */
  Optional<Usuario> findByEmailIgnoreCaseOrUsernameIgnoreCase(String email, String username);

  boolean existsByEmailIgnoreCase(String email);

  boolean existsByUsernameIgnoreCase(String username);
}
