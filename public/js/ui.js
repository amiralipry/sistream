// UI Utilities: Frosted-Glass Toasts, Custom Confirm Popup Modal, PWA & Mobile Navigation

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function formatSeconds(sec) {
  const sNum = parseInt(sec, 10) || 0;
  const h = Math.floor(sNum / 3600);
  const m = Math.floor((sNum % 3600) / 60);
  const s = sNum % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
}

export function colorizeLog(line) {
  if (/error|failed|fatal|could not/i.test(line)) {
    return `<span class="text-rose-400 font-semibold">${escapeHtml(line)}</span>`;
  }
  if (/warning|warn/i.test(line)) {
    return `<span class="text-amber-400">${escapeHtml(line)}</span>`;
  }
  if (/frame=\s*\d+/i.test(line)) {
    return `<span class="text-emerald-400 font-medium">${escapeHtml(line)}</span>`;
  }
  if (/\[سیستم\]/i.test(line)) {
    return `<span class="text-sky-300 font-semibold">${escapeHtml(line)}</span>`;
  }
  return `<span class="text-slate-300">${escapeHtml(line)}</span>`;
}

// ====================== Frosted-Glass Toast Engine ======================
const TOAST_ICONS = {
  success:
    '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>',
  error:
    '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>',
  warning:
    '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
  info:
    '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-brand-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
};

const TOAST_STYLES = {
  success: 'bg-white/95 border-emerald-200 text-slate-800 shadow-emerald-900/10',
  error: 'bg-white/95 border-rose-200 text-slate-800 shadow-rose-900/10',
  warning: 'bg-white/95 border-amber-200 text-slate-800 shadow-amber-900/10',
  info: 'bg-white/95 border-brand-border text-slate-800 shadow-brand/10'
};

const TOAST_ACCENTS = {
  success: 'bg-emerald-50 border-emerald-200',
  error: 'bg-rose-50 border-rose-200',
  warning: 'bg-amber-50 border-amber-200',
  info: 'bg-brand-50 border-brand-200'
};

