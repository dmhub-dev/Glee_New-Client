import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('admin analytics exposes the shared financial-style card primitive', () => {
  const source = read('src/components/admin/AdminAnalyticsCard.tsx')

  assert.match(source, /export function AdminAnalyticsCard/)
  assert.match(source, /rounded-2xl/)
  assert.match(source, /rounded-full/)
  assert.match(source, /bg-neon-pink\/10/)
  assert.match(source, /shadow-admin-card/)
})

test('admin analytics pages use the shared analytics card primitive', () => {
  const files = [
    'src/routes/financials/components/StatCard.tsx',
    'src/routes/financials/components/MetricCard.tsx',
    'src/routes/index.tsx',
    'src/routes/sales-reports/index.tsx',
    'src/routes/payouts/components/PayoutMetricCard.tsx',
    'src/routes/settings/LocationsTab.tsx',
  ]

  for (const file of files) {
    assert.match(read(file), /AdminAnalyticsCard/, `${file} should use AdminAnalyticsCard`)
  }
})

test('admin dashboard analytics cards do not use square rounded-lg card shells', () => {
  const dashboard = read('src/routes/index.tsx')

  assert.doesNotMatch(dashboard, /rounded-lg border border-admin bg-admin-surface p-5 shadow-admin/)
  assert.doesNotMatch(dashboard, /rounded-lg border border-admin bg-admin-overlay p-3/)
})

test('admin analytics wrappers show temporary placeholder trends where real deltas are not wired yet', () => {
  const helper = read('src/components/admin/temporaryAnalyticsTrend.ts')
  const files = [
    'src/routes/financials/components/MetricCard.tsx',
    'src/routes/index.tsx',
    'src/routes/sales-reports/index.tsx',
    'src/routes/payouts/components/PayoutMetricCard.tsx',
    'src/routes/settings/LocationsTab.tsx',
  ]

  assert.match(helper, /export function temporaryAnalyticsTrend/)
  assert.match(helper, /NEGATIVE_LABEL_PATTERN/)

  for (const file of files) {
    assert.match(read(file), /temporaryAnalyticsTrend/, `${file} should use temporary placeholder trends`)
  }
})
