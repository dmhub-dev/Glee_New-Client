const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

export const ENABLE_RESERVATIONS = env.VITE_ENABLE_RESERVATIONS === 'true'
