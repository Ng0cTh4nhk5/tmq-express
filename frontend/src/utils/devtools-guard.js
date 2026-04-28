/**
 * DevTools Guard — Chặn/gây khó khăn khi người dùng mở DevTools
 *
 * ⚠️ LƯU Ý QUAN TRỌNG:
 * - Không có cách nào chặn 100% DevTools ở client-side
 * - Mục đích: ngăn người dùng THÔNG THƯỜNG inspect/copy code
 * - Developer có kinh nghiệm vẫn có thể bypass
 * - Dữ liệu nhạy cảm PHẢI được bảo vệ ở BACKEND (RBAC, validation)
 *
 * Cách dùng:
 *   import { initDevToolsGuard } from './utils/devtools-guard';
 *   initDevToolsGuard({ level: 'medium' });
 *
 * Levels:
 *   'light'  — Chỉ disable right-click + phím tắt
 *   'medium' — Light + detect devtools + debugger trap
 *   'strict' — Medium + redirect khi phát hiện + console bomb
 */

// ═══════════════════════════════════════════════════
// 1. DISABLE RIGHT-CLICK CONTEXT MENU
// ═══════════════════════════════════════════════════
function disableContextMenu() {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
}

// ═══════════════════════════════════════════════════
// 2. BLOCK KEYBOARD SHORTCUTS (F12, Ctrl+Shift+I/J/C, Ctrl+U)
// ═══════════════════════════════════════════════════
function blockDevToolsKeys() {
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element picker)
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
      e.preventDefault();
      return false;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key.toUpperCase() === 'U') {
      e.preventDefault();
      return false;
    }

    // Ctrl+S (Save page)
    if (e.ctrlKey && e.key.toUpperCase() === 'S') {
      e.preventDefault();
      return false;
    }
  });
}

