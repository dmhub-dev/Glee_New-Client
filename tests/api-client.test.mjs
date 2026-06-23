import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadApiClient(tokens = {}) {
  globalThis.__apiClientTestTokens = {
    getAccess: () => null,
    setAccess: () => {},
    clear: () => {},
    ...tokens,
  }
  globalThis.__apiClientTestEnv = { VITE_API_BASE_URL: 'https://api.test' }

  const source = await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8')
  const testableSource = source
    .replace(
      "import { tokens } from '../utils'",
      'const tokens = globalThis.__apiClientTestTokens',
    )
    .replace(
      /const BASE: string = .*VITE_API_BASE_URL \?\? ''/,
      "const BASE: string = globalThis.__apiClientTestEnv?.VITE_API_BASE_URL ?? ''",
    )

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

test('apiFetch returns undefined for empty successful responses', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async () =>
    new Response('', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

  const { apiFetch } = await loadApiClient()

  await assert.doesNotReject(async () => {
    const result = await apiFetch('/empty')
    assert.equal(result, undefined)
  })
})

test('apiFetch still parses non-empty JSON responses', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

  const { apiFetch } = await loadApiClient()

  assert.deepEqual(await apiFetch('/json'), { ok: true })
})

test('apiFetch sends cookies with API requests', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const { apiFetch } = await loadApiClient()

  assert.deepEqual(await apiFetch('/secure'), { ok: true })
  assert.equal(calls[0].url, 'https://api.test/secure')
  assert.equal(calls[0].options.credentials, 'include')
})

test('apiFetch refreshes access token through the httpOnly cookie without sending a refresh token body', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  let accessToken = 'expired-access'
  const calls = []
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })
    if (url === 'https://api.test/secure' && calls.length === 1) {
      return new Response(JSON.stringify({ message: 'expired' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url === 'https://api.test/api/v1/refresh') {
      return new Response(JSON.stringify({ accessToken: 'new-access' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const { apiFetch } = await loadApiClient({
    getAccess: () => accessToken,
    setAccess: token => {
      accessToken = token
    },
  })

  assert.deepEqual(await apiFetch('/secure'), { ok: true })

  assert.equal(calls[1].url, 'https://api.test/api/v1/refresh')
  assert.equal(calls[1].options.credentials, 'include')
  assert.equal(calls[1].options.body, undefined)
  assert.equal(calls[2].options.headers.Authorization, 'Bearer new-access')
})
