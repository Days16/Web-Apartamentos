const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
