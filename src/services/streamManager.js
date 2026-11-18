const { spawn, exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const {
  PREVIEW_DIR,
  UPLOADS_DIR,
  RECORDINGS_DIR,
  cleanPreviewFiles,
  findFFmpegPath
} = require('../config/paths');
const { appendLog, appendRawDivider, getRecentLogs } = require('./logger');

let ffmpegProcess = null;
let streamState = 'idle'; // 'idle' | 'connecting' | 'live' | 'error' | 'stopping'
let statusText = 'آماده برای اتصال';
let startTime = null;
let isStoppingManually = false;
let autoReconnectTimer = null;
let activeConfig = null;

const destinationsLiveStatus = {
  rubika: 'disabled',
  youtube: 'disabled',
  instagram: 'disabled'
};
let verticalTeeSlaveMap = [];
let currentSceneName = 'scene_live';

// Independent on-demand recording subprocess
let manualRecordProcess = null;
let isManualRecordingActive = false;
let manualRecordStartTime = null;
let currentManualRecordFile = null;
let currentSessionRecordFile = null;

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
  const slaveMatch = lower.match(/slave muxer #(\d+) failed/);
  if (slaveMatch) {
    const idx = parseInt(slaveMatch[1], 10);
    const platform = verticalTeeSlaveMap[idx];
    if (platform === 'rubika') destinationsLiveStatus.rubika = 'error';
    if (platform === 'instagram') destinationsLiveStatus.instagram = 'error';
    appendLog(`[هشدار ارتباط] اتصال به «${platform || ('Slave #' + idx)}» با خطا مواجه شد.`);
  }

  const hasErr =
    lower.includes('error') ||
    lower.includes('fail') ||
    lower.includes('refused') ||
    lower.includes('closed') ||
    lower.includes('cannot read rtmp handshake');

  if (hasErr) {
    if (lower.includes('rubika.ir')) destinationsLiveStatus.rubika = 'error';
    if (lower.includes('instagram.com')) destinationsLiveStatus.instagram = 'error';
    if (lower.includes('youtube.com')) destinationsLiveStatus.youtube = 'error';
  }
}

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
            width: d.aspect === 'vertical' ? safeWidth : 1280,
            height: d.aspect === 'vertical' ? safeHeight : 720,
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

  if (!rubikaTarget && !youtubeTarget && !instaTarget && otherTargets.length === 0 && config.streamUrl && config.streamKey) {
    const cleanBaseUrl = config.streamUrl.trim().replace(/\/+$/, '');
    const cleanKey = config.streamKey.trim().replace(/^\/+/, '');
    rubikaTarget = { name: 'روبیکا', url: `${cleanBaseUrl}/${cleanKey}`, aspect: 'vertical' };
  }

  if (!rubikaTarget && !youtubeTarget && !instaTarget && otherTargets.length === 0) {
    throw new Error('حداقل یک مقصد فعال برای ارسال استریم (روبیکا، یوتیوب، اینستاگرام) الزامی است.');
  }

  destinationsLiveStatus.rubika = rubikaTarget ? 'connecting' : 'disabled';
  destinationsLiveStatus.youtube = youtubeTarget ? 'connecting' : 'disabled';
  destinationsLiveStatus.instagram = instaTarget ? 'connecting' : 'disabled';
  verticalTeeSlaveMap = [];

  const verticalTeeOutputs = [];

  if (rubikaTarget) {
    verticalTeeSlaveMap.push('rubika');
    verticalTeeOutputs.push(`[f=flv:onfail=ignore:flvflags=no_duration_filesize]${rubikaTarget.url}`);
  }

  for (const t of otherTargets) {
    verticalTeeSlaveMap.push('other');
    verticalTeeOutputs.push(`[f=flv:onfail=ignore:flvflags=no_duration_filesize]${t.url}`);
  }

  const instaInMainTee = instaTarget && !instaTarget.antiCrop;
  if (instaInMainTee) {
    verticalTeeSlaveMap.push('instagram');
    verticalTeeOutputs.push(`[f=flv:onfail=ignore:flvflags=no_duration_filesize]${instaTarget.url}`);
  }

  verticalTeeOutputs.push(
    `[f=hls:onfail=ignore:hls_time=2:hls_list_size=6:hls_flags=delete_segments+temp_file:hls_segment_filename=public/preview/stream%03d.ts]public/preview/stream.m3u8`
  );

  if (autoRecordOnStart) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    currentSessionRecordFile = `live_${timestamp}.mp4`;
    verticalTeeOutputs.push(
      `[f=mp4:onfail=ignore:movflags=frag_keyframe+empty_moov+default_base_moof]recordings/${currentSessionRecordFile}`
    );
  } else {
    currentSessionRecordFile = null;
  }

  const verticalTeeString = verticalTeeOutputs.join('|');

  let cleanSrtUrl = srtUrl.trim();
  const sep = cleanSrtUrl.includes('?') ? '&' : '?';
  const queryParams = [];
  if (!cleanSrtUrl.includes('rcvbuf=')) queryParams.push('rcvbuf=67108864');
  if (!cleanSrtUrl.includes('latency=')) queryParams.push('latency=2000000');
  if (!cleanSrtUrl.includes('lossmaxttl=')) queryParams.push('lossmaxttl=100');
  if (!cleanSrtUrl.includes('mode=')) queryParams.push('mode=caller');
  if (queryParams.length > 0) cleanSrtUrl += `${sep}${queryParams.join('&')}`;

  const ffmpegArgs = [
    '-hide_banner', '-y', '-threads', '0',
    '-analyzeduration', '10000000',
    '-probesize', '10000000',
    '-fflags', '+genpts+discardcorrupt',
    '-err_detect', 'ignore_err',
    '-thread_queue_size', '8192',
    '-i', cleanSrtUrl
  ];

  const validOverlays = [];
  if (Array.isArray(overlays) && overlays.length > 0) {
    for (const ov of overlays) {
      if (ov && ov.enabled && ov.path) {
        const filename = path.basename(ov.path);
        const fullPath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(fullPath)) {
          validOverlays.push({ ...ov, fullPath, filename });
        }
      }
    }
  }

  if (validOverlays.length === 0 && enableOverlay && !passthrough && overlayPath) {
    const filename = path.basename(overlayPath);
    const fullPath = path.join(UPLOADS_DIR, filename);
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

  validOverlays.forEach((ov) => {
    ffmpegArgs.push('-thread_queue_size', '1024', '-loop', '1', '-i', ov.fullPath);
  });

  let gainMultiplier = 1.0;
  if (audioGain === '0%') gainMultiplier = 0.0;
  else if (audioGain === '125%') gainMultiplier = 1.25;
  else if (audioGain === '150%') gainMultiplier = 1.5;
  else if (audioGain === '200%') gainMultiplier = 2.0;

  const audioFilter = `aresample=async=1000:first_pts=0,aformat=channel_layouts=stereo:sample_rates=44100,volume=${gainMultiplier}`;

  if (passthrough) {
    ffmpegArgs.push(
      '-c:v', 'copy', '-c:a', 'copy',
      '-flags', '+global_header',
      '-f', 'tee', '-use_fifo', '1',
      '-fifo_options', 'queue_size=5000:drop_pkts_on_overflow=1:attempt_recovery=1:recover_any_error=1:recovery_wait_time=2',
      '-map', '0:v', '-map', '0:a?',
      verticalTeeString
    );
  } else {
    const filterParts = [];

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

    if (scalingMode === 'crop') {
      filterParts.push(`${currentV}scale=${safeWidth}:${safeHeight}:force_original_aspect_ratio=increase,crop=${safeWidth}:${safeHeight}[v_base]`);
    } else if (scalingMode === 'fit') {
      filterParts.push(`${currentV}scale=${safeWidth}:${safeHeight}:force_original_aspect_ratio=decrease,pad=${safeWidth}:${safeHeight}:(ow-iw)/2:(oh-ih)/2[v_base]`);
    } else {
      filterParts.push(`${currentV}scale=${safeWidth}:${safeHeight}[v_base]`);
    }

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

        const nextBase = idx === validOverlays.length - 1 ? '[v_master]' : `[v_comp_${idx}]`;
        filterParts.push(`${currentBase}[ov_f_${idx}]overlay=${posExpr}:shortest=1${nextBase}`);
        currentBase = nextBase;
      });
    }

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

  appendRawDivider();
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
      appendLog(`[سیستم] لایه‌های تصویری فعال: ${validOverlays.length} لایه (${validOverlays.map((o) => o.filename).join(', ')})`);
    }
  }

  ffmpegProcess = spawn(ffmpegBin, ffmpegArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  });

  startTime = Date.now();
  streamState = 'connecting';
  statusText = 'در حال برقراری اتصال SRT و ارسال به مقصدهای لایو...';

  ffmpegProcess.stdout.on('data', (data) => {
    data.toString('utf8').split(/\r?\n/).forEach((line) => appendLog(line));
  });

  ffmpegProcess.stderr.on('data', (data) => {
    const text = data.toString('utf8');
    parseFFmpegStderr(text);
    text.split(/\r?\n/).forEach((line) => appendLog(line));
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

  ffmpegProcess.on('close', (code) => {
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
    } else if (code === 0) {
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
  });

  return true;
}

function startStream(config) {
  if (ffmpegProcess) {
    return { ok: false, status: 400, message: 'یک استریم در حال حاضر فعال است. ابتدا آن را متوقف کنید.' };
  }

  const { srtUrl } = config;
  if (!srtUrl || typeof srtUrl !== 'string' || !srtUrl.trim().toLowerCase().startsWith('srt://')) {
    return { ok: false, status: 400, message: 'آدرس ورودی SRT معتبر الزامی است (srt://).' };
  }

  if (autoReconnectTimer) {
    clearTimeout(autoReconnectTimer);
    autoReconnectTimer = null;
  }

  isStoppingManually = false;
  activeConfig = { ...config };
  currentStats = {
    frame: 0,
    fps: 0,
    q: 0,
    size: '0kB',
    time: '00:00:00',
    bitrate: `${config.bitrate || 2500}kbits/s`,
    speed: '0x',
    drop: 0
  };

  try {
    startFFmpegProcess(activeConfig);
    return { ok: true, message: 'ارسال استریم آغاز شد.' };
  } catch (err) {
    streamState = 'error';
    statusText = `خطا: ${err.message}`;
    return { ok: false, status: 500, message: err.message };
  }
}

function restartStreamDeliberately(partialConfig = {}) {
  if (!activeConfig) {
    return { ok: false, status: 400, message: 'استریم فعالی وجود ندارد.' };
  }

  activeConfig = { ...activeConfig, ...partialConfig };
  appendLog('[سیستم] درخواست بازنشانی استریم با تنظیمات جدید توسط کاربر صادر شد.');

  const oldProc = ffmpegProcess;
  isStoppingManually = false;

  if (oldProc) {
    try {
      if (process.platform === 'win32') {
        try { oldProc.stdin.write('q'); } catch (_) {}
        exec(`taskkill /pid ${oldProc.pid} /T /F`, () => {});
      } else {
        oldProc.kill('SIGKILL');
      }
    } catch (_) {}
  }

  setTimeout(() => {
    try {
      startFFmpegProcess(activeConfig);
      appendLog(`[سیستم] استریم با تنظیمات جدید بازنشانی شد.`);
    } catch (err) {
      appendLog(`[خطا] خطا در به‌روزرسانی استریم: ${err.message}`);
    }
  }, 300);

  return { ok: true, message: 'فرآیند بازنشانی استریم با موفقیت آغاز شد.' };
}

function stopStream() {
  isStoppingManually = true;

  if (autoReconnectTimer) {
    clearTimeout(autoReconnectTimer);
    autoReconnectTimer = null;
  }

  if (manualRecordProcess) {
    const recPid = manualRecordProcess.pid;
    try {
      manualRecordProcess.stdin.write('q');
      setTimeout(() => {
        try { exec(`taskkill /pid ${recPid} /T /F`, () => {}); } catch (_) {}
      }, 500);
    } catch (_) {}
    manualRecordProcess = null;
  }
  isManualRecordingActive = false;

  if (!ffmpegProcess) {
    streamState = 'idle';
    statusText = 'استریم غیرفعال است.';
    cleanPreviewFiles();
    return { ok: true, message: 'استریم فعالی وجود نداشت.' };
  }

  streamState = 'stopping';
  statusText = 'در حال توقف...';
  appendLog('[سیستم] درخواست توقف لایو صادر شد.');

  const proc = ffmpegProcess;
  const pid = proc.pid;

  try {
    if (process.platform === 'win32') {
      try { proc.stdin.write('q'); } catch (_) {}
      setTimeout(() => {
        if (ffmpegProcess && ffmpegProcess.pid === pid) {
          try { exec(`taskkill /pid ${pid} /T /F`, () => {}); } catch (_) {}
        }
      }, 1500);
    } else {
      proc.kill('SIGINT');
      setTimeout(() => {
        if (ffmpegProcess && ffmpegProcess.pid === pid) {
          try { proc.kill('SIGKILL'); } catch (_) {}
        }
      }, 2000);
    }

    return { ok: true, message: 'دستور توقف ارسال شد.' };
  } catch (err) {
    return { ok: false, status: 500, message: `خطا در توقف: ${err.message}` };
  }
}

function startManualRecording() {
  if (isManualRecordingActive) {
    return { ok: false, status: 400, message: 'ضبط دستی در حال حاضر فعال است.' };
  }
  if (!ffmpegProcess) {
    return { ok: false, status: 400, message: 'استریم لایو فعال نیست.' };
  }

  const hlsManifest = path.join(PREVIEW_DIR, 'stream.m3u8');
  if (!fs.existsSync(hlsManifest)) {
    return { ok: false, status: 400, message: 'فید پیش‌نمایش هنوز برای ضبط آماده نشده است. چند ثانیه دیگر تلاش کنید.' };
  }

  const ffmpegBin = findFFmpegPath();
  if (!ffmpegBin) {
    return { ok: false, status: 500, message: 'موتور FFmpeg یافت نشد.' };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `record_${timestamp}.mp4`;
  const outPath = path.join(RECORDINGS_DIR, filename);

  try {
    manualRecordProcess = spawn(
      ffmpegBin,
      ['-hide_banner', '-y', '-i', hlsManifest, '-c', 'copy', outPath],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }
    );

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

    return { ok: true, message: 'فرآیند ضبط با موفقیت آغاز شد.', filename };
  } catch (err) {
    return { ok: false, status: 500, message: err.message };
  }
}

function stopManualRecording() {
  if (!isManualRecordingActive || !currentManualRecordFile) {
    return { ok: false, status: 400, message: 'هیچ ضبط فعالی وجود ندارد.' };
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
        } catch (_) {}
      }, 800);
    } catch (_) {}
  }

  appendLog(`[سیستم] ضبط دستی متوقف شد و ذخیره گردید: ${savedFile}`);
  return { ok: true, message: 'ضبط با موفقیت متوقف و ذخیره شد.', filename: savedFile };
}

