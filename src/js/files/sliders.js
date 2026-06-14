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

  document.querySelectorAll('.project-results').forEach((element) => {
    if (element.classList.contains('is-initialized')) return;

    const splide = new Splide(element, {
      type: 'loop',
      autoWidth: true,
      focus: 'center',
      gap: 30,
      perMove: 1,
      arrows: true,
      pagination: true,
      breakpoints: {
        767: {
          gap: 8,
          arrows: false,
        },
      },
    });

    splide.on('moved', () => {
      element.lightGallery?.refresh();
    });

    splide.mount();
    element.lightGallery?.refresh();
  });

  document.querySelectorAll('.project-equipment').forEach((element) => {
    if (element.classList.contains('is-initialized')) return;

    new Splide(element, {
      type: 'slide',
      perPage: 5,
      perMove: 1,
      gap: 30,
      arrows: true,
      pagination: false,
      rewind: true,
      breakpoints: {
        1199: {
          perPage: 4,
          gap: 20,
        },
        991: {
          perPage: 3,
          gap: 16,
        },
        767: {
          perPage: 2,
          perMove: 2,
          gap: 8,
          arrows: false,
          pagination: true,
        },
      },
    }).mount();
  });

  document.querySelectorAll('.similar-projects').forEach((element) => {
    if (element.classList.contains('is-initialized')) return;

    new Splide(element, {
      type: 'slide',
      perPage: 3,
      perMove: 1,
      gap: 30,
      arrows: true,
      pagination: false,
      rewind: true,
      breakpoints: {
        991: {
          perPage: 2,
          gap: 20,
        },
        767: {
          perPage: 1,
          gap: 8,
          arrows: false,
          pagination: true,
        },
      },
    }).mount();
  });

  document.querySelectorAll('.solution-zones__slider').forEach((element) => {
    if (element.classList.contains('is-initialized')) return;

    new Splide(element, {
      type: 'slide',
      perPage: 3,
      perMove: 1,
      gap: 30,
      arrows: false,
      pagination: false,
      rewind: true,
      breakpoints: {
        767: {
          fixedWidth: '250px',
          gap: 12,
          pagination: true,
        },
      },
    }).mount();
  });

  document.querySelectorAll('.solution-other__slider').forEach((element) => {
    if (element.classList.contains('is-initialized')) return;

    new Splide(element, {
      type: 'slide',
      perPage: 3,
      perMove: 1,
      gap: 30,
      arrows: false,
      pagination: false,
      rewind: true,
      breakpoints: {
        767: {
          fixedWidth: '225px',
          gap: 12,
          pagination: true,
        },
      },
    }).mount();
  });

  document.querySelectorAll('.audience-process__slider').forEach((element) => {
    if (element.classList.contains('is-initialized')) return;

    new Splide(element, {
      type: 'slide',
      perPage: 4,
      perMove: 1,
      gap: 30,
      arrows: false,
      pagination: false,
      rewind: true,
      breakpoints: {
        991: {
          perPage: 2,
          gap: 20,
        },
        767: {
          fixedWidth: '252px',
          gap: 10,
          pagination: true,
        },
      },
    }).mount();
  });

  document.querySelectorAll('.about-slider').forEach((element) => {
    if (element.classList.contains('is-initialized')) return;

    new Splide(element, {
      type: 'slide',
      perPage: Number(element.dataset.aboutPerPage),
      perMove: 1,
      gap: 30,
      arrows: false,
      pagination: false,
      rewind: true,
      breakpoints: {
        991: {
          perPage: 2,
          gap: 20,
        },
        767: {
          fixedWidth: '252px',
          gap: 10,
          pagination: true,
        },
      },
    }).mount();
  });

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
