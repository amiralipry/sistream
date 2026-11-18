// Studio Configuration: Per-Platform Profiles & Popup Settings, Multi-Image Overlays & Custom Scenes
import { showToast, showConfirmModal, escapeHtml } from './ui.js';
import { updatePlayerAspectRatio } from './preview.js';

// Core Inputs
const srtUrlInput = document.getElementById('srtUrl');
const destRubikaEnable = document.getElementById('destRubikaEnable');
const destInstaEnable = document.getElementById('destInstaEnable');
const destYouTubeEnable = document.getElementById('destYouTubeEnable');

const rubikaQuickProfile = document.getElementById('rubikaQuickProfile');
const instaQuickProfile = document.getElementById('instaQuickProfile');
const youtubeQuickProfile = document.getElementById('youtubeQuickProfile');

const rubikaSummaryText = document.getElementById('rubikaSummaryText');
const instaSummaryText = document.getElementById('instaSummaryText');
const youtubeSummaryText = document.getElementById('youtubeSummaryText');

// Video Encoding
const videoWidthInput = document.getElementById('videoWidth');
const videoHeightInput = document.getElementById('videoHeight');
const videoBitrateInput = document.getElementById('videoBitrate');
const targetFpsSelect = document.getElementById('targetFps');
const videoRotationSelect = document.getElementById('videoRotation');
const scalingModeSelect = document.getElementById('scalingMode');
const passthroughCheckbox = document.getElementById('passthroughCheckbox');
const filterControlsGroup = document.getElementById('filterControlsGroup');
const autoRecordCheckbox = document.getElementById('autoRecordCheckbox');

// Scenes & Overlays
const newSceneNameInput = document.getElementById('newSceneNameInput');
const addNewSceneBtn = document.getElementById('addNewSceneBtn');
const scenesContainer = document.getElementById('scenesContainer');
const addNewOverlayBtn = document.getElementById('addNewOverlayBtn');
const overlaysContainer = document.getElementById('overlaysContainer');

// Platform Config Popup Modal Elements
const platformConfigModal = document.getElementById('platformConfigModal');
const platformConfigCard = document.getElementById('platformConfigCard');
const platformModalIcon = document.getElementById('platformModalIcon');
const platformModalTitle = document.getElementById('platformModalTitle');
const platformModalSubtitle = document.getElementById('platformModalSubtitle');
const closePlatformModalBtn = document.getElementById('closePlatformModalBtn');
const platformProfileCount = document.getElementById('platformProfileCount');
const modalPlatformProfileSelect = document.getElementById('modalPlatformProfileSelect');
const modalPlatformProfileName = document.getElementById('modalPlatformProfileName');
const modalSavePlatformProfileBtn = document.getElementById('modalSavePlatformProfileBtn');
const modalDeletePlatformProfileBtn = document.getElementById('modalDeletePlatformProfileBtn');
const modalPlatformUrl = document.getElementById('modalPlatformUrl');
const modalPlatformKey = document.getElementById('modalPlatformKey');
const modalRubikaOptions = document.getElementById('modalRubikaOptions');
const modalInstaOptions = document.getElementById('modalInstaOptions');
const modalInstaAntiCrop = document.getElementById('modalInstaAntiCrop');
const modalInstaMarginBox = document.getElementById('modalInstaMarginBox');
const modalInstaAntiCropMargin = document.getElementById('modalInstaAntiCropMargin');
const modalInstaAntiCropMarginVal = document.getElementById('modalInstaAntiCropMarginVal');
const modalYouTubeOptions = document.getElementById('modalYouTubeOptions');
const modalYouTubeAspect = document.getElementById('modalYouTubeAspect');
const modalYouTubeFitMode = document.getElementById('modalYouTubeFitMode');
const modalYouTubeBitrate = document.getElementById('modalYouTubeBitrate');
const modalApplyPlatformBtn = document.getElementById('modalApplyPlatformBtn');
const modalCancelPlatformBtn = document.getElementById('modalCancelPlatformBtn');

