import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('vendor event detail hides status and lifecycle mutation controls', async () => {
  const source = await readFile(new URL('../src/routes/events/EventDetail.tsx', import.meta.url), 'utf8')

  assert.match(source, /const\s+canManageEventLifecycle\s*=\s*!\s*isVendorRole/)

  const changeStatusIndex = source.indexOf('Change Status')
  const changeStatusGuardIndex = source.lastIndexOf('canManageEventLifecycle', changeStatusIndex)
  assert.ok(changeStatusGuardIndex > -1, 'Change Status should be guarded by canManageEventLifecycle')

  const lifecycleIndex = source.indexOf("handleLifecycle(event.status === 'active' ? 'start' : 'end')")
  const lifecycleGuardIndex = source.lastIndexOf('canManageEventLifecycle', lifecycleIndex)
  assert.ok(lifecycleGuardIndex > -1, 'start/end controls should be guarded by canManageEventLifecycle')
})
