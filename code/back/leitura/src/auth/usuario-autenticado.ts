/** Identidade do solicitante, derivada do token. Nunca do corpo da requisição. */
export interface UsuarioAutenticado {
  /** `sub` do token: o id do usuário em `identidade`. */
  id: string;
  username: string;
}
