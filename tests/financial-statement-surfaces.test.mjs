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

  assert.match(panel, /Financial Statement/)
  assert.match(panel, /Regenerate/)
  assert.match(panel, /Download PDF/)
  assert.match(panel, /useFinancialStatement/)
  assert.match(panel, /useRegenerateFinancialStatement/)
  assert.match(panel, /downloadFinancialStatementPdf/)
  assert.match(eventPanel, /targetType="EVENT"/)
  assert.match(locationDetail, /Statements/)
  assert.match(locationDetail, /targetType="LOCATION"/)
})
