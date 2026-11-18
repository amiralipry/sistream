// Live Relay & Transcoder Studio (Multi-Stream Bento, Glassmorphism #153047)

// ====================== DOM Element Bindings ======================
// Input & Multi-Destinations
const srtUrlInput = document.getElementById('srtUrl');
const destRubikaEnable = document.getElementById('destRubikaEnable');
const destRubikaUrl = document.getElementById('destRubikaUrl');
const destRubikaKey = document.getElementById('destRubikaKey');
const destRubikaStatusBadge = document.getElementById('destRubikaStatusBadge');

const destYouTubeEnable = document.getElementById('destYouTubeEnable');
const destYouTubeUrl = document.getElementById('destYouTubeUrl');
const destYouTubeKey = document.getElementById('destYouTubeKey');
const destYouTubeAspect = document.getElementById('destYouTubeAspect');
const destYouTubeFitMode = document.getElementById('destYouTubeFitMode');
const destYouTubeBitrate = document.getElementById('destYouTubeBitrate');
const destYouTubeStatusBadge = document.getElementById('destYouTubeStatusBadge');

const destInstaEnable = document.getElementById('destInstaEnable');
const destInstaUrl = document.getElementById('destInstaUrl');
const destInstaKey = document.getElementById('destInstaKey');
const destInstaAntiCrop = document.getElementById('destInstaAntiCrop');
const destInstaAntiCropMargin = document.getElementById('destInstaAntiCropMargin');
const destInstaAntiCropMarginVal = document.getElementById('destInstaAntiCropMarginVal');
const destInstaStatusBadge = document.getElementById('destInstaStatusBadge');

// Video Encoding
const videoWidthInput = document.getElementById('videoWidth');
const videoHeightInput = document.getElementById('videoHeight');
const videoBitrateInput = document.getElementById('videoBitrate');
const targetFpsSelect = document.getElementById('targetFps');
const videoRotationSelect = document.getElementById('videoRotation');
const scalingModeSelect = document.getElementById('scalingMode');
const passthroughCheckbox = document.getElementById('passthroughCheckbox');
const filterControlsGroup = document.getElementById('filterControlsGroup');

// Scenes Studio
const newSceneNameInput = document.getElementById('newSceneNameInput');
const addNewSceneBtn = document.getElementById('addNewSceneBtn');
const scenesContainer = document.getElementById('scenesContainer');

// Multi-Overlay Graphics Studio
const addNewOverlayBtn = document.getElementById('addNewOverlayBtn');
const overlaysContainer = document.getElementById('overlaysContainer');

// Action Buttons
const startBtn = document.getElementById('startBtn');
const startBtnText = document.getElementById('startBtnText');
const stopBtn = document.getElementById('stopBtn');
const restartLiveBtn = document.getElementById('restartLiveBtn');

// Status & Indicators
const ffmpegBadge = document.getElementById('ffmpegBadge');
const ffmpegDot = document.getElementById('ffmpegDot');
const ffmpegText = document.getElementById('ffmpegText');
const statusPill = document.getElementById('statusPill');
const statusPing = document.getElementById('statusPing');
const statusDot = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');

// Telemetry Stat Cards
const statUptime = document.getElementById('statUptime');
const statFps = document.getElementById('statFps');
const statBitrate = document.getElementById('statBitrate');
const statDrop = document.getElementById('statDrop');
const detailedStatusText = document.getElementById('detailedStatusText');

// Video Preview & Hls.js
const previewVideo = document.getElementById('previewVideo');
const playerPlaceholder = document.getElementById('playerPlaceholder');
const placeholderTitle = document.getElementById('placeholderTitle');
const placeholderDesc = document.getElementById('placeholderDesc');
const phoneAspectTag = document.getElementById('phoneAspectTag');
const phoneLiveClock = document.getElementById('phoneLiveClock');
const togglePreviewCheckbox = document.getElementById('togglePreviewCheckbox');
const unmuteBtn = document.getElementById('unmuteBtn');
const forceReloadPreviewBtn = document.getElementById('forceReloadPreviewBtn');

// Instant Record Elements
const instantRecordBtn = document.getElementById('instantRecordBtn');
const instantRecordBtnText = document.getElementById('instantRecordBtnText');
const manualRecordBadge = document.getElementById('manualRecordBadge');
const manualRecordTimer = document.getElementById('manualRecordTimer');
const autoRecordCheckbox = document.getElementById('autoRecordCheckbox');

// Recordings list & Modal
const recordingsList = document.getElementById('recordingsList');
const refreshRecordingsBtn = document.getElementById('refreshRecordingsBtn');
const recordingModal = document.getElementById('recordingModal');
const modalVideoPlayer = document.getElementById('modalVideoPlayer');
const modalVideoTitle = document.getElementById('modalVideoTitle');
const modalVideoSubtitle = document.getElementById('modalVideoSubtitle');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalCloseActionBtn = document.getElementById('modalCloseActionBtn');

// Terminal Elements
const terminalBox = document.getElementById('terminalBox');
const autoScrollCheckbox = document.getElementById('autoScrollCheckbox');
const copyLogsBtn = document.getElementById('copyLogsBtn');
const copyLogsText = document.getElementById('copyLogsText');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const logCountBadge = document.getElementById('logCountBadge');
const toastContainer = document.getElementById('toastContainer');

