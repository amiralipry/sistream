// Live Phone HLS Preview & Recordings Archive Modal
import { showToast, showConfirmModal, escapeHtml } from './ui.js';

const previewVideo = document.getElementById('previewVideo');
const playerPlaceholder = document.getElementById('playerPlaceholder');
const placeholderTitle = document.getElementById('placeholderTitle');
const placeholderDesc = document.getElementById('placeholderDesc');
const phoneAspectTag = document.getElementById('phoneAspectTag');
const phoneLiveClock = document.getElementById('phoneLiveClock');
const togglePreviewCheckbox = document.getElementById('togglePreviewCheckbox');
const unmuteBtn = document.getElementById('unmuteBtn');
const forceReloadPreviewBtn = document.getElementById('forceReloadPreviewBtn');
const videoWidthInput = document.getElementById('videoWidth');
const videoHeightInput = document.getElementById('videoHeight');

const recordingsList = document.getElementById('recordingsList');
const refreshRecordingsBtn = document.getElementById('refreshRecordingsBtn');
const recordingModal = document.getElementById('recordingModal');
const modalVideoPlayer = document.getElementById('modalVideoPlayer');
const modalVideoTitle = document.getElementById('modalVideoTitle');
const modalVideoSubtitle = document.getElementById('modalVideoSubtitle');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalCloseActionBtn = document.getElementById('modalCloseActionBtn');

let hlsInstance = null;
let hlsRetryTimer = null;
let statusGetter = () => 'idle';

export function bindStatusGetter(fn) {
  statusGetter = fn;
}

export function isHlsActive() {
  return Boolean(hlsInstance);
}

export function isPreviewEnabled() {
  return !togglePreviewCheckbox || togglePreviewCheckbox.checked;
}

export function updatePlayerAspectRatio() {
  const w = parseInt(videoWidthInput?.value, 10) || 720;
  const h = parseInt(videoHeightInput?.value, 10) || 1280;
  if (phoneAspectTag) {
    phoneAspectTag.textContent = w < h ? `${w}×${h} (عمودی ۹:۱۶)` : `${w}×${h} (افقی ۱۶:۹)`;
  }
}

export function startPhoneClock() {
  const tick = () => {
    if (phoneLiveClock) {
      phoneLiveClock.textContent = new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  };
  tick();
  setInterval(tick, 1000);
}

export function hidePlaceholder() {
  if (playerPlaceholder) {
    playerPlaceholder.style.display = 'none';
    playerPlaceholder.classList.add('opacity-0', 'pointer-events-none');
  }
}

export function showPlaceholder(title, desc) {
  if (playerPlaceholder) {
    playerPlaceholder.style.display = 'flex';
    playerPlaceholder.classList.remove('opacity-0', 'pointer-events-none');
  }
  if (placeholderTitle && title) placeholderTitle.textContent = title;
  if (placeholderDesc && desc) placeholderDesc.textContent = desc;
}

async function checkHlsStreamReady() {
  try {
    const res = await fetch(`/preview/stream.m3u8?t=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch (_) {
    return false;
  }
}

export async function initHlsPreview() {
  if (!isPreviewEnabled()) {
    destroyHlsPreview();
    return;
  }

  updatePlayerAspectRatio();
  if (previewVideo) previewVideo.muted = true;

  const currentStatus = statusGetter();
  const ready = await checkHlsStreamReady();
  if (!ready && (currentStatus === 'live' || currentStatus === 'connecting')) {
    if (hlsRetryTimer) clearTimeout(hlsRetryTimer);
    hlsRetryTimer = setTimeout(initHlsPreview, 1200);
    return;
  }

  const streamSrc = `/preview/stream.m3u8?t=${Date.now()}`;

  if (window.Hls && window.Hls.isSupported()) {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    hlsInstance = new window.Hls({
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

    hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
      previewVideo.play().catch(() => {});
      hidePlaceholder();
      if (unmuteBtn) unmuteBtn.classList.remove('hidden');
    });

    hlsInstance.on(window.Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        const st = statusGetter();
        switch (data.type) {
          case window.Hls.ErrorTypes.NETWORK_ERROR:
            if (hlsRetryTimer) clearTimeout(hlsRetryTimer);
            hlsRetryTimer = setTimeout(() => {
              if (hlsInstance && (statusGetter() === 'live' || statusGetter() === 'connecting')) {
                hlsInstance.startLoad();
              }
            }, 1500);
            break;
          case window.Hls.ErrorTypes.MEDIA_ERROR:
            hlsInstance.recoverMediaError();
            break;
          default:
            if (st !== 'live' && st !== 'connecting') {
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

export function destroyHlsPreview() {
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
  showPlaceholder(
    'پخش زنده غیرفعال است',
    'برای پخش پیش‌نمایش در موبایل، آدرس ورودی را مشخص کرده و دکمه شروع لایو را بزنید.'
  );
  if (unmuteBtn) unmuteBtn.classList.add('hidden');
}

// ====================== Recordings List & In-Browser Modal ======================
export async function fetchRecordings() {
  if (!recordingsList) return;
  try {
    const res = await fetch('/api/recordings');
    const data = await res.json();
    if (data.success && Array.isArray(data.recordings)) {
      if (data.recordings.length === 0) {
        recordingsList.innerHTML =
          '<span class="text-slate-400 block text-center py-2">فایل ضبط‌شده‌ای وجود ندارد.</span>';
      } else {
        recordingsList.innerHTML = data.recordings
          .map((r) => {
            const dateStr = new Date(r.createdAt || r.mtime).toLocaleDateString('fa-IR', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return `
              <div class="flex flex-wrap sm:flex-nowrap items-center justify-between p-2 rounded-xl bg-white border border-brand-border gap-2">
                <div class="min-w-0 flex-1">
                  <span class="font-mono-code font-bold text-xs text-brand-950 block truncate">${escapeHtml(r.filename)}</span>
                  <span class="text-[10px] text-brand-700 font-mono-code font-bold">${r.sizeMb} MB • ${dateStr}</span>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-rec-play="${encodeURIComponent(r.filename)}"
                    data-rec-size="${r.sizeMb} MB"
                    class="btn-brand-emerald px-2.5 py-1 rounded-lg text-[11px] font-bold text-white flex items-center gap-1"
                    title="پخش ویدیو در مرورگر"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    <span>پخش</span>
                  </button>

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

                  <button
                    type="button"
                    data-rec-delete="${encodeURIComponent(r.filename)}"
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
          })
          .join('');
      }
    }
  } catch (_) {}
}

