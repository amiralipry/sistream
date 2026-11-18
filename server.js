const express = require('express');
const path = require('path');
const {
  PUBLIC_DIR,
  PREVIEW_DIR,
  UPLOADS_DIR,
  RECORDINGS_DIR,
  ensureDirectories,
  cleanPreviewFiles,
  findFFmpegPath,
  ensureStandbyCard
} = require('./src/config/paths');
const { startRecordingCleanupSchedule } = require('./src/services/recordingCleaner');
const { cleanupOnExit } = require('./src/services/streamManager');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize workspace directories and startup tasks
ensureDirectories();
cleanPreviewFiles();
ensureStandbyCard();
startRecordingCleanupSchedule();

// Body parser
app.use(express.json());

// Live HLS preview directory with strict no-cache headers
app.use(
  '/preview',
  (_, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    next();
  },
  express.static(PREVIEW_DIR)
);

// PWA Service Worker & Manifest headers
app.get('/sw.js', (_, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(PUBLIC_DIR, 'sw.js'));
});

app.get('/manifest.json', (_, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC_DIR, 'manifest.json'));
});

// Static assets & media
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/recordings', express.static(RECORDINGS_DIR, { acceptRanges: true }));

// API routes
app.use('/api', apiRoutes);

// Graceful shutdown handlers
process.on('SIGINT', () => { cleanupOnExit(); process.exit(0); });
process.on('SIGTERM', () => { cleanupOnExit(); process.exit(0); });
process.on('exit', () => { cleanupOnExit(); });
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  cleanupOnExit();
  process.exit(1);
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`SRT Studio Relay Server running at http://localhost:${PORT}`);
  const ffmpeg = findFFmpegPath();
  if (ffmpeg) {
    console.log(`FFmpeg engine active: ${ffmpeg}`);
  }
  console.log('Modular Architecture + PWA + Multi-Overlay Ready.');
  console.log('====================================================');
});
