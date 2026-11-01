/// <reference types="vite/client" />
// Types for the VITE_* environment variables read through import.meta.env.

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_FEATURE_AI_CATEGORIZATION: string;
  readonly VITE_FEATURE_AI_INSIGHTS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
