// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { remarkPackageName } from './src/plugins/remark-package-name.mjs'
// The one place the package name lives; the docs write %PKG% for it.
import { PACKAGE } from './src/config/site.ts'

export default defineConfig({
  // Where it is published: cocido.dev, or SITE_URL while it lives elsewhere (a provisional address).
  site: process.env.SITE_URL ?? 'https://cocido.dev',
  markdown: {
    remarkPlugins: [remarkPackageName(PACKAGE)],
  },
  integrations: [
    starlight({
      title: 'cocido',
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        es: { label: 'Español', lang: 'es' },
      },
      customCss: ['./src/styles/docs.css'],
      components: {
        SiteTitle: './src/components/docs/SiteTitle.astro',
        SocialIcons: './src/components/docs/HeaderLinks.astro',
      },
      editLink: undefined,
      lastUpdated: false,
      sidebar: [
        { slug: 'guide/getting-started' },
        { slug: 'tutorial' },
      ],
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
