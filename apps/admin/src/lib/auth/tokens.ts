const ACCESS_KEY = 'glee-admin-access-token'
const REFRESH_KEY = 'glee-admin-refresh-token'

export const tokens = {
  getAccess: (): string | null => localStorage.getItem(ACCESS_KEY),
  setAccess: (t: string): void => { localStorage.setItem(ACCESS_KEY, t) },
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  setRefresh: (t: string): void => { localStorage.setItem(REFRESH_KEY, t) },
  clear: (): void => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}
