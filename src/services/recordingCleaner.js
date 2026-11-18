const fs = require('fs');
const path = require('path');
const { RECORDINGS_DIR } = require('../config/paths');
const { appendLog } = require('./logger');

const MAX_RECORDING_AGE_MS = 72 * 60 * 60 * 1000;

function cleanOldRecordings() {
  if (!fs.existsSync(RECORDINGS_DIR)) return;
  try {
    const files = fs.readdirSync(RECORDINGS_DIR);
    const now = Date.now();
    let count = 0;

    for (const f of files) {
      if (f.endsWith('.mp4') || f.endsWith('.ts')) {
        const fullPath = path.join(RECORDINGS_DIR, f);
        try {
          const stats = fs.statSync(fullPath);
          if (now - stats.mtimeMs > MAX_RECORDING_AGE_MS) {
            fs.unlinkSync(fullPath);
            count++;
            appendLog(`[سیستم] فایل ضبط‌شده ${f} پس از ۷۲ ساعت خودکار پاکسازی شد.`);
          }
        } catch (_) {}
      }
    }

    if (count > 0) {
      console.log(`Auto-cleaned ${count} recording(s) older than 72 hours.`);
    }
  } catch (_) {}
}

function listRecordings() {
  if (!fs.existsSync(RECORDINGS_DIR)) return [];
  try {
    const files = fs.readdirSync(RECORDINGS_DIR).filter((f) => f.endsWith('.mp4'));
    return files
      .map((f) => {
        const stat = fs.statSync(path.join(RECORDINGS_DIR, f));
        return {
          filename: f,
          sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
          createdAt: stat.birthtime,
          mtime: stat.mtime
        };
      })
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  } catch (_) {
    return [];
  }
}

function startRecordingCleanupSchedule() {
  cleanOldRecordings();
  return setInterval(cleanOldRecordings, 30 * 60 * 1000);
}

module.exports = {
  cleanOldRecordings,
  listRecordings,
  startRecordingCleanupSchedule
};
