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

function literal(token) {
  return new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
}

test('ui package exports shared feedback primitives', async () => {
  const component = await readSource('src/ui/components/ui/empty-state.tsx')
  const index = await readSource('src/ui/index.ts')

  assertTranspiles(component, 'empty-state.tsx')
  assert.match(component, /export type EmptyStateVariant = 'customer' \| 'admin' \| 'danger'/)
  assert.match(component, /export interface EmptyStateProps/)
  assert.match(component, /export function EmptyState/)
  assert.match(component, /export interface LoadingPanelProps/)
  assert.match(component, /export function LoadingPanel/)
  assert.match(component, /variant = 'customer'/)
  assert.match(component, /role="status"/)
  assert.match(component, /aria-live="polite"/)
  assert.match(index, /export \* from '\.\/components\/ui\/empty-state'/)
})
