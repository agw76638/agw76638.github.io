// @ts-check

import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://agw76638.github.io',
  i18n: {
    locales: ['ko', 'en'],
    defaultLocale: 'en',
  },

  integrations: [mdx()],
});
