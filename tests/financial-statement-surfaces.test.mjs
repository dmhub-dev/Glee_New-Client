import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('event earnings and location detail expose financial statement controls', async () => {
  const panel = await read('src/routes/financials/components/FinancialStatementPanel.tsx')
  const eventPanel = await read('src/routes/events/EventEarningsPanel.tsx')
  const locationDetail = await read('src/routes/locations/$locationId.tsx')
  const app = await read('src/app/App.tsx')

  assert.match(panel, /Financial Statement/)
  assert.match(panel, /Generate & Download PDF/)
  assert.match(panel, /Preparing PDF\.\.\./)
  assert.doesNotMatch(panel, /handleRegenerate/)
  assert.match(panel, /useFinancialStatement/)
  assert.match(panel, /useRegenerateFinancialStatement/)
  assert.match(panel, /downloadFinancialStatementPdf/)
  assert.match(eventPanel, /targetType="EVENT"/)
  assert.match(locationDetail, /Statements/)
  assert.match(locationDetail, /targetType="LOCATION"/)
  assert.match(app, /const\s+LOCATION_ROLES:\s*UserRole\[\]\s*=\s*\[\.\.\.ADMIN_ROLES,\s*['"]finance['"],\s*['"]vendor['"],\s*['"]vendor_staff['"]\]/)
  assert.match(locationDetail, /const\s+canViewAdminFinancialStatements\s*=\s*isAdmin\s*\|\|\s*isFinance/)
  assert.match(locationDetail, /scope=\{canViewAdminFinancialStatements\s*\?\s*['"]admin['"]\s*:\s*['"]vendor['"]\}/)
  assert.match(locationDetail, /canGenerate=\{canViewAdminFinancialStatements\s*\|\|\s*\(isVendorOwner\s*&&\s*loc\.vendorId\s*===\s*user\.id\)\}/)
})
