// shortcut: console-based logger, swap for winston if we need log files.
const stamp = () => new Date().toISOString();

const logger = {
  info: (...args: unknown[]) => console.log(stamp(), 'INFO', ...args),
  warn: (...args: unknown[]) => console.warn(stamp(), 'WARN', ...args),
  error: (...args: unknown[]) => console.error(stamp(), 'ERROR', ...args),
};

export default logger;
