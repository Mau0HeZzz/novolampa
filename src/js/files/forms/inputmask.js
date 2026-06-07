/* Маски для полей (в работе)*/
// Подключение функционала "Чертоги Фрилансера"
// Подключение списка активных модулей
import { mhzModules } from "../modules.js";

// Подключение модуля
import "inputmask/dist/inputmask.min.js";

const inputMasks = document.querySelectorAll('input');
if (inputMasks.length) {
	mhzModules.inputmask = Inputmask().mask(inputMasks);
}