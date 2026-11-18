// Interactive Visual Scene Editor Studio (Drag-and-Drop 9:16 Canvas + Text/Image PNG Compositor)
import { showToast, escapeHtml } from './ui.js';

const modal = document.getElementById('sceneEditorModal');
const card = document.getElementById('sceneEditorCard');
const titleEl = document.getElementById('sceneEditorTitle');
const closeBtn = document.getElementById('closeSceneEditorBtn');
const cancelBtn = document.getElementById('cancelSceneEditorBtn');
const saveBtn = document.getElementById('saveSceneEditorBtn');
const stageEl = document.getElementById('sceneStagePreview');

const quickAddTextBtn = document.getElementById('sceneQuickAddTextBtn');
const quickAddImageBtn = document.getElementById('sceneQuickAddImageBtn');

const tabButtons = document.querySelectorAll('.scene-editor-tab');
const tabGeneral = document.getElementById('sceneTabGeneral');
const tabTexts = document.getElementById('sceneTabTexts');
const tabImages = document.getElementById('sceneTabImages');

const nameInput = document.getElementById('sceneEditName');
const descInput = document.getElementById('sceneEditDesc');
const bgColorPanel = document.getElementById('sceneBgColorPanel');
const bgColorInput = document.getElementById('sceneBgColorInput');
const bgImagePanel = document.getElementById('sceneBgImagePanel');
const bgImageFile = document.getElementById('sceneBgImageFile');
const bgImageLabel = document.getElementById('sceneBgImageLabel');
const audioGainSelect = document.getElementById('sceneEditAudioGain');

const addTextLayerBtn = document.getElementById('sceneAddTextLayerBtn');
const textLayersListEl = document.getElementById('sceneTextLayersList');
const addImageLayerBtn = document.getElementById('sceneAddImageLayerBtn');
const imageLayersListEl = document.getElementById('sceneImageLayersList');

const CANVAS_W = 720;
const CANVAS_H = 1280;

let draftScene = null;
let onSaveHandler = null;
let selectedLayerRef = null; // { kind: 'text' | 'image', id: string }

function hexToRgba(hex, alpha = 1) {
  const clean = (hex || '#153047').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function normalizeScene(scene) {
  return {
    id: scene.id || `scene_${Date.now()}`,
    name: scene.name || 'سکانس جدید',
    desc: scene.desc || '',
    isDefault: Boolean(scene.isDefault),
    sourceMode: scene.sourceMode || 'live', // 'live' | 'color' | 'image'
    bgColor: scene.bgColor || '#153047',
    bgImagePath: scene.bgImagePath || '',
    bgImageFilename: scene.bgImageFilename || '',
    audioGain: scene.audioGain || '100%',
    textLayers: Array.isArray(scene.textLayers) ? scene.textLayers : [],
    imageLayers: Array.isArray(scene.imageLayers) ? scene.imageLayers : [],
    renderedBgPath: scene.renderedBgPath || '',
    renderedTextPath: scene.renderedTextPath || '',
    overlaysEnabled: scene.overlaysEnabled
  };
}

function switchEditorTab(tabName) {
  tabButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-editor-tab') === tabName);
  });
  if (tabGeneral) tabGeneral.classList.toggle('hidden', tabName !== 'general');
  if (tabTexts) tabTexts.classList.toggle('hidden', tabName !== 'texts');
  if (tabImages) tabImages.classList.toggle('hidden', tabName !== 'images');
}

function syncSourceModePanels() {
  if (!draftScene) return;
  document.querySelectorAll('input[name="sceneSourceMode"]').forEach((r) => {
    r.checked = r.value === draftScene.sourceMode;
  });
  if (bgColorPanel) bgColorPanel.classList.toggle('hidden', draftScene.sourceMode !== 'color');
  if (bgImagePanel) bgImagePanel.classList.toggle('hidden', draftScene.sourceMode !== 'image');
  if (bgColorInput) bgColorInput.value = draftScene.bgColor || '#153047';
  if (bgImageLabel) {
    bgImageLabel.textContent = draftScene.bgImageFilename
      ? `تصویر فعلی: ${draftScene.bgImageFilename} (برای تغییر کلیک کنید)`
      : 'انتخاب تصویر پس‌زمینه تمام‌صفحه (۹:۱۶)';
  }
}

