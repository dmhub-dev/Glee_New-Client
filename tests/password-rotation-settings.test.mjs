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

test('admin security settings make password rotation an opt-in toggle', async () => {
  const source = await readSource('src/routes/settings/components/SecuritySection.tsx')

  assertTranspiles(source, 'SecuritySection.tsx')
  assert.match(source, /useUpdatePasswordRotationPreference/)
  assert.match(source, /handleRotationToggle\(enabled: boolean\)/)
  assert.match(source, /checked=\{security\?\.passwordRotationEnabled \?\? false\}/)
  assert.match(source, /passwordRotationEnabled && security\?\.passwordChangeRequired/)
  assert.match(source, /Disabled - enable to request periodic password changes\./)
  assert.match(source, /disabled=\{!security\?\.passwordRotationEnabled \|\| updateRotation\.isPending\}/)
  assert.doesNotMatch(source, /useUpdatePasswordRotationDays/)
})

test('customer profile security dialog exposes password rotation opt-in controls', async () => {
  const source = await readSource('src/customer/profile/index.tsx')

  assertTranspiles(source, 'customer-profile-index.tsx')
  assert.match(source, /useUpdatePasswordRotationPreference/)
  assert.match(source, /handleRotationToggle\(enabled: boolean\)/)
  assert.match(source, /checked=\{security\?\.passwordRotationEnabled \?\? false\}/)
  assert.match(source, /Password change frequency/)
  assert.match(source, /Disabled - enable to request periodic password changes\./)
  assert.match(source, /disabled=\{!security\?\.passwordRotationEnabled \|\| updateRotation\.isPending\}/)
  assert.doesNotMatch(source, /useUpdatePasswordRotationDays/)
})
