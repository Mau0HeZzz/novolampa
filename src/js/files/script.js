/**
 * @fileOverview Общие небольшие DOM-утилиты проекта.
 */

// Подключение функционала "Чертоги Фрилансера"
import { debounce, isMobile, setMinHeightBySelector } from "./functions.js";
// Подключение списка активных модулей
import { mhzModules } from "./modules.js";

document.addEventListener('DOMContentLoaded', () => {
  applyResponsiveDnStyles();
  
  if (window.matchMedia('(width >= 767px)').matches) {
    setMinHeightBySelector("[data-home-audience-title]");
  }

  document.querySelectorAll("[data-show-hidden]").forEach((block) => {
    const button = block.querySelector("[data-show-hidden-button]");
    if (!button) return;

    button.hidden = !block.querySelector("[data-show-hidden-item][hidden]");
  });
})

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-show-hidden-button]");
  if (!button) return;

  const block = button.closest("[data-show-hidden]");
  if (!block) return;

  event.preventDefault();
  block.querySelectorAll("[data-show-hidden-item][hidden]").forEach((item) => {
    item.hidden = false;
  });
  button.hidden = true;
});



function applyResponsiveDnStyles() {
  const resolveCssLengthToPx = (lengthValue, fallbackValue = 4) => {
    const normalizedValue = String(lengthValue || "").trim();
    if (!normalizedValue) return fallbackValue;

    if (/^-?\d*\.?\d+px$/i.test(normalizedValue)) {
      const parsedValue = parseFloat(normalizedValue);
      return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
    }

    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.width = normalizedValue;

    (document.body || document.documentElement).appendChild(probe);
    const resolvedValue = parseFloat(window.getComputedStyle(probe).width);
    probe.remove();

    return Number.isFinite(resolvedValue) ? resolvedValue : fallbackValue;
  };

  const formatCssNumber = (value) => {
    const normalizedValue = Math.abs(value) < 0.000001 ? 0 : Number(value.toFixed(6));
    return `${normalizedValue}`;
  };

  const escapeClassName = (className) => {
    if (window.CSS?.escape) return window.CSS.escape(className);
    return String(className).replace(/([^\w-])/g, "\\$1");
  };

  const getClassSelector = (className) => `.${escapeClassName(className)}`;
  const toPx = (value) => `${formatCssNumber(value)}px`;
  const baseIndentPx = resolveCssLengthToPx(
    window.getComputedStyle(document.documentElement).getPropertyValue("--base-indent"),
    4
  );
  const adaptiveSpacingProperties = {
    pt       : "padding-top",
    pb       : "padding-bottom",
    pl       : "padding-left",
    pr       : "padding-right",
    mt       : "margin-top",
    mb       : "margin-bottom",
    mbl      : "margin-bottom",
    w        : "width",
    "min-h"  : "min-height",
    "h"      : "height",
    gap      : "gap",
  };

  // Mirrors the SCSS adaptiveValue(...) formula for adaptive spacing utility classes.
  const renderAdaptiveSpacingRule = (match, cls) => {
    const [, prefix, startValue, minValue, widthFromValue, widthToValue] = match;
    const property = adaptiveSpacingProperties[prefix];
    if (!property) return "";

    const widthFrom = Number(widthFromValue || 1480);
    const widthTo = Number(widthToValue || 360);
    const startPx = Number(startValue) * baseIndentPx;
    const minPx = Number(minValue) * baseIndentPx;
    const selector =
      prefix === "mbl"
        ? `${getClassSelector(cls)}:not(:last-child)`
        : getClassSelector(cls);

    if (!Number.isFinite(widthFrom) || !Number.isFinite(widthTo) || widthFrom === widthTo) {
      return `${selector} { ${property}: ${toPx(startPx)}; }`;
    }

    const slope = (startPx - minPx) / (widthFrom - widthTo);
    const yIntersectionPx = minPx - (widthTo * slope);
    const clampMinPx = Math.min(startPx, minPx);
    const clampMaxPx = Math.max(startPx, minPx);
    const flyValue = `${toPx(yIntersectionPx)} ${slope >= 0 ? "+" : "-"} ${formatCssNumber(Math.abs(slope * 100))}vw`;

    return [
      `@media (min-width: ${widthFrom}px) { ${selector} { ${property}: ${toPx(startPx)}; } }`,
      `@media (min-width: ${widthTo}px) and (max-width: ${widthFrom}px) { ${selector} { ${property}: clamp(${toPx(clampMinPx)}, ${flyValue}, ${toPx(clampMaxPx)}); } }`,
      `@media (max-width: ${widthTo}px) { ${selector} { ${property}: ${toPx(minPx)}; } }`,
    ].join("\n");
  };

  const generators = [
    {
      selector: '[class*="_md"], [class*="_mmd"]',
      classRe: /^_(m?md)-(\d+)-dn$/,
      render: (match, cls) => {
        const [, prefix, size] = match;
        const query =
          prefix === "mmd"
            ? `@media (width >= ${size}px)`
            : `@media (width < ${size}px)`;
        return `${query} { ${getClassSelector(cls)} { display: none !important; } }`;
      },
    },
    {
      selector: '[class*="_cmd"], [class*="_cmmd"]',
      classRe: /^_c(m?md)-(\d+)-dn$/,
      render: (match, cls) => {
        const [, prefix, size] = match;
        const query =
          prefix === "mmd"
            ? `@container (width > ${size}px)`
            : `@container (width <= ${size}px)`;
        return `${query} { ${getClassSelector(cls)} { display: none !important; } }`;
      },
    },
    {
      selector: '[class*="gap-"]',
      classRe: /^gap-(\d+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { gap: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="c-gap-"]',
      classRe: /^c-gap-(\d+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { column-gap: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="r-gap-"]',
      classRe: /^r-gap-(\d+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { row-gap: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="max-w-"]',
      classRe: /^max-w-(\d+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { max-width: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="min-w-"]',
      classRe: /^min-w-(\d+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { min-width: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="w-"]',
      classRe: /^w-(\d+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { width: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="h-"]',
      classRe: /^h-(\d+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { height: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="max-h-"]',
      classRe: /^max-h-(\d+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { max-height: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="min-h-"]',
      classRe: /^min-h-(\d+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { min-height: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="brad-"]',
      classRe: /^brad-(\d*\.?\d+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { border-radius: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="bg-clr-"]',
      classRe: /^bg-clr-([\w-]+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { background-color: var(--${value}); }`;
      },
    },
    {
      selector: '[class*="clr-"]',
      classRe: /^clr-([\w-]+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { color: var(--${value}); }`;
      },
    },
    {
      selector: '[class*="apt-"], [class*="apb-"], [class*="apl-"], [class*="apr-"], [class*="amt-"], [class*="amb-"], [class*="ambl-"], [class*="aw-"], [class*="amin-h-"], [class*="ah-"], [class*="agap-"]',
      classRe: /^a(pt|pb|pl|pr|mt|mb|mbl|w|min-h|h|gap)-(\d*\.?\d+)-(\d*\.?\d+)(?:-(\d*\.?\d+))?(?:-(\d*\.?\d+))?$/,
      render: (match, cls) => renderAdaptiveSpacingRule(match, cls),
    },
    {
      selector: '[class*="pt-"], [class*="pb-"], [class*="pl-"], [class*="pr-"], [class*="mt-"], [class*="mb-"]',
      classRe: /^(pt|pb|pl|pr|mt|mb)-(\d*\.?\d+)$/,
      render: (match, cls) => {
        const [, prefix, value] = match;
        const property = adaptiveSpacingProperties[prefix];
        if (!property) return "";
        return `${getClassSelector(cls)} { ${property}: calc(var(--base-indent) * ${value}); }`;
      },
    },
    {
      selector: '[class*="of-"]',
      classRe: /^of-([\w]+)$/,
      render: (match, cls) => {
        const [, value] = match;
        return `${getClassSelector(cls)} { object-fit: ${value} !important; }`;
      },
    },
    {
      selector: '[class*="op-"]',
      classRe: /^op-([\w]+)(?:-([\w]+))?$/,
      render: (match, cls) => {
        const [, value1, value2] = match;
        const objectPosition = value2 ? `${value1} ${value2}` : value1;
        return `${getClassSelector(cls)} { object-position: ${objectPosition} !important; }`;
      },
    },
  ];

  const css = generators
    .map((generator) => {
      const nodes = document.querySelectorAll(generator.selector);
      if (!nodes.length) return "";

      const classes = new Set();
      nodes.forEach((el) => {
        el.classList.forEach((cls) => {
          const stripped = cls.startsWith('!') ? cls.slice(1) : cls;
          if (generator.classRe.test(stripped)) classes.add(cls);
        });
      });

      if (!classes.size) return "";
      return Array.from(classes)
        .map((cls) => {
          const important = cls.startsWith('!');
          const stripped = important ? cls.slice(1) : cls;
          let rule = generator.render(stripped.match(generator.classRe), cls);
          if (important) {
            rule = rule.replace(/;/g, ' !important;');
          }
          return rule;
        })
        .join("\n");
    })
    .filter(Boolean)
    .join("\n");

  const existing = document.querySelector('style[data-responsive-dn]');
  if (existing) existing.remove();
  if (!css) return;

  const style = document.createElement("style");
  style.setAttribute("data-responsive-dn", "");
  style.textContent = css;
  (document.body || document.documentElement).appendChild(style);
}