export function showToast(message, type = 'info', actionBtn = null) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const styleCls = TOAST_STYLES[type] || TOAST_STYLES.info;
  const accentCls = TOAST_ACCENTS[type] || TOAST_ACCENTS.info;
  const iconSvg = TOAST_ICONS[type] || TOAST_ICONS.info;

  toast.className = `toast-item backdrop-blur-xl p-3 rounded-2xl border text-xs font-semibold shadow-xl flex items-center justify-between gap-2.5 pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0 ${styleCls}`;

  let actionHtml = '';
  if (actionBtn) {
    actionHtml = `<a href="${actionBtn.href}" target="_blank" download class="btn-brand-primary px-2.5 py-1 text-[11px] rounded-lg text-white font-bold shrink-0">${escapeHtml(actionBtn.text)}</a>`;
  }

  toast.innerHTML = `
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 ${accentCls}">
        ${iconSvg}
      </div>
      <span class="leading-relaxed break-words">${escapeHtml(message)}</span>
      ${actionHtml}
    </div>
    <button type="button" aria-label="بستن" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  const dismiss = () => {
    if (!toast.parentElement) return;
    toast.classList.add('opacity-0', 'translate-y-2', 'scale-95');
    setTimeout(() => toast.remove(), 250);
  };

  toast.querySelector('button').addEventListener('click', dismiss);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(dismiss, 4500);
}

// ====================== Custom Glassmorphic Confirm Popup (Zero Native Alerts) ======================
export function showConfirmModal({
  title = 'تأیید عملیات',
  message = 'آیا از انجام این عملیات اطمینان دارید؟',
  confirmText = 'تأیید',
  cancelText = 'انصراف',
  variant = 'primary' // 'primary' | 'danger' | 'warning'
} = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const card = document.getElementById('confirmModalCard');
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const iconBox = document.getElementById('confirmModalIcon');
    const okBtn = document.getElementById('confirmModalOkBtn');
    const cancelBtn = document.getElementById('confirmModalCancelBtn');

    if (!modal || !okBtn || !cancelBtn) {
      resolve(false);
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    if (variant === 'danger') {
      iconBox.className = 'w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0';
      iconBox.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>';
      okBtn.className = 'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold btn-brand-rose text-white';
    } else if (variant === 'warning') {
      iconBox.className = 'w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0';
      iconBox.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>';
      okBtn.className = 'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold btn-brand-primary text-white';
    } else {
      iconBox.className = 'w-11 h-11 rounded-2xl bg-brand-50 text-brand-900 border border-brand-200 flex items-center justify-center shrink-0';
      iconBox.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
      okBtn.className = 'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold btn-brand-primary text-white';
    }

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      if (card) card.classList.remove('scale-95', 'opacity-0');
    });

    const cleanup = (result) => {
      okBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKeyDown);

      modal.classList.add('opacity-0');
      if (card) card.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        resolve(result);
      }, 180);
    };

    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onBackdrop = (e) => {
      if (e.target === modal) cleanup(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') cleanup(false);
    };

    okBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKeyDown);
  });
}

// ====================== PWA Registration & Install Experience ======================
let deferredInstallPrompt = null;

export function initPWA(onReconnect) {
  const installBtn = document.getElementById('installPwaBtn');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    });
  }

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (installBtn && !isStandalone) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      installBtn.classList.remove('hidden');
    });

    if (isIos) {
      installBtn.classList.remove('hidden');
    }

    installBtn.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          showToast('اپلیکیشن استودیو با موفقیت نصب شد.', 'success');
          installBtn.classList.add('hidden');
        }
        deferredInstallPrompt = null;
      } else if (isIos) {
        showToast('در سافاری، دکمه اشتراک‌گذاری (Share) و سپس «Add to Home Screen» را انتخاب کنید.', 'info');
      }
    });

    window.addEventListener('appinstalled', () => {
      installBtn.classList.add('hidden');
      deferredInstallPrompt = null;
      showToast('اپلیکیشن استودیو روی دستگاه نصب شد.', 'success');
    });
  }

  window.addEventListener('online', () => {
    showToast('اتصال اینترنت برقرار شد.', 'success');
    if (typeof onReconnect === 'function') onReconnect();
  });

  window.addEventListener('offline', () => {
    showToast('ارتباط اینترنت دستگاه قطع شده است.', 'warning');
  });
}

// ====================== Mobile Bottom Navigation Controller ======================
export function initMobileNavigation() {
  const nav = document.getElementById('mobileBottomNav');
  if (!nav) return;

  const buttons = nav.querySelectorAll('.mobile-nav-btn');
  const sections = document.querySelectorAll('[data-mobile-section]');

  function activateTab(tabName) {
    buttons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-nav-tab') === tabName);
    });

    sections.forEach((sec) => {
      const secType = sec.getAttribute('data-mobile-section');
      if (tabName === 'all' || secType === 'always' || secType === tabName) {
        sec.classList.remove('mobile-section-hidden');
      } else {
        sec.classList.add('mobile-section-hidden');
      }
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activateTab(btn.getAttribute('data-nav-tab') || 'all');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  activateTab('all');
}

// ====================== Password Visibility Toggles ======================
export function initPasswordToggles() {
  document.querySelectorAll('.toggle-pwd-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      const eyeOpen = btn.querySelector('.eye-open');
      const eyeClosed = btn.querySelector('.eye-closed');
      if (input.type === 'password') {
        input.type = 'text';
        if (eyeOpen) eyeOpen.classList.add('hidden');
        if (eyeClosed) eyeClosed.classList.remove('hidden');
      } else {
        input.type = 'password';
        if (eyeOpen) eyeOpen.classList.remove('hidden');
        if (eyeClosed) eyeClosed.classList.add('hidden');
      }
    });
  });
}
