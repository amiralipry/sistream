// Studio Configuration: Multi-Image Overlays, Custom Scenes & Platform Profiles
import { showToast, escapeHtml } from './ui.js';
import { updatePlayerAspectRatio } from './preview.js';

const srtUrlInput = document.getElementById('srtUrl');
const destRubikaEnable = document.getElementById('destRubikaEnable');
const destRubikaUrl = document.getElementById('destRubikaUrl');
const destRubikaKey = document.getElementById('destRubikaKey');

const destYouTubeEnable = document.getElementById('destYouTubeEnable');
const destYouTubeUrl = document.getElementById('destYouTubeUrl');
const destYouTubeKey = document.getElementById('destYouTubeKey');
const destYouTubeAspect = document.getElementById('destYouTubeAspect');
const destYouTubeFitMode = document.getElementById('destYouTubeFitMode');
const destYouTubeBitrate = document.getElementById('destYouTubeBitrate');

const destInstaEnable = document.getElementById('destInstaEnable');
const destInstaUrl = document.getElementById('destInstaUrl');
const destInstaKey = document.getElementById('destInstaKey');
const destInstaAntiCrop = document.getElementById('destInstaAntiCrop');
const destInstaAntiCropMargin = document.getElementById('destInstaAntiCropMargin');
const destInstaAntiCropMarginVal = document.getElementById('destInstaAntiCropMarginVal');

const videoWidthInput = document.getElementById('videoWidth');
const videoHeightInput = document.getElementById('videoHeight');
const videoBitrateInput = document.getElementById('videoBitrate');
const targetFpsSelect = document.getElementById('targetFps');
const videoRotationSelect = document.getElementById('videoRotation');
const scalingModeSelect = document.getElementById('scalingMode');
const passthroughCheckbox = document.getElementById('passthroughCheckbox');
const filterControlsGroup = document.getElementById('filterControlsGroup');
const autoRecordCheckbox = document.getElementById('autoRecordCheckbox');

const newSceneNameInput = document.getElementById('newSceneNameInput');
const addNewSceneBtn = document.getElementById('addNewSceneBtn');
const scenesContainer = document.getElementById('scenesContainer');

const addNewOverlayBtn = document.getElementById('addNewOverlayBtn');
const overlaysContainer = document.getElementById('overlaysContainer');

