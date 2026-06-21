/**
 * @fileOverview Инициализация калькулятора светодиодной ленты.
 */

import Toastify from "toastify-js";
import tippy from "tippy.js";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { _slideDown, _slideToggle, _slideUp } from "./functions.js";
import { formValidate } from "./forms/forms.js";
import { gotoBlock } from "./scroll/gotoblock.js";
import "toastify-js/src/toastify.css";

class TapeCalculatorProvider {
  constructor(settings = {}, log = () => {}) {
    this.settings = settings;
    this.log = log;
  }

  createBody(payload) {
    const body = new FormData();
    const rootField = this.settings.request?.rootField || "post";

    this.appendBodyValue(body, rootField, payload);

    return body;
  }

  appendBodyValue(body, name, value) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        this.appendBodyValue(body, `${name}[${index}]`, item);
      });
      return;
    }

    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => {
        this.appendBodyValue(body, `${name}[${key}]`, item);
      });
      return;
    }

    body.append(name, value ?? "");
  }

  getHeaders(csrf = "") {
    const requestSettings = this.settings.request || {};
    const headers = {
      accept: "*/*",
      "bx-ajax": "true"
    };

    if (requestSettings.siteIdHeader && requestSettings.siteId) {
      headers[requestSettings.siteIdHeader] = requestSettings.siteId;
    }

    if (requestSettings.csrfHeader && csrf) {
      headers[requestSettings.csrfHeader] = csrf;
    }

    return headers;
  }
}

class TapeCalculatorDemoProvider extends TapeCalculatorProvider {
  constructor(settings = {}, log = () => {}) {
    super(settings, log);
  }

  async calculate(post) {
    const body = this.createBody(post);
    const request = {
      endpoint: this.settings.endpoints?.calculate,
      method: "POST",
      headers: this.getHeaders("demo-csrf-token"),
      body: Object.fromEntries(body.entries()),
      payload: post
    };

    this.log("Отправил запрос на расчет оборудования", request);
    await this.wait();

    const rooms = Object.entries(post).map(([formId, segment]) => ({
      FORM_ID: formId,
      ROOM: segment.room_name,
      ITEMS: this.getProducts(formId),
      TOTAL: this.settings.demo?.total || {}
    }));

    const response = {
      status: "success",
      data: {
        rooms,
        total: this.settings.demo?.total || {},
        post
      },
      errors: []
    };

    this.log("Получил ответ расчета оборудования", response);
    return response;
  }

  async addToCart(payload) {
    const body = this.createBody(payload);
    const request = {
      endpoint: this.settings.endpoints?.addToCart,
      method: "POST",
      headers: this.getHeaders("demo-csrf-token"),
      body: Object.fromEntries(body.entries()),
      payload
    };

    this.log("Отправил запрос на добавление товаров в корзину", request);
    await this.wait();

    const response = {
      status: "success",
      data: {
        added: true,
        payload
      },
      errors: []
    };

    this.log("Получил ответ добавления товаров в корзину", response);
    return response;
  }

  getProducts(formId) {
    return (this.settings.demo?.products || []).map((product) => ({
      ...product,
      ID: `${formId}-${product.ID}`
    }));
  }

  wait() {
    return new Promise((resolve) => {
      setTimeout(resolve, Number(this.settings.demo?.delay) || 0);
    });
  }
}

class TapeCalculatorProductionProvider extends TapeCalculatorProvider {
  constructor(settings = {}, log = () => {}) {
    super(settings, log);
    this.csrf = this.getInitialCsrf();
  }

  calculate(post) {
    return this.request(this.settings.endpoints?.calculate, post);
  }

  addToCart(payload) {
    return this.request(this.settings.endpoints?.addToCart, payload);
  }

  async request(endpoint, payload, shouldRetryCsrf = true) {
    if (!endpoint) {
      throw new Error("Calculator endpoint is not configured");
    }

    const request = {
      endpoint,
      method: "POST",
      headers: this.getHeaders(this.csrf),
      body: this.createBody(payload),
      payload
    };

    this.log("Отправил запрос", request);

    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: request.headers,
      body: request.body
    });
    const data = await this.parseResponse(response);
    const csrf = this.getResponseCsrf(data);

    if (csrf && shouldRetryCsrf) {
      this.csrf = csrf;
      this.log("Получил новый CSRF token, повторяю запрос", { csrf });
      return this.request(endpoint, payload, false);
    }

    if (!response.ok) {
      this.log("Получил ошибку запроса", data);
      throw new Error(data?.errors?.[0]?.message || "Calculator request failed");
    }

    this.log("Получил ответ", data);
    return data;
  }

  async parseResponse(response) {
    try {
      return await response.json();
    } catch (error) {
      this.log("production response parse error", error);
      return null;
    }
  }

  getResponseCsrf(data) {
    return data?.errors?.find((error) => error.code === "invalid_csrf")?.customData?.csrf || "";
  }

  getInitialCsrf() {
    return this.settings.request?.csrf || window.BX?.bitrix_sessid?.() || "";
  }
}

class TapeCalculator {
  constructor(root, settings = {}) {
    this.root = root;
    this.settings = settings;
    this.isDemo = root.hasAttribute("data-demo");
    this.formsNode = root.querySelector("[data-calculator-forms]");
    this.actionsNode = root.querySelector("[data-calculator-actions]");
    this.resultNode = root.querySelector("[data-calculator-result]");
    this.infoNode = root.querySelector("[data-calculator-info]");
    this.templates = new Map(
      Array.from(root.querySelectorAll("[data-calculator-template]")).map((template) => [
        template.dataset.calculatorTemplate,
        template
      ])
    );
    this.post = {};
    this.formIndex = 1;
    this.provider = null;
    this.tooltipInstances = [];
    this.isLoading = false;
    this.lastResult = null;

    this.init();
  }

