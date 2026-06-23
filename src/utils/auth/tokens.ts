let accessToken: string | null = null

export const tokens = {
  getAccess: (): string | null => accessToken,
  setAccess: (token: string): void => { accessToken = token },
  clear: (): void => { accessToken = null },
}
