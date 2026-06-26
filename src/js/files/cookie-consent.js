/**
 * @fileOverview Управление глобальной панелью согласия на использование файлов cookie.
 */

import Cookies from "js-cookie";

const cookieConsent = document.querySelector("[data-cookie-consent]");

if (cookieConsent && Cookies.get("novolampa_cookie_consent") !== "accepted") {
  cookieConsent.hidden = false;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => cookieConsent.classList.add("_visible"));
  });

  cookieConsent.querySelector("[data-cookie-consent-accept]")?.addEventListener("click", () => {
    Cookies.set("novolampa_cookie_consent", "accepted", {
      expires: 365,
      path: "/",
      sameSite: "Lax",
    });

    cookieConsent.classList.remove("_visible");
    cookieConsent.addEventListener("transitionend", () => cookieConsent.remove(), { once: true });
    window.setTimeout(() => cookieConsent.remove(), 400);
  });
}
