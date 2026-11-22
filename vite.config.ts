import { defineConfig } from 'vite-plus'

const integration = 'src/**/*.integration.test.ts'
const unit = { test: { name: 'unit', include: ['src/**/*.test.ts'], exclude: ['**/node_modules/**', integration] } }
const live = { test: { name: 'integration', include: [integration], testTimeout: 30000 } }

export default defineConfig({
  pack: { entry: ['search.ts'], format: ['esm'], dts: true, platform: 'node' },
  test: {
    reporters: ['default', ['junit', { outputFile: 'coverage/junit.xml' }]],
    coverage: { provider: 'istanbul', include: ['search.ts', 'src/**'], reporter: ['text-summary', 'lcov'] },
    // The integration suite reaches the real providers, so it runs only in its own project.
    projects: [unit, live],
  },
  fmt: {
    printWidth: 240,
    semi: false,
    singleQuote: true,
    ignorePatterns: ['package.json', 'pnpm-lock.yaml'],
  },
  lint: {
    plugins: ['typescript', 'unicorn', 'oxc'],
    categories: { perf: 'error' },
    rules: {
      curly: ['error', 'multi-line'],
      'typescript/explicit-function-return-type': 'error',
      'typescript/explicit-module-boundary-types': 'error',
      'typescript/no-explicit-any': 'error',
      'typescript/no-non-null-assertion': 'error',
    },
    ignorePatterns: ['coverage/**', 'dist/**'],
  },
})
