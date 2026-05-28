/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_BYPASS?: string
  readonly VITE_BYPASS_USER?: string
  readonly VITE_BYPASS_PASS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
