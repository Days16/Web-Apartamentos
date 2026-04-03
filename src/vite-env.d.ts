/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública del sitio (sin barra final), p. ej. https://www.apartamentosillapancha.com */
  readonly VITE_SITE_URL?: string;
  /** URL absoluta imagen Open Graph 1200×630 (opcional; si no, se usa hero por defecto) */
  readonly VITE_OG_IMAGE_URL?: string;
}
