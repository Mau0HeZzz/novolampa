/**
 * @fileOverview Интерактивные элементы страницы контактов.
 */

import { yandexMapsPromise } from "./map.js";
import sdekPoints from './cdek_spb_points';

const mapElements = document.querySelectorAll(".contacts-map [data-map]");

if (mapElements.length) {
  yandexMapsPromise
    .then(async (ymaps3) => {
      const {
        YMap,
        YMapCollection,
        YMapDefaultFeaturesLayer,
        YMapDefaultSchemeLayer,
        YMapMarker,
      } = ymaps3;
      const { YMapClusterer, clusterByGrid } = await ymaps3.import("@yandex/ymaps3-clusterer@0.0.1");

      const pickupPoints = window.mhzSettings.CDEK_POINTS || sdekPoints.filter(el => el?.geometry?.coordinates?.length);
      const showroomPoints = [
        { id: "petrogradskaya", coordinates: [30.304540, 59.964678] },
        { id: "veteranov", coordinates: [30.138109, 59.848525] },
      ];

      mapElements.forEach((mapElement) => {
        mapElement.replaceChildren();

        const map = new YMap(mapElement, {
          location: {
            center: [30.250000, 59.920000],
            zoom: 10,
          },
        });

        map.addChild(new YMapDefaultSchemeLayer());
        map.addChild(new YMapDefaultFeaturesLayer());

        const pickupClusterer = new YMapClusterer({
          method: clusterByGrid({ gridSize: 64 }),
          features: pickupPoints,
          marker: (feature) => {
            const marker = document.createElement("img");
            marker.src = "/img/common/marker.svg";
            marker.alt = "";
            marker.width = 26;
            marker.height = 34;
            marker.className = "pickup-marker";

            return new YMapMarker({ coordinates: feature.geometry.coordinates }, marker);
          },
          cluster: (coordinates, features) => {
            const marker = document.createElement("div");
            const markerImage = document.createElement("img");
            const markerCount = document.createElement("span");

            marker.className = "pickup-cluster";
            markerImage.src = "/img/common/marker-cluster.svg";
            markerImage.alt = "";
            markerImage.width = 44;
            markerImage.height = 44;
            markerImage.className = "pickup-cluster__image";
            markerCount.className = "pickup-cluster__count";
            markerCount.textContent = features.length;
            marker.append(markerImage, markerCount);

            return new YMapMarker({ coordinates }, marker);
          },
        });
        const showroomCollection = new YMapCollection({});

        showroomPoints.forEach((point) => {
          const marker = document.createElement("img");
          marker.src = "/img/common/marker-logo.png";
          marker.alt = "";
          marker.width = 164;
          marker.height = 41;
          marker.className = "showroom-marker";
          showroomCollection.addChild(new YMapMarker({ coordinates: point.coordinates }, marker));
        });

        const switcher = mapElement.closest(".contacts-map")?.querySelector("[data-map-switcher]");
        const buttons = switcher ? [...switcher.querySelectorAll("[data-map-mode]")] : [];
        const initialActiveIndex = Math.max(buttons.findIndex((button) => button.classList.contains("_active")), 0);
        const initialMode = buttons[initialActiveIndex]?.dataset.mapMode || "pickup";
        let activeMapLayer = initialMode === "showrooms" ? showroomCollection : pickupClusterer;

        console.log(activeMapLayer);

        map.addChild(activeMapLayer);

        if (!switcher) return;

        const indicator = switcher.querySelector(".segmented-control__indicator");
        const updateIndicator = (button) => {
          const indicatorInset = parseFloat(getComputedStyle(indicator).top);

          switcher.style.setProperty("--segmented-left", `${button.offsetLeft + indicatorInset}px`);
          switcher.style.setProperty("--segmented-width", `${button.offsetWidth - indicatorInset * 2}px`);
        };

        updateIndicator(buttons[initialActiveIndex]);
        switcher.classList.toggle("_first-active", initialActiveIndex === 0);
        switcher.classList.toggle("_last-active", initialActiveIndex === buttons.length - 1);

        new ResizeObserver(() => {
          updateIndicator(switcher.querySelector("[data-map-mode]._active"));
        }).observe(switcher);

        switcher.addEventListener("click", (event) => {
          const button = event.target.closest("[data-map-mode]");
          if (!button || button.classList.contains("_active")) return;

          const activeIndex = buttons.indexOf(button);
          buttons.forEach((item, index) => {
            const isActive = index === activeIndex;
            item.classList.toggle("_active", isActive);
            item.setAttribute("aria-pressed", isActive);
          });

          updateIndicator(button);
          switcher.classList.toggle("_first-active", activeIndex === 0);
          switcher.classList.toggle("_last-active", activeIndex === buttons.length - 1);

          map.removeChild(activeMapLayer);
          activeMapLayer = button.dataset.mapMode === "showrooms" ? showroomCollection : pickupClusterer;
          map.addChild(activeMapLayer);
          map.update({
            location: {
              center: button.dataset.mapMode === "showrooms"
                ? [30.221000, 59.910000]
                : [30.250000, 59.920000],
              zoom: button.dataset.mapMode === "showrooms" ? 11 : 10,
              duration: 400,
            },
          });
        });
      });
    })
    .catch((error) => {
      mapElements.forEach((mapElement) => {
        let status = mapElement.querySelector(".contacts-map__status");

        if (!status) {
          status = document.createElement("span");
          status.className = "contacts-map__status";
          mapElement.replaceChildren(status);
        }

        status.textContent = "Не удалось загрузить карту";
      });
      console.error(error);
    });
}
