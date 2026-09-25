# JavaScript-модули

Минимальная документация по клиентскому JavaScript проекта NovoLampa.

## Подключение

Точка входа — `src/js/app.js`. Она подключается на всех страницах через
`src/html/_js.html`.

В `src/js/app.js`:

- импортируются стили `src/scss/style.scss`;
- вызываются общие функции шаблона;
- подключаются сторонние библиотеки;
- подключаются проектные модули из `src/js/files`.

Большинство модулей безопасно импортируются глобально: если на странице нет
нужного селектора или `data-*`-атрибута, модуль ничего не инициализирует.

Глобальные настройки задаются до подключения `app.js`:

```html
<script>
  window.mhzSettings = {
    TEMPLATE_PATH: "/",
    YANDEX_API_KEY: "",
    CDEK_POINTS: null,
    dadataApiKey: ""
  };
</script>
```

Не храните секретные серверные ключи в `window.mhzSettings`: значения из этого
объекта доступны в браузере.

## Структура

| Путь | Назначение |
| --- | --- |
| `src/js/app.js` | Точка входа и список активных модулей |
| `src/js/files` | Проектные модули и общие функции |
| `src/js/files/forms` | Формы, маски, календарь и диапазоны |
| `src/js/files/scroll` | Навигация, прокрутка и lazy load |
| `src/js/libs` | Модули исходного шаблона и сторонние файлы |
| `src/js/files/modules.js` | Реестр инициализированных модулей `mhzModules` |

## Проектные модули

### Шапка и меню

Файл: `src/js/files/header.js`.

Модуль:

- строит мобильное многоуровневое меню каталога из содержимого `#catalogPopup`;
- переключает категории каталога на десктопе;
- открывает мобильную панель контактов;
- закрывает панель контактов по клику снаружи и по `Escape`;
- рассчитывает отступ информационной плашки с учётом панели Битрикс.

Основные атрибуты:

| Атрибут | Назначение |
| --- | --- |
| `data-catalog-submenu` | Контейнер мобильного меню каталога |
| `data-catalog-popup-category` | Категория каталога |
| `data-catalog-popup-panel` | Панель категории; значение должно совпадать со значением категории |
| `data-menu-back` | Возврат на предыдущий уровень мобильного меню |
| `data-contacts`, `data-contacts-toggle` | Корень и кнопка панели контактов |
| `data-contacts-panel`, `data-contacts-close` | Панель контактов и кнопка закрытия |
| `data-announcement`, `data-announcement-close` | Информационная плашка и кнопка закрытия |

Состояния: `submenu-open`, `contacts-open`, `_active`.

### Каталог

Файл: `src/js/files/catalog.js`.

Корень модуля — форма с `data-catalog-filters`.

Возможности:

- класс `_changed`, если состояние фильтров отличается от начального;
- поиск по брендам через `data-catalog-brand-search`;
- сброс формы, range-слайдеров и кастомных select через `data-catalog-reset`;
- фиксированное положение фильтров внутри `.catalog-products__aside` на ширине
  от `768px`.

Для корректной фиксации на странице должен быть `.catalog-toolbar`.

### Страница товара

Файл: `src/js/files/product.js`.

Модуль работает внутри `.product-page` и:

- синхронизирует поля `data-product-quantity`;
- синхронизирует активный пункт навигации по товару;
- перемещает индикатор `data-product-tabs-indicator`;
- обновляет Splide в открытом разделе;
- показывает `data-product-fixed-cart`, когда основные действия товара вне
  экрана, и скрывает его при появлении `.footer`.

Для наблюдения за секциями используются
`.product-tabs__body[data-watch="navigator"]`. Основной блок действий должен
иметь `data-product-main-actions`.

### Сравнение

Файл: `src/js/files/comparison.js`.

Корень — `data-comparison`. Модуль создаёт и синхронизирует два Splide-слайдера:

- `data-comparison-products` — карточки товаров;
- `data-comparison-values` — значения характеристик.

Строки сопоставляются по одинаковому значению `data-comparison-property`.
Переключатели `data-comparison-mode` поддерживают режимы:

- `all` — все характеристики;
- `different` — только различающиеся.

`data-comparison-count` получает количество товаров.