// Storage Keys
const ACTIVE_SETTINGS_KEY = 'rubika_studio_config_v6';
const LEGACY_SETTINGS_KEY = 'rubika_studio_config_v5';
const PLATFORM_PROFILES_KEY = 'rubika_studio_platform_profiles_v1';
const OVERLAYS_STORAGE_KEY = 'rubika_studio_overlays_v5';
const SCENES_STORAGE_KEY = 'rubika_studio_scenes_v5';

// Platform Metadata
const PLATFORM_META = {
  rubika: {
    label: 'روبیکا',
    subtitle: 'مدیریت پروفایل‌ها، سرور RTMP و کلید پخش روبیکا',
    urlPlaceholder: 'rtmp://live.rubika.ir/live یا IP اختصاصی',
    keyPlaceholder: 'کلید پخش روبیکا',
    iconClass: 'w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0',
    iconSvg:
      '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>'
  },
  instagram: {
    label: 'اینستاگرام',
    subtitle: 'مدیریت پروفایل‌ها، کلید پخش و حاشیه امن ضد برش اینستاگرام',
    urlPlaceholder: 'rtmps://live-upload.instagram.com:443/rtmp/',
    keyPlaceholder: 'کلید پخش اینستاگرام',
    iconClass: 'w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0',
    iconSvg:
      '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="5" stroke-width="2" /><circle cx="12" cy="12" r="4" stroke-width="2" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>'
  },
  youtube: {
    label: 'یوتیوب',
    subtitle: 'مدیریت پروفایل‌ها، کلید پخش و کادربندی یوتیوب',
    urlPlaceholder: 'rtmp://a.rtmp.youtube.com/live2',
    keyPlaceholder: 'کلید پخش یوتیوب',
    iconClass: 'w-9 h-9 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0',
    iconSvg:
      '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><rect x="2" y="5" width="20" height="14" rx="4" stroke-width="2" /></svg>'
  }
};

// Built-in Default Profiles per Social Platform
const DEFAULT_PLATFORM_PROFILES = {
  rubika: {
    'پیش‌فرض روبیکا (تمام‌کادر)': {
      streamUrl: 'rtmp://live.rubika.ir/live',
      streamKey: ''
    }
  },
  instagram: {
    'اینستاگرام - حاشیه امن ۱۵٪': {
      streamUrl: 'rtmps://live-upload.instagram.com:443/rtmp/',
      streamKey: '',
      instaAntiCrop: true,
      instaAntiCropMargin: 15
    },
    'اینستاگرام - بدون حاشیه': {
      streamUrl: 'rtmps://live-upload.instagram.com:443/rtmp/',
      streamKey: '',
      instaAntiCrop: false,
      instaAntiCropMargin: 15
    }
  },
  youtube: {
    'یوتیوب - افقی ۱۶:۹ (تاری کناره‌ها)': {
      streamUrl: 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: '',
      aspect: 'horizontal',
      ytFitMode: 'blur',
      bitrate: 3500
    },
    'یوتیوب - عمودی شورتز ۹:۱۶': {
      streamUrl: 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: '',
      aspect: 'vertical',
      ytFitMode: 'blur',
      bitrate: 2800
    }
  }
};

// Active State per Platform
const platformState = {
  rubika: {
    enabled: true,
    activeProfile: 'پیش‌فرض روبیکا (تمام‌کادر)',
    streamUrl: 'rtmp://live.rubika.ir/live',
    streamKey: ''
  },
  instagram: {
    enabled: false,
    activeProfile: 'اینستاگرام - حاشیه امن ۱۵٪',
    streamUrl: 'rtmps://live-upload.instagram.com:443/rtmp/',
    streamKey: '',
    instaAntiCrop: true,
    instaAntiCropMargin: 15
  },
  youtube: {
    enabled: false,
    activeProfile: 'یوتیوب - افقی ۱۶:۹ (تاری کناره‌ها)',
    streamUrl: 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: '',
    aspect: 'horizontal',
    ytFitMode: 'blur',
    bitrate: 3500
  }
};

