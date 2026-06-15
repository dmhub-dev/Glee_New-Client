import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

class TestApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear(),
  }
}

async function loadProfileQueries(apiFetch) {
  globalThis.__profileTestApiFetch = apiFetch
  globalThis.__profileTestApiError = TestApiError

  const source = await readFile(new URL('../src/api/queries/profile.ts', import.meta.url), 'utf8')
  const testableSource = source
    .replace(
      "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'",
      'const useQuery = () => ({}); const useMutation = () => ({}); const useQueryClient = () => ({ invalidateQueries: () => {} })',
    )
    .replace(
      "import { ApiError, apiFetch } from '../client'",
      'const apiFetch = globalThis.__profileTestApiFetch; const ApiError = globalThis.__profileTestApiError',
    )
    .replace("import type { UserRole } from '../../types'\n", '')

  const { outputText } = ts.transpileModule(testableSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })

  const module = { exports: {} }
  const evaluate = new Function('exports', 'module', outputText)
  evaluate(module.exports, module)
  return module.exports
}

test('notification preferences fallback persists updates when backend endpoint is missing', async t => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: createMemoryStorage() })
  t.after(() => {
    if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage)
    else delete globalThis.localStorage
  })

  const profile = await loadProfileQueries(async () => {
    throw new TestApiError(404, 'not found')
  })

  assert.deepEqual(await profile.getNotificationPreferences(), {
    bookingAlerts: true,
    eventAlerts: true,
    systemAlerts: true,
    weeklyReport: false,
  })

  await profile.updateNotificationPreferences({ weeklyReport: true, eventAlerts: false })

  assert.deepEqual(await profile.getNotificationPreferences(), {
    bookingAlerts: true,
    eventAlerts: false,
    systemAlerts: true,
    weeklyReport: true,
  })
})

test('notification preferences use backend response when endpoint exists', async t => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: createMemoryStorage() })
  t.after(() => {
    if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage)
    else delete globalThis.localStorage
  })

  const calls = []
  const profile = await loadProfileQueries(async (path, options) => {
    calls.push({ path, method: options?.method ?? 'GET' })
    return {
      success: true,
      data: {
        bookingAlerts: false,
        eventAlerts: false,
        systemAlerts: true,
        weeklyReport: true,
      },
    }
  })

  assert.deepEqual(await profile.getNotificationPreferences(), {
    bookingAlerts: false,
    eventAlerts: false,
    systemAlerts: true,
    weeklyReport: true,
  })
  assert.deepEqual(calls[0], { path: '/api/v1/profile/me/notifications', method: 'GET' })
})

test('notification preference updates preserve requested changes when backend returns no body', async t => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: createMemoryStorage() })
  t.after(() => {
    if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage)
    else delete globalThis.localStorage
  })

  const calls = []
  const profile = await loadProfileQueries(async (path, options) => {
    calls.push({ path, method: options?.method ?? 'GET' })
    if (options?.method === 'PATCH') return undefined
    return {
      success: true,
      data: {
        bookingAlerts: false,
        eventAlerts: false,
        systemAlerts: true,
        weeklyReport: false,
      },
    }
  })

  assert.deepEqual(await profile.updateNotificationPreferences({ weeklyReport: true }), {
    bookingAlerts: false,
    eventAlerts: false,
    systemAlerts: true,
    weeklyReport: true,
  })
  assert.deepEqual(calls, [
    { path: '/api/v1/profile/me/notifications', method: 'PATCH' },
    { path: '/api/v1/profile/me/notifications', method: 'GET' },
  ])
})
