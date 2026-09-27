/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /** Base URL do serviço `identidade` (decisão de 12/09: URL por serviço, sem gateway). */
  readonly VITE_IDENTIDADE_BASE_URL: string
  /** Base URL do serviço `acervo` (F-ACV-CADASTRO). */
  readonly VITE_ACERVO_BASE_URL: string
  readonly VITE_LEITURA_BASE_URL: string
  /** Cloud do Cloudinary. Precisa ser o mesmo `CLOUDINARY_CLOUD_NAME` do `acervo`. */
  readonly VITE_CLOUDINARY_CLOUD_NAME: string
  /** Preset UNSIGNED de capa de livro pessoal (P-09). Público por natureza. */
  readonly VITE_CLOUDINARY_UPLOAD_PRESET: string
  /** Preset UNSIGNED de avatar (F-PERFIL): `leai_avatares`, pasta `avatares`. */
  readonly VITE_CLOUDINARY_AVATAR_PRESET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
