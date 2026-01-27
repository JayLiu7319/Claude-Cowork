import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const port = parseInt(env.PORT); // MUST BE LOWERCASE
	const brand = process.env.BRAND || 'business';

	return {
		plugins: [react(), tailwindcss(), tsconfigPaths()],
		base: './',
		define: {
			'import.meta.env.BRAND': JSON.stringify(brand),
		},
		build: {
			outDir: 'dist-react',
		},
		server: {
			port, // MUST BE LOWERCASE
			strictPort: true,
		},
	};
});
