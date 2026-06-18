import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadTokens() {
  const source = await readFile(new URL('../src/utils/auth/tokens.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })

  const module = { exports: {} }
  const evaluate = new Function('exports', 'module', outputText)
  evaluate(module.exports, module)
  return module.exports.tokens
}

test('auth token utility keeps the access token in memory and does not expose refresh token storage', async () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  delete globalThis.localStorage
  try {
    const tokens = await loadTokens()

    assert.equal(tokens.getAccess(), null)
    tokens.setAccess('access-token')
    assert.equal(tokens.getAccess(), 'access-token')
    tokens.clear()
    assert.equal(tokens.getAccess(), null)
    assert.equal('getRefresh' in tokens, false)
    assert.equal('setRefresh' in tokens, false)
  } finally {
    if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage)
  }
})
