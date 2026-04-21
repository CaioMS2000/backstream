import tsConfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		root: './',
		include: ['**/*.e2e-spec.ts'],
		fileParallelism: false,
		globalSetup: ['./test/global-setup.ts'],
		env: { NODE_ENV: 'test' },
	},
	plugins: [tsConfigPaths({})],
})
