import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import db from '@astrojs/db';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  vite: {
    plugins: [basicSsl(), tailwindcss()],
    server: { https: true },
  },
  // basicSsl serves dev over https://localhost; Astro's origin check rejects the
  // resulting cross-site POSTs, so it has to be off wherever basicSsl is on.
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
  adapter: node({ mode: 'standalone' }),
  integrations: [db()],
});
