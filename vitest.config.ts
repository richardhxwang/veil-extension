import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        target: 'ESNext',
        module: 'ESNext',
        moduleResolution: 'bundler',
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
      },
    },
  },
})
