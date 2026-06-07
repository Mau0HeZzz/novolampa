/**
 * @fileOverview Инициализация слайдеров Splide
 */

import { Splide } from '@splidejs/splide';
import '@splidejs/splide/css/core';

function initPromoCatalogPopup() {
  document.querySelectorAll('.promo-catalog-popup').forEach((element) => {
    const splide = new Splide(element, {
      type: 'loop',
      direction: 'ttb',
      height: 'auto',
      pagination: false,
      arrows: false,
      gap: 13,
      // perPage: 3,
      perMove: 1,
      autoplay: true,
      interval: 5000,
      pauseOnHover: true,
      pauseOnFocus: true,
    });

    splide.mount();
  });
}

function initSliders() {
  initPromoCatalogPopup();

  document.querySelectorAll('.splide:not(.promo-catalog-popup)').forEach((element) => {
    if (element.classList.contains('is-initialized')) return;

    // const splide = new Splide(element, {
    //   type: 'slide',
    //   pagination: false,
    //   gap: 10,
    //   arrows: true,
    //   perMove: 1,
    //   perPage: 1,
    // });

    // splide.mount();
  });
}

window.addEventListener('load', () => {
  initSliders();
});
