const MAX_LOG_LINES = 300;
const logBuffer = [];

function appendLog(line) {
  if (!line || !line.trim()) return;
  const timeStr = new Date().toLocaleTimeString('fa-IR', { hour12: false });
  const entry = `[${timeStr}] ${line.trim()}`;
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_LINES) {
    logBuffer.shift();
  }
}

function appendRawDivider() {
  logBuffer.push('----------------------------------------');
  if (logBuffer.length > MAX_LOG_LINES) {
    logBuffer.shift();
  }
}

function getRecentLogs(limit = 50) {
  return logBuffer.slice(-limit);
}

module.exports = {
  appendLog,
  appendRawDivider,
  getRecentLogs
};
