/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LEADERBOARD?: 'local' | 'remote';
  readonly VITE_LEADERBOARD_URL?: string;
  readonly VITE_LEADERBOARD_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
