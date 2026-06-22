import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readSource(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

function assertTranspiles(source, path) {
  const { diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
    reportDiagnostics: true,
  })

  assert.deepEqual(diagnostics?.map(diagnostic => diagnostic.messageText) ?? [], [])
}

const publicStatusFiltersPattern =
  /STATUS_FILTERS: Array<\{ value: PublicStatusFilter; label: string \}> = \[\s*\{ value: 'active', label: 'Active' \},\s*\{ value: 'live', label: 'Live' \},\s*\]/

test('public event browsing exposes active and live status dropdown only', async () => {
  const files = [
    ['src/public/routes/index.tsx', 'public-home.tsx'],
    ['src/public/routes/events/index.tsx', 'public-events.tsx'],
  ]

  for (const [path, label] of files) {
    const source = await readSource(path)

    assertTranspiles(source, label)
    assert.match(source, /type PublicStatusFilter = Extract<Event\['status'\], 'active' \| 'live'>/)
    assert.match(source, publicStatusFiltersPattern)
    assert.doesNotMatch(source, /value: 'sold_out'/)
    assert.doesNotMatch(source, /value: 'cancelled'/)
    assert.doesNotMatch(source, /hidden shrink-0 items-center gap-1 rounded-full border border-white\/10 bg-black\/25 p-1 sm:flex/)
    assert.doesNotMatch(source, /hover:text-neon-pink sm:hidden/)
    assert.doesNotMatch(source, /shadow-\[0_18px_50px_rgba\(0,0,0,0\.55\)\] sm:hidden/)
  }
})
