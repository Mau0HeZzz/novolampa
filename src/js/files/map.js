/**
 * @fileOverview Динамическая загрузка Yandex Maps API v3.
 */

const mapElement = document.querySelector("[data-map]");

export const yandexMapsPromise = mapElement
  ? window.mhzYandexMapsPromise ||= new Promise((resolve, reject) => {
    const apiKey = window.mhzSettings?.YANDEX_API_KEY;

    if (!apiKey) {
      reject(new Error("Не задан YANDEX_API_KEY"));
      return;
    }

    const resolveApi = () => {
      if (!window.ymaps3) {
        reject(new Error("Yandex Maps API не найден после загрузки скрипта"));
        return;
      }

      window.ymaps3.ready.then(() => resolve(window.ymaps3)).catch(reject);
    };

    if (window.ymaps3) {
      resolveApi();
      return;
    }

    const existingScript = document.querySelector("script[data-yandex-maps-api]");
    if (existingScript) {
      existingScript.addEventListener("load", resolveApi, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Не удалось загрузить Yandex Maps API")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.dataset.yandexMapsApi = "";
    script.addEventListener("load", resolveApi, { once: true });
    script.addEventListener("error", () => reject(new Error("Не удалось загрузить Yandex Maps API")), { once: true });
    document.head.append(script);
  })
  : Promise.resolve(null);