// ====================== Interactive 9:16 Stage Renderer ======================
function renderStagePreview() {
  if (!stageEl || !draftScene) return;

  const stageW = stageEl.clientWidth || 270;
  const scaleFactor = stageW / CANVAS_W;

  // Background style
  stageEl.classList.remove('scene-stage-live-grid');
  stageEl.style.background = '';

  let bgHtml = '';
  if (draftScene.sourceMode === 'live') {
    stageEl.classList.add('scene-stage-live-grid');
    bgHtml = `
      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-45">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-sky-300 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span class="text-[11px] font-bold text-sky-200">فید زنده دوربین SRT</span>
      </div>
    `;
  } else if (draftScene.sourceMode === 'color') {
    stageEl.style.background = `radial-gradient(circle at 50% 35%, ${draftScene.bgColor} 0%, #050b12 125%)`;
  } else if (draftScene.sourceMode === 'image') {
    if (draftScene.bgImagePath) {
      bgHtml = `<img src="${draftScene.bgImagePath}" alt="پس‌زمینه" class="absolute inset-0 w-full h-full object-cover pointer-events-none">`;
    } else {
      stageEl.style.background = '#0d1e2e';
      bgHtml = `<div class="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400 pointer-events-none">تصویر پس‌زمینه انتخاب نشده</div>`;
    }
  }

  // Image layers
  const imagesHtml = draftScene.imageLayers
    .filter((img) => img.enabled && img.path)
    .map((img) => {
      const isSelected = selectedLayerRef && selectedLayerRef.kind === 'image' && selectedLayerRef.id === img.id;
      const rot = parseInt(img.rotation, 10) || 0;
      const opacity = (parseInt(img.opacity, 10) || 100) / 100;
      return `
        <div
          class="stage-draggable-item ${isSelected ? 'is-selected' : ''}"
          data-drag-kind="image"
          data-drag-id="${img.id}"
          style="left:${img.xPct}%; top:${img.yPct}%; width:${img.scale}%; opacity:${opacity}; transform:translate(-50%,-50%) rotate(${rot}deg); z-index:20;"
        >
          <img src="${img.path}" alt="لایه تصویر" class="w-full h-auto block pointer-events-none">
        </div>
      `;
    })
    .join('');

  // Text layers
  const textsHtml = draftScene.textLayers
    .filter((txt) => txt.enabled && (txt.text || '').trim())
    .map((txt) => {
      const isSelected = selectedLayerRef && selectedLayerRef.kind === 'text' && selectedLayerRef.id === txt.id;
      const fontPx = Math.max(9, Math.round((parseInt(txt.fontSize, 10) || 36) * scaleFactor));
      const padY = Math.max(4, Math.round(14 * scaleFactor));
      const padX = Math.max(8, Math.round(24 * scaleFactor));
      const radius = txt.style === 'badge' ? 999 : Math.max(6, Math.round(18 * scaleFactor));
      const bgAlpha = (parseInt(txt.bgOpacity, 10) ?? 75) / 100;
      const bgStyle =
        txt.style === 'plain' && bgAlpha === 0
          ? 'background:transparent;'
          : `background:${hexToRgba(txt.bgColor || '#153047', bgAlpha)};`;
      const extraBox =
        txt.style === 'lower_third'
          ? `width:90%; border-right:${Math.max(2, Math.round(6 * scaleFactor))}px solid #10b981;`
          : txt.style === 'badge'
          ? 'border:1px solid rgba(255,255,255,0.28);'
          : '';
      const align = txt.align || 'center';

      return `
        <div
          class="stage-draggable-item ${isSelected ? 'is-selected' : ''}"
          data-drag-kind="text"
          data-drag-id="${txt.id}"
          style="left:${txt.xPct}%; top:${txt.yPct}%; max-width:92%; transform:translate(-50%,-50%); z-index:30; text-align:${align}; color:${txt.color || '#ffffff'}; font-size:${fontPx}px; line-height:1.45; font-weight:800; padding:${padY}px ${padX}px; border-radius:${radius}px; ${bgStyle} ${extraBox} text-shadow:0 1px 4px rgba(0,0,0,0.55); white-space:pre-wrap; word-break:break-word;"
        >${escapeHtml(txt.text)}</div>
      `;
    })
    .join('');

  // Mute badge indicator on stage if muted
  const muteBadge =
    draftScene.audioGain === '0%'
      ? `<div class="absolute top-2.5 left-2.5 z-40 px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-[9px] font-bold pointer-events-none">بی‌صدا</div>`
      : '';

  stageEl.innerHTML = bgHtml + imagesHtml + textsHtml + muteBadge;
  attachStageDragHandlers();
}

