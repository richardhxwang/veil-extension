import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }),
  manifest: {
    name: 'Veil',
    description: '揭开网页面纱 — 暗模式、追踪器、隐藏元素、浏览轨迹',
    permissions: ['history', 'storage', 'sidePanel', 'webRequest', 'tabs', 'webNavigation'],
    host_permissions: ['<all_urls>'],
    side_panel: { default_path: 'sidepanel/index.html' },
    action: { default_popup: 'popup/index.html' },
  },
})
