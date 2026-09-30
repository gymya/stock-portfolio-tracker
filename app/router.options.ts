import type { RouterConfig } from '@nuxt/schema'
export default {
  routes: routes => [{ path: '/', redirect: '/portfolio' }, ...routes],
} satisfies RouterConfig
