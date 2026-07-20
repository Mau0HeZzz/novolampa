/**
 * @fileOverview Конфигурация Vite 8 для MPA-шаблона ванильной вёрстки
 */
import { resolve } from 'path'
import { defineConfig } from "vite";
import posthtml from '@vituum/vite-plugin-posthtml';
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { DEFAULT_OPTIONS } from './config/imageOptimizerConfig';
import ViteFontsAuto from 'vite-plugin-fonts-auto';

import pages from './vitejs/pages.config'

const pagesInput = {}

pages.forEach((page => {
    pagesInput[page.name] = page.path
}));


/**
 * @returns {import('vite').Plugin}
 */
function htmlPartialsHmr() {
  const partialsDir = resolve(__dirname, 'src/html')

  return {
    name: 'html-partials-hmr',
    configureServer(server) {
      server.watcher.add(partialsDir)
    },
    handleHotUpdate({ file, server }) {
      if (resolve(file).startsWith(partialsDir) && file.endsWith('.html')) {
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}

export default defineConfig({
  build: {
    target: 'es2017',
    outDir: 'dist',
    rolldownOptions: {
      input: {
        ...pagesInput
      },
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name == 'app.css') {
            return 'assets/style.css';
          }

          return 'assets/'+assetInfo.name;
        },
        chunkFileNames: (chunkInfo) => {
          console.log(chunkInfo);
          return "assets/[name].js"
        }
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    },
    devSourcemap: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: true,
  },
  plugins: [
    htmlPartialsHmr(),
    ViteFontsAuto({
      sourceDir: 'public/fonts',
      destDir: 'public/fonts',
      cssFile: 'src/scss/fonts/fonts.scss',
      preload: false,
      logs: true,
    }),
    ViteImageOptimizer(DEFAULT_OPTIONS),
    posthtml({
      root: resolve(__dirname),
    }),
  ],
})