// Profile Manager
const profileSelect = document.getElementById('profileSelect');
const profileNameInput = document.getElementById('profileNameInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const loadProfileBtn = document.getElementById('loadProfileBtn');
const deleteProfileBtn = document.getElementById('deleteProfileBtn');

// ====================== State Variables & Keys ======================
let currentStatus = 'idle';
let hlsInstance = null;
let lastLogSignature = '';
let isManualRecordingActive = false;
let hlsRetryTimer = null;
let currentSceneName = 'scene_live';

const PROFILES_STORAGE_KEY = 'rubika_studio_profiles_v5';
const ACTIVE_SETTINGS_KEY = 'rubika_studio_config_v5';
const OVERLAYS_STORAGE_KEY = 'rubika_studio_overlays_v5';
const SCENES_STORAGE_KEY = 'rubika_studio_scenes_v5';

// Multi-Overlay List State
let overlaysList = [];

// Custom Scenes List State
let scenesList = [
  { id: 'scene_live', name: 'صحنه اصلی زنده', desc: 'فید مستقیم بدون نشان', overlaysEnabled: false, isDefault: true },
  { id: 'scene_logo', name: 'تصویر با نشان و لوگو', desc: 'پخش زنده همراه لایه‌ها', overlaysEnabled: true, isDefault: true },
  { id: 'scene_standby', name: 'کارت انتظار استندبای', desc: 'پرده پیش از آغاز پخش', overlaysEnabled: false, isDefault: true },
  { id: 'scene_mute', name: 'حالت سکوت استودیو', desc: 'تصویر زنده با قطع صدا', overlaysEnabled: false, isDefault: true }
];

// Platform Profiles Defaults
const DEFAULT_PROFILES = {
  'روبیکا - تمام‌کادر عمودی بدون برش (۷۲۰×۱۲۸۰)': {
    width: 720,
    height: 1280,
    bitrate: 2500,
    fps: 30,
    rotation: '0',
    scalingMode: 'crop',
    passthrough: false,
    destRubika: true,
    destYouTube: false,
    destInsta: false
  },
  'اینستاگرام - عمودی با حاشیه امن تاری زنده (۱۵٪)': {
    width: 720,
    height: 1280,
    bitrate: 2500,
    fps: 25,
    rotation: '0',
    scalingMode: 'crop',
    passthrough: false,
    destRubika: false,
    destYouTube: false,
    destInsta: true,
    destInstaAntiCrop: true,
    instaAntiCropMargin: 15
  },
  'یوتیوب - افقی ۱۶:۹ با تاری کناره‌ها': {
    width: 1280,
    height: 720,
    bitrate: 3500,
    fps: 30,
    rotation: '0',
    scalingMode: 'fit',
    passthrough: false,
    destRubika: false,
    destYouTube: true,
    destYouTubeAspect: 'horizontal',
    destYouTubeFitMode: 'blur',
    destYouTubeBitrate: 3500,
    destInsta: false
  },
  'پخش همزمان سه پلتفرم (روبیکا + اینستاگرام + یوتیوب)': {
    width: 720,
    height: 1280,
    bitrate: 2600,
    fps: 25,
    rotation: '0',
    scalingMode: 'crop',
    passthrough: false,
    destRubika: true,
    destYouTube: true,
    destYouTubeAspect: 'horizontal',
    destYouTubeFitMode: 'blur',
    destYouTubeBitrate: 3500,
    destInsta: true,
    destInstaAntiCrop: true,
    instaAntiCropMargin: 15
  }
};

// ====================== Toast Notifications ======================
function showToast(message, type = 'info', actionBtn = null) {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-emerald-500/10',
    error: 'bg-rose-50 border-rose-300 text-rose-800 shadow-rose-500/10',
    info: 'bg-slate-50 border-slate-300 text-slate-800 shadow-slate-500/10',
    warning: 'bg-amber-50 border-amber-300 text-amber-800 shadow-amber-500/10'
  };

  toast.className = `p-3 rounded-xl border text-xs font-semibold shadow-lg flex items-center justify-between gap-3 pointer-events-auto transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  
  let actionHtml = '';
  if (actionBtn) {
    actionHtml = `<a href="${actionBtn.href}" target="_blank" download class="btn-brand-primary px-2.5 py-1 text-[11px] rounded-lg text-white font-bold ml-2">${actionBtn.text}</a>`;
  }

  toast.innerHTML = `
    <div class="flex items-center gap-2">
      <span>${escapeHtml(message)}</span>
      ${actionHtml}
    </div>
    <button class="text-slate-400 hover:text-slate-700 text-base leading-none pr-1">&times;</button>
  `;

  toast.querySelector('button').addEventListener('click', () => toast.remove());
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4500);
}

function formatSeconds(sec) {
  const sNum = parseInt(sec, 10) || 0;
  const h = Math.floor(sNum / 3600);
  const m = Math.floor((sNum % 3600) / 60);
  const s = sNum % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function colorizeLog(line) {
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
    return `<span class="text-indigo-400 font-semibold">${escapeHtml(line)}</span>`;
  }
  return `<span class="text-slate-300">${escapeHtml(line)}</span>`;
}

// ====================== Phone Aspect Ratio & Clock ======================
function updatePlayerAspectRatio() {
  const w = parseInt(videoWidthInput.value, 10) || 720;
  const h = parseInt(videoHeightInput.value, 10) || 1280;

  if (phoneAspectTag) {
    if (w < h) {
      phoneAspectTag.textContent = `${w}×${h} (عمودی ۹:۱۶)`;
    } else {
      phoneAspectTag.textContent = `${w}×${h} (افقی ۱۶:۹)`;
    }
  }
}

function updatePhoneClock() {
  if (phoneLiveClock) {
    const now = new Date();
    phoneLiveClock.textContent = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}
setInterval(updatePhoneClock, 1000);
updatePhoneClock();

// ====================== Safe Zone Margin Slider ======================
if (destInstaAntiCropMargin) {
  destInstaAntiCropMargin.addEventListener('input', () => {
    if (destInstaAntiCropMarginVal) {
      destInstaAntiCropMarginVal.textContent = `${destInstaAntiCropMargin.value}%`;
    }
    notifyConfigChange();
  });
}

// ====================== Multi-Image Overlay Manager ======================
function loadOverlaysFromStorage() {
  try {
    const raw = localStorage.getItem(OVERLAYS_STORAGE_KEY);
    if (raw) {
      overlaysList = JSON.parse(raw);
    } else {
      overlaysList = [];
    }
  } catch (e) {
    overlaysList = [];
  }
  renderOverlaysList();
}

function saveOverlaysToStorage() {
  localStorage.setItem(OVERLAYS_STORAGE_KEY, JSON.stringify(overlaysList));
}

function renderOverlaysList() {
  if (!overlaysContainer) return;

  if (overlaysList.length === 0) {
    overlaysContainer.innerHTML = `
      <div class="p-4 rounded-2xl border border-dashed border-brand-border/80 bg-slate-50/60 text-center space-y-1.5">
        <p class="text-xs text-slate-500 font-medium">هیچ نشان یا تصویری اضافه نشده است.</p>
        <p class="text-[11px] text-slate-400">با زدن دکمه «افزودن تصویر» می‌توانید لوگو، نشان یا بنر روی تصویر قرار دهید.</p>
      </div>
    `;
    return;
  }

  overlaysContainer.innerHTML = overlaysList.map((ov, index) => {
    const hasImage = !!ov.path;
    return `
      <div class="p-3 rounded-2xl border border-brand-border/80 bg-white/90 space-y-2.5 shadow-xs" data-overlay-id="${ov.id}">
        <!-- Layer Header -->
        <div class="flex items-center justify-between pb-1.5 border-b border-brand-border/40">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${ov.enabled ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
            <span class="text-xs font-bold text-brand-950">${escapeHtml(ov.name || `لایه تصویر ${index + 1}`)}</span>
          </div>

          <div class="flex items-center gap-2">
            <label class="apple-toggle flex items-center gap-1.5" title="فعال/غیرفعال‌سازی این لایه">
              <input type="checkbox" class="apple-toggle-input overlay-toggle-input" data-index="${index}" ${ov.enabled ? 'checked' : ''}>
              <span class="apple-toggle-track">
                <span class="apple-toggle-thumb"></span>
              </span>
            </label>

            <button type="button" class="btn-brand-rose px-2 py-1 text-[11px] font-bold rounded-lg overlay-delete-btn" data-index="${index}" title="حذف این لایه">
              حذف
            </button>
          </div>
        </div>

        <!-- Layer Image Upload Area -->
        <div class="flex items-center gap-3">
          ${hasImage ? `
            <div class="w-12 h-12 rounded-xl border border-brand-border bg-slate-50 p-1 shrink-0 flex items-center justify-center overflow-hidden">
              <img src="${ov.path}" alt="نشان" class="w-full h-full object-contain">
            </div>
            <div class="flex-1 min-w-0">
              <span class="font-mono-code font-bold text-xs text-brand-950 block truncate">${escapeHtml(ov.filename || 'تصویر')}</span>
              <label class="cursor-pointer text-[11px] text-brand-700 hover:text-brand-900 font-bold block mt-0.5">
                تغییر فایل
                <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden overlay-file-input" data-index="${index}">
              </label>
            </div>
          ` : `
            <label class="w-full py-2.5 px-3 rounded-xl border border-dashed border-brand-primary/40 bg-brand-50/50 hover:bg-brand-50 cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-brand-900 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>انتخاب فایل لوگو / نشان</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden overlay-file-input" data-index="${index}">
            </label>
          `}
        </div>

        <!-- Position & Rotation Selects -->
        <div class="grid grid-cols-2 gap-2 pt-1 border-t border-brand-border/40">
          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">موقعیت در صفحه</label>
            <select class="w-full bento-input px-2 py-1 text-[11px] font-semibold text-brand-900 overlay-position-select" data-index="${index}">
              <option value="top_right" ${ov.position === 'top_right' ? 'selected' : ''}>بالا - راست</option>
              <option value="top_left" ${ov.position === 'top_left' ? 'selected' : ''}>بالا - چپ</option>
              <option value="bottom_right" ${ov.position === 'bottom_right' ? 'selected' : ''}>پایین - راست</option>
              <option value="bottom_left" ${ov.position === 'bottom_left' ? 'selected' : ''}>پایین - چپ</option>
              <option value="center" ${ov.position === 'center' ? 'selected' : ''}>مرکز صفحه</option>
              <option value="full_frame" ${ov.position === 'full_frame' ? 'selected' : ''}>تمام‌کادر (پوشش کامل)</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] text-slate-500 mb-0.5">چرخش لایه</label>
            <select class="w-full bento-input px-2 py-1 text-[11px] font-semibold text-brand-900 overlay-rotation-select" data-index="${index}">
              <option value="0" ${ov.rotation === '0' ? 'selected' : ''}>بدون چرخش (۰°)</option>
              <option value="90" ${ov.rotation === '90' ? 'selected' : ''}>۹۰° ساعتگرد</option>
              <option value="270" ${ov.rotation === '270' ? 'selected' : ''}>۹۰° پادساعتگرد</option>
              <option value="180" ${ov.rotation === '180' ? 'selected' : ''}>۱۸۰° وارونه</option>
            </select>
          </div>
        </div>

        <!-- Sliders: Margins, Scale, Opacity -->
        <div class="space-y-1.5 pt-1 border-t border-brand-border/40 text-[11px]">
          <!-- Margin X -->
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-[10px] shrink-0 w-16">فاصله افقی:</span>
            <input type="range" min="0" max="400" value="${ov.marginX || 25}" class="w-full accent-brand-900 h-1 bg-slate-200 rounded cursor-pointer overlay-marginX-slider" data-index="${index}">
            <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.marginX || 25}px</span>
          </div>

          <!-- Margin Y -->
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-[10px] shrink-0 w-16">فاصله عمودی:</span>
            <input type="range" min="0" max="400" value="${ov.marginY || 25}" class="w-full accent-brand-900 h-1 bg-slate-200 rounded cursor-pointer overlay-marginY-slider" data-index="${index}">
            <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.marginY || 25}px</span>
          </div>

          <!-- Scale (Hidden if full_frame) -->
          <div class="flex items-center gap-2 ${ov.position === 'full_frame' ? 'opacity-40 pointer-events-none' : ''}">
            <span class="text-slate-500 text-[10px] shrink-0 w-16">اندازه نشان:</span>
            <input type="range" min="5" max="100" value="${ov.scale || 20}" class="w-full accent-brand-900 h-1 bg-slate-200 rounded cursor-pointer overlay-scale-slider" data-index="${index}">
            <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.position === 'full_frame' ? 'کامل' : (ov.scale || 20) + '%'}</span>
          </div>

          <!-- Opacity -->
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-[10px] shrink-0 w-16">شفافیت:</span>
            <input type="range" min="10" max="100" value="${ov.opacity || 100}" class="w-full accent-brand-900 h-1 bg-slate-200 rounded cursor-pointer overlay-opacity-slider" data-index="${index}">
            <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.opacity || 100}%</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  attachOverlayEventListeners();
}