function attachStageDragHandlers() {
  if (!stageEl) return;
  stageEl.querySelectorAll('.stage-draggable-item').forEach((el) => {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const kind = el.getAttribute('data-drag-kind');
      const id = el.getAttribute('data-drag-id');
      selectedLayerRef = { kind, id };

      // Highlight selected & jump to relevant tab
      stageEl.querySelectorAll('.stage-draggable-item').forEach((item) => item.classList.remove('is-selected'));
      el.classList.add('is-selected');
      switchEditorTab(kind === 'text' ? 'texts' : 'images');

      const rect = stageEl.getBoundingClientRect();
      const layer =
        kind === 'text'
          ? draftScene.textLayers.find((t) => t.id === id)
          : draftScene.imageLayers.find((i) => i.id === id);
      if (!layer) return;

      el.setPointerCapture(e.pointerId);

      const onMove = (ev) => {
        const xPct = Math.round(Math.max(4, Math.min(96, ((ev.clientX - rect.left) / rect.width) * 100)));
        const yPct = Math.round(Math.max(4, Math.min(96, ((ev.clientY - rect.top) / rect.height) * 100)));
        layer.xPct = xPct;
        layer.yPct = yPct;
        el.style.left = `${xPct}%`;
        el.style.top = `${yPct}%`;

        // Live sync sliders in inspector
        const xSlider = document.querySelector(`[data-pos-slider="${kind}-x-${id}"]`);
        const ySlider = document.querySelector(`[data-pos-slider="${kind}-y-${id}"]`);
        if (xSlider) {
          xSlider.value = xPct;
          const lbl = xSlider.parentElement?.querySelector('span:last-child');
          if (lbl) lbl.textContent = `${xPct}%`;
        }
        if (ySlider) {
          ySlider.value = yPct;
          const lbl = ySlider.parentElement?.querySelector('span:last-child');
          if (lbl) lbl.textContent = `${yPct}%`;
        }
      };

      const onUp = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
  });
}

