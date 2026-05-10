import tsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		root: './',
		include: ['**/*.integration-spec.ts'],
		fileParallelism: false,
		globalSetup: ['./src/test/setup-integration.ts'],
		env: { NODE_ENV: 'test' },
	},
	plugins: [tsConfigPaths({})],
})