let activeModalPlatform = null;
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

// ====================== Per-Platform Profile Store ======================
function getAllPlatformProfiles() {
  const base = {
    rubika: { ...DEFAULT_PLATFORM_PROFILES.rubika },
    instagram: { ...DEFAULT_PLATFORM_PROFILES.instagram },
    youtube: { ...DEFAULT_PLATFORM_PROFILES.youtube }
  };

  try {
    const raw = localStorage.getItem(PLATFORM_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      ['rubika', 'instagram', 'youtube'].forEach((key) => {
        if (parsed[key] && typeof parsed[key] === 'object') {
          base[key] = { ...base[key], ...parsed[key] };
        }
      });
    }
  } catch (_) {}

  return base;
}

function saveAllPlatformProfiles(allProfiles) {
  localStorage.setItem(PLATFORM_PROFILES_KEY, JSON.stringify(allProfiles));
  renderAllQuickProfileSelects();
}

function renderQuickProfileSelect(platformKey, selectEl) {
  if (!selectEl) return;
  const profiles = getAllPlatformProfiles()[platformKey] || {};
  const names = Object.keys(profiles);
  selectEl.innerHTML = '';
  names.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    selectEl.appendChild(opt);
  });

  if (platformState[platformKey].activeProfile && profiles[platformState[platformKey].activeProfile]) {
    selectEl.value = platformState[platformKey].activeProfile;
  } else if (names.length > 0) {
    selectEl.value = names[0];
    platformState[platformKey].activeProfile = names[0];
  }
}

function renderAllQuickProfileSelects() {
  renderQuickProfileSelect('rubika', rubikaQuickProfile);
  renderQuickProfileSelect('instagram', instaQuickProfile);
  renderQuickProfileSelect('youtube', youtubeQuickProfile);
}

function applyProfileToPlatform(platformKey, profileName, silent = false) {
  const profiles = getAllPlatformProfiles()[platformKey] || {};
  const prof = profiles[profileName];
  if (!prof) return;

  platformState[platformKey] = {
    ...platformState[platformKey],
    ...prof,
    activeProfile: profileName
  };

  updatePlatformSummaries();
  renderAllQuickProfileSelects();
  notifyConfigChange();

  if (!silent) {
    showToast(`پروفایل «${profileName}» برای ${PLATFORM_META[platformKey].label} اعمال شد.`, 'info');
  }
}

function updatePlatformSummaries() {
  // Rubika
  if (rubikaSummaryText) {
    const r = platformState.rubika;
    const keyTag = r.streamKey ? 'کلید ثبت شده' : 'کلید تنظیم نشده';
    rubikaSummaryText.textContent = `تمام‌کادر ۷۲۰×۱۲۸۰ • ${keyTag}`;
    rubikaSummaryText.className = `text-[10px] truncate mt-0.5 ${r.streamKey ? 'text-slate-500' : 'text-amber-600 font-semibold'}`;
  }

  // Instagram
  if (instaSummaryText) {
    const ig = platformState.instagram;
    const keyTag = ig.streamKey ? 'کلید ثبت شده' : 'کلید تنظیم نشده';
    const cropTag = ig.instaAntiCrop !== false ? `حاشیه امن ${ig.instaAntiCropMargin || 15}٪` : 'تمام‌کادر بدون حاشیه';
    instaSummaryText.textContent = `${cropTag} • ${keyTag}`;
    instaSummaryText.className = `text-[10px] truncate mt-0.5 ${ig.streamKey ? 'text-slate-500' : 'text-amber-600 font-semibold'}`;
  }

  // YouTube
  if (youtubeSummaryText) {
    const yt = platformState.youtube;
    const keyTag = yt.streamKey ? 'کلید ثبت شده' : 'کلید تنظیم نشده';
    const aspectTag = yt.aspect === 'vertical' ? 'عمودی ۹:۱۶' : 'افقی ۱۶:۹';
    youtubeSummaryText.textContent = `${aspectTag} • ${yt.bitrate || 3500}k • ${keyTag}`;
    youtubeSummaryText.className = `text-[10px] truncate mt-0.5 ${yt.streamKey ? 'text-slate-500' : 'text-amber-600 font-semibold'}`;
  }
}

