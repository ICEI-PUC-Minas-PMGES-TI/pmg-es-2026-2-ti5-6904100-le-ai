/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  /** Base URL do serviço `identidade` (decisão de 12/09: URL por serviço, sem gateway). */
  readonly VITE_IDENTIDADE_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