  init() {
    if (!this.isReady()) return;

    const savedPost = this.getSavedPost();
    this.post = savedPost || this.createInitialPost();
    this.formIndex = this.getLastFormIndex();
    this.provider = this.createProvider();

    if (!savedPost) {
      this.savePost();
    }

    this.log(
      savedPost
        ? "Нашел сохраненное состояние калькулятора в localStorage"
        : "Сохраненного состояния нет, создал первое помещение",
      this.post
    );

    this.root.calculator = this;
    this.log("Инициализировал калькулятор", {
      isDemo: this.isDemo,
      post: this.post,
      formIndex: this.formIndex,
      provider: this.provider.constructor.name,
      templates: Array.from(this.templates.keys())
    });

    this.bindEvents();
    this.renderForms(this.post);
    this.syncAllSegments("Синхронизировал начальное состояние после рендера");
  }

  isReady() {
    if (!this.settings.initialSegment) {
      this.showToast("Не найдены настройки калькулятора");
      return false;
    }

    if (!this.formsNode || !this.actionsNode || !this.resultNode || !this.infoNode) {
      this.showToast("Не найдены контейнеры калькулятора");
      return false;
    }

    if (!this.templates.has("segment")) {
      this.showToast("Не найден шаблон помещения калькулятора");
      return false;
    }

    return true;
  }

  getSavedPost() {
    if (!this.settings.storageKey) return null;

    try {
      const rawPost = localStorage.getItem(this.settings.storageKey);
      return rawPost ? JSON.parse(rawPost) : null;
    } catch (error) {
      localStorage.removeItem(this.settings.storageKey);
      this.log("storage parse error", error);
      return null;
    }
  }

  createInitialPost() {
    const segment = { ...this.settings.initialSegment };

    return {
      [segment.FORM_ID]: segment
    };
  }

  savePost() {
    if (!this.settings.storageKey) return;

    try {
      localStorage.setItem(this.settings.storageKey, JSON.stringify(this.post));
      this.log("save post", this.post);
    } catch (error) {
      this.log("storage save error", error);
    }
  }

  getLastFormIndex() {
    return Object.keys(this.post).reduce((lastIndex, formId) => {
      const formIndex = Number(formId.replace("FORM_", ""));
      return Number.isFinite(formIndex) && formIndex > lastIndex ? formIndex : lastIndex;
    }, 1);
  }

  createProvider() {
    return this.isDemo
      ? new TapeCalculatorDemoProvider(this.settings, this.log.bind(this))
      : new TapeCalculatorProductionProvider(this.settings, this.log.bind(this));
  }

  bindEvents() {
    this.root.addEventListener("submit", (event) => {
      const segment = event.target.closest("[data-calculator-segment]");

      if (!segment) return;

      event.preventDefault();
    });

    this.root.addEventListener("click", (event) => {
      const roomNameButton = event.target.closest("[data-calculator-room-name]");
      const roomSubmitButton = event.target.closest("[data-calculator-room-submit]");
      const roomCancelButton = event.target.closest("[data-calculator-room-cancel]");
      const addButton = event.target.closest("[data-calculator-add-segment]");
      const deleteButton = event.target.closest("[data-calculator-delete-segment]");
      const tooltipCloseButton = event.target.closest("[data-calculator-tooltip-close]");
      const cartButton = event.target.closest("[data-calculator-add-cart]");
      const pdfButton = event.target.closest("[data-calculator-pdf]");
      const submitButton = event.target.closest("[data-calculator-submit]");
      const clearButton = event.target.closest("[data-calculator-clear]");

      this.resetSegmentHighlight(event.target.closest("[data-calculator-segment]._just-added"));

      if (tooltipCloseButton) {
        event.preventDefault();
        this.hideTooltips();
        return;
      }

      if (roomNameButton) {
        event.preventDefault();
        this.openRoomEdit(roomNameButton.closest("[data-calculator-segment]"));
        return;
      }

      if (roomSubmitButton) {
        event.preventDefault();
        this.saveRoomName(roomSubmitButton.closest("[data-calculator-segment]"));
        return;
      }

      if (roomCancelButton) {
        event.preventDefault();
        this.cancelRoomEdit(roomCancelButton.closest("[data-calculator-segment]"));
        return;
      }

      if (submitButton) {
        event.preventDefault();
        this.handleCalculateAttempt();
        return;
      }

      if (clearButton) {
        event.preventDefault();
        this.handleClearAttempt();
        return;
      }

      if (cartButton) {
        event.preventDefault();
        this.handleAddCartAttempt();
        return;
      }

      if (pdfButton) {
        event.preventDefault();
        this.handlePdfAttempt();
        return;
      }

      if (addButton) {
        event.preventDefault();
        this.handleAddSegmentAttempt(addButton.closest("[data-calculator-segment]"));
        return;
      }

      if (deleteButton) {
        event.preventDefault();
        this.handleDeleteSegmentAttempt(deleteButton.closest("[data-calculator-segment]"));
        return;
      }

      const segmentHead = event.target.closest("[data-calculator-segment-head]");

      if (!segmentHead || this.shouldSkipSegmentToggle(event.target)) return;

      this.toggleSegment(segmentHead.closest("[data-calculator-segment]"));
    });

    this.root.addEventListener("input", (event) => {
      const input = event.target.closest("[data-calculator-input]");

      if (!input || input.type === "radio" || input.type === "checkbox") return;

      this.resetSegmentHighlight(input.closest("[data-calculator-segment]._just-added"));
      this.handleFieldChange(input);
    });

    this.root.addEventListener("change", (event) => {
      const input = event.target.closest("[data-calculator-input]");

      if (!input || (input.tagName !== "SELECT" && input.type !== "radio" && input.type !== "checkbox")) return;

      this.resetSegmentHighlight(input.closest("[data-calculator-segment]._just-added"));
      this.handleFieldChange(input);
    });

    this.root.addEventListener("focusin", (event) => {
      this.resetSegmentHighlight(event.target.closest("[data-calculator-segment]._just-added"));
    });

    this.root.addEventListener("keydown", (event) => {
      const input = event.target.closest("[data-calculator-room-input]");

      if (!input) return;

      if (event.key === "Enter") {
        event.preventDefault();
        this.saveRoomName(input.closest("[data-calculator-segment]"));
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        this.cancelRoomEdit(input.closest("[data-calculator-segment]"));
      }
    });
  }

