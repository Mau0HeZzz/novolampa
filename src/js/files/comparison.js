/**
 * @fileOverview Синхронизация товаров и характеристик на странице сравнения.
 */

import { Splide } from "@splidejs/splide";

document.querySelectorAll("[data-comparison]").forEach((comparison) => {
  const productsElement = comparison.querySelector("[data-comparison-products]");
  const valuesElement = comparison.querySelector("[data-comparison-values]");
  const labels = Array.from(comparison.querySelectorAll("[data-comparison-labels] [data-comparison-property]"));
  const valueSlides = Array.from(valuesElement?.querySelectorAll(".splide__slide") || []);

  if (!productsElement || !valuesElement || !labels.length || !valueSlides.length) return;

  const propertyKeys = labels.map((label) => label.dataset.comparisonProperty);

  valueSlides.forEach((slide) => {
    const column = slide.querySelector("[data-comparison-values-column]");

    if (!column) return;

    const cells = new Map(Array.from(column.querySelectorAll("[data-comparison-property]")).map((cell) => [
      cell.dataset.comparisonProperty,
      cell
    ]));

    column.replaceChildren(...propertyKeys.map((propertyKey) => {
      if (cells.has(propertyKey)) return cells.get(propertyKey);

      const cell = document.createElement("div");
      cell.className = "comparison-values__cell";
      cell.dataset.comparisonProperty = propertyKey;
      return cell;
    }));
  });

  const sliderOptions = {
    type: "slide",
    autoWidth: true,
    perMove: 1,
    gap: 30,
    arrows: false,
    pagination: false,
    drag: true,
    breakpoints: {
      767: {
        gap: 8
      }
    }
  };
  const productsSlider = new Splide(productsElement, sliderOptions);
  const valuesSlider = new Splide(valuesElement, sliderOptions);
  const count = comparison.querySelector("[data-comparison-count]");
  let alignmentFrame = 0;
  let observedWidth = 0;

  if (count) {
    count.textContent = productsElement.querySelectorAll(".splide__slide").length;
  }

  const updateRows = () => {
    cancelAnimationFrame(alignmentFrame);
    alignmentFrame = requestAnimationFrame(() => {
      const mode = comparison.querySelector("[data-comparison-mode]:checked")?.value || "all";
      const slideCells = valueSlides.map((slide) => new Map(Array.from(slide.querySelectorAll("[data-comparison-property]")).map((cell) => [
        cell.dataset.comparisonProperty,
        cell
      ])));

      labels.forEach((label) => {
        const propertyKey = label.dataset.comparisonProperty;
        const cells = slideCells.map((items) => items.get(propertyKey)).filter(Boolean);
        const values = cells.map((cell) => (cell.dataset.comparisonValue ?? cell.textContent).replace(/\s+/g, " ").trim());
        const hidden = mode === "different" && new Set(values).size < 2;

        label.hidden = hidden;
        cells.forEach((cell) => {
          cell.hidden = hidden;
        });
      });

      labels.forEach((label) => {
        const propertyKey = label.dataset.comparisonProperty;
        const cells = slideCells.map((items) => items.get(propertyKey)).filter(Boolean);
        const row = [label, ...cells];

        row.forEach((item) => {
          item.style.removeProperty("height");
        });

        if (label.hidden) return;

        const height = Math.ceil(Math.max(...row.map((item) => item.getBoundingClientRect().height)));

        row.forEach((item) => {
          item.style.height = `${height}px`;
        });
      });
    });
  };

  comparison.addEventListener("change", (event) => {
    if (!event.target.matches("[data-comparison-mode]")) return;
    updateRows();
  });

  productsSlider.sync(valuesSlider);
  productsSlider.on("mounted resized updated", updateRows);
  valuesSlider.on("mounted resized updated", updateRows);
  productsSlider.mount();
  valuesSlider.mount();

  const resizeObserver = new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);

    if (width === observedWidth) return;

    observedWidth = width;
    updateRows();
  });

  resizeObserver.observe(comparison);
  document.fonts?.ready.then(updateRows);
});
