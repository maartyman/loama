import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    const config = {
        plugins: [
            vue(),
            vueDevTools(),
            svgLoader()
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
