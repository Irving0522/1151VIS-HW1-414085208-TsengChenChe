import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',   // 用相對路徑，build 出來的 dist 可以放到任何資料夾或 GitHub Pages
})
