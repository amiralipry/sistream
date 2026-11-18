// Main Studio Controller
import {
  showToast,
  showConfirmModal,
  formatSeconds,
  colorizeLog,
  initPWA,
  initMobileNavigation,
  initPasswordToggles
} from './ui.js';
import {
  bindStatusGetter,
  isHlsActive,
  isPreviewEnabled,
  updatePlayerAspectRatio,
  initHlsPreview,
  destroyHlsPreview,
  showPlaceholder,
  fetchRecordings,
  initPreviewAndRecordings
} from './preview.js';
import {
  bindConfigMutatedCallback,
  getCurrentFormConfig,
  saveActiveSettingsToStorage,
  initStudioControls
} from './studio.js';

const srtUrlInput = document.getElementById('srtUrl');
const destRubikaStatusBadge = document.getElementById('destRubikaStatusBadge');
const destInstaStatusBadge = document.getElementById('destInstaStatusBadge');
const destYouTubeStatusBadge = document.getElementById('destYouTubeStatusBadge');

const startBtn = document.getElementById('startBtn');
const startBtnText = document.getElementById('startBtnText');
const stopBtn = document.getElementById('stopBtn');
const restartLiveBtn = document.getElementById('restartLiveBtn');

const ffmpegBadge = document.getElementById('ffmpegBadge');
const ffmpegDot = document.getElementById('ffmpegDot');
const ffmpegText = document.getElementById('ffmpegText');
const statusPill = document.getElementById('statusPill');
const statusPing = document.getElementById('statusPing');
const statusDot = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');

const statUptime = document.getElementById('statUptime');
const statFps = document.getElementById('statFps');
const statBitrate = document.getElementById('statBitrate');
const statDrop = document.getElementById('statDrop');
const detailedStatusText = document.getElementById('detailedStatusText');

const instantRecordBtn = document.getElementById('instantRecordBtn');
const instantRecordBtnText = document.getElementById('instantRecordBtnText');
const manualRecordBadge = document.getElementById('manualRecordBadge');
const manualRecordTimer = document.getElementById('manualRecordTimer');

const terminalBox = document.getElementById('terminalBox');
const autoScrollCheckbox = document.getElementById('autoScrollCheckbox');
const copyLogsBtn = document.getElementById('copyLogsBtn');
const copyLogsText = document.getElementById('copyLogsText');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const logCountBadge = document.getElementById('logCountBadge');

let currentStatus = 'idle';
let isManualRecordingActive = false;
let lastLogSignature = '';

function updatePlatformBadge(badgeEl, status) {
  if (!badgeEl) return;
  if (status === 'live') {
    badgeEl.className =
      'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1 shadow-sm';
    badgeEl.innerHTML =
      '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>متصل (زنده)</span>';
  } else if (status === 'connecting') {
    badgeEl.className =
      'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1 shadow-sm';
    badgeEl.innerHTML =
      '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span><span>در حال برقراری</span>';
  } else if (status === 'error') {
    badgeEl.className =
      'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 flex items-center gap-1 shadow-sm';
    badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span>قطع ارتباط</span>';
  } else {
    badgeEl.className =
      'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1';
    badgeEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span>غیرفعال</span>';
  }
}

