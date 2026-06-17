import { fileURLToPath, URL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import svgLoader from 'vite-svg-loader'

function clientIdRewritePlugin(clientIdUrl?: string): Plugin {
    let outDir = 'dist';
    return {
        name: 'loama-client-id-rewrite',
        apply: 'build',
        configResolved(resolved) {
            outDir = resolved.build.outDir;
        },
        async closeBundle() {
            if (!clientIdUrl) return;
            const filePath = path.resolve(outDir, 'client-id.jsonld');
            try {
                const raw = await readFile(filePath, 'utf-8');
                const json = JSON.parse(raw);
                json.client_id = clientIdUrl;
                await writeFile(filePath, JSON.stringify(json, null, 2) + '\n');
            } catch (err) {
                this.warn(`Could not rewrite client_id in ${filePath}: ${(err as Error).message}`);
            }
        }
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    const config = {
        plugins: [
            vue(),
            vueDevTools(),
            svgLoader(),
            clientIdRewritePlugin(env.VITE_CLIENT_ID_URL)
        ],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
                'loama-app': fileURLToPath(new URL('./src/libs/loama-app/index.ts', import.meta.url)),
                'loama-common': fileURLToPath(new URL('./src/libs/loama-common/index.ts', import.meta.url)),
                'loama-controller': fileURLToPath(new URL('./src/libs/loama-controller/index.ts', import.meta.url))
            }
        },
        // available in app as import.meta.env.BASE_URL
        base: env.VITE_BASE || '/'
    }
    return config;
})