function attachOverlayEventListeners() {
  if (!overlaysContainer) return;

  // Toggle layer enable
  overlaysContainer.querySelectorAll('.overlay-toggle-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList[idx].enabled = e.target.checked;
        saveOverlaysToStorage();
        notifyConfigChange();
      }
    });
  });

  // Delete layer
  overlaysContainer.querySelectorAll('.overlay-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList.splice(idx, 1);
        saveOverlaysToStorage();
        renderOverlaysList();
        notifyConfigChange();
        showToast('لایه تصویری حذف شد.', 'info');
      }
    });
  });

  // File Upload per layer
  overlaysContainer.querySelectorAll('.overlay-file-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const idx = parseInt(input.getAttribute('data-index'), 10);
      const file = e.target.files[0];
      if (!file || !overlaysList[idx]) return;

      const formData = new FormData();
      formData.append('overlay', file);

      try {
        showToast('در حال بارگذاری تصویر نشان...', 'info');
        const res = await fetch('/api/upload-overlay', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          overlaysList[idx].path = data.filePath;
          overlaysList[idx].filename = data.filename;
          overlaysList[idx].enabled = true;
          saveOverlaysToStorage();
          renderOverlaysList();
          notifyConfigChange();
          showToast('تصویر نشان با موفقیت ثبت شد.', 'success');
        } else {
          showToast(data.message || 'خطا در بارگذاری تصویر.', 'error');
        }
      } catch (err) {
        showToast(`خطای ارتباط: ${err.message}`, 'error');
      }
    });
  });

  // Position select
  overlaysContainer.querySelectorAll('.overlay-position-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(sel.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList[idx].position = sel.value;
        saveOverlaysToStorage();
        renderOverlaysList();
        notifyConfigChange();
      }
    });
  });

  // Rotation select
  overlaysContainer.querySelectorAll('.overlay-rotation-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(sel.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList[idx].rotation = sel.value;
        saveOverlaysToStorage();
        notifyConfigChange();
      }
    });
  });

  // Margin X
  overlaysContainer.querySelectorAll('.overlay-marginX-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const idx = parseInt(slider.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList[idx].marginX = parseInt(slider.value, 10);
        saveOverlaysToStorage();
        const display = slider.parentElement.querySelector('span:last-child');
        if (display) display.textContent = `${slider.value}px`;
        notifyConfigChange();
      }
    });
  });

  // Margin Y
  overlaysContainer.querySelectorAll('.overlay-marginY-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const idx = parseInt(slider.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList[idx].marginY = parseInt(slider.value, 10);
        saveOverlaysToStorage();
        const display = slider.parentElement.querySelector('span:last-child');
        if (display) display.textContent = `${slider.value}px`;
        notifyConfigChange();
      }
    });
  });

  // Scale
  overlaysContainer.querySelectorAll('.overlay-scale-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const idx = parseInt(slider.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList[idx].scale = parseInt(slider.value, 10);
        saveOverlaysToStorage();
        const display = slider.parentElement.querySelector('span:last-child');
        if (display) display.textContent = `${slider.value}%`;
        notifyConfigChange();
      }
    });
  });

  // Opacity
  overlaysContainer.querySelectorAll('.overlay-opacity-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const idx = parseInt(slider.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList[idx].opacity = parseInt(slider.value, 10);
        saveOverlaysToStorage();
        const display = slider.parentElement.querySelector('span:last-child');
        if (display) display.textContent = `${slider.value}%`;
        notifyConfigChange();
      }
    });
  });
}

if (addNewOverlayBtn) {
  addNewOverlayBtn.addEventListener('click', () => {
    const newIdx = overlaysList.length + 1;
    overlaysList.push({
      id: `ov_${Date.now()}`,
      name: `نشان ${newIdx}`,
      path: '',
      filename: '',
      position: 'top_right',
      marginX: 25,
      marginY: 25,
      scale: 20,
      opacity: 100,
      rotation: '0',
      enabled: true
    });
    saveOverlaysToStorage();
    renderOverlaysList();
    notifyConfigChange();
    showToast('لایه جدید اضافه شد. اکنون تصویر خود را انتخاب کنید.', 'info');
  });
}

