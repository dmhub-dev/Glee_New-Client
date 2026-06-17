import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readLocationsTabSource() {
  return readFile(new URL('../src/routes/settings/LocationsTab.tsx', import.meta.url), 'utf8')
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

test('locations page exposes command center summary metrics', async () => {
  const source = await readLocationsTabSource()

  assertTranspiles(source)
  assert.match(source, /function\s+LocationMetricCard/)
  assert.match(source, /const\s+locationMetrics\s*=\s*useMemo\(/)
  for (const label of ['Total locations', 'Approved', 'Pending approval', 'Reservations on', 'Missing menu']) {
    assert.match(source, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('locations page supports command center search and operational filters', async () => {
  const source = await readLocationsTabSource()

  assertTranspiles(source)
  assert.match(source, /type\s+LocationFilter\s*=/)
  assert.match(source, /LOCATION_FILTERS/)
  for (const label of ['All', 'Clubs', 'Restaurants', 'Needs approval', 'Reservations on', 'Missing menu']) {
    assert.match(source, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(source, /const\s+\[search,\s*setSearch\]\s*=\s*useState\(['"]{2}\)/)
  assert.match(source, /const\s+\[activeFilter,\s*setActiveFilter\]\s*=\s*useState<LocationFilter>\(['"]ALL['"]\)/)
  assert.match(source, /const\s+filteredLocations\s*=\s*useMemo\(/)
})

test('location cards show booking, menu, approval, and quick actions', async () => {
  const source = await readLocationsTabSource()

  assertTranspiles(source)
  assert.match(source, /function\s+LocationCommandCard/)
  for (const token of [
    'data-testid="location-command-card"',
    'approvalLabel(location.approvalStatus)',
    'Reservations on',
    'Reservations off',
    'Menu uploaded',
    'Menu missing',
    'View',
    'Bookings',
    'Menu',
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(source, /navigate\(`\/dashboard\/locations\/\$\{location\.id\}`\)/)
  assert.match(source, /navigate\(`\/dashboard\/locations\/\$\{location\.id\}`,\s*\{\s*state:\s*\{\s*tab:\s*['"]bookings['"]\s*\}\s*\}\)/)
  assert.match(source, /navigate\(['"]\/dashboard\/menu-pricing['"]\)/)
})