  handleFieldChange(input) {
    const segment = input.closest("[data-calculator-segment]");

    if (!segment) return;

    this.log("Пользователь изменил поле, обновляю состояние калькулятора", {
      formId: segment.dataset.calculatorFormId,
      name: input.name,
      value: input.type === "radio" ? this.getRadioValue(segment, input.name) : input.value
    });
    this.syncSegment(segment);
  }

  async handleCalculateAttempt() {
    if (this.isLoading) return;

    this.log("Пользователь нажал общую кнопку подбора, проверяю все помещения");

    if (!this.validateAllSegments()) return;

    this.log("Все помещения валидны, отправляю общий расчет", this.post);
    this.setLoading(true);

    try {
      const response = await this.provider.calculate(this.post);

      if (response?.status && response.status !== "success") {
        throw new Error(response.errors?.[0]?.message || this.settings.validation?.messages?.request);
      }

      this.lastResult = response?.data || response;
      this.renderResult(this.lastResult);
      this.renderInfo();
      this.showToast(this.settings.messages?.resultReady || "Подбор оборудования готов");
      this.log("Завершил общий расчет и показал результат пользователю", this.lastResult);
    } catch (error) {
      this.log("Общий расчет завершился ошибкой", error);
      this.showToast(error.message || this.settings.validation?.messages?.request || "Не удалось выполнить расчёт");
    } finally {
      this.setLoading(false);
    }
  }

  handleClearAttempt() {
    this.log("Пользователь нажал общую кнопку очистки, сбрасываю калькулятор");
    this.post = this.createInitialPost();
    this.formIndex = this.getLastFormIndex();
    this.savePost();
    this.resultNode.textContent = "";
    this.infoNode.hidden = true;
    this.infoNode.textContent = "";
    this.lastResult = null;
    this.renderForms(this.post);
    this.syncAllSegments(this.settings.messages?.cleared || "Калькулятор очищен");
    this.showToast(this.settings.messages?.cleared || "Калькулятор очищен");
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    this.root.classList.toggle("_loading", isLoading);
    this.root.querySelectorAll("[data-calculator-submit], [data-calculator-clear], [data-calculator-delete-segment], [data-calculator-add-cart], [data-calculator-pdf]").forEach((button) => {
      button.disabled = isLoading;
    });
  }

  async handleAddCartAttempt() {
    if (this.isLoading) return;

    const rooms = this.getResultRooms(this.lastResult);
    const payload = {};

    rooms.forEach((room) => {
      const formId = room.FORM_ID;
      const items = room.ITEMS || room.items || room.PRODUCTS || [];

      if (!formId) return;

      payload[formId] = {
        ...(this.post[formId] || { FORM_ID: formId, room_name: room.ROOM || room.room_name || "" }),
        CART: items.map((item) => ({
          ID: item.ID || item.PRODUCT_ID || item.XML_ID || "",
          QUANTITY: item.QUANTITY || item.COUNT || 1,
          NAME: item.NAME || item.TITLE || ""
        })).filter((item) => item.ID)
      };
    });

    if (!Object.values(payload).some((room) => room.CART?.length)) {
      this.showToast("Сначала выполните подбор оборудования");
      this.log("Добавление в корзину остановлено: нет товаров в последнем результате", {
        lastResult: this.lastResult
      });
      return;
    }

    this.log("Пользователь нажал добавление всех товаров в корзину, отправляю payload", payload);
    this.setLoading(true);

    try {
      const response = await this.provider.addToCart(payload);

      if (response?.status && response.status !== "success") {
        throw new Error(response.errors?.[0]?.message || "Не удалось добавить товары в корзину");
      }

      this.showToast(this.settings.messages?.addedToCart || "Товары добавлены в корзину");
      this.log("Товары из результата добавлены в корзину", {
        payload,
        response
      });
    } catch (error) {
      this.log("Добавление товаров в корзину завершилось ошибкой", error);
      this.showToast(error.message || "Не удалось добавить товары в корзину");
    } finally {
      this.setLoading(false);
    }
  }

  async handlePdfAttempt() {
    if (this.isLoading) return;

    const rooms = this.getResultRooms(this.lastResult);
    const hasProducts = rooms.some((room) => (room.ITEMS || room.items || room.PRODUCTS || []).length);

    if (!hasProducts) {
      this.showToast("Сначала выполните подбор оборудования");
      this.log("Экспорт PDF остановлен: нет товаров в последнем результате", {
        lastResult: this.lastResult
      });
      return;
    }

    this.log("Пользователь нажал экспорт PDF, начинаю подготовку документа", {
      rooms,
      settings: this.settings.pdf || {}
    });
    this.setLoading(true);

    try {
      const pdfSettings = this.settings.pdf || {};
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });
      const fontSources = [
        { fileName: "Onest-Regular.ttf", fontStyle: "normal", url: pdfSettings.fontRegular || "/fonts/Onest-Regular.ttf" },
        { fileName: "Onest-Medium.ttf", fontStyle: "medium", url: pdfSettings.fontMedium || "/fonts/Onest-Medium.ttf" },
        { fileName: "Onest-Bold.ttf", fontStyle: "bold", url: pdfSettings.fontBold || "/fonts/Onest-Bold.ttf" }
      ];
      const toBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const chunkSize = 0x8000;