// ====================== Platform Settings Popup Modal ======================
function renderModalProfilesDropdown(platformKey, preferredName = null) {
  if (!modalPlatformProfileSelect) return;
  const profiles = getAllPlatformProfiles()[platformKey] || {};
  const names = Object.keys(profiles);

  modalPlatformProfileSelect.innerHTML = '';
  names.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    modalPlatformProfileSelect.appendChild(opt);
  });

  if (preferredName && profiles[preferredName]) {
    modalPlatformProfileSelect.value = preferredName;
  } else if (platformState[platformKey].activeProfile && profiles[platformState[platformKey].activeProfile]) {
    modalPlatformProfileSelect.value = platformState[platformKey].activeProfile;
  }

  if (platformProfileCount) {
    platformProfileCount.textContent = `${names.length.toLocaleString('fa-IR')} پروفایل`;
  }
}

function populateModalFieldsFromData(platformKey, data) {
  if (modalPlatformUrl) modalPlatformUrl.value = data.streamUrl || '';
  if (modalPlatformKey) {
    modalPlatformKey.value = data.streamKey || '';
    modalPlatformKey.type = 'password';
    const pwdBtn = platformConfigModal?.querySelector('.toggle-pwd-btn');
    if (pwdBtn) {
      pwdBtn.querySelector('.eye-open')?.classList.remove('hidden');
      pwdBtn.querySelector('.eye-closed')?.classList.add('hidden');
    }
  }

  if (platformKey === 'instagram') {
    const antiCrop = data.instaAntiCrop !== false;
    const margin = Math.max(5, Math.min(35, parseInt(data.instaAntiCropMargin, 10) || 15));
    if (modalInstaAntiCrop) modalInstaAntiCrop.checked = antiCrop;
    if (modalInstaAntiCropMargin) modalInstaAntiCropMargin.value = margin;
    if (modalInstaAntiCropMarginVal) modalInstaAntiCropMarginVal.textContent = `${margin}%`;
    if (modalInstaMarginBox) {
      modalInstaMarginBox.classList.toggle('opacity-40', !antiCrop);
      modalInstaMarginBox.classList.toggle('pointer-events-none', !antiCrop);
    }
  } else if (platformKey === 'youtube') {
    if (modalYouTubeAspect) modalYouTubeAspect.value = data.aspect || 'horizontal';
    if (modalYouTubeFitMode) modalYouTubeFitMode.value = data.ytFitMode || 'blur';
    if (modalYouTubeBitrate) modalYouTubeBitrate.value = parseInt(data.bitrate, 10) || 3500;
  }
}

function collectModalFields(platformKey) {
  const base = {
    streamUrl: modalPlatformUrl ? modalPlatformUrl.value.trim() : '',
    streamKey: modalPlatformKey ? modalPlatformKey.value.trim() : ''
  };

  if (platformKey === 'instagram') {
    base.instaAntiCrop = modalInstaAntiCrop ? modalInstaAntiCrop.checked : true;
    base.instaAntiCropMargin = modalInstaAntiCropMargin ? parseInt(modalInstaAntiCropMargin.value, 10) || 15 : 15;
  } else if (platformKey === 'youtube') {
    base.aspect = modalYouTubeAspect ? modalYouTubeAspect.value : 'horizontal';
    base.ytFitMode = modalYouTubeFitMode ? modalYouTubeFitMode.value : 'blur';
    base.bitrate = modalYouTubeBitrate ? parseInt(modalYouTubeBitrate.value, 10) || 3500 : 3500;
  }

  return base;
}

