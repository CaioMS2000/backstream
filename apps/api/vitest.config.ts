import { defineConfig } from 'vitest/config'

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		globals: true,
		root: './',
		exclude: ['**/*.e2e-spec.ts', '**/node_modules/**'],
		env: { NODE_ENV: 'test' },
	},
})
