import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

function assertTranspiles(source) {
  const { diagnostics } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  })
  assert.deepEqual(diagnostics?.map(diagnostic => diagnostic.messageText) ?? [], [])
}

test('App registers payouts route and keeps finance location route access read-only', async () => {
  const source = await readFile(new URL('../src/app/App.tsx', import.meta.url), 'utf8')
  assertTranspiles(source)
  assert.match(source, /const\s+PayoutsPage\s*=\s*lazy\(\(\)\s*=>\s*import\(['"]\.\.\/routes\/payouts\/index['"]\)\)/)
  assert.match(source, /const\s+PAYOUTS_ROLES:\s*UserRole\[\]\s*=\s*\[\.\.\.ADMIN_ROLES,\s*['"]finance['"],\s*['"]vendor['"],\s*['"]vendor_staff['"]\]/)
  assert.match(source, /const\s+LOCATION_ROLES:\s*UserRole\[\]\s*=\s*\[\.\.\.ADMIN_ROLES,\s*['"]finance['"],\s*['"]vendor['"],\s*['"]vendor_staff['"]\]/)
  assert.match(source, /path=['"]\/dashboard\/payouts['"][\s\S]*<ProtectedRoute\s+roles=\{PAYOUTS_ROLES\}>[\s\S]*<PayoutsPage\s*\/>/)
})

test('Sidebar exposes payouts to internal and vendor roles', async () => {
  const source = await readFile(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  assertTranspiles(source)
  assert.match(source, /Wallet|CreditCard|Banknote|HandCoins/)
  assert.match(source, /label:\s*['"]Payouts['"],\s*to:\s*['"]\/dashboard\/payouts['"][\s\S]*roles:\s*\[['"]super_admin['"],\s*['"]admin['"],\s*['"]finance['"],\s*['"]vendor['"],\s*['"]vendor_staff['"]\]/)
})

test('vendor location section uses vendor-scoped locations', async () => {
  const source = await readFile(new URL('../src/routes/events/index.tsx', import.meta.url), 'utf8')
  assertTranspiles(source)
  assert.match(source, /Use platform locations or your approved vendor locations for events/)
  assert.match(source, /useLocations\(\{\s*vendorScoped:\s*isVendorRole\s*\}\)/)
  assert.match(source, /<LocationReferenceGrid\s+locations=\{locations\s*\?\?\s*\[\]\}\s+isLoading=\{locationsLoading\}\s+allowCreate=\{canCreateEvents\}\s*\/>/)
})