function openPlatformModal(platformKey) {
  if (!platformConfigModal || !PLATFORM_META[platformKey]) return;
  activeModalPlatform = platformKey;
  const meta = PLATFORM_META[platformKey];

  if (platformModalIcon) {
    platformModalIcon.className = meta.iconClass;
    platformModalIcon.innerHTML = meta.iconSvg;
  }
  if (platformModalTitle) platformModalTitle.textContent = `تنظیمات و پروفایل‌های ${meta.label}`;
  if (platformModalSubtitle) platformModalSubtitle.textContent = meta.subtitle;
  if (modalPlatformUrl) modalPlatformUrl.placeholder = meta.urlPlaceholder;
  if (modalPlatformKey) modalPlatformKey.placeholder = meta.keyPlaceholder;
  if (modalPlatformProfileName) modalPlatformProfileName.value = '';

  // Toggle platform-specific option panels
  if (modalRubikaOptions) modalRubikaOptions.classList.toggle('hidden', platformKey !== 'rubika');
  if (modalInstaOptions) modalInstaOptions.classList.toggle('hidden', platformKey !== 'instagram');
  if (modalYouTubeOptions) modalYouTubeOptions.classList.toggle('hidden', platformKey !== 'youtube');

  renderModalProfilesDropdown(platformKey);
  populateModalFieldsFromData(platformKey, platformState[platformKey]);

  platformConfigModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    platformConfigModal.classList.remove('opacity-0');
    if (platformConfigCard) platformConfigCard.classList.remove('scale-95', 'opacity-0');
  });
}

function closePlatformModal() {
  if (!platformConfigModal) return;
  platformConfigModal.classList.add('opacity-0');
  if (platformConfigCard) platformConfigCard.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    platformConfigModal.classList.add('hidden');
    activeModalPlatform = null;
  }, 180);
}

