/**
 * @fileOverview Интерактивные элементы страницы товара.
 */

const productPage = document.querySelector(".product-page");

if (productPage) {
  const fixedCart = productPage.querySelector("[data-product-fixed-cart]");
  const footer = document.querySelector(".footer");
  const quantityInputs = productPage.querySelectorAll("[data-product-quantity]");
  const tabsIndicator = productPage.querySelector("[data-product-tabs-indicator]");
  const productTabsTitles = productPage.querySelectorAll(".product-tabs__title[data-goto]");
  let isMainActionsVisible = true;
  let isFooterVisible = false;
  const updateFixedCartVisibility = () => {
    fixedCart?.classList.toggle("_visible", !isMainActionsVisible && !isFooterVisible);
  };
  const updateTabsIndicator = () => {
    const activeTitle = tabsIndicator?.closest(".product-tabs__navigation")?.querySelector(".product-tabs__title._navigator-active");

    if (!activeTitle) return;

    tabsIndicator.style.width = `${activeTitle.offsetWidth}px`;
    tabsIndicator.style.transform = `translateX(${activeTitle.offsetLeft}px)`;
  };
  const setActiveProductTabsTitle = (activeTitle) => {
    if (!activeTitle) return;

    productTabsTitles.forEach((title) => {
      title.classList.toggle("_navigator-active", title === activeTitle);
    });
    updateTabsIndicator();
  };

  requestAnimationFrame(updateTabsIndicator);

  document.addEventListener("watcherCallback", (event) => {
    const entry = event.detail.entry;

    if (entry.target.matches("[data-product-main-actions]")) {
      isMainActionsVisible = entry.isIntersecting;
      updateFixedCartVisibility();
      return;
    }

    if (!entry.isIntersecting || !entry.target.matches(".product-tabs__body[data-watch='navigator']")) return;

    setTimeout(() => {
      setActiveProductTabsTitle(productPage.querySelector(`.product-tabs__title[data-goto="#${entry.target.id}"]`));
    }, 0);
  });

  productPage.addEventListener("changeQuantity", (event) => {
    quantityInputs.forEach((input) => {
      input.value = event.detail.value;
    });
  });

  productPage.addEventListener("input", (event) => {
    if (!event.target.matches("[data-product-quantity]")) return;

    quantityInputs.forEach((input) => {
      if (input !== event.target) input.value = event.target.value;
    });
  });

  productPage.addEventListener("click", (event) => {
    const tabsTitle = event.target.closest(".product-tabs__title[data-goto]");

    if (tabsTitle) {
      setActiveProductTabsTitle(tabsTitle);
      setTimeout(() => {
        productPage.querySelector(tabsTitle.dataset.goto)?.splide?.refresh();
      }, 320);
      return;
    }
  });

  if (footer) {
    new IntersectionObserver((entries) => {
      isFooterVisible = entries.some((entry) => entry.isIntersecting);
      updateFixedCartVisibility();
    }).observe(footer);
  }
}