### Оформление заказа

Файл: `src/js/files/checkout.js`.

Корень — `data-checkout`.

Модуль:

- раскрывает мобильную корзину через `data-checkout-cart-toggle`;
- синхронизирует быстрый выбор города `input[name="quickCity"]`;
- запрашивает подсказки города и адреса через DaData;
- поддерживает выбор подсказки мышью, стрелками и клавишей `Enter`.

Структура поля подсказок:

```html
<div data-address-field>
  <input data-address-suggest="city">
  <div data-address-suggestions hidden></div>
</div>
```

Для адреса используется `data-address-suggest="address"`. Ключ передаётся через
`window.mhzSettings.dadataApiKey`. Запрос начинается с двух символов и
откладывается на `300ms`.

### Контакты и карта

Файлы:

- `src/js/files/map.js` — загрузка Yandex Maps API v3;
- `src/js/files/contacts.js` — карта пунктов выдачи и шоурумов;
- `src/js/files/segmented-control.js` — индикатор переключателя карты.

Карта создаётся для каждого `.contacts-map [data-map]`. Переключатель
`data-map-switcher` содержит кнопки `data-map-mode="pickup"` и
`data-map-mode="showrooms"`.

Настройки:

| Поле | Назначение |
| --- | --- |
| `window.mhzSettings.YANDEX_API_KEY` | Ключ Yandex Maps API |
| `window.mhzSettings.CDEK_POINTS` | Массив GeoJSON-точек СДЭК |
| `src/js/files/cdek_spb_points.json` | Локальный fallback точек СДЭК |

При ошибке вместо карты выводится сообщение «Не удалось загрузить карту».

### Калькулятор светодиодной ленты

Файл: `src/js/files/calculator.js`.

Корень — `data-calculator`. Экземпляр доступен как `element.calculator`.
Пример разметки и настроек находится в
`pages/knowledge-base-tape-calculator.html`.

Модуль:

- добавляет, переименовывает, сворачивает и удаляет помещения;
- сохраняет введённые данные в `localStorage`;
- проверяет габариты помещения;
- отправляет общий расчёт на backend;
- отображает товары по помещениям;
- добавляет результат в корзину;
- формирует PDF.

Режим выбирается разметкой:

- без `data-demo` — запросы к backend;
- с `data-demo` — локальный ответ из `settings.demo`.

Минимальные настройки:

```js
window.calculatorSettings = {
  storageKey: "NOVOLAMPA_TAPE_CALCULATOR",
  initialSegment: {
    FORM_ID: "FORM_1",
    init: "Y",
    room_name: "Комната 1"
  },
  endpoints: {
    calculate: "/calculate",
    addToCart: "/add-to-cart"
  },
  request: {
    rootField: "post",
    csrfHeader: "x-bitrix-csrf-token",
    siteIdHeader: "x-bitrix-site-id",
    siteId: "s1",
    csrf: ""
  },
  validation: {
    dimensions: {
      fields: ["length", "width", "height"],
      alternativeField: "general_length"
    },
    messages: {}
  },
  messages: {},
  sections: {
    order: []
  }
};
```

Backend получает `FormData` с корневым полем `request.rootField`. При ошибке
`invalid_csrf` модуль берёт новый токен из
`error.customData.csrf` и один раз повторяет запрос.

Основные шаблоны задаются через
`<template data-calculator-template="...">`. Обязателен шаблон `segment`;
результат использует `result`, `result-room` и `result-item`.

### Cookie consent

Файл: `src/js/files/cookie-consent.js`.

Панель с `data-cookie-consent` показывается, пока cookie
`novolampa_cookie_consent` не равна `accepted`. Кнопка
`data-cookie-consent-accept` сохраняет согласие на `365` дней.

### Общие DOM-утилиты

Файл: `src/js/files/script.js`.

`data-show-hidden` объединяет скрытые элементы и кнопку:

```html
<div data-show-hidden>
  <div data-show-hidden-item hidden>...</div>
  <button data-show-hidden-button>Показать ещё</button>
</div>
```

Также файл генерирует CSS для служебных классов, найденных в HTML:

