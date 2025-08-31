import pino from "pino";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log file paths
const authLogPath = path.join(__dirname, "auth.log");
const appLogPath = path.join(__dirname, "app.log");
const workerLogPath = path.join(__dirname, "worker.log");

// Ensure the log directory exists
const logDir = path.dirname(authLogPath);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Create write streams for each log file
const authLogStream = fs.createWriteStream(authLogPath, { flags: 'a' });
const appLogStream = fs.createWriteStream(appLogPath, { flags: 'a' });
const workerLogStream = fs.createWriteStream(workerLogPath, { flags: 'a' });

// Common logger configuration
const loggerConfig = {
    level: "debug",
    timestamp: pino.stdTimeFunctions.isoTime,
};

// Create separate loggers for each category
const authLogger = pino(
    {
        ...loggerConfig,
        name: 'auth'
    },
    authLogStream
);

const appLogger = pino(
    {
        ...loggerConfig,
        name: 'app'
    },
    appLogStream
);

const workerLogger = pino(
    {
        ...loggerConfig,
        name: 'worker'
    },
    workerLogStream
);

// Initialize loggers
authLogger.info('Auth logger initialized');
appLogger.info('App logger initialized');
workerLogger.info('Worker logger initialized');

export { authLogger, appLogger, workerLogger };