// ====================== Inspector: Text Layers Renderer ======================
function renderTextLayersInspector() {
  if (!textLayersListEl || !draftScene) return;

  if (draftScene.textLayers.length === 0) {
    textLayersListEl.innerHTML = `
      <div class="p-4 rounded-2xl border border-dashed border-brand-border bg-slate-50/70 text-center space-y-1">
        <p class="text-xs font-semibold text-slate-600">هنوز متنی برای این سکانس اضافه نشده است.</p>
        <p class="text-[11px] text-slate-400">با دکمه «افزودن متن» می‌توانید عنوان، زیرنویس یا برچسب زنده بسازید.</p>
      </div>
    `;
    return;
  }

  textLayersListEl.innerHTML = draftScene.textLayers
    .map((txt, idx) => {
      return `
        <div class="p-3 rounded-2xl border border-brand-border/80 bg-white space-y-2.5 shadow-xs" data-text-card="${txt.id}">
          <div class="flex items-center justify-between border-b border-brand-border/40 pb-1.5">
            <span class="text-xs font-bold text-brand-950">لایه متن ${idx + 1}</span>
            <div class="flex items-center gap-2">
              <label class="apple-toggle">
                <input type="checkbox" class="apple-toggle-input sc-txt-toggle" data-id="${txt.id}" ${txt.enabled ? 'checked' : ''}>
                <span class="apple-toggle-track"><span class="apple-toggle-thumb"></span></span>
              </label>
              <button type="button" class="btn-brand-rose px-2 py-1 rounded-lg text-[10px] font-bold sc-txt-del" data-id="${txt.id}">حذف</button>
            </div>
          </div>

          <textarea rows="2" class="w-full bento-input px-3 py-2 text-xs font-semibold sc-txt-content" data-id="${txt.id}" placeholder="متن دلخواه فارسی یا انگلیسی...">${escapeHtml(txt.text)}</textarea>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label class="block text-[10px] text-slate-500 mb-0.5">سبک نمایش</label>
              <select class="w-full bento-input px-2 py-1 text-[11px] font-semibold sc-txt-style" data-id="${txt.id}">
                <option value="lower_third" ${txt.style === 'lower_third' ? 'selected' : ''}>زیرنویس شیشه‌ای</option>
                <option value="badge" ${txt.style === 'badge' ? 'selected' : ''}>برچسب نشان‌دار</option>
                <option value="plain" ${txt.style === 'plain' ? 'selected' : ''}>متن آزاد</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] text-slate-500 mb-0.5">چینش متن</label>
              <select class="w-full bento-input px-2 py-1 text-[11px] font-semibold sc-txt-align" data-id="${txt.id}">
                <option value="center" ${txt.align === 'center' ? 'selected' : ''}>وسط‌چین</option>
                <option value="right" ${txt.align === 'right' ? 'selected' : ''}>راست‌چین</option>
                <option value="left" ${txt.align === 'left' ? 'selected' : ''}>چپ‌چین</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] text-slate-500 mb-0.5">رنگ متن</label>
              <input type="color" value="${txt.color || '#ffffff'}" class="w-full h-8 rounded-xl border border-brand-border cursor-pointer p-0.5 bg-white sc-txt-color" data-id="${txt.id}">
            </div>

            <div>
              <label class="block text-[10px] text-slate-500 mb-0.5">رنگ کادر</label>
              <input type="color" value="${txt.bgColor || '#153047'}" class="w-full h-8 rounded-xl border border-brand-border cursor-pointer p-0.5 bg-white sc-txt-bgcolor" data-id="${txt.id}">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-500 w-16 shrink-0">اندازه قلم:</span>
              <input type="range" min="18" max="88" value="${txt.fontSize || 34}" class="w-full sc-txt-size" data-id="${txt.id}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-8 text-left">${txt.fontSize || 34}</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-500 w-16 shrink-0">شفافیت کادر:</span>
              <input type="range" min="0" max="100" value="${txt.bgOpacity ?? 80}" class="w-full sc-txt-bgop" data-id="${txt.id}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-8 text-left">${txt.bgOpacity ?? 80}%</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-500 w-16 shrink-0">موقعیت X:</span>
              <input type="range" min="4" max="96" value="${txt.xPct ?? 50}" class="w-full sc-txt-x" data-id="${txt.id}" data-pos-slider="text-x-${txt.id}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-8 text-left">${txt.xPct ?? 50}%</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-500 w-16 shrink-0">موقعیت Y:</span>
              <input type="range" min="4" max="96" value="${txt.yPct ?? 82}" class="w-full sc-txt-y" data-id="${txt.id}" data-pos-slider="text-y-${txt.id}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-8 text-left">${txt.yPct ?? 82}%</span>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  attachTextInspectorHandlers();
}

function attachTextInspectorHandlers() {
  if (!textLayersListEl) return;
  const findTxt = (el) => draftScene.textLayers.find((t) => t.id === el.getAttribute('data-id'));

  textLayersListEl.querySelectorAll('.sc-txt-toggle').forEach((el) => {
    el.addEventListener('change', () => {
      const t = findTxt(el);
      if (t) { t.enabled = el.checked; renderStagePreview(); }
    });
  });

  textLayersListEl.querySelectorAll('.sc-txt-del').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      draftScene.textLayers = draftScene.textLayers.filter((t) => t.id !== id);
      renderTextLayersInspector();
      renderStagePreview();
    });
  });

  textLayersListEl.querySelectorAll('.sc-txt-content').forEach((el) => {
    el.addEventListener('input', () => {
      const t = findTxt(el);
      if (t) { t.text = el.value; renderStagePreview(); }
    });
  });

  textLayersListEl.querySelectorAll('.sc-txt-style').forEach((el) => {
    el.addEventListener('change', () => {
      const t = findTxt(el);
      if (t) { t.style = el.value; renderStagePreview(); }
    });
  });

  textLayersListEl.querySelectorAll('.sc-txt-align').forEach((el) => {
    el.addEventListener('change', () => {
      const t = findTxt(el);
      if (t) { t.align = el.value; renderStagePreview(); }
    });
  });

  textLayersListEl.querySelectorAll('.sc-txt-color').forEach((el) => {
    el.addEventListener('input', () => {
      const t = findTxt(el);
      if (t) { t.color = el.value; renderStagePreview(); }
    });
  });

  textLayersListEl.querySelectorAll('.sc-txt-bgcolor').forEach((el) => {
    el.addEventListener('input', () => {
      const t = findTxt(el);
      if (t) { t.bgColor = el.value; renderStagePreview(); }
    });
  });

  const bindRange = (sel, prop, suffix) => {
    textLayersListEl.querySelectorAll(sel).forEach((el) => {
      el.addEventListener('input', () => {
        const t = findTxt(el);
        if (t) {
          t[prop] = parseInt(el.value, 10);
          const lbl = el.parentElement?.querySelector('span:last-child');
          if (lbl) lbl.textContent = `${el.value}${suffix}`;
          renderStagePreview();
        }
      });
    });
  };

  bindRange('.sc-txt-size', 'fontSize', '');
  bindRange('.sc-txt-bgop', 'bgOpacity', '%');
  bindRange('.sc-txt-x', 'xPct', '%');
  bindRange('.sc-txt-y', 'yPct', '%');
}

// ====================== Inspector: Image Layers Renderer ======================
function renderImageLayersInspector() {
  if (!imageLayersListEl || !draftScene) return;

  if (draftScene.imageLayers.length === 0) {
    imageLayersListEl.innerHTML = `
      <div class="p-4 rounded-2xl border border-dashed border-brand-border bg-slate-50/70 text-center space-y-1">
        <p class="text-xs font-semibold text-slate-600">هنوز تصویری به این سکانس اضافه نشده است.</p>
        <p class="text-[11px] text-slate-400">با دکمه «افزودن عکس» لوگو، بنر یا واترمارک اختصاصی این سکانس را اضافه کنید.</p>
      </div>
    `;
    return;
  }

  imageLayersListEl.innerHTML = draftScene.imageLayers
    .map((img, idx) => {
      return `
        <div class="p-3 rounded-2xl border border-brand-border/80 bg-white space-y-2.5 shadow-xs">
          <div class="flex items-center justify-between border-b border-brand-border/40 pb-1.5">
            <span class="text-xs font-bold text-brand-950">${escapeHtml(img.name || `تصویر ${idx + 1}`)}</span>
            <div class="flex items-center gap-2">
              <label class="apple-toggle">
                <input type="checkbox" class="apple-toggle-input sc-img-toggle" data-id="${img.id}" ${img.enabled ? 'checked' : ''}>
                <span class="apple-toggle-track"><span class="apple-toggle-thumb"></span></span>
              </label>
              <button type="button" class="btn-brand-rose px-2 py-1 rounded-lg text-[10px] font-bold sc-img-del" data-id="${img.id}">حذف</button>
            </div>
          </div>

          <div class="flex items-center gap-3">
            ${
              img.path
                ? `
              <div class="w-12 h-12 rounded-xl border border-brand-border bg-slate-50 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                <img src="${img.path}" alt="پیش‌نمایش" class="w-full h-full object-contain">
              </div>
              <div class="flex-1 min-w-0">
                <span class="font-mono-code text-xs font-bold text-brand-950 block truncate">${escapeHtml(img.filename || 'تصویر')}</span>
                <label class="cursor-pointer text-[11px] font-bold text-brand-700 hover:text-brand-900">
                  تغییر تصویر
                  <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden sc-img-file" data-id="${img.id}">
                </label>
              </div>
            `
                : `
              <label class="w-full py-2.5 px-3 rounded-xl border border-dashed border-brand-primary/40 bg-brand-50/40 hover:bg-brand-50 cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-brand-900">
                <span>انتخاب فایل تصویر (PNG / JPG / WEBP)</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden sc-img-file" data-id="${img.id}">
              </label>
            `
            }
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-500 w-16 shrink-0">اندازه:</span>
              <input type="range" min="8" max="100" value="${img.scale || 28}" class="w-full sc-img-scale" data-id="${img.id}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-8 text-left">${img.scale || 28}%</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-500 w-16 shrink-0">شفافیت:</span>
              <input type="range" min="10" max="100" value="${img.opacity || 100}" class="w-full sc-img-op" data-id="${img.id}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-8 text-left">${img.opacity || 100}%</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-500 w-16 shrink-0">موقعیت X:</span>
              <input type="range" min="4" max="96" value="${img.xPct ?? 80}" class="w-full sc-img-x" data-id="${img.id}" data-pos-slider="image-x-${img.id}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-8 text-left">${img.xPct ?? 80}%</span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-500 w-16 shrink-0">موقعیت Y:</span>
              <input type="range" min="4" max="96" value="${img.yPct ?? 12}" class="w-full sc-img-y" data-id="${img.id}" data-pos-slider="image-y-${img.id}">
              <span class="font-mono-code font-bold text-brand-900 text-[10px] w-8 text-left">${img.yPct ?? 12}%</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[10px] text-slate-500 shrink-0">چرخش:</span>
            <select class="bento-input px-2 py-1 text-[11px] font-semibold sc-img-rot" data-id="${img.id}">
              <option value="0" ${img.rotation === '0' ? 'selected' : ''}>۰°</option>
              <option value="90" ${img.rotation === '90' ? 'selected' : ''}>۹۰° ساعتگرد</option>
              <option value="270" ${img.rotation === '270' ? 'selected' : ''}>۹۰° پادساعتگرد</option>
              <option value="180" ${img.rotation === '180' ? 'selected' : ''}>۱۸۰°</option>
            </select>
          </div>
        </div>
      `;
    })
    .join('');

  attachImageInspectorHandlers();
}

async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append('overlay', file);
  const res = await fetch('/api/upload-overlay', { method: 'POST', body: formData });
  return res.json();
}

function attachImageInspectorHandlers() {
  if (!imageLayersListEl) return;
  const findImg = (el) => draftScene.imageLayers.find((i) => i.id === el.getAttribute('data-id'));

  imageLayersListEl.querySelectorAll('.sc-img-toggle').forEach((el) => {
    el.addEventListener('change', () => {
      const img = findImg(el);
      if (img) { img.enabled = el.checked; renderStagePreview(); }
    });
  });

  imageLayersListEl.querySelectorAll('.sc-img-del').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      draftScene.imageLayers = draftScene.imageLayers.filter((i) => i.id !== id);
      renderImageLayersInspector();
      renderStagePreview();
    });
  });

  imageLayersListEl.querySelectorAll('.sc-img-file').forEach((el) => {
    el.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      const img = findImg(el);
      if (!file || !img) return;
      try {
        showToast('در حال بارگذاری تصویر سکانس...', 'info');
        const data = await uploadImageFile(file);
        if (data.success) {
          img.path = data.filePath;
          img.filename = data.filename;
          img.enabled = true;
          renderImageLayersInspector();
          renderStagePreview();
          showToast('تصویر روی سکانس اضافه شد.', 'success');
        } else {
          showToast(data.message || 'خطا در بارگذاری تصویر.', 'error');
        }
      } catch (err) {
        showToast(`خطا: ${err.message}`, 'error');
      }
    });
  });

  imageLayersListEl.querySelectorAll('.sc-img-rot').forEach((el) => {
    el.addEventListener('change', () => {
      const img = findImg(el);
      if (img) { img.rotation = el.value; renderStagePreview(); }
    });
  });

  const bindRange = (sel, prop) => {
    imageLayersListEl.querySelectorAll(sel).forEach((el) => {
      el.addEventListener('input', () => {
        const img = findImg(el);
        if (img) {
          img[prop] = parseInt(el.value, 10);
          const lbl = el.parentElement?.querySelector('span:last-child');
          if (lbl) lbl.textContent = `${el.value}%`;
          renderStagePreview();
        }
      });
    });
  };

  bindRange('.sc-img-scale', 'scale');
  bindRange('.sc-img-op', 'opacity');
  bindRange('.sc-img-x', 'xPct');
  bindRange('.sc-img-y', 'yPct');
}

// ====================== High-Res 720x1280 PNG Compositor (RTL Persian Perfect) ======================
function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function canvasToUploadedPng(canvas, filename) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return '';
  const formData = new FormData();
  formData.append('overlay', blob, filename);
  const res = await fetch('/api/upload-overlay', { method: 'POST', body: formData });
  const data = await res.json();
  return data.success ? data.filePath : '';
}

async function renderSceneBackgroundPng(bgColor) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(CANVAS_W * 0.5, CANVAS_H * 0.35, 40, CANVAS_W * 0.5, CANVAS_H * 0.5, CANVAS_H * 0.85);
  grad.addColorStop(0, bgColor || '#153047');
  grad.addColorStop(1, '#050b12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  return canvasToUploadedPng(canvas, `scene_bg_${Date.now()}.png`);
}

async function renderSceneTextsPng(textLayers) {
  const enabled = textLayers.filter((t) => t.enabled && (t.text || '').trim());
  if (enabled.length === 0) return '';

  try {
    await document.fonts.ready;
  } catch (_) {}

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  enabled.forEach((txt) => {
    const fontSize = Math.max(18, parseInt(txt.fontSize, 10) || 34);
    const lineHeight = Math.round(fontSize * 1.45);
    const align = txt.align || 'center';
    const maxTextWidth = txt.style === 'lower_third' ? CANVAS_W * 0.82 : CANVAS_W * 0.84;

    ctx.save();
    ctx.direction = 'rtl';
    ctx.font = `800 ${fontSize}px "Vazirmatn", Tahoma, sans-serif`;
    ctx.textBaseline = 'middle';

    // Word wrap lines preserving explicit newlines
    const rawLines = (txt.text || '').split(/\r?\n/);
    const lines = [];
    rawLines.forEach((raw) => {
      const words = raw.split(/\s+/);
      let current = '';
      words.forEach((word) => {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxTextWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      });
      if (current) lines.push(current);
    });

    const widestLine = Math.max(...lines.map((l) => ctx.measureText(l).width), 60);
    const padX = txt.style === 'badge' ? 32 : 28;
    const padY = txt.style === 'badge' ? 14 : 18;
    const boxW = txt.style === 'lower_third' ? CANVAS_W * 0.9 : Math.min(CANVAS_W * 0.92, widestLine + padX * 2);
    const boxH = lines.length * lineHeight + padY * 2;

    const cx = (Math.max(4, Math.min(96, parseFloat(txt.xPct ?? 50))) / 100) * CANVAS_W;
    const cy = (Math.max(4, Math.min(96, parseFloat(txt.yPct ?? 82))) / 100) * CANVAS_H;
    const boxX = cx - boxW / 2;
    const boxY = cy - boxH / 2;

    const bgAlpha = (parseInt(txt.bgOpacity, 10) ?? 80) / 100;
    const radius = txt.style === 'badge' ? boxH / 2 : 20;

    if (bgAlpha > 0) {
      ctx.fillStyle = hexToRgba(txt.bgColor || '#153047', bgAlpha);
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, radius);
      ctx.fill();

      if (txt.style === 'lower_third') {
        ctx.fillStyle = '#10b981';
        drawRoundedRect(ctx, boxX + boxW - 8, boxY + 6, 8, boxH - 12, 4);
        ctx.fill();
      } else if (txt.style === 'badge') {
        ctx.strokeStyle = 'rgba(255,255,255,0.32)';
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, radius);
        ctx.stroke();
      }
    }

    ctx.fillStyle = txt.color || '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    if (align === 'right') {
      ctx.textAlign = 'right';
    } else if (align === 'left') {
      ctx.textAlign = 'left';
    } else {
      ctx.textAlign = 'center';
    }

    const startY = boxY + padY + lineHeight / 2;
    lines.forEach((line, i) => {
      let tx = cx;
      if (align === 'right') tx = boxX + boxW - padX;
      else if (align === 'left') tx = boxX + padX;
      ctx.fillText(line, tx, startY + i * lineHeight);
    });

    ctx.restore();
  });

  return canvasToUploadedPng(canvas, `scene_text_${Date.now()}.png`);
}

// ====================== Scene Layer Compilation for FFmpeg ======================
export function buildSceneOverlaysPayload(scene) {
  const layers = [];
  if (!scene) return layers;

  // 1. Background cover (Color standby or Full-screen Image)
  if (scene.sourceMode === 'color' && scene.renderedBgPath) {
    layers.push({
      id: `${scene.id}_bg`,
      path: scene.renderedBgPath,
      position: 'full_frame',
      scale: 100,
      opacity: 100,
      rotation: '0',
      enabled: true
    });
  } else if (scene.sourceMode === 'image' && scene.bgImagePath) {
    layers.push({
      id: `${scene.id}_bgimg`,
      path: scene.bgImagePath,
      position: 'full_frame',
      scale: 100,
      opacity: 100,
      rotation: '0',
      enabled: true
    });
  }

  // 2. Scene Image Layers
  if (Array.isArray(scene.imageLayers)) {
    scene.imageLayers.forEach((img) => {
      if (img.enabled && img.path) {
        layers.push({
          id: img.id,
          path: img.path,
          position: 'custom',
          xPct: img.xPct ?? 50,
          yPct: img.yPct ?? 50,
          scale: img.scale || 28,
          opacity: img.opacity || 100,
          rotation: img.rotation || '0',
          enabled: true
        });
      }
    });
  }

  // 3. Scene Rendered Persian Text Layer (transparent 720x1280 PNG)
  if (scene.renderedTextPath) {
    layers.push({
      id: `${scene.id}_text`,
      path: scene.renderedTextPath,
      position: 'full_frame',
      scale: 100,
      opacity: 100,
      rotation: '0',
      enabled: true
    });
  }

  return layers;
}

// ====================== Public Open / Close / Add Layer Helpers ======================
function addNewTextLayer(preset = {}) {
  const newTxt = {
    id: `txt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    text: preset.text || 'عنوان یا زیرنویس زنده',
    style: preset.style || 'lower_third',
    align: preset.align || 'center',
    fontSize: preset.fontSize || 34,
    color: preset.color || '#ffffff',
    bgColor: preset.bgColor || '#153047',
    bgOpacity: preset.bgOpacity ?? 85,
    xPct: preset.xPct ?? 50,
    yPct: preset.yPct ?? 82,
    enabled: true
  };
  draftScene.textLayers.push(newTxt);
  selectedLayerRef = { kind: 'text', id: newTxt.id };
  switchEditorTab('texts');
  renderTextLayersInspector();
  renderStagePreview();
}

function addNewImageLayer() {
  const newImg = {
    id: `img_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: `تصویر ${draftScene.imageLayers.length + 1}`,
    path: '',
    filename: '',
    scale: 28,
    opacity: 100,
    rotation: '0',
    xPct: 80,
    yPct: 14,
    enabled: true
  };
  draftScene.imageLayers.push(newImg);
  selectedLayerRef = { kind: 'image', id: newImg.id };
  switchEditorTab('images');
  renderImageLayersInspector();
  renderStagePreview();
}

export function openSceneEditor(scene, onSave) {
  if (!modal) return;
  draftScene = normalizeScene(JSON.parse(JSON.stringify(scene)));
  onSaveHandler = onSave;
  selectedLayerRef = null;

  if (titleEl) titleEl.textContent = `ویرایش سکانس: ${draftScene.name}`;
  if (nameInput) nameInput.value = draftScene.name;
  if (descInput) descInput.value = draftScene.desc || '';
  if (audioGainSelect) audioGainSelect.value = draftScene.audioGain || '100%';

  syncSourceModePanels();
  switchEditorTab('general');
  renderTextLayersInspector();
  renderImageLayersInspector();

  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    if (card) card.classList.remove('scale-95', 'opacity-0');
    renderStagePreview();
  });
}

function closeSceneEditor() {
  if (!modal) return;
  modal.classList.add('opacity-0');
  if (card) card.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    draftScene = null;
    onSaveHandler = null;
  }, 180);
}

export function initSceneEditorModal() {
  if (closeBtn) closeBtn.addEventListener('click', closeSceneEditor);
  if (cancelBtn) cancelBtn.addEventListener('click', closeSceneEditor);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSceneEditor();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeSceneEditor();
    }
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchEditorTab(btn.getAttribute('data-editor-tab'));
    });
  });

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      if (draftScene) {
        draftScene.name = nameInput.value;
        if (titleEl) titleEl.textContent = `ویرایش سکانس: ${draftScene.name || 'بدون نام'}`;
      }
    });
  }

  if (descInput) {
    descInput.addEventListener('input', () => {
      if (draftScene) draftScene.desc = descInput.value;
    });
  }

  if (audioGainSelect) {
    audioGainSelect.addEventListener('change', () => {
      if (draftScene) {
        draftScene.audioGain = audioGainSelect.value;
        renderStagePreview();
      }
    });
  }

  document.querySelectorAll('input[name="sceneSourceMode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!draftScene || !radio.checked) return;
      draftScene.sourceMode = radio.value;
      syncSourceModePanels();
      renderStagePreview();
    });
  });

  if (bgColorInput) {
    bgColorInput.addEventListener('input', () => {
      if (draftScene) {
        draftScene.bgColor = bgColorInput.value;
        renderStagePreview();
      }
    });
  }

  document.querySelectorAll('[data-bg-swatch]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const hex = btn.getAttribute('data-bg-swatch');
      if (draftScene && hex) {
        draftScene.bgColor = hex;
        if (bgColorInput) bgColorInput.value = hex;
        renderStagePreview();
      }
    });
  });

  if (bgImageFile) {
    bgImageFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || !draftScene) return;
      try {
        showToast('در حال بارگذاری تصویر پس‌زمینه...', 'info');
        const data = await uploadImageFile(file);
        if (data.success) {
          draftScene.bgImagePath = data.filePath;
          draftScene.bgImageFilename = data.filename;
          syncSourceModePanels();
          renderStagePreview();
          showToast('تصویر پس‌زمینه سکانس ثبت شد.', 'success');
        } else {
          showToast(data.message || 'خطا در بارگذاری.', 'error');
        }
      } catch (err) {
        showToast(`خطا: ${err.message}`, 'error');
      }
    });
  }

  // Quick Templates
  document.querySelectorAll('[data-scene-template]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!draftScene) return;
      const tpl = btn.getAttribute('data-scene-template');
      if (tpl === 'lower_third') {
        addNewTextLayer({
          text: 'استودیو پخش زنده\nپخش اختصاصی با کیفیت بالا',
          style: 'lower_third',
          align: 'right',
          fontSize: 30,
          color: '#ffffff',
          bgColor: '#153047',
          bgOpacity: 88,
          xPct: 50,
          yPct: 84
        });
      } else if (tpl === 'live_badge') {
        addNewTextLayer({
          text: 'پخش زنده',
          style: 'badge',
          align: 'center',
          fontSize: 26,
          color: '#ffffff',
          bgColor: '#e11d48',
          bgOpacity: 95,
          xPct: 80,
          yPct: 8
        });
      } else if (tpl === 'standby') {
        draftScene.sourceMode = 'color';
        draftScene.bgColor = '#153047';
        draftScene.audioGain = '0%';
        if (audioGainSelect) audioGainSelect.value = '0%';
        syncSourceModePanels();
        addNewTextLayer({
          text: 'پخش زنده به‌زودی آغاز می‌شود\nلطفاً چند لحظه شکیبا باشید',
          style: 'plain',
          align: 'center',
          fontSize: 38,
          color: '#ffffff',
          bgColor: '#153047',
          bgOpacity: 0,
          xPct: 50,
          yPct: 50
        });
      }
      showToast('قالب آماده به سکانس اضافه شد.', 'success');
    });
  });

  if (addTextLayerBtn) addTextLayerBtn.addEventListener('click', () => addNewTextLayer());
  if (quickAddTextBtn) quickAddTextBtn.addEventListener('click', () => addNewTextLayer());
  if (addImageLayerBtn) addImageLayerBtn.addEventListener('click', () => addNewImageLayer());
  if (quickAddImageBtn) quickAddImageBtn.addEventListener('click', () => addNewImageLayer());

  // Save & Compile Scene PNGs
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!draftScene) return;
      const finalName = (draftScene.name || '').trim();
      if (!finalName) {
        showToast('نام سکانس نمی‌تواند خالی باشد.', 'warning');
        switchEditorTab('general');
        nameInput?.focus();
        return;
      }
      draftScene.name = finalName;

      saveBtn.disabled = true;
      const origText = saveBtn.textContent;
      saveBtn.textContent = 'در حال رندر و ذخیره...';

      try {
        // Render background PNG if solid color standby mode
        if (draftScene.sourceMode === 'color') {
          draftScene.renderedBgPath = await renderSceneBackgroundPng(draftScene.bgColor);
        } else {
          draftScene.renderedBgPath = '';
        }

        // Render transparent high-res Persian text composite PNG
        draftScene.renderedTextPath = await renderSceneTextsPng(draftScene.textLayers);

        if (typeof onSaveHandler === 'function') {
          onSaveHandler(draftScene);
        }
        showToast(`سکانس «${draftScene.name}» ذخیره و آماده پخش شد.`, 'success');
        closeSceneEditor();
      } catch (err) {
        showToast(`خطا در ذخیره‌سازی سکانس: ${err.message}`, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = origText;
      }
    });
  }
}
