/**
 * @fileOverview Управление состоянием фильтров страницы каталога.
 */

import { mhzModules } from "./modules.js";

document.querySelectorAll("[data-catalog-filters]").forEach((form) => {
  const getFormState = () => new URLSearchParams(new FormData(form)).toString();
  const initialState = getFormState();

  const updateChangedState = () => {
    form.classList.toggle("_changed", getFormState() !== initialState);
  };

  form.addEventListener("input", updateChangedState);
  form.addEventListener("change", updateChangedState);
  form.addEventListener("selectCallback", updateChangedState);

  form.querySelector("[data-catalog-brand-search]")?.addEventListener("input", (event) => {
    const query = event.target.value.trim().toLocaleLowerCase("ru");

    event.target.closest(".catalog-filter__body").querySelectorAll(".catalog-checkbox").forEach((checkbox) => {
      checkbox.hidden = !checkbox.textContent.toLocaleLowerCase("ru").includes(query);
    });
  });

  form.querySelector("[data-catalog-reset]")?.addEventListener("click", () => {
    form.reset();

    form.querySelectorAll("[data-range]").forEach((range) => {
      range.rangeSlider?.reset();
    });

    form.querySelectorAll("select[data-custom-select]").forEach((select) => {
      mhzModules.select?.selectBuild(select);
    });

    form.querySelector("[data-catalog-brand-search]")?.dispatchEvent(new Event("input", { bubbles: true }));
    requestAnimationFrame(updateChangedState);
  });

  const aside = document.querySelector(".catalog-products__aside");
  const toolbar = document.querySelector(".catalog-toolbar");

  if (aside && toolbar) {
    const desktopMedia = window.matchMedia("(min-width: 768px)");
    let position = "absolute";
    let direction = "down";
    let previousScrollY = window.scrollY;
    let updateFrame = 0;

    const setAbsolutePosition = (documentTop, asideTop, maxOffset) => {
      const offset = Math.min(Math.max(documentTop - asideTop, 0), maxOffset);

      position = "absolute";
      form.classList.remove("_sticky-top", "_sticky-bottom");
      form.style.setProperty("--catalog-filters-offset", `${offset}px`);
      form.style.removeProperty("--catalog-filters-fixed-top");
      form.style.removeProperty("--catalog-filters-fixed-left");
      form.style.removeProperty("--catalog-filters-fixed-width");
    };

    const setFixedPosition = (nextPosition, top, left, width) => {
      position = nextPosition;
      form.classList.toggle("_sticky-top", nextPosition === "top");
      form.classList.toggle("_sticky-bottom", nextPosition === "bottom");
      form.style.setProperty("--catalog-filters-fixed-top", `${top}px`);
      form.style.setProperty("--catalog-filters-fixed-left", `${left}px`);
      form.style.setProperty("--catalog-filters-fixed-width", `${width}px`);
    };

    const updateStickyPosition = () => {
      updateFrame = 0;

      if (!desktopMedia.matches || form.parentElement !== aside) {
        position = "absolute";
        previousScrollY = window.scrollY;
        form.classList.remove("_sticky-top", "_sticky-bottom");
        form.style.removeProperty("--catalog-filters-offset");
        form.style.removeProperty("--catalog-filters-fixed-top");
        form.style.removeProperty("--catalog-filters-fixed-left");
        form.style.removeProperty("--catalog-filters-fixed-width");
        return;
      }

      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - previousScrollY;

      if (Math.abs(scrollDelta) > 1) {
        direction = scrollDelta > 0 ? "down" : "up";
      }

      previousScrollY = currentScrollY;

      const asideRect = aside.getBoundingClientRect();
      const formRect = form.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();
      const asideTop = asideRect.top + currentScrollY;
      const asideBottom = asideRect.bottom + currentScrollY;
      const formHeight = form.offsetHeight;
      const gap = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.75;
      const topLimit = toolbarRect.bottom + gap;
      const bottomLimit = window.innerHeight - gap;
      const availableHeight = bottomLimit - topLimit;
      const maxOffset = Math.max(aside.offsetHeight - formHeight, 0);

      form.style.setProperty("--catalog-filters-fixed-left", `${asideRect.left}px`);
      form.style.setProperty("--catalog-filters-fixed-width", `${asideRect.width}px`);

      if (formHeight <= availableHeight) {
        if (asideRect.top >= topLimit) {
          setAbsolutePosition(asideTop, asideTop, maxOffset);
        } else if (asideRect.bottom <= topLimit + formHeight) {
          setAbsolutePosition(asideBottom - formHeight, asideTop, maxOffset);
        } else {
          setFixedPosition("top", topLimit, asideRect.left, asideRect.width);
        }
        return;
      }

      if (position === "top" && direction === "down") {
        setAbsolutePosition(formRect.top + currentScrollY, asideTop, maxOffset);
      } else if (position === "bottom" && direction === "up") {
        setAbsolutePosition(formRect.top + currentScrollY, asideTop, maxOffset);
      }

      const updatedFormRect = form.getBoundingClientRect();

      if (position === "absolute") {
        if (asideRect.bottom <= bottomLimit && updatedFormRect.top < topLimit) {
          setAbsolutePosition(asideBottom - formHeight, asideTop, maxOffset);
        } else if (direction === "down" && updatedFormRect.bottom <= bottomLimit && asideRect.bottom > bottomLimit) {
          setFixedPosition("bottom", bottomLimit - formHeight, asideRect.left, asideRect.width);
        } else if (direction === "up" && updatedFormRect.top >= topLimit && asideRect.top < topLimit) {
          setFixedPosition("top", topLimit, asideRect.left, asideRect.width);
        }
      } else if (position === "bottom") {
        if (asideRect.bottom <= bottomLimit) {
          setAbsolutePosition(asideBottom - formHeight, asideTop, maxOffset);
        } else {
          setFixedPosition("bottom", bottomLimit - formHeight, asideRect.left, asideRect.width);
        }
      } else if (position === "top") {
        if (asideRect.top >= topLimit) {
          setAbsolutePosition(asideTop, asideTop, maxOffset);
        } else if (asideRect.bottom <= topLimit + formHeight) {
          setAbsolutePosition(asideBottom - formHeight, asideTop, maxOffset);
        } else {
          setFixedPosition("top", topLimit, asideRect.left, asideRect.width);
        }
      }
    };

    const requestStickyUpdate = () => {
      if (!updateFrame) {
        updateFrame = requestAnimationFrame(updateStickyPosition);
      }
    };

    window.addEventListener("scroll", requestStickyUpdate, { passive: true });
    window.addEventListener("resize", requestStickyUpdate);
    desktopMedia.addEventListener("change", requestStickyUpdate);
    new ResizeObserver(requestStickyUpdate).observe(form);
    requestStickyUpdate();
  }
});
