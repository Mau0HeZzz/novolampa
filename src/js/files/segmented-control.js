/**
 * @fileOverview Расчёт положения и ширины индикатора сегментированных переключателей.
 */

export function updateSegmentedControl(control) {
  const indicator = control.querySelector(".segmented-control__indicator");
  const buttons = [...control.querySelectorAll(".segmented-control__button")];
  const activeButton = control.querySelector(".segmented-control__button._active") || buttons[0];

  if (!indicator || !activeButton) return;

  const controlRect = control.getBoundingClientRect();
  const activeButtonRect = activeButton.getBoundingClientRect();
  const indicatorLeft = activeButtonRect.left - controlRect.left;
  const activeIndex = buttons.indexOf(activeButton);

  control.style.setProperty("--segmented-indicator-left", `${indicatorLeft}px`);
  control.style.setProperty("--segmented-indicator-width", `${activeButtonRect.width}px`);
  control.classList.toggle("_first-active", activeIndex === 0);
  control.classList.toggle("_last-active", activeIndex === buttons.length - 1);
}

export function segmentedControlsInit() {
  document.querySelectorAll(".segmented-control").forEach((control) => {
    const update = () => updateSegmentedControl(control);

    update();
    requestAnimationFrame(update);
    new ResizeObserver(update).observe(control);
    control.addEventListener("segmentedControlUpdate", update);
    document.fonts?.ready.then(update);
  });
}
