export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  runtimeConfig: {
    fugleApiBaseUrl: '', // NUXT_FUGLE_API_BASE_URL, server-only
    fugleApiKey: '', // NUXT_FUGLE_API_KEY, never exposed to the browser
  },
  colorMode: { preference: 'light' },
  modules: ['@nuxt/ui', '@vite-pwa/nuxt'],
  pwa: {
    registerType: 'prompt',
    client: { installPrompt: true },
    manifest: {
      id: '/',
      name: '台股手帳｜投資組合',
      short_name: '台股手帳',
      description: '在自己的裝置管理台股持股，掌握最新交易日市值與損益。',
      lang: 'zh-Hant',
      start_url: '/portfolio',
      scope: '/',
      display: 'standalone',
      theme_color: '#08192D',
      background_color: '#f7f8fa',
      icons: [
        { src: '/icons/notebook-full-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/notebook-full-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    },
    includeAssets: ['icons/*.png'],
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//],
      additionalManifestEntries: [{ url: '/', revision: String(Date.now()) }],
      cleanupOutdatedCaches: true,
      runtimeCaching: [{ urlPattern: /\/api\/quotes(?:\?.*)?$/, handler: 'NetworkOnly' }],
    },
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'zh-Hant' },
      title: '台股手帳｜投資組合',
      link: [
        { rel: 'apple-touch-icon', href: '/icons/notebook-full-180.png' },
        { rel: 'icon', type: 'image/png', href: '/icons/notebook-full-192.png' },
      ],
      meta: [
        { name: 'theme-color', content: '#08192D' },
        { name: 'apple-mobile-web-app-title', content: '台股手帳' },
        { name: 'description', content: '保存在瀏覽器中的台股持股與最新交易日市值。' },
      ],
    },
  },
  typescript: { strict: true },
});