| Шаблон | Результат |
| --- | --- |
| `_md-768-dn`, `_mmd-768-dn` | Скрытие ниже или выше ширины |
| `_cmd-768-dn`, `_cmmd-768-dn` | Скрытие по ширине контейнера |
| `gap-4`, `c-gap-4`, `r-gap-4` | Отступы на основе `--base-indent` |
| `w-10`, `min-w-10`, `max-w-10` | Ширина |
| `h-10`, `min-h-10`, `max-h-10` | Высота |
| `pt-4`, `pb-4`, `pl-4`, `pr-4`, `mt-4`, `mb-4` | Внешние и внутренние отступы |
| `apt-10-4`, `amb-10-4`, `aw-10-4`, `agap-10-4` | Адаптивные значения |
| `brad-2`, `bg-clr-white`, `clr-black` | Радиус и цвета |
| `of-cover`, `op-center-top` | `object-fit` и `object-position` |

Префикс `!`, например `!gap-4`, добавляет `!important`.

### Ограничение числового ввода

Файл: `src/js/files/only-digits-input.js`.

Добавьте `data-only-digits-input` к `input`. Модуль оставляет цифры и одну
десятичную точку, сохраняя позицию курсора.

## Общие модули шаблона

### Формы

Файл: `src/js/files/forms/forms.js`.

Активны обработка полей, валидация, отправка и счётчик количества.

Основные атрибуты:

| Атрибут | Назначение |
| --- | --- |
| `data-required` | Обязательное поле |
| `data-required="..."` | Специальная проверка: `email`, `phone`, `fio`, `date` или `password` |
| `data-validate` | Проверка после потери фокуса |
| `data-error` | Текст ошибки |
| `data-no-validate` | Отключить проверку формы |
| `data-ajax` | Отправить форму через `fetch` |
| `data-dev="success\|error"` | Имитировать результат отправки |
| `data-dev-delay` | Задержка имитации в миллисекундах |
| `data-goto-error` | Прокрутить к первой ошибке |
| `data-popup-success`, `data-popup-error` | Попап результата |
| `data-popup-autoclose="false"` | Не закрывать попап автоматически |
| `data-timeout` | Задержка автозакрытия попапа |
| `data-quantity` | Корень счётчика количества |

После успешной отправки создаётся событие `formSent` с
`event.detail.form` и `event.detail.responseResult`.

Счётчик количества создаёт события:

- `changeQuantity` с `event.detail.value`;
- `isMinQuantityDestination` при достижении минимума.

