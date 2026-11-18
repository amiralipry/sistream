const express = require('express');
const { spawn, execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Auto-create required directories on startup
const DIRS = [
  path.join(__dirname, 'public'),
  path.join(__dirname, 'public', 'preview'),
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'recordings')
];
DIRS.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middlewares
app.use(express.json());

// Strict no-cache headers for live HLS preview files
app.use('/preview', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  next();
}, express.static(path.join(__dirname, 'public', 'preview')));

// PWA Service Worker & Manifest headers
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Static folders with video streaming range support
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/recordings', express.static(path.join(__dirname, 'recordings'), {
  acceptRanges: true
}));

// Configure Multer for overlay uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `overlay_${Date.now()}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('تنها فایلهای تصویری با پسوند PNG, JPG, JPEG یا WEBP مجاز هستند.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter
});

// 72-Hour Auto-cleanup for recordings
const MAX_RECORDING_AGE_MS = 72 * 60 * 60 * 1000;

function cleanOldRecordings() {
  const recDir = path.join(__dirname, 'recordings');
  if (!fs.existsSync(recDir)) return;
  try {
    const files = fs.readdirSync(recDir);
    const now = Date.now();
    let count = 0;
    for (const f of files) {
      if (f.endsWith('.mp4') || f.endsWith('.ts')) {
        const fullPath = path.join(recDir, f);
        try {
          const stats = fs.statSync(fullPath);
          const age = now - stats.mtimeMs;
          if (age > MAX_RECORDING_AGE_MS) {
            fs.unlinkSync(fullPath);
            count++;
            appendLog(`[سیستم] فایل ضبط‌شده ${f} پس از ۷۲ ساعت خودکار پاکسازی شد.`);
          }
        } catch (e) {}
      }
    }
    if (count > 0) {
      console.log(`Auto-cleaned ${count} recording(s) older than 72 hours.`);
    }
  } catch (err) {}
}

cleanOldRecordings();
setInterval(cleanOldRecordings, 30 * 60 * 1000);

// Global streaming state
let ffmpegProcess = null;
let streamState = 'idle'; // 'idle' | 'connecting' | 'live' | 'error' | 'stopping'
let statusText = 'آماده برای اتصال';
let startTime = null;
let isStoppingManually = false;
let autoReconnectTimer = null;
let activeConfig = null;

// Platform Live Connection Health
const destinationsLiveStatus = {
  rubika: 'disabled',
  youtube: 'disabled',
  instagram: 'disabled'
};
let verticalTeeSlaveMap = [];
let currentSceneName = 'scene_live';

// On-Demand Independent Recording Subprocess (Never touches main broadcast)
let manualRecordProcess = null;
let isManualRecordingActive = false;
let manualRecordStartTime = null;
let currentManualRecordFile = null;

// Optional Continuous Master Recording
let currentSessionRecordFile = null;

const MAX_LOG_LINES = 300;
const logBuffer = [];
let currentStats = {
  frame: 0,
  fps: 0,
  q: 0,
  size: '0kB',
  time: '00:00:00',
  bitrate: '0kbits/s',
  speed: '0x',
  drop: 0
};

// Clean preview files in public/preview/
function cleanPreviewFiles() {
  const previewDir = path.join(__dirname, 'public', 'preview');
  if (!fs.existsSync(previewDir)) return;
  try {
    const files = fs.readdirSync(previewDir);
    for (const f of files) {
      if (f.endsWith('.m3u8') || f.endsWith('.ts') || f.endsWith('.tmp')) {
        try {
          fs.unlinkSync(path.join(previewDir, f));
        } catch (e) {}
      }
    }
  } catch (e) {}
}

cleanPreviewFiles();

// Locate FFmpeg binary
function findFFmpegPath() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  try {
    const cmd = process.platform === 'win32' ? 'where.exe ffmpeg' : 'which ffmpeg';
    const result = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
    if (result) {
      const firstLine = result.split(/\r?\n/)[0].trim();
      if (fs.existsSync(firstLine)) return firstLine;
    }
  } catch (err) {}

  if (process.platform === 'win32') {
    const candidates = [
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
    ];

    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const wingetLinks = path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe');
      if (fs.existsSync(wingetLinks)) candidates.unshift(wingetLinks);

      const wingetDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
      if (fs.existsSync(wingetDir)) {
        try {
          const dirs = fs.readdirSync(wingetDir);
          for (const d of dirs) {
            if (d.toLowerCase().includes('ffmpeg')) {
              const subDir = path.join(wingetDir, d);
              const found = searchForBinary(subDir, 'ffmpeg.exe', 3);
              if (found) candidates.unshift(found);
            }
          }
        } catch (e) {}
      }
    }

    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
  }

  return null;
}

function searchForBinary(dir, binaryName, maxDepth) {
  if (maxDepth < 0) return null;
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isFile() && file.name.toLowerCase() === binaryName.toLowerCase()) {
        return fullPath;
      }
      if (file.isDirectory() && maxDepth > 0) {
        const res = searchForBinary(fullPath, binaryName, maxDepth - 1);
        if (res) return res;
      }
    }
  } catch (e) {}
  return null;
}

function ensureStandbyCard() {
  const standbyPath = path.join(__dirname, 'uploads', 'standby_card.png');
  if (fs.existsSync(standbyPath)) return;
  const ffmpegBin = findFFmpegPath();
  if (!ffmpegBin) return;
  try {
    execSync(`"${ffmpegBin}" -v error -y -f lavfi -i color=c=#153047:s=720x1280 -vf "drawtext=fontfile='C\\:/Windows/Fonts/tahoma.ttf':text='استودیو پخش زنده':fontcolor=#9bc2db:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2-60,drawtext=fontfile='C\\:/Windows/Fonts/tahoma.ttf':text='به زودی بازمی‌گردیم':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=(h-text_h)/2,drawtext=fontfile='C\\:/Windows/Fonts/tahoma.ttf':text='لطفاً شکیبا باشید':fontcolor=#cbdceb:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+60" -frames:v 1 "${standbyPath}"`, { stdio: 'ignore' });
  } catch (e) {}
}