function switchScene(sceneName) {
  currentSceneName = sceneName;
  appendLog(`[سیستم] سوییچ به سکانس: ${sceneName}`);
  return currentSceneName;
}

function updateActiveOverlays(overlays) {
  if (activeConfig && overlays) {
    activeConfig.overlays = overlays;
  }
  appendLog(`[سیستم] تنظیمات لایه‌های گرافیکی به‌روزرسانی شد.`);
}

function getStatusSnapshot() {
  const detectedFFmpeg = findFFmpegPath();
  const uptime = ffmpegProcess && startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const previewActive = fs.existsSync(path.join(PREVIEW_DIR, 'stream.m3u8'));
  const manualRecordUptime =
    isManualRecordingActive && manualRecordStartTime
      ? Math.floor((Date.now() - manualRecordStartTime) / 1000)
      : 0;

  return {
    running: ffmpegProcess !== null,
    state: streamState,
    statusText,
    uptime,
    stats: currentStats,
    logs: getRecentLogs(50),
    ffmpegInstalled: Boolean(detectedFFmpeg),
    ffmpegPath: detectedFFmpeg || null,
    previewActive,
    destinationsStatus: destinationsLiveStatus,
    currentScene: currentSceneName,
    isManualRecording: isManualRecordingActive,
    manualRecordUptime,
    manualRecordFile: currentManualRecordFile,
    masterRecordFile: currentSessionRecordFile,
    activeConfig: activeConfig
      ? {
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
        }
      : null
  };
}

function cleanupOnExit() {
  if (autoReconnectTimer) clearTimeout(autoReconnectTimer);
  if (manualRecordProcess) {
    try { execSync(`taskkill /pid ${manualRecordProcess.pid} /T /F`, { stdio: 'ignore' }); } catch (_) {}
  }
  if (ffmpegProcess) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${ffmpegProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        ffmpegProcess.kill('SIGKILL');
      }
    } catch (_) {}
  }
  cleanPreviewFiles();
}

module.exports = {
  startStream,
  stopStream,
  restartStreamDeliberately,
  startManualRecording,
  stopManualRecording,
  switchScene,
  updateActiveOverlays,
  getStatusSnapshot,
  cleanupOnExit
};
