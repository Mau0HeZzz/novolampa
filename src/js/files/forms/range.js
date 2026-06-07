// Подключение с node_modules
import * as noUiSlider from 'nouislider';
import { debounce, getDigFromString } from '../functions';

// Подключение стилей с scss/base/forms/range.scss
// в файле scss/forms/forms.scss

// Подключение стилей с node_modules
import 'nouislider/dist/nouislider.css';


const setRangeEvent = debounce((input) => {
  input.dispatchEvent(new Event('change', {bubbles:true}))
}, 500)

export function rangeInit() {
	const rangeSliders = document.querySelectorAll('[data-range]');
	if (rangeSliders.length) {
    rangeSliders.forEach(rangeSliderEl=>{
      rangeSliderCreate(rangeSliderEl)
    })
	}
}
rangeInit();

function rangeSliderCreate(rangeSliderEl) {
  let updateCounter = 0;
  const parent = rangeSliderEl.closest('[data-range-parent]');
  const minInput = parent?.querySelector('[data-min-input]');
  const maxInput = parent?.querySelector('[data-max-input]');
  
  const min = getDigFromString(rangeSliderEl.getAttribute('data-min'));
  const max = getDigFromString(rangeSliderEl.getAttribute('data-max'));

  let values = rangeSliderEl.getAttribute('data-values');

  let minValue = min;
  let maxValue = max;
  values =  values.split(',');
  if (values[0]) {
    minValue = getDigFromString(values[0]);
  } else if (minInput?.value) {
    minValue = getDigFromString(minInput.value);
  }

  if (values[1]) {
    maxValue = getDigFromString(values[1]);
  } else if (maxInput?.value) {
    maxValue = getDigFromString(maxInput.value);
  }

  
  const rangeSlider = noUiSlider.create(rangeSliderEl, {
    start: [minValue,maxValue],
    connect: true,
    step: 1,
    range: {
      'min': min,
      'max': max
    },
  });
  
  rangeSlider.on('update', (a, b, c, d)=>{
    if (updateCounter >= 2) {
      if (b == 0) {
        if (minInput) {
          minInput.value = Math.round(c[0])
          setRangeEvent(minInput);
        }
      }
      if (b == 1) {
        if (maxInput) {
          maxInput.value = Math.round(c[1])
          setRangeEvent(maxInput);
        }
      }
    }

    updateCounter++;
  })

  minInput?.addEventListener('input', debounce((e)=>{
    setRangePoints(rangeSlider, minInput, 'min', min, max);
  }, 700))
  maxInput?.addEventListener('input', debounce((e)=>{
    setRangePoints(rangeSlider, maxInput, 'max', min, max);
  }, 700))

  rangeSliderEl.rangeSlider = rangeSlider;
}

function setRangePoints(rangeSlider, input, side, min, max) {
  let val = parseInt(input.value);
  let current = rangeSlider.get().map(el=>parseInt(el));

  if (val < min) val = min;
  if (side === 'min') {
    if (val > current[1]) val = current[1]
  }

  if (val > max) val = max;
  if (side === 'max') {
    if (val < current[0]) val = current[0]
  }

  let newArr = structuredClone(current);
  let idx = side === 'min' ? 0 : 1;

  newArr[idx] = val;

  rangeSlider.set(newArr)
}
