/** Identidade do solicitante, derivada do token. Nunca do corpo da requisição. */
export interface UsuarioAutenticado {
  /** `sub` do token: o id do usuário em `identidade`. */
  id: string;
  username: string;
  /**
   * Claim `papel` do token (F-MOD): `admin` só para a conta de administrador; ausente ou outro
   * valor vale `leitor`. Hoje só a listagem de frases o lê, para o admin moderar todas.
   */
  papel: 'leitor' | 'admin';
}
