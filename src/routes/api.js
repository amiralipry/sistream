const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { UPLOADS_DIR, RECORDINGS_DIR } = require('../config/paths');
const { appendLog } = require('../services/logger');
const { listRecordings } = require('../services/recordingCleaner');
const streamManager = require('../services/streamManager');

const router = express.Router();

// Multer configuration for overlay uploads
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `overlay_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('تنها فایل‌های تصویری با پسوند PNG، JPG، JPEG یا WEBP مجاز هستند.'));
    }
  }
});

// Upload overlay image
router.post('/upload-overlay', (req, res) => {
  upload.single('overlay')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'فایلی ارسال نشده است.' });
    }

    const relativeUrl = `/uploads/${req.file.filename}`;
    appendLog(`[سیستم] تصویر بارگذاری شد: ${req.file.filename}`);

    return res.json({
      success: true,
      message: 'تصویر با موفقیت بارگذاری شد.',
      filePath: relativeUrl,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  });
});

// Delete overlay image
router.post('/delete-overlay', (req, res) => {
  const { filename } = req.body || {};
  if (!filename) {
    return res.status(400).json({ success: false, message: 'نام فایل الزامی است.' });
  }

  const targetPath = path.join(UPLOADS_DIR, path.basename(filename));
  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath);
      return res.json({ success: true, message: 'تصویر با موفقیت حذف شد.' });
    } catch (_) {
      return res.status(500).json({ success: false, message: 'خطا در حذف فایل.' });
    }
  }
  return res.json({ success: true, message: 'فایل قبلاً حذف شده بود.' });
});

// Live overlay update registration
router.post('/overlay/live-update', (req, res) => {
  streamManager.updateActiveOverlays(req.body && req.body.overlays);
  return res.json({ success: true, message: 'مشخصات لایه‌ها ثبت شد.' });
});

// Scene switching
router.post('/scene/switch', (req, res) => {
  const { scene } = req.body || {};
  if (!scene) {
    return res.status(400).json({ success: false, message: 'نام سکانس الزامی است.' });
  }
  const currentScene = streamManager.switchScene(scene);
  return res.json({
    success: true,
    message: `سکانس فعال به «${scene}» تغییر یافت.`,
    currentScene
  });
});

// Stream control endpoints
router.get('/status', (_, res) => {
  res.json(streamManager.getStatusSnapshot());
});

router.post('/start', (req, res) => {
  const result = streamManager.startStream(req.body || {});
  if (!result.ok) {
    return res.status(result.status || 400).json({ success: false, message: result.message });
  }
  return res.json({ success: true, message: result.message });
});

router.post('/stop', (_, res) => {
  const result = streamManager.stopStream();
  if (!result.ok) {
    return res.status(result.status || 500).json({ success: false, message: result.message });
  }
  return res.json({ success: true, message: result.message });
});

router.post('/restart', (req, res) => {
  const result = streamManager.restartStreamDeliberately(req.body || {});
  if (!result.ok) {
    return res.status(result.status || 400).json({ success: false, message: result.message });
  }
  return res.json({ success: true, message: result.message });
});

// On-demand recording endpoints
router.post('/record/start', (_, res) => {
  const result = streamManager.startManualRecording();
  if (!result.ok) {
    return res.status(result.status || 400).json({ success: false, message: result.message });
  }
  return res.json({ success: true, message: result.message, filename: result.filename });
});

router.post('/record/stop', (_, res) => {
  const result = streamManager.stopManualRecording();
  if (!result.ok) {
    return res.status(result.status || 400).json({ success: false, message: result.message });
  }
  return res.json({ success: true, message: result.message, filename: result.filename });
});

// Recordings archive
router.get('/recordings', (_, res) => {
  res.json({ success: true, recordings: listRecordings() });
});

router.get('/recordings/download/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(RECORDINGS_DIR, safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('فایل مورد نظر یافت نشد.');
  }
  return res.download(filePath, safeFilename);
});

router.delete('/recordings/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(RECORDINGS_DIR, safeFilename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: 'فایل با موفقیت حذف شد.' });
    } catch (_) {
      return res.status(500).json({ success: false, message: 'خطا در حذف فایل.' });
    }
  }
  return res.status(404).json({ success: false, message: 'فایل یافت نشد.' });
});

module.exports = router;
