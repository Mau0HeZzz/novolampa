/**
 * @fileOverview Интерактив оформления заказа: корзина, города и адресные подсказки DaData.
 */

const dadataAddressEndpoint = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address";

document.querySelectorAll("[data-checkout]").forEach((checkout) => {
  const cart = checkout.querySelector("[data-checkout-cart]");
  const cartToggle = cart?.querySelector("[data-checkout-cart-toggle]");
  const cityInput = checkout.querySelector('[data-address-suggest="city"]');

  cartToggle?.addEventListener("click", () => {
    const isExpanded = cart.classList.toggle("_expanded");
    cartToggle.setAttribute("aria-expanded", String(isExpanded));
  });

  checkout.querySelectorAll('input[name="quickCity"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked || !cityInput) return;

      cityInput.value = radio.value;
      cityInput.classList.add("_form-input");
      cityInput.closest(".form__item")?.classList.add("_form-input");
      cityInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  checkout.querySelectorAll("[data-address-field]").forEach((field) => {
    const input = field.querySelector("[data-address-suggest]");
    const suggestions = field.querySelector("[data-address-suggestions]");
    let requestTimer;
    let requestController;
    let activeIndex = -1;

    const closeSuggestions = () => {
      suggestions.hidden = true;
      suggestions.replaceChildren();
      input.setAttribute("aria-expanded", "false");
      activeIndex = -1;
    };

    const selectSuggestion = (option) => {
      input.value = option.dataset.value;
      input.classList.add("_form-input");
      field.classList.add("_form-input");

      if (input.dataset.addressSuggest === "city") {
        checkout.querySelectorAll('input[name="quickCity"]').forEach((radio) => {
          radio.checked = radio.value === option.dataset.value;
        });
      }

      input.dispatchEvent(new Event("change", { bubbles: true }));
      closeSuggestions();
    };

    suggestions.addEventListener("mousedown", (event) => {
      const option = event.target.closest("[data-address-option]");
      if (!option) return;

      event.preventDefault();
      selectSuggestion(option);
    });

    input.addEventListener("input", () => {
      window.clearTimeout(requestTimer);
      requestController?.abort();

      const query = input.value.trim();
      if (query.length < 2) {
        closeSuggestions();
        return;
      }

      requestTimer = window.setTimeout(async () => {
        const apiKey = window.mhzSettings?.dadataApiKey;
        if (!apiKey) {
          closeSuggestions();
          return;
        }

        requestController = new AbortController();
        const requestBody = { query, count: 7 };

        if (input.dataset.addressSuggest === "city") {
          requestBody.from_bound = { value: "city" };
          requestBody.to_bound = { value: "settlement" };
        } else if (cityInput?.value.trim()) {
          requestBody.locations = [{ city: cityInput.value.trim() }];
          requestBody.restrict_value = false;
        }

        try {
          const response = await fetch(dadataAddressEndpoint, {
            method: "POST",
            mode: "cors",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Token ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: requestController.signal,
          });

          if (!response.ok) throw new Error(`DaData request failed: ${response.status}`);

          const data = await response.json();
          suggestions.replaceChildren();

          data.suggestions.forEach((suggestion) => {
            const option = document.createElement("button");
            const isCity = input.dataset.addressSuggest === "city";
            const cityValue = suggestion.data.city || suggestion.data.settlement || suggestion.value;
            const addressValue = [
              suggestion.data.street_with_type,
              [suggestion.data.house_type, suggestion.data.house].filter(Boolean).join(" "),
              [suggestion.data.block_type, suggestion.data.block].filter(Boolean).join(" "),
              [suggestion.data.flat_type, suggestion.data.flat].filter(Boolean).join(" "),
            ].filter(Boolean).join(", ") || query;

            option.type = "button";
            option.role = "option";
            option.dataset.addressOption = "";
            option.dataset.value = isCity ? cityValue : addressValue;
            option.textContent = isCity
              ? suggestion.data.city_with_type || suggestion.data.settlement_with_type || suggestion.value
              : addressValue;
            suggestions.append(option);
          });

          suggestions.hidden = data.suggestions.length === 0;
          input.setAttribute("aria-expanded", String(data.suggestions.length > 0));
          activeIndex = -1;
        } catch (error) {
          if (error.name !== "AbortError") closeSuggestions();
        }
      }, 300);
    });

    input.addEventListener("keydown", (event) => {
      const options = [...suggestions.querySelectorAll("[data-address-option]")];
      if (suggestions.hidden || !options.length) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex += event.key === "ArrowDown" ? 1 : -1;
        activeIndex = (activeIndex + options.length) % options.length;
        options.forEach((option, index) => option.classList.toggle("_active", index === activeIndex));
        options[activeIndex].scrollIntoView({ block: "nearest" });
      }

      if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        selectSuggestion(options[activeIndex]);
      }

      if (event.key === "Escape") closeSuggestions();
    });

    input.addEventListener("blur", () => window.setTimeout(closeSuggestions, 150));
  });
});