ensureStandbyCard();

function appendLog(line) {
  if (!line || !line.trim()) return;
  const timeStr = new Date().toLocaleTimeString('fa-IR', { hour12: false });
  const entry = `[${timeStr}] ${line.trim()}`;
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_LINES) {
    logBuffer.shift();
  }
}

// Parse FFmpeg progress & connection health
function parseFFmpegStderr(chunkStr) {
  const frameMatch = chunkStr.match(/frame=\s*(\d+)/);
  const fpsMatch = chunkStr.match(/fps=\s*([\d.]+)/);
  const qMatch = chunkStr.match(/q=\s*([\d.-]+)/);
  const sizeMatch = chunkStr.match(/size=\s*(\S+)/);
  const timeMatch = chunkStr.match(/time=\s*([\d:.]+)/);
  const bitrateMatch = chunkStr.match(/bitrate=\s*(\S+)/);
  const speedMatch = chunkStr.match(/speed=\s*([\d.x]+)/);
  const dropMatch = chunkStr.match(/drop=\s*(\d+)/i);

  if (frameMatch || timeMatch || speedMatch || fpsMatch) {
    if (frameMatch) currentStats.frame = parseInt(frameMatch[1], 10);
    if (fpsMatch) currentStats.fps = parseFloat(fpsMatch[1]);
    if (qMatch) currentStats.q = parseFloat(qMatch[1]);
    if (sizeMatch) currentStats.size = sizeMatch[1];
    if (timeMatch) currentStats.time = timeMatch[1];
    if (bitrateMatch && bitrateMatch[1] !== 'N/A') currentStats.bitrate = bitrateMatch[1];
    if (speedMatch) currentStats.speed = speedMatch[1];
    if (dropMatch) currentStats.drop = parseInt(dropMatch[1], 10);

    if (streamState === 'connecting' && currentStats.frame >= 2) {
      streamState = 'live';
      statusText = 'در حال پخش زنده (ارتباط پایدار)';
    }

    if (currentStats.frame >= 2) {
      if (destinationsLiveStatus.rubika === 'connecting') destinationsLiveStatus.rubika = 'live';
      if (destinationsLiveStatus.youtube === 'connecting') destinationsLiveStatus.youtube = 'live';
      if (destinationsLiveStatus.instagram === 'connecting') destinationsLiveStatus.instagram = 'live';
    }
  }

  const lower = chunkStr.toLowerCase();

  // Check slave muxer failure index
  const slaveMatch = lower.match(/slave muxer #(\d+) failed/);
  if (slaveMatch) {
    const idx = parseInt(slaveMatch[1], 10);
    const platform = verticalTeeSlaveMap[idx];
    if (platform === 'rubika') destinationsLiveStatus.rubika = 'error';
    if (platform === 'instagram') destinationsLiveStatus.instagram = 'error';
    appendLog(`[هشدار ارتباط] اتصال به «${platform || ('Slave #' + idx)}» با خطا مواجه شد.`);
  }

  // Detect connection failures
  if (lower.includes('rubika.ir') && (lower.includes('error') || lower.includes('fail') || lower.includes('refused') || lower.includes('closed') || lower.includes('cannot read rtmp handshake'))) {
    destinationsLiveStatus.rubika = 'error';
  }
  if (lower.includes('instagram.com') && (lower.includes('error') || lower.includes('fail') || lower.includes('refused') || lower.includes('closed') || lower.includes('cannot read rtmp handshake'))) {
    destinationsLiveStatus.instagram = 'error';
  }
  if (lower.includes('youtube.com') && (lower.includes('error') || lower.includes('fail') || lower.includes('refused') || lower.includes('closed') || lower.includes('cannot read rtmp handshake'))) {
    destinationsLiveStatus.youtube = 'error';
  }
}

// Start Main FFmpeg Process with Multi-Image Chaining & Isolated Rubika / Instagram
function startFFmpegProcess(config) {
  const ffmpegBin = findFFmpegPath();
  if (!ffmpegBin) {
    throw new Error('نرم‌افزار FFmpeg در سیستم یافت نشد.');
  }

  cleanPreviewFiles();

  const {
    srtUrl,
    destinations = [],
    width = 720,
    height = 1280,
    bitrate = 2500,
    fps = 30,
    rotation = '0',
    scalingMode = 'crop',
    passthrough = false,
    overlays = [],
    enableOverlay = false,
    overlayPath = '',
    overlayPosition = 'top_right',
    overlayMarginX = 25,
    overlayMarginY = 25,
    overlayScale = 20,
    overlayOpacity = 100,
    overlayRotation = '0',
    instaAntiCrop = true,
    instaAntiCropMargin = 15,
    audioGain = '100%',
    autoRecordOnStart = false
  } = config;

  const finalWidth = parseInt(width, 10) || 720;
  const finalHeight = parseInt(height, 10) || 1280;
  const finalFps = parseInt(fps, 10) || 30;
  const finalBitrate = parseInt(bitrate, 10) || 2500;

  const safeWidth = finalWidth % 2 === 0 ? finalWidth : finalWidth + 1;
  const safeHeight = finalHeight % 2 === 0 ? finalHeight : finalHeight + 1;

  // Classify targets
  let rubikaTarget = null;
  let youtubeTarget = null;
  let instaTarget = null;
  const otherTargets = [];

  if (Array.isArray(destinations) && destinations.length > 0) {
    for (const d of destinations) {
      if (d.enabled && d.streamUrl && d.streamKey) {
        const cleanBaseUrl = d.streamUrl.trim().replace(/\/+$/, '');
        const cleanKey = d.streamKey.trim().replace(/^\/+/, '');
        const targetUrl = `${cleanBaseUrl}/${cleanKey}`;
        const n = (d.name || '').trim().toLowerCase();

        if (d.name === 'روبیکا' || n.includes('rubika') || n.includes('روبیکا')) {
          rubikaTarget = { name: 'روبیکا', url: targetUrl, aspect: 'vertical' };
        } else if (d.name === 'یوتیوب' || n.includes('youtube') || n.includes('yt') || n.includes('یوتیوب')) {
          youtubeTarget = {
            name: 'یوتیوب',
            url: targetUrl,
            aspect: d.aspect || 'horizontal',
            width: (d.aspect === 'vertical') ? safeWidth : 1280,
            height: (d.aspect === 'vertical') ? safeHeight : 720,
            bitrate: parseInt(d.bitrate, 10) || 3500,
            fitMode: d.ytFitMode || 'blur'
          };
        } else if (d.name === 'اینستاگرام' || n.includes('insta') || n.includes('اینستاگرام')) {
          instaTarget = {
            name: 'اینستاگرام',
            url: targetUrl,
            antiCrop: d.instaAntiCrop !== false,
            marginPct: Math.max(5, Math.min(35, parseInt(d.instaAntiCropMargin || instaAntiCropMargin, 10) || 15)),
            bitrate: Math.min(2800, Math.max(2200, finalBitrate))
          };
        } else {
          otherTargets.push({ name: d.name || 'سفارشی', url: targetUrl });
        }
      }
    }
  }

  // Fallback for single streamUrl
  if (!rubikaTarget && !youtubeTarget && !instaTarget && otherTargets.length === 0 && config.streamUrl && config.streamKey) {
    const cleanBaseUrl = config.streamUrl.trim().replace(/\/+$/, '');
    const cleanKey = config.streamKey.trim().replace(/^\/+/, '');
    rubikaTarget = { name: 'روبیکا', url: `${cleanBaseUrl}/${cleanKey}`, aspect: 'vertical' };
  }

  if (!rubikaTarget && !youtubeTarget && !instaTarget && otherTargets.length === 0) {
    throw new Error('حداقل یک مقصد فعال برای ارسال استریم (روبیکا، یوتیوب، اینستاگرام) الزامی است.');
  }

  // Platform statuses
  destinationsLiveStatus.rubika = rubikaTarget ? 'connecting' : 'disabled';
  destinationsLiveStatus.youtube = youtubeTarget ? 'connecting' : 'disabled';
  destinationsLiveStatus.instagram = instaTarget ? 'connecting' : 'disabled';
  verticalTeeSlaveMap = [];

  // Multi-destination tee outputs for Master stream (Rubika, preview HLS, and optional auto-record)
  const verticalTeeOutputs = [];

  if (rubikaTarget) {
    verticalTeeSlaveMap.push('rubika');
    verticalTeeOutputs.push(`[f=flv:onfail=ignore:flvflags=no_duration_filesize]${rubikaTarget.url}`);
  }

  for (const t of otherTargets) {
    verticalTeeSlaveMap.push('other');
    verticalTeeOutputs.push(`[f=flv:onfail=ignore:flvflags=no_duration_filesize]${t.url}`);
  }

  // If Instagram has NO anti-crop, send in main tee
  const instaInMainTee = instaTarget && !instaTarget.antiCrop;
  if (instaInMainTee) {
    verticalTeeSlaveMap.push('instagram');
    verticalTeeOutputs.push(`[f=flv:onfail=ignore:flvflags=no_duration_filesize]${instaTarget.url}`);
  }

  // HLS live preview output (atomic temp_file writing, 6 segments sliding window = smooth low latency)
  verticalTeeOutputs.push(`[f=hls:onfail=ignore:hls_time=2:hls_list_size=6:hls_flags=delete_segments+temp_file:hls_segment_filename=public/preview/stream%03d.ts]public/preview/stream.m3u8`);

  // Auto-record ONLY if explicitly enabled by user
  if (autoRecordOnStart) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    currentSessionRecordFile = `live_${timestamp}.mp4`;
    verticalTeeOutputs.push(`[f=mp4:onfail=ignore:movflags=frag_keyframe+empty_moov+default_base_moof]recordings/${currentSessionRecordFile}`);
  } else {
    currentSessionRecordFile = null;
  }

  const verticalTeeString = verticalTeeOutputs.join('|');

  // Tune SRT URL
  let cleanSrtUrl = srtUrl.trim();
  const sep = cleanSrtUrl.includes('?') ? '&' : '?';
  const queryParams = [];
  if (!cleanSrtUrl.includes('rcvbuf=')) queryParams.push('rcvbuf=67108864');
  if (!cleanSrtUrl.includes('latency=')) queryParams.push('latency=2000000');
  if (!cleanSrtUrl.includes('lossmaxttl=')) queryParams.push('lossmaxttl=100');
  if (!cleanSrtUrl.includes('mode=')) queryParams.push('mode=caller');
  if (queryParams.length > 0) cleanSrtUrl += `${sep}${queryParams.join('&')}`;

  const ffmpegArgs = ['-hide_banner', '-y', '-threads', '0'];

  // Input 0: SRT Live Input
  ffmpegArgs.push('-analyzeduration', '10000000');
  ffmpegArgs.push('-probesize', '10000000');
  ffmpegArgs.push('-fflags', '+genpts+discardcorrupt');
  ffmpegArgs.push('-err_detect', 'ignore_err');
  ffmpegArgs.push('-thread_queue_size', '8192');
  ffmpegArgs.push('-i', cleanSrtUrl);

  // Multi-Image Overlays Collector
  const validOverlays = [];

  // Check multi-overlays array
  if (Array.isArray(overlays) && overlays.length > 0) {
    for (const ov of overlays) {
      if (ov && ov.enabled && ov.path) {
        const filename = path.basename(ov.path);
        const fullPath = path.join(__dirname, 'uploads', filename);
        if (fs.existsSync(fullPath)) {
          validOverlays.push({
            ...ov,
            fullPath,
            filename
          });
        }
      }
    }
  }

  // Fallback to single overlay if provided
  if (validOverlays.length === 0 && enableOverlay && !passthrough && overlayPath) {
    const filename = path.basename(overlayPath);
    const fullPath = path.join(__dirname, 'uploads', filename);
    if (fs.existsSync(fullPath)) {
      validOverlays.push({
        fullPath,
        filename,
        position: overlayPosition || 'top_right',
        marginX: overlayMarginX || 25,
        marginY: overlayMarginY || 25,
        scale: overlayScale || 20,
        opacity: overlayOpacity || 100,
        rotation: overlayRotation || '0'
      });
    }
  }

  // Add each image overlay as an independent FFmpeg input
  validOverlays.forEach((ov) => {
    ffmpegArgs.push('-thread_queue_size', '1024', '-loop', '1', '-i', ov.fullPath);
  });

  // Audio filter with Gain / Mute support
  let gainMultiplier = 1.0;
  if (audioGain === '0%') gainMultiplier = 0.0;
  else if (audioGain === '125%') gainMultiplier = 1.25;
  else if (audioGain === '150%') gainMultiplier = 1.5;
  else if (audioGain === '200%') gainMultiplier = 2.0;

  const audioFilter = `aresample=async=1000:first_pts=0,aformat=channel_layouts=stereo:sample_rates=44100,volume=${gainMultiplier}`;

  if (passthrough) {
    ffmpegArgs.push('-c:v', 'copy', '-c:a', 'copy');
    ffmpegArgs.push('-flags', '+global_header');
    ffmpegArgs.push('-f', 'tee', '-use_fifo', '1');
    ffmpegArgs.push('-fifo_options', 'queue_size=5000:drop_pkts_on_overflow=1:attempt_recovery=1:recover_any_error=1:recovery_wait_time=2');
    ffmpegArgs.push('-map', '0:v', '-map', '0:a?');
    ffmpegArgs.push(verticalTeeString);
  } else {
    const filterParts = [];

    // 1. Rotation stage
    let currentV = '[0:v]';
    if (rotation === '90' || rotation === '90_cw') {
      filterParts.push(`${currentV}transpose=1[v_rot]`);
      currentV = '[v_rot]';
    } else if (rotation === '270' || rotation === '90_ccw') {
      filterParts.push(`${currentV}transpose=2[v_rot]`);
      currentV = '[v_rot]';
    } else if (rotation === '180') {
      filterParts.push(`${currentV}transpose=2,transpose=2[v_rot]`);
      currentV = '[v_rot]';
    }

    // 2. Base scaling (Rubika, preview & recording get full frame clean video!)
    if (scalingMode === 'crop') {
      filterParts.push(`${currentV}scale=${safeWidth}:${safeHeight}:force_original_aspect_ratio=increase,crop=${safeWidth}:${safeHeight}[v_base]`);
    } else if (scalingMode === 'fit') {
      filterParts.push(`${currentV}scale=${safeWidth}:${safeHeight}:force_original_aspect_ratio=decrease,pad=${safeWidth}:${safeHeight}:(ow-iw)/2:(oh-ih)/2[v_base]`);
    } else {
      filterParts.push(`${currentV}scale=${safeWidth}:${safeHeight}[v_base]`);
    }

    // 3. Multi-Image Overlay Chaining
    if (validOverlays.length === 0) {
      filterParts.push(`[v_base]null[v_master]`);
    } else {
      let currentBase = '[v_base]';
      validOverlays.forEach((ov, idx) => {
        const inputIdx = idx + 1;
        let curOv = `[${inputIdx}:v]`;

        if (ov.rotation === '90' || ov.rotation === '90_cw') {
          filterParts.push(`${curOv}transpose=1[ov_rot_${idx}]`);
          curOv = `[ov_rot_${idx}]`;
        } else if (ov.rotation === '270' || ov.rotation === '90_ccw') {
          filterParts.push(`${curOv}transpose=2[ov_rot_${idx}]`);
          curOv = `[ov_rot_${idx}]`;
        } else if (ov.rotation === '180') {
          filterParts.push(`${curOv}transpose=2,transpose=2[ov_rot_${idx}]`);
          curOv = `[ov_rot_${idx}]`;
        }

        const alphaVal = Math.max(0.1, Math.min(1.0, (parseInt(ov.opacity, 10) || 100) / 100)).toFixed(2);
        const mX = Math.max(0, Math.min(400, parseInt(ov.marginX, 10) || 25));
        const mY = Math.max(0, Math.min(400, parseInt(ov.marginY, 10) || 25));

        let posExpr = `W-w-${mX}:${mY}`;
        if (ov.position === 'top_left') posExpr = `${mX}:${mY}`;
        else if (ov.position === 'bottom_right') posExpr = `W-w-${mX}:H-h-${mY}`;
        else if (ov.position === 'bottom_left') posExpr = `${mX}:H-h-${mY}`;
        else if (ov.position === 'center') posExpr = `(W-w)/2:(H-h)/2`;
        else if (ov.position === 'full_frame') posExpr = `0:0`;

        const scalePct = Math.max(5, Math.min(100, parseInt(ov.scale, 10) || 20));
        let targetW = Math.round(safeWidth * (scalePct / 100));
        if (targetW % 2 !== 0) targetW += 1;

        if (ov.position === 'full_frame') {
          filterParts.push(`${curOv}scale=${safeWidth}:${safeHeight},format=rgba,colorchannelmixer=aa=${alphaVal}[ov_f_${idx}]`);
          posExpr = '0:0';
        } else {
          filterParts.push(`${curOv}scale=${targetW}:-2,format=rgba,colorchannelmixer=aa=${alphaVal}[ov_f_${idx}]`);
        }

        const nextBase = (idx === validOverlays.length - 1) ? '[v_master]' : `[v_comp_${idx}]`;
        filterParts.push(`${currentBase}[ov_f_${idx}]overlay=${posExpr}:shortest=1${nextBase}`);
        currentBase = nextBase;
      });
    }

    // Determine branches from v_master
    const needInstaBranch = Boolean(instaTarget && instaTarget.antiCrop);
    const needYtBranch = Boolean(youtubeTarget && youtubeTarget.aspect === 'horizontal');

    let splitCount = 1;
    if (needInstaBranch) splitCount++;
    if (needYtBranch) splitCount++;

    if (splitCount === 3) {
      filterParts.push(`[v_master]split=3[v_rubika][v_for_insta][v_for_yt]`);
    } else if (splitCount === 2) {
      if (needInstaBranch) {
        filterParts.push(`[v_master]split=2[v_rubika][v_for_insta]`);
      } else {
        filterParts.push(`[v_master]split=2[v_rubika][v_for_yt]`);
      }
    } else {
      filterParts.push(`[v_master]null[v_rubika]`);
    }

    // Build Instagram Branch with custom safe zone margin percentage & live blurred background
    if (needInstaBranch) {
      const marginPct = instaTarget.marginPct || 15;
      const scaleFactor = (100 - marginPct) / 100;
      let innerW = Math.round(safeWidth * scaleFactor);
      let innerH = Math.round(safeHeight * scaleFactor);
      if (innerW % 2 !== 0) innerW -= 1;
      if (innerH % 2 !== 0) innerH -= 1;

      filterParts.push(`[v_for_insta]split=2[insta_bg][insta_fg]`);
      filterParts.push(`[insta_bg]scale=${safeWidth}:${safeHeight}:force_original_aspect_ratio=increase,crop=${safeWidth}:${safeHeight},boxblur=25:5[insta_bg_blur]`);
      filterParts.push(`[insta_fg]scale=${innerW}:${innerH}[insta_fg_scaled]`);
      filterParts.push(`[insta_bg_blur][insta_fg_scaled]overlay=(W-w)/2:(H-h)/2[v_insta]`);
    }

    // Build YouTube Horizontal Branch (if enabled)
    if (needYtBranch) {
      const ytW = youtubeTarget.width || 1280;
      const ytH = youtubeTarget.height || 720;
      const ytFit = youtubeTarget.fitMode || 'blur';

      if (ytFit === 'blur') {
        filterParts.push(`[v_for_yt]split=2[yt_bg][yt_fg]`);
        filterParts.push(`[yt_bg]scale=${ytW}:${ytH}:force_original_aspect_ratio=increase,crop=${ytW}:${ytH},boxblur=20:5[bg_blurred]`);
        filterParts.push(`[yt_fg]scale=-2:${ytH}[fg_scaled]`);
        filterParts.push(`[bg_blurred][fg_scaled]overlay=(W-w)/2:0[v_yt]`);
      } else if (ytFit === 'fit') {
        filterParts.push(`[v_for_yt]scale=${ytW}:${ytH}:force_original_aspect_ratio=decrease,pad=${ytW}:${ytH}:(ow-iw)/2:(oh-ih)/2:black[v_yt]`);
      } else {
        filterParts.push(`[v_for_yt]scale=${ytW}:${ytH}:force_original_aspect_ratio=increase,crop=${ytW}:${ytH}[v_yt]`);
      }
    }

    ffmpegArgs.push('-filter_complex', filterParts.join(';'));

    // Output 1: Vertical Stream (Rubika clean full-frame, preview HLS)
    ffmpegArgs.push(
      '-map', '[v_rubika]', '-map', '0:a?',
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-pix_fmt', 'yuv420p',
      '-r', `${finalFps}`, '-b:v', `${finalBitrate}k`, '-maxrate', `${finalBitrate}k`, '-bufsize', `${finalBitrate * 2}k`, '-g', `${finalFps * 2}`,
      '-af', audioFilter,
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
      '-flags', '+global_header',
      '-f', 'tee', '-use_fifo', '1',
      '-fifo_options', 'queue_size=5000:drop_pkts_on_overflow=1:attempt_recovery=1:recover_any_error=1:recovery_wait_time=2',
      verticalTeeString
    );

    // Output 2: Dedicated Instagram Branch (Strict CBR + GOP 25 + Anti-Crop Custom Margin)
    if (needInstaBranch) {
      const instaBit = instaTarget.bitrate || 2500;
      ffmpegArgs.push(
        '-map', '[v_insta]', '-map', '0:a?',
        '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-pix_fmt', 'yuv420p',
        '-r', `${finalFps}`, '-b:v', `${instaBit}k`, '-minrate', `${instaBit}k`, '-maxrate', `${instaBit}k`, '-bufsize', `${instaBit}k`,
        '-g', '25', '-x264opts', 'keyint=50:min-keyint=25:no-scenecut',
        '-af', audioFilter,
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
        '-flvflags', 'no_duration_filesize',
        '-f', 'flv',
        instaTarget.url
      );
    }

    // Output 3: Dedicated YouTube Horizontal Branch (16:9)
    if (needYtBranch) {
      const ytBitrate = youtubeTarget.bitrate || 3500;
      ffmpegArgs.push(
        '-map', '[v_yt]', '-map', '0:a?',
        '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-pix_fmt', 'yuv420p',
        '-r', `${finalFps}`, '-b:v', `${ytBitrate}k`, '-maxrate', `${ytBitrate}k`, '-bufsize', `${ytBitrate * 2}k`, '-g', `${finalFps * 2}`,
        '-af', audioFilter,
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
        '-flvflags', 'no_duration_filesize',
        '-f', 'flv',
        youtubeTarget.url
      );
    }
  }

  logBuffer.push('----------------------------------------');
  appendLog(`[سیستم] آغاز پردازش جدید FFmpeg:`);
  appendLog(`[سیستم] ورودی SRT: ${cleanSrtUrl}`);
  const activeNames = [];
  if (rubikaTarget) activeNames.push('روبیکا (تمام‌کادر بدون برش)');
  if (instaTarget) activeNames.push(`اینستاگرام (حاشیه امن بلور ${instaTarget.marginPct}٪)`);
  if (youtubeTarget) activeNames.push(`یوتیوب (${youtubeTarget.aspect === 'horizontal' ? 'افقی ۱۶:۹' : 'عمودی'})`);
  appendLog(`[سیستم] مقصدهای فعال: ${activeNames.join('، ')}`);
  if (autoRecordOnStart && currentSessionRecordFile) {
    appendLog(`[سیستم] ضبط خودکار فعال است: ${currentSessionRecordFile}`);
  } else {
    appendLog(`[سیستم] ضبط خودکار غیرفعال است (ضبط تنها با کلیک کاربر آغاز می‌شود).`);
  }
  if (!passthrough) {
    appendLog(`[سیستم] مشخصات ویدیو: ${safeWidth}x${safeHeight} @ ${finalBitrate}kbps (${finalFps} FPS) | چرخش: ${rotation}°`);
    if (validOverlays.length > 0) {
      appendLog(`[سیستم] لایه‌های تصویری فعال: ${validOverlays.length} لایه (${validOverlays.map(o => o.filename).join(', ')})`);
    }
  }

  ffmpegProcess = spawn(ffmpegBin, ffmpegArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  startTime = Date.now();
  streamState = 'connecting';
  statusText = 'در حال برقراری اتصال SRT و ارسال به مقصدهای لایو...';

  ffmpegProcess.stdout.on('data', (data) => {
    const text = data.toString('utf8');
    text.split(/\r?\n/).forEach(line => appendLog(line));
  });

  ffmpegProcess.stderr.on('data', (data) => {
    const text = data.toString('utf8');
    parseFFmpegStderr(text);
    text.split(/\r?\n/).forEach(line => appendLog(line));
  });

  ffmpegProcess.on('error', (err) => {
    appendLog(`[خطای FFmpeg]: ${err.message}`);
    streamState = 'error';
    statusText = `خطا در اجرای FFmpeg: ${err.message}`;
    destinationsLiveStatus.rubika = 'error';
    destinationsLiveStatus.youtube = 'error';
    destinationsLiveStatus.instagram = 'error';
    ffmpegProcess = null;
  });

  ffmpegProcess.on('close', (code, signal) => {
    appendLog(`[سیستم] فرآیند FFmpeg متوقف شد (کد: ${code})`);

    const wasManual = isStoppingManually;
    ffmpegProcess = null;
    startTime = null;
    destinationsLiveStatus.rubika = 'disabled';
    destinationsLiveStatus.youtube = 'disabled';
    destinationsLiveStatus.instagram = 'disabled';

    if (wasManual) {
      streamState = 'idle';
      statusText = 'استریم توسط کاربر متوقف شد.';
      cleanPreviewFiles();
    } else {
      if (code === 0) {
        streamState = 'idle';
        statusText = 'پایان استریم.';
        cleanPreviewFiles();
      } else {
        streamState = 'error';
        statusText = `استریم قطع شد (کد: ${code}).`;

        if (config.autoReconnect !== false && !isStoppingManually) {
          appendLog(`[سیستم] تلاش برای اتصال مجدد خودکار طی ۳ ثانیه آینده...`);
          streamState = 'connecting';
          statusText = 'در حال تلاش مجدد خودکار طی ۳ ثانیه...';

          if (autoReconnectTimer) clearTimeout(autoReconnectTimer);
          autoReconnectTimer = setTimeout(() => {
            if (!isStoppingManually && !ffmpegProcess) {
              appendLog(`[سیستم] راه‌اندازی مجدد خودکار استریم...`);
              try {
                startFFmpegProcess(config);
              } catch (err) {
                streamState = 'error';
                statusText = `خطا در اتصال مجدد خودکار: ${err.message}`;
              }
            }
          }, 3000);
        } else {
          cleanPreviewFiles();
        }
      }
    }
  });

  return true;
}

// Deliberate manual restart helper when user explicitly confirms
function restartFFmpegDeliberately(config) {
  if (!config) return;
  const oldProc = ffmpegProcess;
  isStoppingManually = false;

  if (oldProc) {
    try {
      if (process.platform === 'win32') {
        try { oldProc.stdin.write('q'); } catch (e) {}
        exec(`taskkill /pid ${oldProc.pid} /T /F`, () => {});
      } else {
        oldProc.kill('SIGKILL');
      }
    } catch (e) {}
  }

  setTimeout(() => {
    try {
      startFFmpegProcess(config);
      appendLog(`[سیستم] استریم با تنظیمات جدید بازنشانی شد.`);
    } catch (err) {
      appendLog(`[خطا] خطا در به‌روزرسانی استریم: ${err.message}`);
    }
  }, 300);
}

// ======================= API Endpoints =======================

// Upload Overlay Image
app.post('/api/upload-overlay', upload.single('overlay'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'فایلی ارسال نشده است.' });
  }

  const relativeUrl = `/uploads/${req.file.filename}`;
  appendLog(`[سیستم] تصویر بارگذاری شد: ${req.file.filename}`);

  res.json({
    success: true,
    message: 'تصویر با موفقیت بارگذاری شد.',
    filePath: relativeUrl,
    filename: req.file.filename,
    originalName: req.file.originalname
  });
});

