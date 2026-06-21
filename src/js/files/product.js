/**
 * @fileOverview Интерактивные элементы страницы товара.
 */

const productPage = document.querySelector(".product-page");

if (productPage) {
  const fixedCart = productPage.querySelector("[data-product-fixed-cart]");
  const quantityInputs = productPage.querySelectorAll("[data-product-quantity]");
  const tabsIndicator = productPage.querySelector("[data-product-tabs-indicator]");
  const updateTabsIndicator = () => {
    const activeTitle = tabsIndicator?.closest("[data-tabs-titles]")?.querySelector("[data-tabs-title]._tab-active");

    if (!activeTitle) return;

    tabsIndicator.style.width = `${activeTitle.offsetWidth}px`;
    tabsIndicator.style.transform = `translateX(${activeTitle.offsetLeft}px)`;
  };

  requestAnimationFrame(updateTabsIndicator);

  document.addEventListener("watcherCallback", (event) => {
    const entry = event.detail.entry;

    if (!entry.target.matches("[data-product-main-actions]")) return;

    fixedCart?.classList.toggle("_visible", !entry.isIntersecting);
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
    const tabLink = event.target.closest("[data-product-tab-index]");

    if (tabLink) {
      productPage.querySelectorAll(".product-tabs [data-tabs-title]")[Number(tabLink.dataset.productTabIndex)]?.click();
      return;
    }

    if (!event.target.closest("[data-tabs-title]")) return;

    updateTabsIndicator();

    setTimeout(() => {
      productPage.querySelectorAll("[data-tabs-item]:not([hidden]) .splide").forEach((slider) => {
        slider.splide?.refresh();
      });
    }, 320);
  });
}
