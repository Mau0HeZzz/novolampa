/**
 * @fileOverview Интерактивное поведение шапки и каталога.
 */

import { bodyLock, bodyUnlock } from "./functions.js";

function fillCatalogSubmenu(catalogPopup, panelsByCategory) {
  const catalogSubmenu = document.querySelector("[data-catalog-submenu]");
  if (!catalogSubmenu) return;

  const categories = catalogPopup.querySelectorAll("[data-catalog-popup-category]");
  const catalogWrapper = document.createElement("div");
  const catalogHead = document.createElement("div");
  const catalogBack = document.createElement("button");
  const catalogTitle = document.createElement("span");
  const categoriesList = document.createElement("ul");

  catalogWrapper.className = "submenu__wrapper";
  catalogHead.className = "submenu__head menu__head";
  catalogBack.className = "menu__back";
  catalogBack.type = "button";
  catalogBack.dataset.menuBack = "";
  catalogBack.innerHTML = '<svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg"><use xlink:href="/img/sprite.svg#arrow-left"></use></svg>';
  catalogTitle.className = "menu__title";
  catalogTitle.textContent = "Каталог";
  categoriesList.className = "submenu__body";
  catalogHead.append(catalogBack, catalogTitle);

  categories.forEach((category) => {
    const panel = panelsByCategory.get(category.dataset.catalogPopupCategory);
    if (!panel) return;

    const categoryItem = document.createElement("li");
    const categoryLink = category.cloneNode(false);
    const categorySubmenu = document.createElement("div");
    const categoryWrapper = document.createElement("div");
    const categoryHead = catalogHead.cloneNode(true);
    const groupsList = document.createElement("ul");

    categoryItem.className = "submenu__item";
    categoryLink.className = "submenu__link";
    categoryLink.removeAttribute("data-catalog-popup-category");
    categoryLink.textContent = category.textContent.trim();
    categorySubmenu.className = "submenu";
    categoryWrapper.className = "submenu__wrapper";
    categoryHead.querySelector(".menu__title").textContent = category.textContent.trim();
    groupsList.className = "submenu__body";

    panel.querySelectorAll(".catalog-popup__group").forEach((group) => {
      const groupTitle = group.querySelector(".catalog-popup__group-title");
      if (!groupTitle) return;

      const groupItem = document.createElement("li");
      const groupLink = document.createElement("a");
      const groupSubmenu = document.createElement("div");
      const groupWrapper = document.createElement("div");
      const groupHead = catalogHead.cloneNode(true);
      const subLinksList = document.createElement("ul");

      groupItem.className = "submenu__item";
      groupLink.className = "submenu__link";
      groupLink.href = "#";
      groupLink.textContent = groupTitle.textContent.trim();
      groupSubmenu.className = "submenu";
      groupWrapper.className = "submenu__wrapper";
      groupHead.querySelector(".menu__title").textContent = groupTitle.textContent.trim();
      subLinksList.className = "submenu__body";

      group.querySelectorAll(".catalog-popup__sub").forEach((subLink) => {
        const subLinkItem = document.createElement("li");
        const copiedSubLink = subLink.cloneNode(false);

        subLinkItem.className = "submenu__item";
        copiedSubLink.className = "submenu__link";
        copiedSubLink.textContent = subLink.textContent.trim();
        subLinkItem.append(copiedSubLink);
        subLinksList.append(subLinkItem);
      });

      groupWrapper.append(groupHead, subLinksList);
      groupSubmenu.append(groupWrapper);
      groupItem.append(groupLink, groupSubmenu);
      groupsList.append(groupItem);
    });

    categoryWrapper.append(categoryHead, groupsList);
    categorySubmenu.append(categoryWrapper);
    categoryItem.append(categoryLink, categorySubmenu);
    categoriesList.append(categoryItem);
  });

  catalogWrapper.append(catalogHead, categoriesList);
  catalogSubmenu.replaceChildren(catalogWrapper);
}

