import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readLocationDetailSource() {
  return readFile(new URL('../src/routes/locations/$locationId.tsx', import.meta.url), 'utf8')
}

function assertTranspiles(source) {
  const { diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  })

  assert.deepEqual(diagnostics?.map(diagnostic => diagnostic.messageText) ?? [], [])
}

test('location detail can initialize its active tab from route state', async () => {
  const source = await readLocationDetailSource()

  assertTranspiles(source)
  assert.match(source, /useLocation\s+as\s+useRouterLocation/)
  assert.match(source, /function\s+isLocationDetailTab/)
  assert.match(source, /const\s+routerLocation\s*=\s*useRouterLocation\(\)/)
  assert.match(source, /routeState\?\.tab/)
  assert.match(source, /useState<LocationDetailTab>\(\(\)\s*=>\s*requestedTab\s*\?\?\s*['"]overview['"]\)/)
  assert.match(source, /if\s*\(requestedTab\)\s+setActiveTab\(requestedTab\)/)
})
