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

test('security info normalizes missing password rotation enabled to false', async () => {
  const profile = await loadProfileQueries(async path => {
    assert.equal(path, '/api/v1/profile/me/security')
    return {
      success: true,
      data: {
        twoFactorEnabled: true,
        passwordRotationDays: 30,
        passwordChangeRequired: true,
        passwordChangedAt: '2026-01-01T00:00:00.000Z',
        passwordExpiresAt: '2026-01-31T00:00:00.000Z',
      },
    }
  })

  assert.deepEqual(await profile.getSecurityInfo(), {
    twoFactorEnabled: true,
    lastLoginAt: null,
    lastLoginIp: null,
    activeSessions: [],
    passwordRotationEnabled: false,
    passwordChangeRequired: true,
    passwordRotationDays: 30,
    passwordChangedAt: '2026-01-01T00:00:00.000Z',
    passwordExpiresAt: '2026-01-31T00:00:00.000Z',
  })
})

test('password rotation preference update sends enabled state and optional days', async () => {
  const calls = []
  const profile = await loadProfileQueries(async (path, options) => {
    calls.push({
      path,
      method: options?.method ?? 'GET',
      body: options?.body ? JSON.parse(options.body) : undefined,
    })
    if (options?.method === 'PATCH') return { success: true, data: {} }
    return {
      success: true,
      data: {
        twoFactorEnabled: false,
        passwordRotationEnabled: true,
        passwordRotationDays: 14,
        passwordChangeRequired: false,
      },
    }
  })

  await profile.updatePasswordRotationPreference({ enabled: true, days: 14 })
  await profile.updatePasswordRotationPreference({ enabled: false })

  assert.deepEqual(calls, [
    {
      path: '/api/v1/me/password-rotation',
      method: 'PATCH',
      body: { enabled: true, days: 14 },
    },
    {
      path: '/api/v1/profile/me/security',
      method: 'GET',
      body: undefined,
    },
    {
      path: '/api/v1/me/password-rotation',
      method: 'PATCH',
      body: { enabled: false },
    },
    {
      path: '/api/v1/profile/me/security',
      method: 'GET',
      body: undefined,
    },
  ])
})

test('password rotation preference DTO restricts enabled state and allowed days', async () => {
  const source = await readFile(new URL('../src/api/queries/profile.ts', import.meta.url), 'utf8')
  const sourceFile = ts.createSourceFile('profile.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

  const exportedTypeAliases = new Map()
  for (const statement of sourceFile.statements) {
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      exportedTypeAliases.set(statement.name.text, statement.type)
    }
  }

  const daysType = exportedTypeAliases.get('PasswordRotationDays')
  assert.ok(daysType, 'PasswordRotationDays should be exported as a type alias')
  assert.ok(ts.isUnionTypeNode(daysType), 'PasswordRotationDays should be a union')
  assert.deepEqual(daysType.types.map(type => Number(type.getText(sourceFile))), [7, 14, 30, 45, 60])

  const dtoType = exportedTypeAliases.get('UpdatePasswordRotationPreferenceDto')
  assert.ok(dtoType, 'UpdatePasswordRotationPreferenceDto should be exported as a type alias')
  assert.ok(ts.isUnionTypeNode(dtoType), 'UpdatePasswordRotationPreferenceDto should be a discriminated union')
  assert.equal(dtoType.types.length, 2)

  const unionMembers = dtoType.types.map(type => type.getText(sourceFile).replace(/\s+/g, ' '))
  assert.ok(
    unionMembers.some(member => member === '{ enabled: true; days: PasswordRotationDays }'),
    'enabled rotation should require PasswordRotationDays',
  )
  assert.ok(
    unionMembers.some(member => member === '{ enabled: false; days?: never }'),
    'disabled rotation should forbid days',
  )
})