function menuSubmenuActions(event) {
  if (!window.matchMedia("(width <= 1024px)").matches) return;

  const submenuBack = event.target.closest("[data-menu-back]");

  if (submenuBack) {
    const submenu = submenuBack.closest(".submenu");
    if (!submenu) return;

    submenu.classList.remove("_active");

    if (submenu.parentElement?.classList.contains("menu__item")) {
      document.documentElement.classList.remove("submenu-open");
    }

    return;
  }

  const menuLink = event.target.closest(".menu__link, .submenu__link");
  if (!menuLink) return;

  const menuItem = menuLink.classList.contains("menu__link")
    ? menuLink.closest(".menu__item")
    : menuLink.closest(".submenu__item");
  const submenu = Array.from(menuItem?.children ?? []).find((child) =>
    child.classList.contains("submenu")
  );

  if (!submenu) return;

  event.preventDefault();
  submenu.classList.add("_active");
  document.documentElement.classList.add("submenu-open");
}

function initContactsDropdown() {
  const contacts = document.querySelector("[data-contacts]");
  const contactsToggle = contacts?.querySelector("[data-contacts-toggle]");
  const contactsPanel = document.querySelector("[data-contacts-panel]");
  const mobileContactsMedia = window.matchMedia("(width < 1280px)");

  if (!contacts || !contactsToggle || !contactsPanel) return;

  const closeContacts = () => {
    if (!document.documentElement.classList.contains("contacts-open")) return;

    document.documentElement.classList.remove("contacts-open");
    contactsToggle.setAttribute("aria-expanded", "false");
    bodyUnlock(0);
  };

  document.addEventListener("click", (event) => {
    if (!mobileContactsMedia.matches) return;

    if (event.target.closest("[data-contacts-toggle]")) {
      const isOpen = document.documentElement.classList.contains("contacts-open");

      if (isOpen) {
        closeContacts();
      } else {
        document.documentElement.classList.add("contacts-open");
        contactsToggle.setAttribute("aria-expanded", "true");
        bodyLock(0);
      }

      return;
    }

    if (!document.documentElement.classList.contains("contacts-open")) return;
    if (event.target.closest("[data-contacts-close]") || !contactsPanel.contains(event.target)) {
      closeContacts();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeContacts();
  });

  mobileContactsMedia.addEventListener("change", (event) => {
    if (!event.matches) closeContacts();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const announcement = document.querySelector("[data-announcement]");
  const announcementClose = announcement?.querySelector("[data-announcement-close]");

  if (announcement) {
    const updateAnnouncementOffset = () => {
      const announcementHeight = announcement.offsetHeight;
      const announcementOffset = Math.max(announcementHeight - window.scrollY, 0);

      document.body.style.setProperty("--announcement-offset", `${announcementOffset}px`);
    };

    updateAnnouncementOffset();
    window.addEventListener("scroll", updateAnnouncementOffset, { passive: true });
    window.addEventListener("resize", updateAnnouncementOffset);

    announcementClose?.addEventListener("click", () => {
      announcement.hidden = true;
      document.body.style.setProperty("--announcement-height", "0px");
      document.body.style.setProperty("--announcement-offset", "0px");
    });
  }

  initContactsDropdown();

  const catalogPopup = document.querySelector("#catalogPopup");
  if (!catalogPopup) return;

  const categories = catalogPopup.querySelectorAll("[data-catalog-popup-category]");
  const panels = catalogPopup.querySelectorAll("[data-catalog-popup-panel]");
  const panelsContainer = catalogPopup.querySelector(".catalog-popup__panels");
  const panelsByCategory = new Map(
    Array.from(panels, (panel) => [panel.dataset.catalogPopupPanel, panel])
  );

  fillCatalogSubmenu(catalogPopup, panelsByCategory);
  document.addEventListener("click", menuSubmenuActions);

  categories.forEach((category) => {
    category.addEventListener("mouseenter", () => {
      const panel = panelsByCategory.get(category.dataset.catalogPopupCategory);
      if (!panel || category.classList.contains("_active")) return;

      categories.forEach((item) => item.classList.remove("_active"));
      panels.forEach((item) => {
        item.hidden = item !== panel;
      });

      category.classList.add("_active");
      panelsContainer?.scrollTo({ top: 0 });
    });
  });
});
