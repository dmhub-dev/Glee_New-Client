import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadApiClient() {
  globalThis.__apiClientTestTokens = {
    getAccess: () => null,
    setAccess: () => {},
    getRefresh: () => null,
    setRefresh: () => {},
    clear: () => {},
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