function openRecordingModal(encodedFilename, sizeInfo) {
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
}

function closeRecordingModal() {
  if (!recordingModal) return;
  if (modalVideoPlayer) {
    modalVideoPlayer.pause();
    modalVideoPlayer.removeAttribute('src');
    modalVideoPlayer.load();
  }
  recordingModal.classList.add('hidden');
}

export function initPreviewAndRecordings() {
  startPhoneClock();

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
        if (statusGetter() === 'live') initHlsPreview();
      } else {
        destroyHlsPreview();
      }
    });
  }

  if (recordingsList) {
    recordingsList.addEventListener('click', async (e) => {
      const playBtn = e.target.closest('[data-rec-play]');
      if (playBtn) {
        openRecordingModal(
          playBtn.getAttribute('data-rec-play'),
          playBtn.getAttribute('data-rec-size')
        );
        return;
      }

      const delBtn = e.target.closest('[data-rec-delete]');
      if (delBtn) {
        const encoded = delBtn.getAttribute('data-rec-delete');
        const ok = await showConfirmModal({
          title: 'حذف فایل ضبط‌شده',
          message: `آیا از حذف دائمی فایل «${decodeURIComponent(encoded)}» اطمینان دارید؟`,
          confirmText: 'حذف فایل',
          cancelText: 'انصراف',
          variant: 'danger'
        });
        if (!ok) return;

        try {
          const res = await fetch(`/api/recordings/${encoded}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast('فایل ضبط‌شده با موفقیت حذف شد.', 'info');
            fetchRecordings();
          } else {
            showToast(data.message || 'خطا در حذف فایل.', 'error');
          }
        } catch (err) {
          showToast(`خطا در حذف فایل: ${err.message}`, 'error');
        }
      }
    });
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeRecordingModal);
  if (modalCloseActionBtn) modalCloseActionBtn.addEventListener('click', closeRecordingModal);
  if (recordingModal) {
    recordingModal.addEventListener('click', (e) => {
      if (e.target === recordingModal) closeRecordingModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && recordingModal && !recordingModal.classList.contains('hidden')) {
      closeRecordingModal();
    }
  });

  if (refreshRecordingsBtn) refreshRecordingsBtn.addEventListener('click', fetchRecordings);
}
