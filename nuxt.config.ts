export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  colorMode: { preference: 'light' },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  app: { head: { htmlAttrs: { lang: 'zh-Hant' }, title: '台股手帳｜投資組合', meta: [{ name: 'description', content: '保存在瀏覽器中的台股持股與最新交易日市值。' }] } },
  typescript: { strict: true },
})
