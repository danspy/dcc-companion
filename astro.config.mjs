import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import db from '@astrojs/db';
import node from '@astrojs/node';
import { fileURLToPath } from 'node:url';
import { contentDate } from './scripts/lib/content-date.mjs';

// The date of the content itself, fixed at build time: the app's feed is stamped with it.
const CONTENT_DATE = contentDate(fileURLToPath(new URL('.', import.meta.url))).toISOString();

export default defineConfig({
  output: 'server',
  vite: {
    plugins: [basicSsl(), tailwindcss()],
    server: { https: true },
    define: { __CONTENT_DATE__: JSON.stringify(CONTENT_DATE) },
  },
  // basicSsl serves dev over https://localhost; Astro's origin check rejects the
  // resulting cross-site POSTs, so it has to be off wherever basicSsl is on.
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
  adapter: node({ mode: 'standalone' }),
  integrations: [db()],
});
