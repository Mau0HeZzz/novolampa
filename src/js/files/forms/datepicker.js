/* Календарь */

// Подключение функционала "Чертоги Фрилансера"
// подключение списка активных модулей
import { mhzModules } from "../modules.js";

// Подключение модуля
import AirDatepicker from 'air-datepicker';
import 'air-datepicker/air-datepicker.css';
import { isMobile } from "../functions.js";

if (document.querySelector('[data-datepicker]')) {
  let options = {
    // inline: true,
    // view: 'months',
    // minView: 'months',
    // dateFormat: 'MMMM yyyy',
    // autoClose: true,
    position: 'bottom right',
    onSelect: async (obj) => {
      obj.datepicker.hide();
    }
  }
  if (isMobile.any()) {
    options.isMobile = true;
  }
  let picker = new AirDatepicker(inputEl, options);
	mhzModules.datepicker = picker;
}
