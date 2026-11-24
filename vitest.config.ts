import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // These run against the Orca app's own test kit: `pnpm test:orca`.
    exclude: ['test/orca/**'],
    environment: 'node'
  }
})