// ====================== Custom Scenes Studio ======================
function loadScenesFromStorage() {
  try {
    const raw = localStorage.getItem(SCENES_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) {
        scenesList = stored;
      }
    }
  } catch (e) {}
  renderScenesList();
}

function saveScenesToStorage() {
  localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenesList));
}

function renderScenesList() {
  if (!scenesContainer) return;

  scenesContainer.innerHTML = scenesList.map(sc => {
    const isActive = (currentSceneName === sc.id || currentSceneName === sc.name);
    return `
      <div 
        class="scene-btn p-2.5 rounded-xl border-2 ${isActive ? 'border-brand-900 bg-brand-50 shadow-sm' : 'border-brand-border bg-white hover:bg-slate-50'} text-right flex flex-col justify-between transition-all relative group"
        data-scene-id="${sc.id}"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold ${isActive ? 'text-brand-950 font-black' : 'text-slate-800'}">${escapeHtml(sc.name)}</span>
          ${!sc.isDefault ? `
            <button type="button" class="text-slate-300 hover:text-rose-600 text-sm delete-scene-btn px-1" data-scene-id="${sc.id}" title="حذف این سکانس">&times;</button>
          ` : ''}
        </div>
        <span class="text-[10px] text-slate-500 mt-1 block truncate">${escapeHtml(sc.desc || '')}</span>
      </div>
    `;
  }).join('');

  attachSceneEventListeners();
}

function attachSceneEventListeners() {
  if (!scenesContainer) return;

  scenesContainer.querySelectorAll('.scene-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (e.target.classList.contains('delete-scene-btn')) return;
      const scId = btn.getAttribute('data-scene-id');
      const sc = scenesList.find(s => s.id === scId);
      if (!sc) return;

      currentSceneName = sc.id;
      renderScenesList();

      // Apply overlay state defined by scene
      if (sc.overlaysEnabled !== undefined) {
        overlaysList.forEach(ov => { ov.enabled = sc.overlaysEnabled; });
        saveOverlaysToStorage();
        renderOverlaysList();
      }

      try {
        await fetch('/api/scene/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene: sc.name })
        });
      } catch (err) {}

      notifyConfigChange();
      showToast(`سکانس «${sc.name}» فعال شد.`, 'success');
    });
  });

  // Delete scene
  scenesContainer.querySelectorAll('.delete-scene-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const scId = btn.getAttribute('data-scene-id');
      const idx = scenesList.findIndex(s => s.id === scId);
      if (idx !== -1 && !scenesList[idx].isDefault) {
        const deletedName = scenesList[idx].name;
        scenesList.splice(idx, 1);
        saveScenesToStorage();
        renderScenesList();
        showToast(`سکانس «${deletedName}» حذف شد.`, 'info');
      }
    });
  });
}

if (addNewSceneBtn && newSceneNameInput) {
  addNewSceneBtn.addEventListener('click', () => {
    const name = newSceneNameInput.value.trim();
    if (!name) {
      showToast('نامی برای سکانس جدید وارد کنید.', 'warning');
      newSceneNameInput.focus();
      return;
    }

    const newScene = {
      id: `scene_${Date.now()}`,
      name,
      desc: 'سکانس سفارشی ایجادشده توسط کاربر',
      overlaysEnabled: overlaysList.some(o => o.enabled),
      isDefault: false
    };

    scenesList.push(newScene);
    saveScenesToStorage();
    newSceneNameInput.value = '';
    renderScenesList();
    showToast(`سکانس «${name}» با موفقیت ایجاد شد.`, 'success');
  });
}

// ====================== Config & Profile Manager ======================
function getStoredProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILES };
    return { ...DEFAULT_PROFILES, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_PROFILES };
  }
}

function saveProfilesToStorage(profiles) {
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  renderProfileDropdown();
}

function renderProfileDropdown() {
  if (!profileSelect) return;
  const profiles = getStoredProfiles();
  profileSelect.innerHTML = '';
  Object.keys(profiles).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    profileSelect.appendChild(opt);
  });
}

function getCurrentFormConfig() {
  const destinations = [
    {
      name: 'روبیکا',
      streamUrl: destRubikaUrl.value.trim(),
      streamKey: destRubikaKey.value.trim(),
      enabled: destRubikaEnable.checked,
      aspect: 'vertical'
    },
    {
      name: 'یوتیوب',
      streamUrl: destYouTubeUrl.value.trim(),
      streamKey: destYouTubeKey.value.trim(),
      enabled: destYouTubeEnable.checked,
      aspect: destYouTubeAspect ? destYouTubeAspect.value : 'horizontal',
      ytFitMode: destYouTubeFitMode ? destYouTubeFitMode.value : 'blur',
      bitrate: destYouTubeBitrate ? (parseInt(destYouTubeBitrate.value, 10) || 3500) : 3500,
      width: (destYouTubeAspect && destYouTubeAspect.value === 'vertical') ? 720 : 1280,
      height: (destYouTubeAspect && destYouTubeAspect.value === 'vertical') ? 1280 : 720
    },
    {
      name: 'اینستاگرام',
      streamUrl: destInstaUrl.value.trim(),
      streamKey: destInstaKey.value.trim(),
      enabled: destInstaEnable.checked,
      instaAntiCrop: destInstaAntiCrop ? destInstaAntiCrop.checked : true,
      instaAntiCropMargin: destInstaAntiCropMargin ? (parseInt(destInstaAntiCropMargin.value, 10) || 15) : 15
    }
  ];

  return {
    srtUrl: srtUrlInput.value.trim(),
    destinations,
    destYouTubeAspect: destYouTubeAspect ? destYouTubeAspect.value : 'horizontal',
    destYouTubeFitMode: destYouTubeFitMode ? destYouTubeFitMode.value : 'blur',
    destYouTubeBitrate: destYouTubeBitrate ? (parseInt(destYouTubeBitrate.value, 10) || 3500) : 3500,
    destInstaAntiCrop: destInstaAntiCrop ? destInstaAntiCrop.checked : true,
    instaAntiCropMargin: destInstaAntiCropMargin ? (parseInt(destInstaAntiCropMargin.value, 10) || 15) : 15,
    width: parseInt(videoWidthInput.value, 10) || 720,
    height: parseInt(videoHeightInput.value, 10) || 1280,
    bitrate: parseInt(videoBitrateInput.value, 10) || 2500,
    fps: parseInt(targetFpsSelect.value, 10) || 30,
    rotation: videoRotationSelect.value,
    scalingMode: scalingModeSelect.value,
    passthrough: passthroughCheckbox.checked,
    autoRecordOnStart: autoRecordCheckbox ? autoRecordCheckbox.checked : false,
    overlays: overlaysList,
    autoReconnect: true
  };
}