// Delete Overlay Image
app.post('/api/delete-overlay', (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ success: false, message: 'نام فایل الزامی است.' });
  }

  const safeFilename = path.basename(filename);
  const targetPath = path.join(__dirname, 'uploads', safeFilename);

  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath);
      return res.json({ success: true, message: 'تصویر با موفقیت حذف شد.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'خطا در حذف فایل.' });
    }
  }

  return res.json({ success: true, message: 'فایل قبلاً حذف شده بود.' });
});

// Explicit Stream Restart Endpoint (Only called when user confirms)
app.post('/api/restart', (req, res) => {
  if (!activeConfig) {
    return res.status(400).json({ success: false, message: 'استریم فعالی وجود ندارد.' });
  }

  const newConfig = { ...activeConfig, ...req.body };
  activeConfig = newConfig;

  appendLog('[سیستم] درخواست بازنشانی استریم با تنظیمات جدید توسط کاربر صادر شد.');
  restartFFmpegDeliberately(activeConfig);

  return res.json({ success: true, message: 'فرآیند بازنشانی استریم با موفقیت آغاز شد.' });
});

// Scene switch endpoint
app.post('/api/scene/switch', (req, res) => {
  const { scene } = req.body;
  if (!scene) {
    return res.status(400).json({ success: false, message: 'نام سکانس الزامی است.' });
  }
  currentSceneName = scene;
  appendLog(`[سیستم] سوییچ به سکانس: ${scene}`);
  return res.json({
    success: true,
    message: `سکانس فعال به «${scene}» تغییر یافت.`,
    currentScene: currentSceneName
  });
});

