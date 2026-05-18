const winston = require("winston");
const fs = require("fs");

fs.mkdirSync("logs", { recursive: true });

const logger = winston.createLogger({
  level: "info",

  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),

  transports: [
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),

    new winston.transports.File({
      filename: "logs/combined.log",
    }),

    new winston.transports.File({
      filename: "logs/audit.log",
      level: "info",
    }),

    new winston.transports.Console(),
  ],
});

logger.audit = (event, details = {}) => {
  logger.info(`AUDIT ${event} ${JSON.stringify(details)}`);
};

module.exports = logger;
