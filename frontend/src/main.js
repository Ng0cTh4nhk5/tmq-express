import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

import 'primeicons/primeicons.css';
import './assets/styles/base.css';

import App from './App.vue';
import router from './router';
import { initDevToolsGuard } from './utils/devtools-guard';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark-mode',
      cssLayer: false,
    },
  },
  locale: {
    // Tháng đầy đủ
    monthNames: ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'],
    // Tháng viết tắt (hiển thị trên header calendar)
    monthNamesShort: ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'],
    // Ngày trong tuần
    dayNames: ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'],
    dayNamesShort: ['CN','T2','T3','T4','T5','T6','T7'],
    dayNamesMin: ['CN','T2','T3','T4','T5','T6','T7'],
    // Buttons
    today: 'Hôm nay',
    clear: 'Xóa',
    // Tuần bắt đầu từ Thứ Hai
    firstDayOfWeek: 1,
    // Định dạng ngày
    dateFormat: 'dd/mm/yy',
  },
});
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);

// ── DevTools Guard (chỉ chạy ở production) ──
// Levels: 'light' | 'medium' | 'strict'
initDevToolsGuard({ level: 'medium', allowDev: true });

app.mount('#app');
