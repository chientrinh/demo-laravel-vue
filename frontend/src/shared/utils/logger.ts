export const logger = {
  error: (message: string, error?: unknown) => {
    console.error(message, error)
  },
  warn: (message: string, error?: unknown) => {
    console.warn(message, error)
  },
  info: (message: string, info?: unknown) => {
    console.info(message, info)
  },
}