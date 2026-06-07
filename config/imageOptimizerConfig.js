/**
 * @fileOverview Конфигурация оптимизации изображений (sharp + svgo)
 */
export const DEFAULT_OPTIONS = {
  test: /\.(jpe?g|png|gif|webp|svg|avif)$/i,
  includePublic: true,
  logStats: true,
  ansiColors: true,
  svg: {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            cleanupNumericValues: false,
            convertPathData: false,
            cleanupIds: {
              minify: false,
              remove: false,
            },
          },
        },
      },
      {
        name: "removeViewBox",
        active: false,
      },
      "sortAttrs",
      {
        name: "addAttributesToSVGElement",
        params: {
          attributes: [{ xmlns: "http://www.w3.org/2000/svg" }],
        },
      },
    ],
  },
  png: {
    quality: 75,
  },
  jpeg: {
    quality: 75,
  },
  gif: {},
  webp: {
    quality: 75,
  },
  avif: {
    quality: 75,
  },
  cache: true,
  cacheLocation: 'node_modules/.cache/image-optimizer',
};