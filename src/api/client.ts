import { tokens } from '../utils'

const BASE: string = (import.meta as any).env?.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function parseResponseBody<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.status === 205) return undefined as T

  const text = await res.text()
  if (!text.trim()) return undefined as T

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return JSON.parse(text) as T
  }

  return text as T
}

async function errorMessageFromResponse(res: Response): Promise<string> {
  const fallback = res.statusText || 'Request failed'
  const text = await res.text().catch(() => '')
  if (!text.trim()) return fallback

  try {
    const body = JSON.parse(text) as { message?: string; error?: string }
    return body.message ?? body.error ?? fallback
  } catch {
    return text
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
    throw new ApiError(res.status, await errorMessageFromResponse(res))
  }

  return parseResponseBody<T>(res)
}