function applyConfigToForm(cfg) {
  if (cfg.srtUrl !== undefined) srtUrlInput.value = cfg.srtUrl;
  if (cfg.width !== undefined) videoWidthInput.value = cfg.width;
  if (cfg.height !== undefined) videoHeightInput.value = cfg.height;
  if (cfg.bitrate !== undefined) videoBitrateInput.value = cfg.bitrate;
  if (cfg.fps !== undefined) targetFpsSelect.value = cfg.fps;
  if (cfg.rotation !== undefined) videoRotationSelect.value = cfg.rotation;
  if (cfg.scalingMode !== undefined) scalingModeSelect.value = cfg.scalingMode;
  if (cfg.passthrough !== undefined) {
    passthroughCheckbox.checked = cfg.passthrough;
    handlePassthroughToggle();
  }

  // Handle destinations
  if (cfg.destRubika !== undefined) destRubikaEnable.checked = cfg.destRubika;
  if (cfg.destYouTube !== undefined) destYouTubeEnable.checked = cfg.destYouTube;
  if (cfg.destInsta !== undefined) destInstaEnable.checked = cfg.destInsta;

  if (cfg.destYouTubeAspect !== undefined && destYouTubeAspect) destYouTubeAspect.value = cfg.destYouTubeAspect;
  if (cfg.destYouTubeFitMode !== undefined && destYouTubeFitMode) destYouTubeFitMode.value = cfg.destYouTubeFitMode;
  if (cfg.destYouTubeBitrate !== undefined && destYouTubeBitrate) destYouTubeBitrate.value = cfg.destYouTubeBitrate;
  if (cfg.destInstaAntiCrop !== undefined && destInstaAntiCrop) destInstaAntiCrop.checked = cfg.destInstaAntiCrop;
  if (cfg.instaAntiCropMargin !== undefined && destInstaAntiCropMargin) {
    destInstaAntiCropMargin.value = cfg.instaAntiCropMargin;
    if (destInstaAntiCropMarginVal) destInstaAntiCropMarginVal.textContent = `${cfg.instaAntiCropMargin}%`;
  }

  if (Array.isArray(cfg.destinations)) {
    cfg.destinations.forEach(d => {
      if (d.name === 'روبیکا') {
        destRubikaEnable.checked = d.enabled;
        if (d.streamUrl) destRubikaUrl.value = d.streamUrl;
        if (d.streamKey) destRubikaKey.value = d.streamKey;
      } else if (d.name === 'یوتیوب') {
        destYouTubeEnable.checked = d.enabled;
        if (d.streamUrl) destYouTubeUrl.value = d.streamUrl;
        if (d.streamKey) destYouTubeKey.value = d.streamKey;
        if (d.aspect && destYouTubeAspect) destYouTubeAspect.value = d.aspect;
        if (d.ytFitMode && destYouTubeFitMode) destYouTubeFitMode.value = d.ytFitMode;
        if (d.bitrate && destYouTubeBitrate) destYouTubeBitrate.value = d.bitrate;
      } else if (d.name === 'اینستاگرام') {
        destInstaEnable.checked = d.enabled;
        if (d.streamUrl) destInstaUrl.value = d.streamUrl;
        if (d.streamKey) destInstaKey.value = d.streamKey;
        if (d.instaAntiCrop !== undefined && destInstaAntiCrop) destInstaAntiCrop.checked = d.instaAntiCrop;
        if (d.instaAntiCropMargin !== undefined && destInstaAntiCropMargin) {
          destInstaAntiCropMargin.value = d.instaAntiCropMargin;
          if (destInstaAntiCropMarginVal) destInstaAntiCropMarginVal.textContent = `${d.instaAntiCropMargin}%`;
        }
      }
    });
  }

  if (cfg.autoRecordOnStart !== undefined && autoRecordCheckbox) {
    autoRecordCheckbox.checked = cfg.autoRecordOnStart;
  }

  if (Array.isArray(cfg.overlays)) {
    overlaysList = cfg.overlays;
    saveOverlaysToStorage();
    renderOverlaysList();
  }

  updatePlayerAspectRatio();
  saveActiveSettingsToStorage();
}

function notifyConfigChange() {
  saveActiveSettingsToStorage();
  // If live, display restart button so user can restart whenever they are ready
  if (currentStatus === 'live' && restartLiveBtn) {
    restartLiveBtn.classList.remove('hidden');
  }
}

function saveActiveSettingsToStorage() {
  const cfg = getCurrentFormConfig();
  localStorage.setItem(ACTIVE_SETTINGS_KEY, JSON.stringify(cfg));
}

function loadActiveSettingsFromStorage() {
  try {
    const raw = localStorage.getItem(ACTIVE_SETTINGS_KEY);
    if (raw) {
      applyConfigToForm(JSON.parse(raw));
    }
  } catch (e) {}
}

if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', () => {
    const name = (profileNameInput ? profileNameInput.value.trim() : '') || (profileSelect ? profileSelect.value : '');
    if (!name) {
      showToast('نامی برای پروفایل وارد کنید.', 'warning');
      return;
    }
    const profiles = getStoredProfiles();
    profiles[name] = getCurrentFormConfig();
    saveProfilesToStorage(profiles);
    if (profileSelect) profileSelect.value = name;
    if (profileNameInput) profileNameInput.value = '';
    showToast(`پروفایل «${name}» ذخیره شد.`, 'success');
  });
}

if (loadProfileBtn) {
  loadProfileBtn.addEventListener('click', () => {
    const name = profileSelect ? profileSelect.value : '';
    const profiles = getStoredProfiles();
    if (profiles[name]) {
      applyConfigToForm(profiles[name]);
      showToast(`پروفایل «${name}» اعمال شد.`, 'info');
    }
  });
}

if (deleteProfileBtn) {
  deleteProfileBtn.addEventListener('click', () => {
    const name = profileSelect ? profileSelect.value : '';
    if (DEFAULT_PROFILES[name]) {
      showToast('پروفایل‌های پیش‌فرض قابل حذف نیستند.', 'warning');
      return;
    }
    const profiles = getStoredProfiles();
    if (profiles[name]) {
      delete profiles[name];
      saveProfilesToStorage(profiles);
      showToast(`پروفایل «${name}» حذف شد.`, 'info');
    }
  });
}

// Input change listeners
[
  srtUrlInput, destRubikaEnable, destRubikaUrl, destRubikaKey,
  destYouTubeEnable, destYouTubeUrl, destYouTubeKey,
  destInstaEnable, destInstaUrl, destInstaKey,
  videoWidthInput, videoHeightInput, videoBitrateInput,
  targetFpsSelect, videoRotationSelect, scalingModeSelect
].filter(Boolean).forEach(el => {
  el.addEventListener('change', () => {
    updatePlayerAspectRatio();
    notifyConfigChange();
  });
  el.addEventListener('input', () => {
    updatePlayerAspectRatio();
    notifyConfigChange();
  });
});

function handlePassthroughToggle() {
  const isPass = passthroughCheckbox.checked;
  if (isPass) {
    if (filterControlsGroup) filterControlsGroup.classList.add('opacity-40', 'pointer-events-none');
    if (overlaysContainer) overlaysContainer.classList.add('opacity-40', 'pointer-events-none');
  } else {
    if (filterControlsGroup) filterControlsGroup.classList.remove('opacity-40', 'pointer-events-none');
    if (overlaysContainer) overlaysContainer.classList.remove('opacity-40', 'pointer-events-none');
  }
  notifyConfigChange();
}
if (passthroughCheckbox) {
  passthroughCheckbox.addEventListener('change', handlePassthroughToggle);
}

