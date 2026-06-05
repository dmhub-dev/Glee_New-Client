import { tokens } from '../utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE: string = (import.meta as any).env?.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokens.getRefresh()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${BASE}/api/v1/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) { tokens.clear(); return null }
    const data = await res.json() as { accessToken: string; refreshToken: string }
    tokens.setAccess(data.accessToken)
    if (data.refreshToken) tokens.setRefresh(data.refreshToken)
    return data.accessToken
  } catch {
    tokens.clear()
    return null
  }
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth = false, headers: extraHeaders, ...init } = options

  const isFormData = init.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(extraHeaders as Record<string, string> | undefined ?? {}),
  }

  if (!skipAuth) {
    const token = tokens.getAccess()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401 && !skipAuth) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
    }
    const newToken = await refreshPromise
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${BASE}${path}`, { ...init, headers })
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string }
    throw new ApiError(res.status, body.message ?? res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
