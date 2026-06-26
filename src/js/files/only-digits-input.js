/**
 * @fileOverview Ограничение текстовых полей значениями из цифр и одной десятичной точки.
 */

export function onlyDigitsInputInit() {
  document.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement) || !event.target.matches("[data-only-digits-input]")) return;

    const input = event.target;
    const initialValue = input.value;
    const initialSelectionStart = input.selectionStart ?? initialValue.length;
    let value = "";
    let selectionStart = initialSelectionStart;
    let hasPoint = false;

    for (let index = 0; index < initialValue.length; index += 1) {
      const character = initialValue[index];
      const isAllowed = (character >= "0" && character <= "9") || (character === "." && !hasPoint);

      if (isAllowed) {
        value += character;
        hasPoint ||= character === ".";
        continue;
      }

      if (index < initialSelectionStart) selectionStart -= 1;
    }

    if (value === initialValue) return;

    input.value = value;
    input.setSelectionRange(selectionStart, selectionStart);
  }, true);
}
