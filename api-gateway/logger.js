const fs = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "logs");

fs.mkdirSync(logDir, { recursive: true });

function write(filename, level, message, details = {}) {
  const line = `${new Date().toISOString()} [${level}] ${message} ${JSON.stringify(details)}\n`;

  fs.appendFileSync(path.join(logDir, filename), line);
}

module.exports = {
  info(message, details) {
    write("combined.log", "INFO", message, details);
  },

  error(message, details) {
    write("combined.log", "ERROR", message, details);
    write("error.log", "ERROR", message, details);
  },

  audit(event, details) {
    write("audit.log", "AUDIT", event, details);
    write("combined.log", "AUDIT", event, details);
  },
};