function updateUI(data) {
  currentStatus = data.state;

  if (ffmpegBadge && ffmpegDot && ffmpegText) {
    if (data.ffmpegInstalled) {
      ffmpegBadge.classList.remove('text-rose-600');
      ffmpegBadge.classList.add('text-emerald-700');
      ffmpegDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500';
      ffmpegText.textContent = 'موتور آماده';
    } else {
      ffmpegBadge.classList.remove('text-emerald-700');
      ffmpegBadge.classList.add('text-rose-600');
      ffmpegDot.className = 'w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse';
      ffmpegText.textContent = 'بدون FFmpeg';
    }
  }

  if (statusPing) statusPing.classList.add('hidden');

  if (data.state === 'live') {
    if (statusPill) {
      statusPill.className =
        'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 border border-emerald-300 text-emerald-800';
    }
    if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-emerald-500';
    if (statusPing) statusPing.classList.remove('hidden');
    if (statusLabel) statusLabel.textContent = 'پخش زنده';

    if (startBtn) startBtn.disabled = true;
    if (startBtnText) startBtnText.textContent = 'در حال ارسال لایو...';
    if (stopBtn) stopBtn.disabled = false;
    if (restartLiveBtn) restartLiveBtn.classList.remove('hidden');

    if (!isHlsActive() && isPreviewEnabled() && data.previewActive) {
      initHlsPreview();
    }
  } else if (data.state === 'connecting') {
    if (statusPill) {
      statusPill.className =
        'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 border border-amber-300 text-amber-800';
    }
    if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-ping';
    if (statusLabel) statusLabel.textContent = 'در حال اتصال...';

    if (startBtn) startBtn.disabled = true;
    if (startBtnText) startBtnText.textContent = 'در حال اتصال...';
    if (stopBtn) stopBtn.disabled = false;
    if (restartLiveBtn) restartLiveBtn.classList.add('hidden');

    showPlaceholder('در حال برقراری سیگنال لایو...', 'در حال اتصال به ورودی SRT و آماده‌سازی فید پخش زنده...');
  } else if (data.state === 'stopping') {
    if (statusPill) {
      statusPill.className =
        'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 border border-rose-300 text-rose-800';
    }
    if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-rose-500 animate-pulse';
    if (statusLabel) statusLabel.textContent = 'در حال توقف...';

    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;
    if (restartLiveBtn) restartLiveBtn.classList.add('hidden');
    destroyHlsPreview();
    showPlaceholder('در حال توقف استریم...', 'پردازش در حال بستن اتصالات می‌باشد.');
  } else if (data.state === 'error') {
    if (statusPill) {
      statusPill.className =
        'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 border border-rose-300 text-rose-800';
    }
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
    if (statusPill) {
      statusPill.className =
        'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100/90 border border-brand-border text-slate-700';
    }
    if (statusDot) statusDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-slate-400';
    if (statusLabel) statusLabel.textContent = 'آماده';

    if (startBtn) {
      startBtn.disabled = false;
      if (startBtnText) startBtnText.textContent = 'شروع ارسال لایو';
    }
    if (stopBtn) stopBtn.disabled = true;
    if (restartLiveBtn) restartLiveBtn.classList.add('hidden');
    destroyHlsPreview();
  }

  if (data.destinationsStatus) {
    updatePlatformBadge(destRubikaStatusBadge, data.destinationsStatus.rubika);
    updatePlatformBadge(destInstaStatusBadge, data.destinationsStatus.instagram);
    updatePlatformBadge(destYouTubeStatusBadge, data.destinationsStatus.youtube);
  }

  isManualRecordingActive = Boolean(data.isManualRecording);
  if (instantRecordBtn && manualRecordBadge && manualRecordTimer) {
    if (isManualRecordingActive) {
      instantRecordBtn.className = 'btn-brand-rose px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5';
      if (instantRecordBtnText) instantRecordBtnText.textContent = 'توقف و ذخیره ضبط';
      manualRecordBadge.className =
        'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse';
      manualRecordBadge.textContent = 'در حال ضبط...';
      manualRecordTimer.textContent = formatSeconds(data.manualRecordUptime || 0);
    } else {
      instantRecordBtn.className =
        'btn-brand-primary px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5';
      if (instantRecordBtnText) instantRecordBtnText.textContent = 'شروع ضبط';
      manualRecordBadge.className =
        'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200';
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
    if (!res.ok) return;
    const data = await res.json();
    updateUI(data);
  } catch (_) {}
}

function initActions() {
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

      const hasValidDest = config.destinations.some((d) => d.enabled && d.streamUrl && d.streamKey);
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
      const ok = await showConfirmModal({
        title: 'بازنشانی استریم زنده',
        message: 'آیا مایل به بازنشانی استریم با تنظیمات و لایه‌های جدید هستید؟ ممکن است پخش چند ثانیه وقفه داشته باشد.',
        confirmText: 'بازنشانی استریم',
        cancelText: 'انصراف',
        variant: 'warning'
      });
      if (!ok) return;

      restartLiveBtn.disabled = true;
      showToast('در حال بازنشانی استریم با مشخصات جدید...', 'info');

      try {
        const res = await fetch('/api/restart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getCurrentFormConfig())
        });
        const data = await res.json();
        if (data.success) {
          showToast('استریم با تنظیمات جدید بازنشانی شد.', 'success');
          setTimeout(initHlsPreview, 2500);
        } else {
          showToast(data.message || 'خطا در بازنشانی استریم.', 'error');
        }
      } catch (err) {
        showToast(`خطا: ${err.message}`, 'error');
      } finally {
        restartLiveBtn.disabled = false;
      }
    });
  }

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

  if (copyLogsBtn) {
    copyLogsBtn.addEventListener('click', () => {
      const text = terminalBox ? terminalBox.innerText : '';
      if (!text.trim()) {
        showToast('لاگی برای کپی وجود ندارد.', 'info');
        return;
      }
      navigator.clipboard
        .writeText(text)
        .then(() => {
          if (copyLogsText) copyLogsText.textContent = 'کپی شد!';
          copyLogsBtn.classList.add('bg-emerald-700', 'text-white');
          setTimeout(() => {
            if (copyLogsText) copyLogsText.textContent = 'کپی لاگ';
            copyLogsBtn.classList.remove('bg-emerald-700', 'text-white');
          }, 2000);
          showToast('لاگ‌ها در حافظه کپی شدند.', 'success');
        })
        .catch(() => {});
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
}

window.addEventListener('DOMContentLoaded', () => {
  bindStatusGetter(() => currentStatus);
  bindConfigMutatedCallback(() => {
    if (currentStatus === 'live' && restartLiveBtn) {
      restartLiveBtn.classList.remove('hidden');
    }
  });

  initPWA(pollStatus);
  initMobileNavigation();
  initPasswordToggles();
  initStudioControls();
  initPreviewAndRecordings();
  initActions();

  updatePlayerAspectRatio();
  pollStatus();
  fetchRecordings();
  setInterval(pollStatus, 1000);
  setInterval(fetchRecordings, 10000);
});