// ═══════════════════════════════════════════════════
// 3. DISABLE TEXT SELECTION + DRAG
// ═══════════════════════════════════════════════════
function disableSelection() {
  // CSS-based (more reliable)
  const style = document.createElement('style');
  style.textContent = `
    body {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
    /* Cho phép select trong input/textarea */
    input, textarea, [contenteditable="true"] {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);

  // Chặn drag ảnh/element
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });
}

// ═══════════════════════════════════════════════════
// 4. DETECT DEVTOOLS OPEN (nhiều phương pháp kết hợp)
// ═══════════════════════════════════════════════════

/**
 * Phương pháp 1: Kiểm tra kích thước cửa sổ
 * Khi devtools mở (docked), window.inner sẽ nhỏ hơn window.outer đáng kể
 */
function detectByWindowSize() {
  const threshold = 160; // px
  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;
  return widthDiff > threshold || heightDiff > threshold;
}

/**
 * Phương pháp 2: Dùng đặc tính của console.log với getter
 * Khi devtools mở, console sẽ evaluate getter → phát hiện
 */
function detectByConsoleLog() {
  let detected = false;
  const obj = { toString() { detected = true; return ''; } };

  // Trick: console.log chỉ evaluate khi devtools console đang mở
  console.log('%c', obj);
  // Clear ngay để không để lại dấu vết
  console.clear();

  return detected;
}

/**
 * Phương pháp 3: Performance timing với debugger
 * debugger statement tốn thời gian chỉ khi devtools mở
 */
function detectByDebuggerTiming() {
  const start = performance.now();
  // eslint-disable-next-line no-debugger
  debugger;
  const end = performance.now();
  // Nếu devtools đóng, debugger chạy < 1ms
  // Nếu devtools mở, debugger pause → timing > 100ms
  return (end - start) > 100;
}

/**
 * Phương pháp 4: Dùng Error stack trace format
 * Chrome devtools thay đổi stack trace format khi mở
 */
function detectByRegex() {
  const el = new Image();
  let detected = false;

  Object.defineProperty(el, 'id', {
    get() {
      detected = true;
      return 'probe';
    },
  });

  console.log(el);
  console.clear();

  return detected;
}

// ═══════════════════════════════════════════════════
// 5. DEBUGGER TRAP (vòng lặp debugger statement)
// ═══════════════════════════════════════════════════
let debuggerTrapActive = false;

function startDebuggerTrap() {
  if (debuggerTrapActive) return;
  debuggerTrapActive = true;

  // Tạo function mới liên tục để tránh bị breakpoint disable
  function trap() {
    if (!debuggerTrapActive) return;

    // Tạo anonymous function qua constructor để khó disable breakpoint
    (function () {
      return false;
    })
      ['constructor']('debugger')
      ['call']();

    setTimeout(trap, 500);
  }

  trap();
}

function stopDebuggerTrap() {
  debuggerTrapActive = false;
}

// ═══════════════════════════════════════════════════
// 6. CONSOLE BOMB — Override console methods
// ═══════════════════════════════════════════════════
function consoleBomb() {
  const noop = () => {};
  const methods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'group', 'groupEnd'];
  methods.forEach((method) => {
    console[method] = noop;
  });

  // Clear liên tục
  setInterval(() => {
    console.clear();
  }, 1000);
}

// ═══════════════════════════════════════════════════
// 7. ANTI COPY-PASTE
// ═══════════════════════════════════════════════════
function disableCopyPaste() {
  ['copy', 'cut', 'paste'].forEach((event) => {
    document.addEventListener(event, (e) => {
      // Cho phép trong input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
    });
  });
}

// ═══════════════════════════════════════════════════
// MAIN: Init guard
// ═══════════════════════════════════════════════════

/**
 * @param {Object} options
 * @param {'light'|'medium'|'strict'} options.level - Mức độ bảo vệ
 * @param {Function} options.onDetect - Callback khi phát hiện devtools
 * @param {boolean} options.allowDev - Bỏ qua nếu NODE_ENV === 'development'
 */
export function initDevToolsGuard(options = {}) {
  const {
    level = 'medium',
    onDetect = null,
    allowDev = true,
  } = options;

  // Không chạy trong development mode (để dev dễ debug)
  if (allowDev && import.meta.env.DEV) {
    console.log('[DevTools Guard] Skipped in development mode');
    return;
  }

  console.log(`[DevTools Guard] Initialized — level: ${level}`);

  // ── LIGHT: Chỉ chặn phím tắt và right-click ──
  disableContextMenu();
  blockDevToolsKeys();
  disableSelection();
  disableCopyPaste();

  if (level === 'light') return;

  // ── MEDIUM: Thêm detection loop ──
  let devtoolsOpen = false;

  function checkDevTools() {
    const sizeCheck = detectByWindowSize();
    const consoleCheck = detectByConsoleLog();
    const regexCheck = detectByRegex();

    const isOpen = sizeCheck || consoleCheck || regexCheck;

    if (isOpen && !devtoolsOpen) {
      devtoolsOpen = true;
      console.clear();

      if (onDetect) {
        onDetect();
      } else {
        // Hành vi mặc định: hiện overlay cảnh báo
        showWarningOverlay();
      }
    } else if (!isOpen && devtoolsOpen) {
      devtoolsOpen = false;
      removeWarningOverlay();
    }
  }

  // Kiểm tra mỗi 2 giây
  setInterval(checkDevTools, 2000);

  // Debugger trap (chạy khi devtools mở sẽ bị pause liên tục)
  startDebuggerTrap();

  if (level === 'medium') return;

  // ── STRICT: Thêm console bomb + redirect ──
  consoleBomb();

  // Override onDetect mặc định: redirect sang trang khác
  if (!onDetect) {
    const originalOnDetect = showWarningOverlay;
    options.onDetect = () => {
      originalOnDetect();
      // Sau 3 giây redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    };
  }
}

// ═══════════════════════════════════════════════════
// WARNING OVERLAY UI
// ═══════════════════════════════════════════════════
function showWarningOverlay() {
  if (document.getElementById('devtools-guard-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'devtools-guard-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(0,0,0,0.92);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Inter', sans-serif;
    ">
      <div style="
        text-align: center; color: white; max-width: 420px; padding: 2rem;
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
        <h2 style="margin: 0 0 0.5rem; font-size: 1.4rem;">
          Phát hiện công cụ lập trình
        </h2>
        <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">
          Vui lòng đóng Developer Tools để tiếp tục sử dụng hệ thống.
          Hành vi này đã được ghi nhận.
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function removeWarningOverlay() {
  const el = document.getElementById('devtools-guard-overlay');
  if (el) el.remove();
}

export { stopDebuggerTrap };