function initPlatformModalHandlers() {
  document.querySelectorAll('[data-open-platform]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openPlatformModal(btn.getAttribute('data-open-platform'));
    });
  });

  if (closePlatformModalBtn) closePlatformModalBtn.addEventListener('click', closePlatformModal);
  if (modalCancelPlatformBtn) modalCancelPlatformBtn.addEventListener('click', closePlatformModal);
  if (platformConfigModal) {
    platformConfigModal.addEventListener('click', (e) => {
      if (e.target === platformConfigModal) closePlatformModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && platformConfigModal && !platformConfigModal.classList.contains('hidden')) {
      const confirmModal = document.getElementById('confirmModal');
      if (confirmModal && !confirmModal.classList.contains('hidden')) return;
      closePlatformModal();
    }
  });

  // Instagram margin slider inside popup
  if (modalInstaAntiCropMargin) {
    modalInstaAntiCropMargin.addEventListener('input', () => {
      if (modalInstaAntiCropMarginVal) {
        modalInstaAntiCropMarginVal.textContent = `${modalInstaAntiCropMargin.value}%`;
      }
    });
  }

  if (modalInstaAntiCrop) {
    modalInstaAntiCrop.addEventListener('change', () => {
      const enabled = modalInstaAntiCrop.checked;
      if (modalInstaMarginBox) {
        modalInstaMarginBox.classList.toggle('opacity-40', !enabled);
        modalInstaMarginBox.classList.toggle('pointer-events-none', !enabled);
      }
    });
  }

  // Selecting a profile inside the popup loads it immediately into the modal form
  if (modalPlatformProfileSelect) {
    modalPlatformProfileSelect.addEventListener('change', () => {
      if (!activeModalPlatform) return;
      const selected = modalPlatformProfileSelect.value;
      const profiles = getAllPlatformProfiles()[activeModalPlatform] || {};
      if (profiles[selected]) {
        populateModalFieldsFromData(activeModalPlatform, profiles[selected]);
        showToast(`اطلاعات پروفایل «${selected}» بارگذاری شد.`, 'info');
      }
    });
  }

  // Save new or update selected profile for this platform
  if (modalSavePlatformProfileBtn) {
    modalSavePlatformProfileBtn.addEventListener('click', () => {
      if (!activeModalPlatform) return;
      const typedName = modalPlatformProfileName ? modalPlatformProfileName.value.trim() : '';
      const targetName = typedName || (modalPlatformProfileSelect ? modalPlatformProfileSelect.value : '');
      if (!targetName) {
        showToast('نامی برای پروفایل وارد کنید.', 'warning');
        modalPlatformProfileName?.focus();
        return;
      }

      const data = collectModalFields(activeModalPlatform);
      const all = getAllPlatformProfiles();
      all[activeModalPlatform][targetName] = data;
      saveAllPlatformProfiles(all);

      platformState[activeModalPlatform] = {
        ...platformState[activeModalPlatform],
        ...data,
        activeProfile: targetName
      };

      if (modalPlatformProfileName) modalPlatformProfileName.value = '';
      renderModalProfilesDropdown(activeModalPlatform, targetName);
      renderAllQuickProfileSelects();
      updatePlatformSummaries();
      notifyConfigChange();

      showToast(`پروفایل «${targetName}» برای ${PLATFORM_META[activeModalPlatform].label} ذخیره شد.`, 'success');
    });
  }

  // Delete custom profile for this platform (via custom glassmorphic confirm popup)
  if (modalDeletePlatformProfileBtn) {
    modalDeletePlatformProfileBtn.addEventListener('click', async () => {
      if (!activeModalPlatform || !modalPlatformProfileSelect) return;
      const name = modalPlatformProfileSelect.value;
      if (DEFAULT_PLATFORM_PROFILES[activeModalPlatform][name]) {
        showToast('پروفایل‌های پیش‌فرض قابل حذف نیستند.', 'warning');
        return;
      }

      const ok = await showConfirmModal({
        title: 'حذف پروفایل شبکه',
        message: `آیا از حذف پروفایل «${name}» از ${PLATFORM_META[activeModalPlatform].label} اطمینان دارید؟`,
        confirmText: 'حذف پروفایل',
        cancelText: 'انصراف',
        variant: 'danger'
      });
      if (!ok) return;

      const all = getAllPlatformProfiles();
      if (all[activeModalPlatform][name]) {
        delete all[activeModalPlatform][name];
        saveAllPlatformProfiles(all);

        const remaining = Object.keys(all[activeModalPlatform]);
        const fallbackName = remaining[0];
        if (fallbackName) {
          applyProfileToPlatform(activeModalPlatform, fallbackName, true);
          renderModalProfilesDropdown(activeModalPlatform, fallbackName);
          populateModalFieldsFromData(activeModalPlatform, all[activeModalPlatform][fallbackName]);
        }
        showToast(`پروفایل «${name}» حذف شد.`, 'info');
      }
    });
  }

  // Apply & Close popup
  if (modalApplyPlatformBtn) {
    modalApplyPlatformBtn.addEventListener('click', () => {
      if (!activeModalPlatform) return;
      const data = collectModalFields(activeModalPlatform);
      const selectedProfile = modalPlatformProfileSelect ? modalPlatformProfileSelect.value : platformState[activeModalPlatform].activeProfile;

      platformState[activeModalPlatform] = {
        ...platformState[activeModalPlatform],
        ...data,
        activeProfile: selectedProfile
      };

      // Also keep custom profile synced with latest edits if user modified their saved profile
      const all = getAllPlatformProfiles();
      if (selectedProfile && all[activeModalPlatform][selectedProfile]) {
        all[activeModalPlatform][selectedProfile] = { ...all[activeModalPlatform][selectedProfile], ...data };
        saveAllPlatformProfiles(all);
      }

      updatePlatformSummaries();
      notifyConfigChange();
      showToast(`تنظیمات ${PLATFORM_META[activeModalPlatform].label} ذخیره و اعمال شد.`, 'success');
      closePlatformModal();
    });
  }

  // Main-row quick profile dropdowns
  const bindQuickSelect = (el, platformKey) => {
    if (!el) return;
    el.addEventListener('change', () => {
      applyProfileToPlatform(platformKey, el.value);
    });
  };
  bindQuickSelect(rubikaQuickProfile, 'rubika');
  bindQuickSelect(instaQuickProfile, 'instagram');
  bindQuickSelect(youtubeQuickProfile, 'youtube');

  // Enable/Disable toggles
  if (destRubikaEnable) {
    destRubikaEnable.addEventListener('change', () => {
      platformState.rubika.enabled = destRubikaEnable.checked;
      notifyConfigChange();
    });
  }
  if (destInstaEnable) {
    destInstaEnable.addEventListener('change', () => {
      platformState.instagram.enabled = destInstaEnable.checked;
      notifyConfigChange();
    });
  }
  if (destYouTubeEnable) {
    destYouTubeEnable.addEventListener('change', () => {
      platformState.youtube.enabled = destYouTubeEnable.checked;
      notifyConfigChange();
    });
  }
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
              <input type="range" min="0" max="400" value="${ov.marginX || 25}" class="w-full overlay-marginX-slider" data-index="${index}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.marginX || 25}px</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-slate-500 text-[10px] shrink-0 w-16">فاصله عمودی:</span>
              <input type="range" min="0" max="400" value="${ov.marginY || 25}" class="w-full overlay-marginY-slider" data-index="${index}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.marginY || 25}px</span>
            </div>

            <div class="flex items-center gap-2 ${ov.position === 'full_frame' ? 'opacity-40 pointer-events-none' : ''}">
              <span class="text-slate-500 text-[10px] shrink-0 w-16">اندازه نشان:</span>
              <input type="range" min="5" max="100" value="${ov.scale || 20}" class="w-full overlay-scale-slider" data-index="${index}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-9 text-left">${ov.position === 'full_frame' ? 'کامل' : `${ov.scale || 20}%`}</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-slate-500 text-[10px] shrink-0 w-16">شفافیت:</span>
              <input type="range" min="10" max="100" value="${ov.opacity || 100}" class="w-full overlay-opacity-slider" data-index="${index}">
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

