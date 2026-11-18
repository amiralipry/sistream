const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PREVIEW_DIR = path.join(PUBLIC_DIR, 'preview');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const RECORDINGS_DIR = path.join(ROOT_DIR, 'recordings');

function ensureDirectories() {
  [PUBLIC_DIR, PREVIEW_DIR, UPLOADS_DIR, RECORDINGS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function cleanPreviewFiles() {
  if (!fs.existsSync(PREVIEW_DIR)) return;
  try {
    const files = fs.readdirSync(PREVIEW_DIR);
    for (const f of files) {
      if (f.endsWith('.m3u8') || f.endsWith('.ts') || f.endsWith('.tmp')) {
        try {
          fs.unlinkSync(path.join(PREVIEW_DIR, f));
        } catch (_) {}
      }
    }
  } catch (_) {}
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
  } catch (_) {}
  return null;
}

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
  } catch (_) {}

  if (process.platform === 'win32') {
    const candidates = [
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe'
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
              const found = searchForBinary(path.join(wingetDir, d), 'ffmpeg.exe', 3);
              if (found) candidates.unshift(found);
            }
          }
        } catch (_) {}
      }
    }

    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
  }

  return null;
}

function ensureStandbyCard() {
  const standbyPath = path.join(UPLOADS_DIR, 'standby_card.png');
  if (fs.existsSync(standbyPath)) return;
  const ffmpegBin = findFFmpegPath();
  if (!ffmpegBin) return;
  try {
    execSync(
      `"${ffmpegBin}" -v error -y -f lavfi -i color=c=#153047:s=720x1280 -vf "drawtext=fontfile='C\\:/Windows/Fonts/tahoma.ttf':text='استودیو پخش زنده':fontcolor=#9bc2db:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2-60,drawtext=fontfile='C\\:/Windows/Fonts/tahoma.ttf':text='به زودی بازمی‌گردیم':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=(h-text_h)/2,drawtext=fontfile='C\\:/Windows/Fonts/tahoma.ttf':text='لطفاً شکیبا باشید':fontcolor=#cbdceb:fontsize=22:x=(w-text_w)/2:y=(h-text_h)/2+60" -frames:v 1 "${standbyPath}"`,
      { stdio: 'ignore' }
    );
  } catch (_) {}
}

module.exports = {
  ROOT_DIR,
  PUBLIC_DIR,
  PREVIEW_DIR,
  UPLOADS_DIR,
  RECORDINGS_DIR,
  ensureDirectories,
  cleanPreviewFiles,
  findFFmpegPath,
  ensureStandbyCard
};