        for (let index = 0; index < bytes.length; index += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
        }

        return btoa(binary);
      };

      await Promise.all(fontSources.map(async (font) => {
        const response = await fetch(font.url);

        if (!response.ok) {
          throw new Error(`Не удалось загрузить шрифт PDF: ${font.url}`);
        }

        doc.addFileToVFS(font.fileName, toBase64(await response.arrayBuffer()));
        doc.addFont(font.fileName, "Onest", font.fontStyle);
      }));

      const products = rooms.flatMap((room) => (
        (room.ITEMS || room.items || room.PRODUCTS || []).map((product) => product.PREVIEW_PICTURE || product.IMAGE || "")
      )).filter(Boolean);
      const productImages = new Map();

      await Promise.all([...new Set(products)].map(async (url) => {
        try {
          const response = await fetch(url);

          if (!response.ok) return;

          await new Promise((resolve) => {
            const reader = new FileReader();

            reader.addEventListener("load", () => {
              productImages.set(url, reader.result);
              resolve();
            }, { once: true });
            reader.addEventListener("error", resolve, { once: true });
            response.blob().then((blob) => {
              reader.readAsDataURL(blob);
            }).catch(resolve);
          });
        } catch (error) {
          this.log("Не удалось загрузить изображение товара для PDF", {
            url,
            error
          });
        }
      }));

      doc.setProperties({
        title: "Подбор оборудования NOVOLAMPA",
        subject: "Результат калькулятора светодиодной ленты",
        creator: "NOVOLAMPA"
      });
      doc.setFont("Onest", "bold");
      doc.setFontSize(18);
      doc.setTextColor(45, 201, 100);
      doc.text("NOVOLAMPA", 42, 46);
      doc.setFont("Onest", "normal");
      doc.setFontSize(9);
      doc.setTextColor(57, 72, 84);
      doc.text(doc.splitTextToSize(pdfSettings.partnerRequisite || "", 300), 250, 36);
      doc.setFont("Onest", "bold");
      doc.setFontSize(14);
      doc.setTextColor(32, 39, 46);
      doc.text("Результат подбора оборудования", 42, 88);

      const body = [];

      rooms.forEach((room) => {
        const items = room.ITEMS || room.items || room.PRODUCTS || [];

        body.push([{
          content: room.ROOM || room.room_name || "Помещение",
          colSpan: 6,
          isRoom: true
        }]);

        items.forEach((product) => {
          const imageUrl = product.PREVIEW_PICTURE || product.IMAGE || "";

          body.push([
            { content: "", image: productImages.get(imageUrl) || "" },
            product.NAME || product.TITLE || "",
            `${product.QUANTITY || product.COUNT || ""}`,
            product.MEASURE || "шт.",
            product.PRICE_FORMATTED || this.formatMoney(product.PRICE),
            product.SUM_FORMATTED || this.formatMoney(product.SUM)
          ]);
        });
      });

      const total = this.getResultTotal(this.lastResult, rooms);

      autoTable(doc, {
        startY: 108,
        head: [["Фото", "Наименование", "Кол-во", "Ед.изм.", "Цена", "Сумма"]],
        body,
        foot: [[
          { content: "Итого:", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
          { content: total.SUM_FORMATTED || this.formatMoney(total.SUM), colSpan: 2, styles: { fontStyle: "bold" } }
        ]],
        theme: "grid",
        margin: { top: 42, right: 42, bottom: 42, left: 42 },
        styles: {
          font: "Onest",
          fontStyle: "normal",
          fontSize: 8,
          cellPadding: 6,
          lineColor: [224, 228, 232],
          lineWidth: 0.5,
          textColor: [32, 39, 46],
          overflow: "linebreak",
          valign: "middle"
        },
        headStyles: {
          fillColor: [45, 201, 100],
          textColor: [255, 255, 255],
          fontStyle: "bold"
        },
        footStyles: {
          fillColor: [247, 248, 250],
          textColor: [32, 39, 46],
          fontStyle: "bold"
        },
        columnStyles: {
          0: { cellWidth: 68, halign: "center", minCellHeight: 52 },
          1: { cellWidth: 200 },
          2: { cellWidth: 48, halign: "center" },
          3: { cellWidth: 50, halign: "center" },
          4: { cellWidth: 70, halign: "right" },
          5: { cellWidth: 70, halign: "right" }
        },
        didParseCell: (data) => {
          if (data.cell.raw?.isRoom) {
            data.cell.styles.fillColor = [247, 248, 250];
            data.cell.styles.textColor = [45, 201, 100];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 10;
          }
        },
        didDrawCell: (data) => {
          if (data.section !== "body" || data.column.index !== 0 || !data.cell.raw?.image) return;

          const size = Math.min(43, data.cell.height - 8, data.cell.width - 8);
          const format = String(data.cell.raw.image).match(/^data:image\/([^;]+)/)?.[1]?.toUpperCase() || "PNG";

          doc.addImage(
            data.cell.raw.image,
            format,
            data.cell.x + (data.cell.width - size) / 2,
            data.cell.y + (data.cell.height - size) / 2,
            size,
            size
          );
        }
      });

      doc.save(pdfSettings.fileName || "novolampa-tape-calculator.pdf");
      this.showToast(this.settings.messages?.pdfReady || "PDF сформирован");
      this.log("PDF сформирован и отдан на скачивание", {
        fileName: pdfSettings.fileName,
        rooms,
        total
      });
    } catch (error) {
      this.log("Формирование PDF завершилось ошибкой", error);
      this.showToast(error.message || "Не удалось сформировать PDF");
    } finally {
      this.setLoading(false);
    }
  }

  handleDeleteSegmentAttempt(segment) {
    const segments = Array.from(this.root.querySelectorAll("[data-calculator-segment]"));
    const formId = segment?.dataset.calculatorFormId;

    if (!segment || !formId || segments.length <= 1) return;

    delete this.post[formId];
    segment.remove();
    const remainingSegments = Array.from(this.root.querySelectorAll("[data-calculator-segment]"));

    if (remainingSegments.length === 1) {
      this.expandSegment(remainingSegments[0]);
    }

    this.savePost();
    this.updateDeleteButtons();
    this.resultNode.textContent = "";
    this.infoNode.hidden = true;
    this.infoNode.textContent = "";
    this.lastResult = null;
    this.log("Пользователь удалил помещение, обновил состояние калькулятора", {
      removedFormId: formId,
      post: this.post
    });
  }

  handleAddSegmentAttempt(segment) {
    this.log("Пользователь нажал кнопку добавления помещения, создаю новый сегмент", {
      formId: segment?.dataset.calculatorFormId
    });

    const nextIndex = this.getLastFormIndex() + 1;
    const nextSegmentData = {
      FORM_ID: `FORM_${nextIndex}`,
      init: "Y",
      room_name: `Комната ${nextIndex}`
    };
    const nextSegment = this.renderSegment(nextSegmentData);

    this.formIndex = nextIndex;
    this.post[nextSegmentData.FORM_ID] = nextSegmentData;
    this.formsNode.append(nextSegment);
    this.markSegmentAsJustAdded(nextSegment);
    this.syncSegment(nextSegment);
    this.initTooltips();
    this.updateDeleteButtons();

    if (this.validateSegment(segment, this.settings.validation?.messages?.addSegment, false)) {
      this.collapseSegment(segment);
      this.scheduleSegmentHighlightReset(nextSegment);
    } else {
      this.scrollToAddedSegment(nextSegment);
      this.log("Текущее помещение невалидно, оставляю его открытым и показываю пользователю новое", {
        formId: segment?.dataset.calculatorFormId,
        addedFormId: nextSegment.dataset.calculatorFormId
      });
    }

    this.log("Добавил новое помещение и сохранил состояние калькулятора", {
      added: nextSegmentData,
      post: this.post
    });
    this.showToast(this.settings.messages?.roomAdded || "Помещение добавлено");
  }

  updateDeleteButtons() {
    const segments = Array.from(this.root.querySelectorAll("[data-calculator-segment]"));
    const shouldShowDelete = segments.length > 1;

    segments.forEach((segment) => {
      const deleteButton = segment.querySelector("[data-calculator-delete-segment]");

      if (deleteButton) {
        deleteButton.hidden = !shouldShowDelete;
      }
    });
  }

  markSegmentAsJustAdded(segment) {
    segment?.classList.add("_just-added");
  }

  scheduleSegmentHighlightReset(segment) {
    window.setTimeout(() => {
      this.resetSegmentHighlight(segment);
    }, 2000);
  }

  resetSegmentHighlight(segment) {
    if (!segment?.classList.contains("_just-added")) return;

    segment.classList.remove("_just-added");
    this.log("Снял подсветку нового помещения", {
      formId: segment.dataset.calculatorFormId
    });
  }

  scrollToAddedSegment(segment) {
    const head = segment?.querySelector("[data-calculator-segment-head]");

    if (!head) return;

    const viewportOffset = window.innerHeight - head.offsetHeight - 20;
    const top = head.getBoundingClientRect().top + window.scrollY - Math.max(viewportOffset, 0);

    window.scrollTo({
      top,
      behavior: "smooth"
    });
    this.log("Прокрутил страницу так, чтобы шапка нового помещения появилась из-за нижнего края экрана", {
      formId: segment.dataset.calculatorFormId,
      top
    });
  }

  openRoomEdit(segment) {
    const roomNameButton = segment?.querySelector("[data-calculator-room-name]");
    const roomEdit = segment?.querySelector("[data-calculator-room-edit]");
    const roomInput = segment?.querySelector("[data-calculator-room-input]");
    const currentName = segment?.querySelector("[data-calculator-room-hidden]")?.value || roomNameButton?.textContent || "";

    if (!roomNameButton || !roomEdit || !roomInput) return;

    roomInput.value = currentName;
    this.toggleRoomInputFilled(roomInput);
    roomNameButton.hidden = true;
    roomEdit.hidden = false;

    requestAnimationFrame(() => {
      roomInput.focus();
      roomInput.select();
    });

    this.log("Пользователь открыл редактирование названия помещения", {
      formId: segment.dataset.calculatorFormId,
      roomName: currentName
    });
  }

  saveRoomName(segment) {
    const roomNameButton = segment?.querySelector("[data-calculator-room-name]");
    const roomEdit = segment?.querySelector("[data-calculator-room-edit]");
    const roomInput = segment?.querySelector("[data-calculator-room-input]");
    const roomHidden = segment?.querySelector("[data-calculator-room-hidden]");
    const currentName = roomHidden?.value || roomNameButton?.textContent || segment?.dataset.calculatorFormId || "Помещение";
    const nextName = roomInput?.value.trim() || currentName;

    if (!roomNameButton || !roomEdit || !roomInput || !roomHidden) return;

    roomHidden.value = nextName;
    roomNameButton.textContent = nextName;
    roomInput.value = nextName;
    this.toggleRoomInputFilled(roomInput);
    roomNameButton.hidden = false;
    roomEdit.hidden = true;
    this.syncSegment(segment);

    this.log("Пользователь сохранил новое название помещения", {
      formId: segment.dataset.calculatorFormId,
      previousName: currentName,
      nextName,
      post: this.post
    });
  }

  cancelRoomEdit(segment) {
    const roomNameButton = segment?.querySelector("[data-calculator-room-name]");
    const roomEdit = segment?.querySelector("[data-calculator-room-edit]");
    const roomInput = segment?.querySelector("[data-calculator-room-input]");
    const currentName = segment?.querySelector("[data-calculator-room-hidden]")?.value || roomNameButton?.textContent || "";

    if (!roomNameButton || !roomEdit || !roomInput) return;

    roomInput.value = currentName;
    this.toggleRoomInputFilled(roomInput);
    roomNameButton.hidden = false;
    roomEdit.hidden = true;

    this.log("Пользователь отменил редактирование названия помещения", {
      formId: segment.dataset.calculatorFormId,
      roomName: currentName
    });
  }

  toggleRoomInputFilled(input) {
    const hasValue = Boolean(input?.value);

    input?.classList.toggle("_form-input", hasValue);
    input?.closest(".form__item")?.classList.toggle("_form-input", hasValue);
  }

  shouldSkipSegmentToggle(target) {
    return Boolean(target.closest(`
      [data-calculator-room-name],
      [data-calculator-room-edit],
      [data-calculator-add-segment],
      [data-calculator-tooltip],
      button,
      input,
      textarea,
      select,
      a
    `));
  }

  toggleSegment(segment) {
    const body = segment?.querySelector("[data-calculator-segment-body]");

    if (!body || body.classList.contains("_slide")) return;

    this.log("Пользователь нажал на шапку помещения, переключаю видимость формы", {
      formId: segment.dataset.calculatorFormId,
      action: body.hidden ? "разворачиваю" : "сворачиваю"
    });
    segment.classList.toggle("_active", body.hidden);
    _slideToggle(body, 350);
  }

  collapseSegment(segment) {
    const body = segment?.querySelector("[data-calculator-segment-body]");

    if (!body || body.hidden || body.classList.contains("_slide")) return;

    segment.classList.remove("_active");
    _slideUp(body, 350);
    this.log("Свернул форму помещения", {
      formId: segment.dataset.calculatorFormId
    });
  }

  expandSegment(segment) {
    const body = segment?.querySelector("[data-calculator-segment-body]");

    if (!body || !body.hidden || body.classList.contains("_slide")) return;

    segment.classList.add("_active");
    _slideDown(body, 350);
    this.log("Развернул форму помещения", {
      formId: segment.dataset.calculatorFormId
    });
  }

  syncAllSegments(message = "Синхронизировал все сегменты калькулятора") {
    this.root.querySelectorAll("[data-calculator-segment]").forEach((segment) => {
      this.syncSegment(segment, false);
    });

    this.savePost();
    this.log(message, this.post);
  }

  syncSegment(segment, shouldSave = true) {
    const segmentData = this.collectSegmentData(segment);

    if (!segmentData.FORM_ID) return null;

    this.post[segmentData.FORM_ID] = segmentData;

    if (shouldSave) {
      this.savePost();
      this.log("Собрал данные сегмента и сохранил состояние", segmentData);
    }

    return segmentData;
  }

  collectSegmentData(segment) {
    const data = {};

    new FormData(segment).forEach((value, key) => {
      if (key === "CART" && value === "") return;

      data[key] = value;
    });

    data.FORM_ID = data.FORM_ID || segment.dataset.calculatorFormId || "";
    data.room_name = data.room_name || segment.querySelector("[data-calculator-room-hidden]")?.value || "";

    return data;
  }

  getRadioValue(segment, name) {
    return Array.from(segment.querySelectorAll("[data-calculator-input]")).find((input) => (
      input.name === name && input.checked
    ))?.value || "";
  }

  validateSegment(segment, message = this.settings.validation?.messages?.dimensions, shouldShowToast = true) {
    if (!segment) return false;

    const segmentData = this.syncSegment(segment);
    const isValid = this.isDimensionsValid(segmentData);

    this.toggleDimensionsErrors(segment, !isValid, message);

    if (!isValid) {
      if (shouldShowToast) {
        this.showToast(message);
      }
      this.log("Помещение не прошло валидацию", {
        formId: segmentData.FORM_ID,
        message,
        data: segmentData
      });
      return false;
    }

    this.log("Помещение прошло валидацию", {
      formId: segmentData.FORM_ID,
      data: segmentData
    });
    return true;
  }

  validateAllSegments() {
    const segments = Array.from(this.root.querySelectorAll("[data-calculator-segment]"));
    let isValid = true;
    let firstInvalidSegment = null;

    segments.forEach((segment) => {
      if (!this.validateSegment(segment)) {
        isValid = false;
        firstInvalidSegment ||= segment;
      }
    });

    if (!isValid) {
      this.scrollToSegment(firstInvalidSegment);
      this.log("Общий расчет остановлен: есть невалидные помещения", this.post);
      return false;
    }

    this.syncAllSegments("Все помещения прошли валидацию, синхронизировал общий post");
    return true;
  }

  isDimensionsValid(segmentData = {}) {
    const dimensions = this.settings.validation?.dimensions || {};
    const fields = dimensions.fields || [];
    const alternativeField = dimensions.alternativeField;
    const hasDimensions = fields.every((field) => String(segmentData[field] || "").trim());
    const hasAlternative = alternativeField && String(segmentData[alternativeField] || "").trim();

    return hasDimensions || hasAlternative;
  }

  scrollToSegment(segment) {
    if (!segment?.id) return;

    this.expandSegment(segment);
    gotoBlock(`#${segment.id}`, true, 500, 20);
    this.log("Прокрутил страницу к первому помещению с ошибкой", {
      formId: segment.dataset.calculatorFormId
    });
  }

  toggleDimensionsErrors(segment, hasError, message) {
    const dimensions = this.settings.validation?.dimensions || {};
    const names = [...(dimensions.fields || []), dimensions.alternativeField].filter(Boolean);

    names.forEach((name, index) => {
      const input = Array.from(segment.querySelectorAll("[data-calculator-input]")).find((item) => item.name === name);

      if (!input) return;

      if (hasError) {
        formValidate.addError(input);
        return;
      }

      formValidate.removeError(input);
    });
  }

  renderResult(data = {}) {
    const resultNode = this.cloneTemplate("result");
    const roomsNode = resultNode.querySelector("[data-calculator-result-rooms]");
    const totalNode = resultNode.querySelector("[data-calculator-total-sum]");
    const rooms = this.getResultRooms(data);
    const total = this.getResultTotal(data, rooms);

    rooms.forEach((room) => {
      roomsNode.append(this.renderResultRoom(room));
    });

    totalNode.textContent = total.SUM_FORMATTED || this.formatMoney(total.SUM);
    this.resultNode.textContent = "";
    this.resultNode.append(resultNode);

    this.log("Отрисовал результат подбора", {
      rooms,
      total
    });
  }

  renderResultRoom(room = {}) {
    const roomNode = this.cloneTemplate("result-room");
    const itemsNode = roomNode.querySelector("[data-calculator-result-items]");
    const items = room.ITEMS || room.items || room.PRODUCTS || [];

    roomNode.querySelector("[data-calculator-result-room-title]").textContent = room.ROOM || room.room_name || "Помещение";
    items.forEach((item) => {
      itemsNode.append(this.renderResultItem(item));
    });

    return roomNode;
  }

  renderResultItem(product = {}) {
    const itemNode = this.cloneTemplate("result-item");
    const link = itemNode.querySelector("[data-calculator-product-link]");
    const image = itemNode.querySelector("[data-calculator-product-image]");
    const title = itemNode.querySelector("[data-calculator-product-title]");
    const detailUrl = product.DETAIL_PAGE_URL || product.URL || "#";
    const titleText = product.NAME || product.TITLE || "";

    link.href = detailUrl;
    title.href = detailUrl;
    title.textContent = titleText;
    image.src = product.PREVIEW_PICTURE || product.IMAGE || "";
    image.alt = titleText;
    itemNode.querySelector("[data-calculator-product-article]").textContent = product.ARTICLE || product.ARTNUMBER || "";
    itemNode.querySelector("[data-calculator-product-stock]").textContent = product.STOCK || "";
    itemNode.querySelector("[data-calculator-product-stock]").style.setProperty(
      "--circle-bg",
      String(product.STOCK || "").startsWith("В наличии") ? "var(--bg-green-color)" : "#c7cbd0"
    );
    itemNode.querySelector("[data-calculator-product-weight]").textContent = product.WEIGHT || "";
    itemNode.querySelector("[data-calculator-product-price]").textContent = product.PRICE_FORMATTED || this.formatMoney(product.PRICE);
    itemNode.querySelector("[data-calculator-product-price]").dataset.note = `за 1 ${product.MEASURE || "шт."}`;
    itemNode.querySelector("[data-calculator-product-quantity]").textContent = `${product.QUANTITY || product.COUNT || ""} ${product.MEASURE || "шт."}`.trim();
    itemNode.querySelector("[data-calculator-product-sum]").textContent = product.SUM_FORMATTED || this.formatMoney(product.SUM);
    itemNode.querySelector("[data-calculator-product-sum]").dataset.note = `за ${product.QUANTITY || product.COUNT || 1} ${product.MEASURE || "шт."}`;

    return itemNode;
  }

  getResultRooms(data = {}) {
    data ||= {};

    if (Array.isArray(data.rooms)) return data.rooms;
    if (Array.isArray(data.ROOMS)) return data.ROOMS;

    return Object.entries(data)
      .filter(([key, value]) => key.startsWith("FORM_") && value && typeof value === "object")
      .map(([formId, value]) => ({
        FORM_ID: value.FORM_ID || formId,
        ROOM: value.ROOM || value.room_name || this.post[formId]?.room_name,
        ITEMS: value.ITEMS || value.items || value.PRODUCTS || [],
        TOTAL: value.TOTAL || value.total || {}
      }));
  }

  getResultTotal(data = {}, rooms = this.getResultRooms(data)) {
    return data.total || data.TOTAL || {
      SUM: rooms.reduce((roomsSum, room) => (
        roomsSum + (room.ITEMS || room.items || room.PRODUCTS || []).reduce((itemsSum, item) => (
          itemsSum + Number(item.SUM || item.PRICE * (item.QUANTITY || item.COUNT || 1) || 0)
        ), 0)
      ), 0)
    };
  }

  renderInfo() {
    const template = this.templates.get("info");

    if (!template) {
      throw new Error('Calculator template "info" is not found');
    }

    this.infoNode.textContent = "";
    this.infoNode.append(template.content.cloneNode(true));
    this.infoNode.hidden = false;
  }

  formatMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return "";

    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 2
    }).format(number);
  }

  renderForms(data = {}) {
    this.formsNode.textContent = "";

    Object.values(data).forEach((segmentData) => {
      this.formsNode.append(this.renderSegment(segmentData));
    });

    this.log("Отрисовал формы калькулятора", data);
    this.initTooltips();
    this.updateDeleteButtons();
  }

  renderSegment(segmentData = {}) {
    const segment = this.cloneTemplate("segment");
    const sectionsNode = segment.querySelector("[data-calculator-sections]");
    const roomName = segmentData.room_name ?? `Комната ${this.formIndex}`;

    segment.classList.add("_active");
    segment.dataset.calculatorFormId = segmentData.FORM_ID;
    segment.id = segmentData.FORM_ID;
    segment.querySelector('[data-calculator-field="sessid"]').value = segmentData.sessid ?? "";
    segment.querySelector('[data-calculator-field="FORM_ID"]').value = segmentData.FORM_ID ?? "";
    segment.querySelector("[data-calculator-init]").value = segmentData.init ?? "";
    segment.querySelector("[data-calculator-room-hidden]").value = roomName;
    segment.querySelector("[data-calculator-room-name]").textContent = roomName;
    segment.querySelector("[data-calculator-room-input]").value = roomName;
    this.toggleRoomInputFilled(segment.querySelector("[data-calculator-room-input]"));

    this.getOrderedSections().forEach((section, index) => {
      sectionsNode.append(this.renderSection(section, index, segmentData));
    });

    return segment;
  }

  renderSection(section, index, segmentData) {
    return section.code === "SIZES"
      ? this.renderSizesSection(section, index, segmentData)
      : this.renderOptionsSection(section, index, segmentData);
  }

  renderSizesSection(section, index, segmentData) {
    const sectionNode = this.cloneTemplate("section-sizes");
    const sizeFieldsNode = sectionNode.querySelector("[data-calculator-size-fields]");
    const totalFieldNode = sectionNode.querySelector("[data-calculator-total-field]");
    const fields = Object.values(section.ITEMS || {}).filter((field) => field.ACTIVE !== false);

    this.fillSectionHead(sectionNode, section, index);

    fields.forEach((field) => {
      const fieldNode = this.renderField(field, segmentData[field.NAME]);

      if (field.NAME === this.settings.validation?.dimensions?.alternativeField) {
        totalFieldNode.append(fieldNode);
        return;
      }

      sizeFieldsNode.append(fieldNode);
    });

    return sectionNode;
  }

  renderOptionsSection(section, index, segmentData) {
    const sectionNode = this.cloneTemplate("section-options");
    const optionsNode = sectionNode.querySelector("[data-calculator-options]");
    const selectedValue = segmentData[section.code] ?? section.SELECTED;

    this.fillSectionHead(sectionNode, section, index);

    (section.ITEMS || []).filter((option) => option.ACTIVE !== false).forEach((option) => {
      optionsNode.append(this.renderRadio(option, selectedValue));
    });

    return sectionNode;
  }

  renderField(field, value = "") {
    const fieldNode = this.cloneTemplate("field");
    const input = fieldNode.querySelector("[data-calculator-input]");

    input.name = field.NAME;
    input.value = value ?? field.VALUE ?? "";
    input.type = field.TYPE || "text";
    fieldNode.querySelector("[data-calculator-field-label]").textContent = field.LABEL || "";

    if (input.value) {
      input.classList.add("_form-input");
      fieldNode.classList.add("_form-input");
    }

    return fieldNode;
  }

  renderRadio(option, selectedValue) {
    const optionNode = this.cloneTemplate("radio");
    const input = optionNode.querySelector("[data-calculator-input]");

    input.name = option.NAME;
    input.value = option.VALUE;
    input.type = option.TYPE || "radio";
    input.checked = option.VALUE === selectedValue;
    optionNode.querySelector("[data-calculator-radio-label]").textContent = option.LABEL || "";

    return optionNode;
  }

  fillSectionHead(sectionNode, section, index) {
    sectionNode.dataset.calculatorSectionCode = section.code;
    sectionNode.querySelector("[data-calculator-section-index]").textContent = `${index + 1}.`;
    sectionNode.querySelector("[data-calculator-section-title]").textContent = section.TITLE || "";

    const tooltip = sectionNode.querySelector("[data-calculator-tooltip]");

    if (!section.DESCRIPTION) {
      tooltip.hidden = true;
      return;
    }

    tooltip.dataset.tippyContent = this.createTooltipContent(section.DESCRIPTION);
  }

  createTooltipContent(content) {
    return `
      <div class="tape-tooltip">
        <button type="button" class="tape-tooltip__close" aria-label="Закрыть подсказку" data-calculator-tooltip-close>
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <use xlink:href="/img/sprite.svg#close"></use>
          </svg>
        </button>
        <div class="tape-tooltip__content">${content}</div>
      </div>
    `;
  }

  getOrderedSections() {
    const sections = this.settings.sections || {};

    return (sections.order || [])
      .map((code) => ({ ...sections[code], code }))
      .filter((section) => section.TITLE);
  }

  cloneTemplate(name) {
    const template = this.templates.get(name);

    if (!template) {
      throw new Error(`Calculator template "${name}" is not found`);
    }

    return template.content.firstElementChild.cloneNode(true);
  }

  initTooltips() {
    this.tooltipInstances.forEach((instance) => instance.destroy());
    this.tooltipInstances = tippy(this.root.querySelectorAll("[data-tippy-content]"), {
      allowHTML: true,
      appendTo: () => document.body,
      interactive: true,
      maxWidth: 'none',
      onMount: (instance) => {
        const closeButton = instance.popper.querySelector("[data-calculator-tooltip-close]");

        if (closeButton) {
          closeButton.onclick = () => instance.hide();
        }
      },
      placement: "top",
      theme: "tape-calculator",
      trigger: "click"
    });
  }

  hideTooltips() {
    this.tooltipInstances.forEach((instance) => {
      instance.hide();
    });
  }

  showToast(message) {
    Toastify({
      text: message,
      duration: 3500,
      close: true,
      gravity: "bottom",
      position: "left",
      stopOnFocus: true,
      className: "toastify_error"
    }).showToast();
  }

  log(action, data = null) {
    if (!this.isDemo || !this.settings.demo?.logging) return;

    console.groupCollapsed(`[calculator demo] ${action}`);
    if (data !== null) {
      console.log(data);
    }
    console.groupEnd();
  }
}

document.querySelectorAll("[data-calculator]").forEach((root) => {
  new TapeCalculator(root, window.calculatorSettings || {});
});