// ====================== Form Config & Persistence ======================
export function getCurrentFormConfig() {
  const r = platformState.rubika;
  const yt = platformState.youtube;
  const ig = platformState.instagram;

  const destinations = [
    {
      name: 'روبیکا',
      streamUrl: (r.streamUrl || '').trim(),
      streamKey: (r.streamKey || '').trim(),
      enabled: destRubikaEnable ? destRubikaEnable.checked : r.enabled,
      aspect: 'vertical'
    },
    {
      name: 'یوتیوب',
      streamUrl: (yt.streamUrl || '').trim(),
      streamKey: (yt.streamKey || '').trim(),
      enabled: destYouTubeEnable ? destYouTubeEnable.checked : yt.enabled,
      aspect: yt.aspect || 'horizontal',
      ytFitMode: yt.ytFitMode || 'blur',
      bitrate: parseInt(yt.bitrate, 10) || 3500,
      width: yt.aspect === 'vertical' ? 720 : 1280,
      height: yt.aspect === 'vertical' ? 1280 : 720
    },
    {
      name: 'اینستاگرام',
      streamUrl: (ig.streamUrl || '').trim(),
      streamKey: (ig.streamKey || '').trim(),
      enabled: destInstaEnable ? destInstaEnable.checked : ig.enabled,
      instaAntiCrop: ig.instaAntiCrop !== false,
      instaAntiCropMargin: parseInt(ig.instaAntiCropMargin, 10) || 15
    }
  ];

  return {
    srtUrl: srtUrlInput ? srtUrlInput.value.trim() : '',
    destinations,
    platformState: {
      rubika: { ...r, enabled: destRubikaEnable ? destRubikaEnable.checked : r.enabled },
      instagram: { ...ig, enabled: destInstaEnable ? destInstaEnable.checked : ig.enabled },
      youtube: { ...yt, enabled: destYouTubeEnable ? destYouTubeEnable.checked : yt.enabled }
    },
    instaAntiCropMargin: parseInt(ig.instaAntiCropMargin, 10) || 15,
    width: parseInt(videoWidthInput?.value, 10) || 720,
    height: parseInt(videoHeightInput?.value, 10) || 1280,
    bitrate: parseInt(videoBitrateInput?.value, 10) || 2500,
    fps: parseInt(targetFpsSelect?.value, 10) || 30,
    rotation: videoRotationSelect ? videoRotationSelect.value : '0',
    scalingMode: scalingModeSelect ? scalingModeSelect.value : 'crop',
    passthrough: passthroughCheckbox ? passthroughCheckbox.checked : false,
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

function hydrateSavedSettings() {
  try {
    const raw = localStorage.getItem(ACTIVE_SETTINGS_KEY) || localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!raw) return;
    const cfg = JSON.parse(raw);

    if (cfg.srtUrl !== undefined && srtUrlInput) srtUrlInput.value = cfg.srtUrl;
    if (cfg.width !== undefined && videoWidthInput) videoWidthInput.value = cfg.width;
    if (cfg.height !== undefined && videoHeightInput) videoHeightInput.value = cfg.height;
    if (cfg.bitrate !== undefined && videoBitrateInput) videoBitrateInput.value = cfg.bitrate;
    if (cfg.fps !== undefined && targetFpsSelect) targetFpsSelect.value = cfg.fps;
    if (cfg.rotation !== undefined && videoRotationSelect) videoRotationSelect.value = cfg.rotation;
    if (cfg.scalingMode !== undefined && scalingModeSelect) scalingModeSelect.value = cfg.scalingMode;
    if (cfg.passthrough !== undefined && passthroughCheckbox) {
      passthroughCheckbox.checked = cfg.passthrough;
      handlePassthroughToggle();
    }
    if (cfg.autoRecordOnStart !== undefined && autoRecordCheckbox) {
      autoRecordCheckbox.checked = cfg.autoRecordOnStart;
    }

    // Load structured platformState (v6) or migrate destinations (v5)
    if (cfg.platformState) {
      ['rubika', 'instagram', 'youtube'].forEach((k) => {
        if (cfg.platformState[k]) {
          platformState[k] = { ...platformState[k], ...cfg.platformState[k] };
        }
      });
    } else if (Array.isArray(cfg.destinations)) {
      cfg.destinations.forEach((d) => {
        if (d.name === 'روبیکا') {
          platformState.rubika.enabled = Boolean(d.enabled);
          if (d.streamUrl) platformState.rubika.streamUrl = d.streamUrl;
          if (d.streamKey) platformState.rubika.streamKey = d.streamKey;
        } else if (d.name === 'اینستاگرام') {
          platformState.instagram.enabled = Boolean(d.enabled);
          if (d.streamUrl) platformState.instagram.streamUrl = d.streamUrl;
          if (d.streamKey) platformState.instagram.streamKey = d.streamKey;
          if (d.instaAntiCrop !== undefined) platformState.instagram.instaAntiCrop = d.instaAntiCrop;
          if (d.instaAntiCropMargin !== undefined) platformState.instagram.instaAntiCropMargin = d.instaAntiCropMargin;
        } else if (d.name === 'یوتیوب') {
          platformState.youtube.enabled = Boolean(d.enabled);
          if (d.streamUrl) platformState.youtube.streamUrl = d.streamUrl;
          if (d.streamKey) platformState.youtube.streamKey = d.streamKey;
          if (d.aspect) platformState.youtube.aspect = d.aspect;
          if (d.ytFitMode) platformState.youtube.ytFitMode = d.ytFitMode;
          if (d.bitrate) platformState.youtube.bitrate = d.bitrate;
        }
      });
    }

    if (destRubikaEnable) destRubikaEnable.checked = Boolean(platformState.rubika.enabled);
    if (destInstaEnable) destInstaEnable.checked = Boolean(platformState.instagram.enabled);
    if (destYouTubeEnable) destYouTubeEnable.checked = Boolean(platformState.youtube.enabled);
  } catch (_) {}
}

export function initStudioControls() {
  loadScenesFromStorage();
  loadOverlaysFromStorage();
  hydrateSavedSettings();
  renderAllQuickProfileSelects();
  updatePlatformSummaries();
  initPlatformModalHandlers();

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

  [
    srtUrlInput,
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