// Live overlay update registration
app.post('/api/overlay/live-update', (req, res) => {
  if (activeConfig && req.body.overlays) {
    activeConfig.overlays = req.body.overlays;
  }
  appendLog(`[سیستم] تنظیمات لایه‌های گرافیکی به‌روزرسانی شد.`);
  return res.json({ success: true, message: 'مشخصات لایه‌ها ثبت شد.' });
});

// Get Recordings List
app.get('/api/recordings', (req, res) => {
  const recDir = path.join(__dirname, 'recordings');
  try {
    const files = fs.readdirSync(recDir).filter(f => f.endsWith('.mp4'));
    const list = files.map(f => {
      const stat = fs.statSync(path.join(recDir, f));
      return {
        filename: f,
        sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
        createdAt: stat.birthtime,
        mtime: stat.mtime
      };
    }).sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    res.json({ success: true, recordings: list });
  } catch (e) {
    res.json({ success: true, recordings: [] });
  }
});

// Direct Download of a Recording
app.get('/api/recordings/download/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'recordings', safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('فایل مورد نظر یافت نشد.');
  }

  res.download(filePath, safeFilename);
});

// Delete a Recording File
app.delete('/api/recordings/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'recordings', safeFilename);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: 'فایل با موفقیت حذف شد.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'خطا در حذف فایل.' });
    }
  }
  return res.status(404).json({ success: false, message: 'فایل یافت نشد.' });
});