// ====================== HLS.js Live Video Preview ======================
async function checkHlsStreamReady() {
  try {
    const res = await fetch(`/preview/stream.m3u8?t=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function initHlsPreview() {
  if (togglePreviewCheckbox && !togglePreviewCheckbox.checked) {
    destroyHlsPreview();
    return;
  }

  updatePlayerAspectRatio();

  if (previewVideo) {
    previewVideo.muted = true;
  }

  // Pre-check if manifest is generated
  const ready = await checkHlsStreamReady();
  if (!ready && (currentStatus === 'live' || currentStatus === 'connecting')) {
    if (hlsRetryTimer) clearTimeout(hlsRetryTimer);
    hlsRetryTimer = setTimeout(initHlsPreview, 1200);
    return;
  }

  const streamSrc = `/preview/stream.m3u8?t=${Date.now()}`;

  if (Hls.isSupported()) {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    hlsInstance = new Hls({
      lowLatencyMode: true,
      backBufferLength: 4,
      liveSyncDurationCount: 2,
      liveMaxLatencyDurationCount: 3,
      manifestLoadingMaxRetry: 12,
      manifestLoadingRetryDelay: 1000,
      levelLoadingMaxRetry: 12,
      levelLoadingRetryDelay: 1000
    });

    hlsInstance.loadSource(streamSrc);
    hlsInstance.attachMedia(previewVideo);

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      previewVideo.play().catch(() => {});
      hidePlaceholder();
      if (unmuteBtn) unmuteBtn.classList.remove('hidden');
    });

    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (hlsRetryTimer) clearTimeout(hlsRetryTimer);
            hlsRetryTimer = setTimeout(() => {
              if (hlsInstance && (currentStatus === 'live' || currentStatus === 'connecting')) {
                hlsInstance.startLoad();
              }
            }, 1500);
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hlsInstance.recoverMediaError();
            break;
          default:
            if (currentStatus !== 'live' && currentStatus !== 'connecting') {
              destroyHlsPreview();
            }
            break;
        }
      }
    });
  } else if (previewVideo && previewVideo.canPlayType('application/vnd.apple.mpegurl')) {
    previewVideo.src = streamSrc;
    previewVideo.addEventListener('loadedmetadata', () => {
      previewVideo.play().catch(() => {});
      hidePlaceholder();
      if (unmuteBtn) unmuteBtn.classList.remove('hidden');
    });
  }
}

function hidePlaceholder() {
  if (playerPlaceholder) {
    playerPlaceholder.style.display = 'none';
    playerPlaceholder.classList.add('opacity-0', 'pointer-events-none');
  }
}

function showPlaceholder(title, desc) {
  if (playerPlaceholder) {
    playerPlaceholder.style.display = 'flex';
    playerPlaceholder.classList.remove('opacity-0', 'pointer-events-none');
  }
  if (placeholderTitle && title) placeholderTitle.textContent = title;
  if (placeholderDesc && desc) placeholderDesc.textContent = desc;
}

function destroyHlsPreview() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  if (hlsRetryTimer) {
    clearTimeout(hlsRetryTimer);
    hlsRetryTimer = null;
  }
  if (previewVideo) {
    previewVideo.pause();
    previewVideo.removeAttribute('src');
    previewVideo.load();
  }
  showPlaceholder('پخش زنده غیرفعال است', 'برای پخش پیش‌نمایش در موبایل، آدرس ورودی را مشخص کرده و دکمه شروع لایو را بزنید.');
  if (unmuteBtn) unmuteBtn.classList.add('hidden');
}

if (previewVideo) {
  previewVideo.addEventListener('playing', () => {
    hidePlaceholder();
    if (unmuteBtn) unmuteBtn.classList.remove('hidden');
  });
}

if (unmuteBtn) {
  unmuteBtn.addEventListener('click', () => {
    if (previewVideo) {
      previewVideo.muted = false;
      previewVideo.volume = 1.0;
    }
    unmuteBtn.classList.add('hidden');
    showToast('صدای مانیتورینگ متصل شد.', 'info');
  });
}

if (forceReloadPreviewBtn) {
  forceReloadPreviewBtn.addEventListener('click', () => {
    showToast('در حال تازه‌سازی فید پیش‌نمایش...', 'info');
    destroyHlsPreview();
    setTimeout(initHlsPreview, 400);
  });
}

if (togglePreviewCheckbox) {
  togglePreviewCheckbox.addEventListener('change', () => {
    if (togglePreviewCheckbox.checked) {
      if (currentStatus === 'live') initHlsPreview();
    } else {
      destroyHlsPreview();
    }
  });
}

// ====================== Instant Record Handlers ======================
if (instantRecordBtn) {
  instantRecordBtn.addEventListener('click', async () => {
    if (isManualRecordingActive) {
      instantRecordBtn.disabled = true;
      try {
        const res = await fetch('/api/record/stop', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`فایل ضبط‌شده ذخیره شد: ${data.filename}`, 'success', {
            text: 'دانلود',
            href: `/api/recordings/download/${data.filename}`
          });
          fetchRecordings();
        } else {
          showToast(data.message || 'خطا در توقف ضبط.', 'error');
        }
      } catch (err) {
        showToast(`خطا: ${err.message}`, 'error');
      } finally {
        instantRecordBtn.disabled = false;
      }
    } else {
      if (currentStatus !== 'live' && currentStatus !== 'connecting') {
        showToast('برای شروع ضبط، استریم لایو باید فعال باشد.', 'warning');
        return;
      }

      instantRecordBtn.disabled = true;
      try {
        const res = await fetch('/api/record/start', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`فرآیند ضبط آغاز شد (${data.filename}).`, 'info');
        } else {
          showToast(data.message || 'خطا در شروع ضبط.', 'error');
        }
      } catch (err) {
        showToast(`خطا: ${err.message}`, 'error');
      } finally {
        instantRecordBtn.disabled = false;
      }
    }
  });
}

// ====================== Recordings List & In-Browser Playback ======================
async function fetchRecordings() {
  if (!recordingsList) return;
  try {
    const res = await fetch('/api/recordings');
    const data = await res.json();
    if (data.success && Array.isArray(data.recordings)) {
      if (data.recordings.length === 0) {
        recordingsList.innerHTML = '<span class="text-slate-400 block text-center py-2">فایل ضبط‌شده‌ای وجود ندارد.</span>';
      } else {
        recordingsList.innerHTML = data.recordings.map(r => {
          const dateStr = new Date(r.createdAt || r.mtime).toLocaleDateString('fa-IR', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return `
            <div class="flex flex-wrap sm:flex-nowrap items-center justify-between p-2 rounded-xl bg-white border border-brand-border gap-2">
              <div class="min-w-0 flex-1">
                <span class="font-mono-code font-bold text-xs text-brand-950 block truncate">${r.filename}</span>
                <span class="text-[10px] text-brand-700 font-mono-code font-bold">${r.sizeMb} MB • ${dateStr}</span>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <!-- Play Button -->
                <button 
                  type="button" 
                  onclick="openRecordingModal('${encodeURIComponent(r.filename)}', '${r.sizeMb} MB')" 
                  class="btn-brand-emerald px-2.5 py-1 rounded-lg text-[11px] font-bold text-white flex items-center gap-1"
                  title="پخش ویدیو در مرورگر"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                  <span>پخش</span>
                </button>

                <!-- Download Button -->
                <a 
                  href="/api/recordings/download/${encodeURIComponent(r.filename)}" 
                  download 
                  class="btn-brand-primary px-2.5 py-1 rounded-lg text-[11px] font-bold text-white flex items-center gap-1"
                  title="دانلود فایل"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>دانلود</span>
                </a>

                <!-- Delete Button -->
                <button 
                  type="button" 
                  onclick="deleteRecordingFile('${encodeURIComponent(r.filename)}')" 
                  class="btn-brand-rose px-2 py-1 rounded-lg text-[11px] font-bold text-white"
                  title="حذف فایل"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (e) {}
}

window.deleteRecordingFile = async function(filename) {
  if (!confirm('آیا از حذف این فایل ضبط‌شده اطمینان دارید؟')) return;
  try {
    const res = await fetch(`/api/recordings/${filename}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('فایل با موفقیت حذف شد.', 'info');
      fetchRecordings();
    }
  } catch (err) {}
};

window.openRecordingModal = function(encodedFilename, sizeInfo) {
  if (!recordingModal) return;
  const filename = decodeURIComponent(encodedFilename);
  if (modalVideoTitle) modalVideoTitle.textContent = filename;
  if (modalVideoSubtitle) modalVideoSubtitle.textContent = sizeInfo ? `حجم فایل: ${sizeInfo}` : '';
  if (modalDownloadBtn) modalDownloadBtn.href = `/api/recordings/download/${encodedFilename}`;
  if (modalVideoPlayer) {
    modalVideoPlayer.src = `/recordings/${encodedFilename}`;
    recordingModal.classList.remove('hidden');
    modalVideoPlayer.play().catch(() => {});
  }
};

function closeRecordingModal() {
  if (!recordingModal) return;
  if (modalVideoPlayer) {
    modalVideoPlayer.pause();
    modalVideoPlayer.removeAttribute('src');
    modalVideoPlayer.load();
  }
  recordingModal.classList.add('hidden');
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeRecordingModal);
if (modalCloseActionBtn) modalCloseActionBtn.addEventListener('click', closeRecordingModal);
if (recordingModal) {
  recordingModal.addEventListener('click', (e) => {
    if (e.target === recordingModal) closeRecordingModal();
  });
}

if (refreshRecordingsBtn) refreshRecordingsBtn.addEventListener('click', fetchRecordings);

// ====================== Destination Status Badges Helper ======================
function updatePlatformBadge(badgeEl, status) {
  if (!badgeEl) return;
  if (status === 'live') {
    badgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1 shadow-sm';
    badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>متصل (زنده)</span>';
  } else if (status === 'connecting') {
    badgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1 shadow-sm';
    badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span><span>در حال برقراری</span>';
  } else if (status === 'error') {
    badgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 flex items-center gap-1 shadow-sm';
    badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span>قطع ارتباط</span>';
  } else {
    badgeEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1';
    badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span>غیرفعال</span>';
  }
}

// ====================== UI State & Telemetry Updates ======================
function updateUI(data) {
  currentStatus = data.state;

  if (ffmpegBadge && ffmpegDot && ffmpegText) {
    if (data.ffmpegInstalled) {
      ffmpegBadge.classList.remove('text-rose-600');
      ffmpegBadge.classList.add('text-emerald-700');
      ffmpegDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      ffmpegText.textContent = 'موتور پردازش آماده';
    } else {
      ffmpegBadge.classList.remove('text-emerald-700');
      ffmpegBadge.classList.add('text-rose-600');
      ffmpegDot.className = 'w-2 h-2 rounded-full bg-rose-500 animate-pulse';
      ffmpegText.textContent = 'موتور پردازش یافت نشد';
    }
  }

  if (statusPing) statusPing.classList.add('hidden');

  if (data.state === 'live') {
    if (statusPill) statusPill.className = 'flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-sm';
    if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-emerald-500';
    if (statusPing) statusPing.classList.remove('hidden');
    if (statusLabel) statusLabel.textContent = 'پخش زنده فعال';

    if (startBtn) startBtn.disabled = true;
    if (startBtnText) startBtnText.textContent = 'در حال ارسال لایو...';
    if (stopBtn) stopBtn.disabled = false;
    if (restartLiveBtn) restartLiveBtn.classList.remove('hidden');

    if (!hlsInstance && togglePreviewCheckbox && togglePreviewCheckbox.checked && data.previewActive) {
      initHlsPreview();
    }
  } else if (data.state === 'connecting') {
    if (statusPill) statusPill.className = 'flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-300 text-amber-800 shadow-sm';
    if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-ping';
    if (statusLabel) statusLabel.textContent = 'در حال اتصال...';

    if (startBtn) startBtn.disabled = true;
    if (startBtnText) startBtnText.textContent = 'در حال اتصال...';
    if (stopBtn) stopBtn.disabled = false;
    if (restartLiveBtn) restartLiveBtn.classList.add('hidden');

    showPlaceholder('در حال برقراری سیگنال لایو...', 'در حال اتصال به ورودی SRT و آماده‌سازی فید پخش زنده...');
  } else if (data.state === 'stopping') {
    if (statusPill) statusPill.className = 'flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-300 text-rose-800 shadow-sm';
    if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-rose-500 animate-pulse';
    if (statusLabel) statusLabel.textContent = 'در حال توقف...';

    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
    if (restartLiveBtn) restartLiveBtn.classList.add('hidden');
    destroyHlsPreview();

    showPlaceholder('در حال توقف استریم...', 'پردازش در حال بستن اتصالات می‌باشد.');
  } else if (data.state === 'error') {
    if (statusPill) statusPill.className = 'flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-300 text-rose-800 shadow-sm';
    if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-rose-500';
    if (statusLabel) statusLabel.textContent = 'خطا در لایو';

    if (startBtn) {
      startBtn.disabled = false;
      if (startBtnText) startBtnText.textContent = 'شروع مجدد لایو';
    }
    if (stopBtn) stopBtn.disabled = true;
    if (restartLiveBtn) restartLiveBtn.classList.add('hidden');
    destroyHlsPreview();

    showPlaceholder('سیگنال استریم قطع شد', data.statusText || 'ارتباط با ورودی SRT یا مقصد استریم با خطا مواجه شد.');
  } else {
    // Idle
    if (statusPill) statusPill.className = 'flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-white border border-brand-border text-slate-700 shadow-sm';
    if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-slate-400';
    if (statusLabel) statusLabel.textContent = 'آماده (غیرفعال)';

    if (startBtn) {
      startBtn.disabled = false;
      if (startBtnText) startBtnText.textContent = 'شروع ارسال لایو';
    }
    if (stopBtn) stopBtn.disabled = true;
    if (restartLiveBtn) restartLiveBtn.classList.add('hidden');
    destroyHlsPreview();

    showPlaceholder('پخش زنده غیرفعال است', 'برای پخش پیش‌نمایش در موبایل، آدرس ورودی را مشخص کرده و دکمه شروع لایو را بزنید.');
  }

  // Update platform health badges
  if (data.destinationsStatus) {
    updatePlatformBadge(destRubikaStatusBadge, data.destinationsStatus.rubika);
    updatePlatformBadge(destInstaStatusBadge, data.destinationsStatus.instagram);
    updatePlatformBadge(destYouTubeStatusBadge, data.destinationsStatus.youtube);
  }

  // Instant record status
  isManualRecordingActive = !!data.isManualRecording;
  if (instantRecordBtn && manualRecordBadge && manualRecordTimer) {
    if (isManualRecordingActive) {
      instantRecordBtn.className = 'btn-brand-rose px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5';
      instantRecordBtnText.textContent = 'توقف و ذخیره ضبط';
      manualRecordBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse';
      manualRecordBadge.textContent = 'در حال ضبط...';
      manualRecordTimer.textContent = formatSeconds(data.manualRecordUptime || 0);
    } else {
      instantRecordBtn.className = 'btn-brand-primary px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5';
      instantRecordBtnText.textContent = 'شروع ضبط';
      manualRecordBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200';
      manualRecordBadge.textContent = 'آماده';
      manualRecordTimer.textContent = '00:00:00';
    }
  }

  if (detailedStatusText) detailedStatusText.textContent = data.statusText || 'سیستم آماده اتصال است.';

  if (statUptime) statUptime.textContent = formatSeconds(data.uptime || 0);
  if (data.stats) {
    if (statFps) statFps.textContent = `${data.stats.fps || 0} FPS`;
    if (statBitrate) statBitrate.textContent = data.stats.bitrate || '0 kbps';
    if (statDrop) statDrop.textContent = (data.stats.drop || 0).toLocaleString('fa-IR');
  }

  if (Array.isArray(data.logs) && data.logs.length > 0 && terminalBox) {
    const signature = data.logs.join('\n');
    if (signature !== lastLogSignature) {
      lastLogSignature = signature;
      if (logCountBadge) logCountBadge.textContent = `${data.logs.length} خط`;
      terminalBox.innerHTML = data.logs.map(colorizeLog).join('\n');
      if (autoScrollCheckbox && autoScrollCheckbox.checked) {
        terminalBox.scrollTop = terminalBox.scrollHeight;
      }
    }
  }
}

async function pollStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    updateUI(data);
  } catch (err) {}
}

// ====================== Action Handlers ======================
if (startBtn) {
  startBtn.addEventListener('click', async () => {
    const config = getCurrentFormConfig();

    if (!config.srtUrl) {
      showToast('آدرس فید ورودی SRT الزامی است.', 'warning');
      if (srtUrlInput) srtUrlInput.focus();
      return;
    }
    if (!config.srtUrl.toLowerCase().startsWith('srt://')) {
      showToast('آدرس ورودی باید با srt:// آغاز شود.', 'warning');
      if (srtUrlInput) srtUrlInput.focus();
      return;
    }

    const hasValidDest = config.destinations.some(d => d.enabled && d.streamUrl && d.streamKey);
    if (!hasValidDest) {
      showToast('حداقل یک مقصد استریم (روبیکا، اینستاگرام، یوتیوب) باید فعال و دارای کلید باشد.', 'warning');
      return;
    }

    saveActiveSettingsToStorage();

    startBtn.disabled = true;
    if (startBtnText) startBtnText.textContent = 'در حال ارسال دستور...';

    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        showToast(result.message || 'خطا در شروع لایو.', 'error');
        startBtn.disabled = false;
        if (startBtnText) startBtnText.textContent = 'شروع ارسال لایو';
      } else {
        showToast('ارسال استریم با موفقیت آغاز شد.', 'success');
        pollStatus();
        setTimeout(initHlsPreview, 2500);
      }
    } catch (err) {
      showToast(`خطای ارتباط: ${err.message}`, 'error');
      startBtn.disabled = false;
      if (startBtnText) startBtnText.textContent = 'شروع ارسال لایو';
    }
  });
}

if (stopBtn) {
  stopBtn.addEventListener('click', async () => {
    stopBtn.disabled = true;
    try {
      const res = await fetch('/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await res.json();
      showToast(result.message || 'درخواست توقف ارسال شد.', 'info');
      pollStatus();
      fetchRecordings();
    } catch (err) {
      showToast(`خطا در توقف: ${err.message}`, 'error');
      stopBtn.disabled = false;
    }
  });
}

if (restartLiveBtn) {
  restartLiveBtn.addEventListener('click', async () => {
    const ok = confirm('آیا مایل به بازنشانی استریم با تنظیمات و لایه‌های جدید هستید؟');
    if (!ok) return;

    restartLiveBtn.disabled = true;
    showToast('در حال بازنشانی استریم با مشخصات جدید...', 'info');

    try {
      const cfg = getCurrentFormConfig();
      const res = await fetch('/api/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg)
      });
      const data = await res.json();
      if (data.success) {
        showToast('استریم با تنظیمات جدید بازنشانی شد.', 'success');
        setTimeout(initHlsPreview, 2500);
      } else {
        showToast(data.message || 'خطا در بازنشانی استریم.', 'error');
      }
    } catch (e) {
      showToast(`خطا: ${e.message}`, 'error');
    } finally {
      restartLiveBtn.disabled = false;
    }
  });
}

// Terminal tools
if (copyLogsBtn) {
  copyLogsBtn.addEventListener('click', () => {
    const text = terminalBox ? terminalBox.innerText : '';
    if (!text.trim()) {
      showToast('لاگی برای کپی وجود ندارد.', 'info');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      if (copyLogsText) copyLogsText.textContent = 'کپی شد!';
      copyLogsBtn.classList.add('bg-emerald-700', 'text-white');
      setTimeout(() => {
        if (copyLogsText) copyLogsText.textContent = 'کپی لاگ';
        copyLogsBtn.classList.remove('bg-emerald-700', 'text-white');
      }, 2000);
      showToast('لاگ‌ها در حافظه کپی شدند.', 'success');
    }).catch(() => {});
  });
}

if (clearLogsBtn) {
  clearLogsBtn.addEventListener('click', () => {
    if (terminalBox) terminalBox.innerHTML = '<span class="text-slate-500">[کنسول پاکسازی شد]</span>';
    if (logCountBadge) logCountBadge.textContent = '0 خط';
    lastLogSignature = '';
    showToast('ترمینال پاکسازی شد.', 'info');
  });
}

function initPasswordToggles() {
  document.querySelectorAll('.toggle-pwd-btn').forEach(btn => {
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

// ====================== PWA Registration, Install & Offline State ======================
let deferredInstallPrompt = null;

function initPWA() {
  const installBtn = document.getElementById('installPwaBtn');
  const offlineBanner = document.getElementById('offlineBanner');

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    });
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (installBtn && !isStandalone) {
    // Capture standard Chromium/Android/Desktop install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      installBtn.classList.remove('hidden');
    });

    // On iOS Safari (outside standalone), show install button with Add to Home Screen guide
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
      showToast('اپلیکیشن استودیو به دستگاه شما اضافه شد.', 'success');
    });
  }

  // Network Online/Offline status
  function updateNetworkBanner() {
    if (!offlineBanner) return;
    if (navigator.onLine) {
      offlineBanner.classList.add('hidden');
    } else {
      offlineBanner.classList.remove('hidden');
    }
  }

  window.addEventListener('online', () => {
    updateNetworkBanner();
    showToast('اتصال اینترنت برقرار شد.', 'success');
    pollStatus();
  });

  window.addEventListener('offline', () => {
    updateNetworkBanner();
    showToast('اتصال اینترنت قطع شده است.', 'warning');
  });

  updateNetworkBanner();
}

// ====================== Mobile Bottom Navigation Controller ======================
function initMobileNavigation() {
  const nav = document.getElementById('mobileBottomNav');
  if (!nav) return;

  const buttons = nav.querySelectorAll('.mobile-nav-btn');
  const sections = document.querySelectorAll('[data-mobile-section]');

  function activateTab(tabName) {
    buttons.forEach(btn => {
      const isMatch = btn.getAttribute('data-nav-tab') === tabName;
      btn.classList.toggle('is-active', isMatch);
    });

    sections.forEach(sec => {
      const secType = sec.getAttribute('data-mobile-section');
      if (tabName === 'all' || secType === 'always' || secType === tabName) {
        sec.classList.remove('mobile-section-hidden');
      } else {
        sec.classList.add('mobile-section-hidden');
      }
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-nav-tab') || 'all';
      activateTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  activateTab('all');
}

// ====================== Application Bootstrapping ======================
window.addEventListener('DOMContentLoaded', () => {
  initPWA();
  initMobileNavigation();
  initPasswordToggles();
  renderProfileDropdown();
  loadScenesFromStorage();
  loadOverlaysFromStorage();
  loadActiveSettingsFromStorage();
  updatePlayerAspectRatio();
  pollStatus();
  fetchRecordings();
  setInterval(pollStatus, 1000);
  setInterval(fetchRecordings, 10000);
});