Документация исходного шаблона:
[работа с формами](https://start-template.ru/rabota-s-formami-i-elementami-form-chertogi-frilansera-v3-0-0/).

### Range

Файл: `src/js/files/forms/range.js`.

```html
<div data-range-parent>
  <input data-min-input>
  <input data-max-input>
  <div data-range data-min="0" data-max="100" data-values="10,90"></div>
</div>
```

Экземпляр noUiSlider доступен как `rangeElement.rangeSlider`. Изменение
ползунка обновляет поля и создаёт событие `change`.

### Маски

Файл: `src/js/files/forms/inputmask.js`.

Inputmask инициализируется для всех `input`. Настройка конкретного поля
передаётся через `data-inputmask`.

### Select

Файл: `src/js/libs/select.js`.

Кастомизируются `select[data-custom-select]`. Экземпляр доступен через
`mhzModules.select`.

Часто используемые атрибуты: `data-search`, `data-scroll`, `data-tags`,
`data-checkbox`, `data-submit`, `data-class-modif`.

Документация исходного шаблона:
[кастомный select](https://start-template.ru/modul-kastomizaczii-elementa-select-chertogi-frilansera-v3-0-0/).

### Popup

Файл: `src/js/libs/popup.js`.

```html
<button data-popup="#example">Открыть</button>

<div id="example" class="popup" aria-hidden="true">
  <div class="popup__content">
    <button data-close>Закрыть</button>
  </div>
</div>
```

Программное управление:

```js
import { mhzModules } from "./modules.js";

mhzModules.popup.open("#example");
mhzModules.popup.close();
```

События документа: `beforePopupOpen`, `afterPopupOpen`,
`beforePopupClose`, `afterPopupClose`.

Документация исходного шаблона:
[модуль Popup](https://start-template.ru/modul-popup-vytekayushhie-modalnye-okna-chertogi-frilansera-v3-0-0/).

### Спойлеры, табы и «Показать ещё»

Реализация: `src/js/files/functions.js`. Инициализация: `src/js/app.js`.

| Модуль | Корневой атрибут | Документация |
| --- | --- | --- |
| Спойлеры | `data-spollers` | [Описание](https://start-template.ru/modul-spojlery-chertogi-frilansera-v3-0-0/) |
| Табы | `data-tabs` | [Описание](https://start-template.ru/modul-taby-chertogi-frilansera-v3-0-0/) |
| Показать ещё | `data-showmore` | [Описание](https://start-template.ru/modul-pokazat-eshhe-chertogi-frilansera-v3-0-0/) |

### Наблюдатель

Файл: `src/js/libs/watcher.js`.

`data-watch` подключает `IntersectionObserver`. При видимости добавляется
`_watcher-view` и создаётся событие `watcherCallback` с
`event.detail.entry`.

Настройки: `data-watch-root`, `data-watch-margin`,
`data-watch-threshold`, `data-watch-once`.

### Навигация и шапка при прокрутке

Файлы: `src/js/files/scroll/scroll.js` и
`src/js/files/scroll/gotoblock.js`.

Для перехода используется `data-goto` со значением CSS-селектора.
Дополнительные настройки:

- `data-goto-header` — учесть высоту шапки;
- `data-goto-top` — дополнительный отступ;
- `data-goto-speed` — длительность прокрутки;
- `data-watch="navigator"` — связывает секцию с навигационной ссылкой.

Шапка `header.header` получает `_header-scroll`, а при
`data-scroll-show` — `_header-show`.

### Слайдеры

Файл: `src/js/files/sliders.js`. Используется Splide, запуск происходит после
события `load`.

Настроены селекторы:

- `.promo-catalog-popup`;
- `[data-product-gallery-main]` и `[data-product-gallery-thumbs]`;
- `.project-results`;
- `.project-equipment`;
- `.product-projects`;
- `.similar-projects`;
- `.solution-zones__slider`;
- `.solution-other__slider`;
- `.audience-process__slider`;
- `.about-slider`;
- `.home-projects__slider`;
- `.home-clients__slider`.

Для `.about-slider` количество слайдов задаётся через `data-about-per-page`.
Созданные экземпляры, которые используются другими модулями, сохраняются в
`element.splide`.

### Галерея

Файл: `src/js/files/gallery.js`.

Корень — `data-gallery`, элементы — ссылки внутри него.

- `data-gallery-zoom` подключает zoom;
- `data-gallery-video` подключает video;
- экземпляр доступен как `element.lightGallery`;
- список галерей доступен как `mhzModules.gallery`.

### Остальные активные модули

| Файл | Активация |
| --- | --- |
| `src/js/files/tippy.js` | `data-tippy-content` |
| `src/js/files/scroll/lazyload.js` | `data-src`, `data-srcset` |
| `src/js/libs/dynamic_adapt.js` | `data-da` |
| `src/js/files/segmented-control.js` | `.segmented-control` |

## Неактивные заготовки

В `src/js/app.js` закомментированы WebP/touch-классы, before/after, ripple,
custom cursor, datepicker, SimpleBar, Fullpage, scroll-parallax, цифровой
счётчик и Isotope.

Также не импортируются:

- `src/js/files/swiper-sliders.js`;
- `src/js/files/detectZoom.js`;
- `src/js/files/scroll/simplebar.js`;
- `src/js/files/forms/datepicker.js`;
- `src/js/files/isotope.js`.

Перед использованием проверьте актуальность заготовки и подключите её в
`src/js/app.js`.

## Добавление нового модуля

1. Создайте файл в `src/js/files`.
2. Используйте уникальный корневой класс или `data-*`-атрибут.
3. Завершайте инициализацию без ошибки, если корневого элемента нет.
4. Импортируйте файл в `src/js/app.js`.
5. Если экземпляр нужен другим модулям, сохраните его в `mhzModules` или на
   корневом DOM-элементе.
6. Добавьте в этот документ назначение, точку активации, настройки и события.