// On-Demand Independent Recording: Start (Zero impact on live stream)
app.post('/api/record/start', (req, res) => {
  if (isManualRecordingActive) {
    return res.status(400).json({ success: false, message: 'ضبط دستی در حال حاضر فعال است.' });
  }

  if (!ffmpegProcess) {
    return res.status(400).json({ success: false, message: 'استریم لایو فعال نیست.' });
  }

  const hlsManifest = path.join(__dirname, 'public', 'preview', 'stream.m3u8');
  if (!fs.existsSync(hlsManifest)) {
    return res.status(400).json({ success: false, message: 'فید پیش‌نمایش هنوز برای ضبط آماده نشده است. چند ثانیه دیگر تلاش کنید.' });
  }

  const ffmpegBin = findFFmpegPath();
  if (!ffmpegBin) {
    return res.status(500).json({ success: false, message: 'موتور FFmpeg یافت نشد.' });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `record_${timestamp}.mp4`;
  const outPath = path.join(__dirname, 'recordings', filename);

  try {
    // Lossless recording subprocess copying the live stream without touching main FFmpeg
    manualRecordProcess = spawn(ffmpegBin, [
      '-hide_banner', '-y',
      '-i', hlsManifest,
      '-c', 'copy',
      outPath
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    isManualRecordingActive = true;
    manualRecordStartTime = Date.now();
    currentManualRecordFile = filename;
    appendLog(`[سیستم] ضبط دستی با موفقیت آغاز شد: ${filename}`);

    manualRecordProcess.on('error', (err) => {
      appendLog(`[خطای ضبط]: ${err.message}`);
      isManualRecordingActive = false;
      manualRecordProcess = null;
    });

    manualRecordProcess.on('close', () => {
      isManualRecordingActive = false;
      manualRecordProcess = null;
    });

    return res.json({
      success: true,
      message: 'فرآیند ضبط با موفقیت آغاز شد.',
      filename
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// On-Demand Independent Recording: Stop & Save cleanly
app.post('/api/record/stop', (req, res) => {
  if (!isManualRecordingActive || !currentManualRecordFile) {
    return res.status(400).json({ success: false, message: 'هیچ ضبط فعالی وجود ندارد.' });
  }

  const savedFile = currentManualRecordFile;
  const proc = manualRecordProcess;

  isManualRecordingActive = false;
  manualRecordStartTime = null;
  manualRecordProcess = null;

  if (proc) {
    try {
      proc.stdin.write('q');
      setTimeout(() => {
        try {
          if (process.platform === 'win32') {
            exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
          } else {
            proc.kill('SIGKILL');
          }
        } catch (e) {}
      }, 800);
    } catch (e) {}
  }

  appendLog(`[سیستم] ضبط دستی متوقف شد و ذخیره گردید: ${savedFile}`);

  return res.json({
    success: true,
    message: 'ضبط با موفقیت متوقف و ذخیره شد.',
    filename: savedFile
  });
});

// Stream Status
app.get('/api/status', (req, res) => {
  const detectedFFmpeg = findFFmpegPath();
  const uptime = (ffmpegProcess && startTime) ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const previewPath = path.join(__dirname, 'public', 'preview', 'stream.m3u8');
  const previewActive = fs.existsSync(previewPath);

  const manualRecordUptime = (isManualRecordingActive && manualRecordStartTime)
    ? Math.floor((Date.now() - manualRecordStartTime) / 1000)
    : 0;

  res.json({
    running: ffmpegProcess !== null,
    state: streamState,
    statusText,
    uptime,
    stats: currentStats,
    logs: logBuffer.slice(-50),
    ffmpegInstalled: !!detectedFFmpeg,
    ffmpegPath: detectedFFmpeg || null,
    previewActive,
    destinationsStatus: destinationsLiveStatus,
    currentScene: currentSceneName,
    isManualRecording: isManualRecordingActive,
    manualRecordUptime,
    manualRecordFile: currentManualRecordFile,
    masterRecordFile: currentSessionRecordFile,
    activeConfig: activeConfig ? {
      srtUrl: activeConfig.srtUrl,
      width: activeConfig.width,
      height: activeConfig.height,
      bitrate: activeConfig.bitrate,
      fps: activeConfig.fps,
      rotation: activeConfig.rotation,
      scalingMode: activeConfig.scalingMode,
      passthrough: activeConfig.passthrough,
      instaAntiCrop: activeConfig.instaAntiCrop,
      instaAntiCropMargin: activeConfig.instaAntiCropMargin,
      autoRecordOnStart: activeConfig.autoRecordOnStart,
      autoReconnect: activeConfig.autoReconnect
    } : null
  });
});

// Start Stream
app.post('/api/start', (req, res) => {
  if (ffmpegProcess) {
    return res.status(400).json({
      success: false,
      message: 'یک استریم در حال حاضر فعال است. ابتدا آن را متوقف کنید.'
    });
  }

  const { srtUrl } = req.body;

  if (!srtUrl || typeof srtUrl !== 'string' || !srtUrl.trim().toLowerCase().startsWith('srt://')) {
    return res.status(400).json({ success: false, message: 'آدرس ورودی SRT معتبر الزامی است (srt://).' });
  }

  if (autoReconnectTimer) {
    clearTimeout(autoReconnectTimer);
    autoReconnectTimer = null;
  }

  isStoppingManually = false;
  activeConfig = { ...req.body };

  currentStats = {
    frame: 0,
    fps: 0,
    q: 0,
    size: '0kB',
    time: '00:00:00',
    bitrate: `${req.body.bitrate || 2500}kbits/s`,
    speed: '0x',
    drop: 0
  };

  try {
    startFFmpegProcess(activeConfig);
    return res.json({
      success: true,
      message: 'ارسال استریم آغاز شد.'
    });
  } catch (err) {
    streamState = 'error';
    statusText = `خطا: ${err.message}`;
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Stop Stream
app.post('/api/stop', (req, res) => {
  isStoppingManually = true;

  if (autoReconnectTimer) {
    clearTimeout(autoReconnectTimer);
    autoReconnectTimer = null;
  }

  // Stop manual recording if running
  if (manualRecordProcess) {
    try {
      manualRecordProcess.stdin.write('q');
      setTimeout(() => {
        try { exec(`taskkill /pid ${manualRecordProcess.pid} /T /F`, () => {}); } catch (e) {}
      }, 500);
    } catch (e) {}
    manualRecordProcess = null;
  }
  isManualRecordingActive = false;

  if (!ffmpegProcess) {
    streamState = 'idle';
    statusText = 'استریم غیرفعال است.';
    cleanPreviewFiles();
    return res.json({
      success: true,
      message: 'استریم فعالی وجود نداشت.'
    });
  }

  streamState = 'stopping';
  statusText = 'در حال توقف...';
  appendLog('[سیستم] درخواست توقف لایو صادر شد.');

  const proc = ffmpegProcess;
  const pid = proc.pid;

  function forceKill() {
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${pid} /T /F`, () => {});
      } else {
        proc.kill('SIGKILL');
      }
    } catch (e) {}
  }

  try {
    if (process.platform === 'win32') {
      try { proc.stdin.write('q'); } catch (e) {}
      setTimeout(() => {
        if (ffmpegProcess && ffmpegProcess.pid === pid) {
          forceKill();
        }
      }, 1500);
    } else {
      proc.kill('SIGINT');
      setTimeout(() => {
        if (ffmpegProcess && ffmpegProcess.pid === pid) {
          proc.kill('SIGKILL');
        }
      }, 2000);
    }

    return res.json({
      success: true,
      message: 'دستور توقف ارسال شد.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `خطا در توقف: ${err.message}`
    });
  }
});

// Clean up processes on server termination
function cleanupOnExit() {
  if (autoReconnectTimer) clearTimeout(autoReconnectTimer);
  if (manualRecordProcess) {
    try { execSync(`taskkill /pid ${manualRecordProcess.pid} /T /F`, { stdio: 'ignore' }); } catch (e) {}
  }
  if (ffmpegProcess) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${ffmpegProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        ffmpegProcess.kill('SIGKILL');
      }
    } catch (e) {}
  }
  cleanPreviewFiles();
}

process.on('SIGINT', () => { cleanupOnExit(); process.exit(0); });
process.on('SIGTERM', () => { cleanupOnExit(); process.exit(0); });
process.on('exit', () => { cleanupOnExit(); });
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  cleanupOnExit();
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`SRT Studio Relay Server running at http://localhost:${PORT}`);
  const ffmpeg = findFFmpegPath();
  if (ffmpeg) {
    console.log(`FFmpeg engine active: ${ffmpeg}`);
  }
  console.log(`Multi-image overlays, Custom safe zone & On-Demand recording ready.`);
  console.log(`====================================================`);
});