const profileSelect = document.getElementById('profileSelect');
const profileNameInput = document.getElementById('profileNameInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const loadProfileBtn = document.getElementById('loadProfileBtn');
const deleteProfileBtn = document.getElementById('deleteProfileBtn');

const PROFILES_STORAGE_KEY = 'rubika_studio_profiles_v5';
const ACTIVE_SETTINGS_KEY = 'rubika_studio_config_v5';
const OVERLAYS_STORAGE_KEY = 'rubika_studio_overlays_v5';
const SCENES_STORAGE_KEY = 'rubika_studio_scenes_v5';

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

let overlaysList = [];
let currentSceneName = 'scene_live';
let scenesList = [
  { id: 'scene_live', name: 'صحنه اصلی زنده', desc: 'فید مستقیم بدون نشان', overlaysEnabled: false, isDefault: true },
  { id: 'scene_logo', name: 'تصویر با نشان و لوگو', desc: 'پخش زنده همراه لایه‌ها', overlaysEnabled: true, isDefault: true },
  { id: 'scene_standby', name: 'کارت انتظار استندبای', desc: 'پرده پیش از آغاز پخش', overlaysEnabled: false, isDefault: true },
  { id: 'scene_mute', name: 'حالت سکوت استودیو', desc: 'تصویر زنده با قطع صدا', overlaysEnabled: false, isDefault: true }
];

let onConfigMutated = () => {};

export function bindConfigMutatedCallback(fn) {
  onConfigMutated = fn;
}

function notifyConfigChange() {
  saveActiveSettingsToStorage();
  onConfigMutated();
}

// ====================== Multi-Image Overlays ======================
function saveOverlaysToStorage() {
  localStorage.setItem(OVERLAYS_STORAGE_KEY, JSON.stringify(overlaysList));
}

function loadOverlaysFromStorage() {
  try {
    const raw = localStorage.getItem(OVERLAYS_STORAGE_KEY);
    overlaysList = raw ? JSON.parse(raw) : [];
  } catch (_) {
    overlaysList = [];
  }
  renderOverlaysList();
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

  overlaysContainer.innerHTML = overlaysList
    .map((ov, index) => {
      const hasImage = Boolean(ov.path);
      return `
        <div class="p-3 rounded-2xl border border-brand-border/80 bg-white/90 space-y-2.5 shadow-xs" data-overlay-id="${ov.id}">
          <div class="flex items-center justify-between pb-1.5 border-b border-brand-border/40">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${ov.enabled ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
              <span class="text-xs font-bold text-brand-950">${escapeHtml(ov.name || `لایه تصویر ${index + 1}`)}</span>
            </div>

            <div class="flex items-center gap-2">
              <label class="apple-toggle flex items-center gap-1.5" title="فعال/غیرفعال‌سازی این لایه">
                <input type="checkbox" class="apple-toggle-input overlay-toggle-input" data-index="${index}" ${ov.enabled ? 'checked' : ''}>
                <span class="apple-toggle-track"><span class="apple-toggle-thumb"></span></span>
              </label>

              <button type="button" class="btn-brand-rose px-2 py-1 text-[11px] font-bold rounded-lg overlay-delete-btn" data-index="${index}" title="حذف این لایه">
                حذف
              </button>
            </div>
          </div>

          <div class="flex items-center gap-3">
            ${
              hasImage
                ? `
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
            `
                : `
              <label class="w-full py-2.5 px-3 rounded-xl border border-dashed border-brand-primary/40 bg-brand-50/50 hover:bg-brand-50 cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-brand-900 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>انتخاب فایل لوگو / نشان</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden overlay-file-input" data-index="${index}">
              </label>
            `
            }
          </div>

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

          <div class="space-y-1.5 pt-1 border-t border-brand-border/40 text-[11px]">
            <div class="flex items-center gap-2">
              <span class="text-slate-500 text-[10px] shrink-0 w-16">فاصله افقی:</span>
              <input type="range" min="0" max="400" value="${ov.marginX || 25}" class="w-full accent-brand-900 h-1 bg-slate-200 rounded cursor-pointer overlay-marginX-slider" data-index="${index}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.marginX || 25}px</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-slate-500 text-[10px] shrink-0 w-16">فاصله عمودی:</span>
              <input type="range" min="0" max="400" value="${ov.marginY || 25}" class="w-full accent-brand-900 h-1 bg-slate-200 rounded cursor-pointer overlay-marginY-slider" data-index="${index}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.marginY || 25}px</span>
            </div>

            <div class="flex items-center gap-2 ${ov.position === 'full_frame' ? 'opacity-40 pointer-events-none' : ''}">
              <span class="text-slate-500 text-[10px] shrink-0 w-16">اندازه نشان:</span>
              <input type="range" min="5" max="100" value="${ov.scale || 20}" class="w-full accent-brand-900 h-1 bg-slate-200 rounded cursor-pointer overlay-scale-slider" data-index="${index}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.position === 'full_frame' ? 'کامل' : `${ov.scale || 20}%`}</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-slate-500 text-[10px] shrink-0 w-16">شفافیت:</span>
              <input type="range" min="10" max="100" value="${ov.opacity || 100}" class="w-full accent-brand-900 h-1 bg-slate-200 rounded cursor-pointer overlay-opacity-slider" data-index="${index}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.opacity || 100}%</span>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  attachOverlayEventListeners();
}

function attachOverlayEventListeners() {
  if (!overlaysContainer) return;

  overlaysContainer.querySelectorAll('.overlay-toggle-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList[idx].enabled = e.target.checked;
        saveOverlaysToStorage();
        notifyConfigChange();
      }
    });
  });

  overlaysContainer.querySelectorAll('.overlay-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
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

  overlaysContainer.querySelectorAll('.overlay-file-input').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const idx = parseInt(input.getAttribute('data-index'), 10);
      const file = e.target.files[0];
      if (!file || !overlaysList[idx]) return;

      const formData = new FormData();
      formData.append('overlay', file);

      try {
        showToast('در حال بارگذاری تصویر نشان...', 'info');
        const res = await fetch('/api/upload-overlay', { method: 'POST', body: formData });
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

  overlaysContainer.querySelectorAll('.overlay-position-select').forEach((sel) => {
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList[idx].position = sel.value;
        saveOverlaysToStorage();
        renderOverlaysList();
        notifyConfigChange();
      }
    });
  });

  overlaysContainer.querySelectorAll('.overlay-rotation-select').forEach((sel) => {
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.getAttribute('data-index'), 10);
      if (overlaysList[idx]) {
        overlaysList[idx].rotation = sel.value;
        saveOverlaysToStorage();
        notifyConfigChange();
      }
    });
  });

  const bindRange = (selector, prop, unit) => {
    overlaysContainer.querySelectorAll(selector).forEach((slider) => {
      slider.addEventListener('input', () => {
        const idx = parseInt(slider.getAttribute('data-index'), 10);
        if (overlaysList[idx]) {
          overlaysList[idx][prop] = parseInt(slider.value, 10);
          saveOverlaysToStorage();
          const display = slider.parentElement.querySelector('span:last-child');
          if (display) display.textContent = `${slider.value}${unit}`;
          notifyConfigChange();
        }
      });
    });
  };

  bindRange('.overlay-marginX-slider', 'marginX', 'px');
  bindRange('.overlay-marginY-slider', 'marginY', 'px');
  bindRange('.overlay-scale-slider', 'scale', '%');
  bindRange('.overlay-opacity-slider', 'opacity', '%');
}

// ====================== Custom Scenes ======================
function saveScenesToStorage() {
  localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenesList));
}

function loadScenesFromStorage() {
  try {
    const raw = localStorage.getItem(SCENES_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) scenesList = stored;
    }
  } catch (_) {}
  renderScenesList();
}

function renderScenesList() {
  if (!scenesContainer) return;

  scenesContainer.innerHTML = scenesList
    .map((sc) => {
      const isActive = currentSceneName === sc.id || currentSceneName === sc.name;
      return `
        <div
          class="scene-btn p-2.5 rounded-xl border-2 ${isActive ? 'border-brand-900 bg-brand-50 shadow-sm' : 'border-brand-border bg-white hover:bg-slate-50'} text-right flex flex-col justify-between transition-all relative group"
          data-scene-id="${sc.id}"
        >
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-bold truncate ${isActive ? 'text-brand-950 font-black' : 'text-slate-800'}">${escapeHtml(sc.name)}</span>
            ${
              !sc.isDefault
                ? `<button type="button" class="text-slate-400 hover:text-rose-600 text-sm delete-scene-btn px-1 shrink-0" data-scene-id="${sc.id}" title="حذف این سکانس">&times;</button>`
                : ''
            }
          </div>
          <span class="text-[10px] text-slate-500 mt-1 block truncate">${escapeHtml(sc.desc || '')}</span>
        </div>
      `;
    })
    .join('');

  attachSceneEventListeners();
}

function attachSceneEventListeners() {
  if (!scenesContainer) return;

  scenesContainer.querySelectorAll('.scene-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (e.target.classList.contains('delete-scene-btn')) return;
      const scId = btn.getAttribute('data-scene-id');
      const sc = scenesList.find((s) => s.id === scId);
      if (!sc) return;

      currentSceneName = sc.id;
      renderScenesList();

      if (sc.overlaysEnabled !== undefined) {
        overlaysList.forEach((ov) => {
          ov.enabled = sc.overlaysEnabled;
        });
        saveOverlaysToStorage();
        renderOverlaysList();
      }

      try {
        await fetch('/api/scene/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene: sc.name })
        });
      } catch (_) {}

      notifyConfigChange();
      showToast(`سکانس «${sc.name}» فعال شد.`, 'success');
    });
  });

  scenesContainer.querySelectorAll('.delete-scene-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const scId = btn.getAttribute('data-scene-id');
      const idx = scenesList.findIndex((s) => s.id === scId);
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

// ====================== Profiles & Active Config ======================
function getStoredProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    return raw ? { ...DEFAULT_PROFILES, ...JSON.parse(raw) } : { ...DEFAULT_PROFILES };
  } catch (_) {
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
  Object.keys(profiles).forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    profileSelect.appendChild(opt);
  });
}

export function getCurrentFormConfig() {
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
      bitrate: destYouTubeBitrate ? parseInt(destYouTubeBitrate.value, 10) || 3500 : 3500,
      width: destYouTubeAspect && destYouTubeAspect.value === 'vertical' ? 720 : 1280,
      height: destYouTubeAspect && destYouTubeAspect.value === 'vertical' ? 1280 : 720
    },
    {
      name: 'اینستاگرام',
      streamUrl: destInstaUrl.value.trim(),
      streamKey: destInstaKey.value.trim(),
      enabled: destInstaEnable.checked,
      instaAntiCrop: destInstaAntiCrop ? destInstaAntiCrop.checked : true,
      instaAntiCropMargin: destInstaAntiCropMargin ? parseInt(destInstaAntiCropMargin.value, 10) || 15 : 15
    }
  ];

  return {
    srtUrl: srtUrlInput.value.trim(),
    destinations,
    destYouTubeAspect: destYouTubeAspect ? destYouTubeAspect.value : 'horizontal',
    destYouTubeFitMode: destYouTubeFitMode ? destYouTubeFitMode.value : 'blur',
    destYouTubeBitrate: destYouTubeBitrate ? parseInt(destYouTubeBitrate.value, 10) || 3500 : 3500,
    destInstaAntiCrop: destInstaAntiCrop ? destInstaAntiCrop.checked : true,
    instaAntiCropMargin: destInstaAntiCropMargin ? parseInt(destInstaAntiCropMargin.value, 10) || 15 : 15,
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

export function saveActiveSettingsToStorage() {
  localStorage.setItem(ACTIVE_SETTINGS_KEY, JSON.stringify(getCurrentFormConfig()));
}

function handlePassthroughToggle() {
  const isPass = passthroughCheckbox.checked;
  if (filterControlsGroup) {
    filterControlsGroup.classList.toggle('opacity-40', isPass);
    filterControlsGroup.classList.toggle('pointer-events-none', isPass);
  }
  if (overlaysContainer) {
    overlaysContainer.classList.toggle('opacity-40', isPass);
    overlaysContainer.classList.toggle('pointer-events-none', isPass);
  }
  notifyConfigChange();
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
    cfg.destinations.forEach((d) => {
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

function loadActiveSettingsFromStorage() {
  try {
    const raw = localStorage.getItem(ACTIVE_SETTINGS_KEY);
    if (raw) applyConfigToForm(JSON.parse(raw));
  } catch (_) {}
}

export function initStudioControls() {
  renderProfileDropdown();
  loadScenesFromStorage();
  loadOverlaysFromStorage();
  loadActiveSettingsFromStorage();

  if (destInstaAntiCropMargin) {
    destInstaAntiCropMargin.addEventListener('input', () => {
      if (destInstaAntiCropMarginVal) {
        destInstaAntiCropMarginVal.textContent = `${destInstaAntiCropMargin.value}%`;
      }
      notifyConfigChange();
    });
  }

  if (addNewOverlayBtn) {
    addNewOverlayBtn.addEventListener('click', () => {
      overlaysList.push({
        id: `ov_${Date.now()}`,
        name: `نشان ${overlaysList.length + 1}`,
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

  if (addNewSceneBtn && newSceneNameInput) {
    addNewSceneBtn.addEventListener('click', () => {
      const name = newSceneNameInput.value.trim();
      if (!name) {
        showToast('نامی برای سکانس جدید وارد کنید.', 'warning');
        newSceneNameInput.focus();
        return;
      }

      scenesList.push({
        id: `scene_${Date.now()}`,
        name,
        desc: 'سکانس سفارشی ایجادشده توسط کاربر',
        overlaysEnabled: overlaysList.some((o) => o.enabled),
        isDefault: false
      });
      saveScenesToStorage();
      newSceneNameInput.value = '';
      renderScenesList();
      showToast(`سکانس «${name}» با موفقیت ایجاد شد.`, 'success');
    });
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

  [
    srtUrlInput,
    destRubikaEnable,
    destRubikaUrl,
    destRubikaKey,
    destYouTubeEnable,
    destYouTubeUrl,
    destYouTubeKey,
    destYouTubeAspect,
    destYouTubeFitMode,
    destYouTubeBitrate,
    destInstaEnable,
    destInstaUrl,
    destInstaKey,
    destInstaAntiCrop,
    videoWidthInput,
    videoHeightInput,
    videoBitrateInput,
    targetFpsSelect,
    videoRotationSelect,
    scalingModeSelect,
    autoRecordCheckbox
  ]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener('change', () => {
        updatePlayerAspectRatio();
        notifyConfigChange();
      });
      el.addEventListener('input', () => {
        updatePlayerAspectRatio();
        notifyConfigChange();
      });
    });

  if (passthroughCheckbox) {
    passthroughCheckbox.addEventListener('change', handlePassthroughToggle);
  }
}
