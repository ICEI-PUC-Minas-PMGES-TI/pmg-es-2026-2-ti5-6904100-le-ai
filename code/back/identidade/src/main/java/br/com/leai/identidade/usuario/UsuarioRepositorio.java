package br.com.leai.identidade.usuario;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

  /** Recuperação de senha: só por e-mail, porque o link vai para ele (RF-AUT-04). */
  Optional<Usuario> findByEmailIgnoreCase(String email);

  boolean existsByUsernameIgnoreCase(String username);

  /**
   * Lê a conta com {@code SELECT ... FOR UPDATE}, para a troca de senha. Duas trocas simultâneas
   * com a mesma senha atual não podem as duas passar: a segunda espera a primeira commitar e
   * compara com o hash novo.
   */
  /**
   * Perfil de outro leitor pelo username completo, ignorando caixa, e só se a conta estiver
   * visível: suspensa ou com exclusão pendente não existe para os outros (mesmo filtro das VIEWs).
   * Igualdade, nunca prefixo: não há busca parcial (RNF-SEC-19/44).
   */
  @Query(
      "SELECT u FROM Usuario u WHERE lower(u.username) = lower(:username)"
          + " AND u.suspenso = false AND u.exclusaoSolicitadaEm IS NULL")
  Optional<Usuario> buscarVisivelPorUsername(@Param("username") String username);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT u FROM Usuario u WHERE u.id = :id")
  Optional<Usuario> buscarParaAtualizar(@Param("id") UUID id);
}
