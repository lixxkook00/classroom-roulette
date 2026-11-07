import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { DEFAULT_TEACHER_PIN, hashPin } from './src/pin.ts'

/** The live address, used for SEO tags, robots.txt and sitemap.xml. */
const DEFAULT_SITE_URL = 'https://lequangqui-classroom.vercel.app'

/** Writes robots.txt and sitemap.xml for the site address at build time. */
function seoFiles(siteUrl: string): Plugin {
  return {
    name: 'seo-files',
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>
`,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Set these in Vercel (Project → Settings → Environment Variables) or a local .env file.
  const env = loadEnv(mode, process.cwd(), '')
  // Teacher password: only its hash goes into the app.
  const pin = env.VITE_TEACHER_PIN || DEFAULT_TEACHER_PIN
  // Site address without a trailing slash, e.g. https://hoahocthayqui.vn
  const siteUrl = (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')
  process.env.VITE_SITE_URL = siteUrl // fills %VITE_SITE_URL% in index.html

  return {
    plugins: [react(), seoFiles(siteUrl)],
    define: {
      __TEACHER_PIN_HASH__: JSON.stringify(hashPin(pin)),
    },
  }
})
