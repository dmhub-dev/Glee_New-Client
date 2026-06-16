import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

function assertTranspiles(source) {
  const { diagnostics } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  })
  assert.deepEqual(diagnostics?.map(diagnostic => diagnostic.messageText) ?? [], [])
}

test('payout utilities define money formatting and role guards', async () => {
  const source = await read('src/routes/payouts/utils.ts')
  assert.match(source, /export function formatKes/)
  assert.match(source, /export function canManageVendorPayouts/)
  assert.match(source, /role === ['"]vendor['"]/)
  assert.match(source, /export function canViewPayoutEarnings/)
  assert.match(source, /export function canViewAdminPayouts/)
  assert.match(source, /super_admin|finance/)
})

test('payout shared components expose reusable status, metric, table, and profile form surfaces', async () => {
  for (const path of [
    'src/routes/payouts/components/PayoutStatusBadge.tsx',
    'src/routes/payouts/components/PayoutMetricCard.tsx',
    'src/routes/payouts/components/PayoutRequestTable.tsx',
    'src/routes/payouts/components/PayoutProfileForm.tsx',
  ]) {
    const source = await read(path)
    assertTranspiles(source)
  }

  const status = await read('src/routes/payouts/components/PayoutStatusBadge.tsx')
  assert.match(status, /PENDING_VERIFICATION/)
  assert.match(status, /VERIFIED/)
  assert.match(status, /APPROVED/)
  assert.match(status, /PAID/)

  const profile = await read('src/routes/payouts/components/PayoutProfileForm.tsx')
  assert.match(profile, /BANK_TRANSFER/)
  assert.match(profile, /MOBILE_MONEY/)
  assert.match(profile, /readOnly/)
  assert.match(profile, /PENDING_VERIFICATION/)

  const table = await read('src/routes/payouts/components/PayoutRequestTable.tsx')
  assert.match(table, /transactionReference/)
  assert.match(table, /showAdminColumns/)
})

test('vendor payouts page uses vendor-safe data and owner-only actions', async () => {
  const source = await read('src/routes/payouts/VendorPayoutsPage.tsx')
  assertTranspiles(source)
  assert.match(source, /useVendorPayoutProfile/)
  assert.match(source, /useVendorPayoutRequests/)
  assert.match(source, /useVendorEventEarnings/)
  assert.match(source, /canManageVendorPayouts\(user\.role\)/)
  assert.match(source, /Request Payout/)
  assert.match(source, /PayoutProfileForm/)
  assert.doesNotMatch(source, /gleeCommission|platformRevenue|transactionReference|providerMetadata|adminNote/)
})

test('payout route switches between vendor and admin surfaces by role', async () => {
  const source = await read('src/routes/payouts/index.tsx')
  assertTranspiles(source)
  assert.match(source, /canViewVendorPayouts\(user\.role\)/)
  assert.match(source, /canViewAdminPayouts\(user\.role\)/)
  assert.match(source, /<VendorPayoutsPage\s*\/>/)
  assert.match(source, /<AdminPayoutsPage\s*\/>/)
})

test('admin payouts page exposes queue, terms, verification, history, and paid audit fields', async () => {
  const source = await read('src/routes/payouts/AdminPayoutsPage.tsx')
  assertTranspiles(source)
  assert.match(source, /useAdminPayoutRequests/)
  assert.match(source, /useUpsertVendorCommission/)
  assert.match(source, /useVerifyVendorPayoutProfile/)
  assert.match(source, /useApprovePayoutRequest/)
  assert.match(source, /useRejectPayoutRequest/)
  assert.match(source, /useCancelAdminPayoutRequest/)
  assert.match(source, /useMarkPayoutRequestPaid/)
  assert.match(source, /transactionReference/)
  assert.match(source, /canMarkPaid/)
  assert.match(source, /paidAmountNumber <= selectedApprovedAmount/)
  assert.match(source, /max=\{selectedApprovedAmount \|\| undefined\}/)
  assert.match(source, /required/)
  assert.match(source, /rejectionReason/)
  assert.match(source, /cancellationReason/)
  assert.doesNotMatch(source, /paidAmount\s*\|\|/)
  assert.doesNotMatch(source, /Rejected by admin|Cancelled by admin/)
  assert.match(source, /Vendor Terms/)
  assert.match(source, /Profile Verification/)
  assert.match(source, /Payout Queue/)
})

test('event detail exposes earnings tab and panel', async () => {
  const tabs = await read('src/routes/events/EventDetailTabs.tsx')
  const detail = await read('src/routes/events/EventDetail.tsx')
  const panel = await read('src/routes/events/EventEarningsPanel.tsx')

  assertTranspiles(tabs)
  assertTranspiles(detail)
  assertTranspiles(panel)
  assert.match(tabs, /Earnings/)
  assert.match(tabs, /canViewPayoutEarnings\(userRole\)/)
  assert.match(detail, /EventEarningsPanel/)
  assert.match(panel, /useVendorEventEarnings/)
  assert.match(panel, /useAdminEventEarnings/)
  assert.match(panel, /canViewVendorPayouts\(userRole\)/)
  assert.match(panel, /useVendorEventPayoutTerms/)
  assert.match(panel, /useAdminEventCommission/)
  assert.match(panel, /useCreatePayoutAdjustment/)
  assert.match(panel, /commissionLockedAt/)
  assert.match(panel, /setCommissionType\(terms\.commissionType\)/)
  assert.match(panel, /Glee Commission/)
  assert.match(panel, /Vendor Net Payable/)
})

test('vendor dashboard and profile surface payout profile prompts', async () => {
  const dashboard = await read('src/routes/index.tsx')
  const profile = await read('src/routes/profile/index.tsx')
  assertTranspiles(dashboard)
  assertTranspiles(profile)
  assert.match(dashboard, /useVendorPayoutProfile/)
  assert.match(dashboard, /Payout profile/)
  assert.match(dashboard, /\/dashboard\/payouts/)
  assert.match(profile, /useVendorPayoutProfile/)
  assert.match(profile, /Payout profile/)
  assert.match(profile, /\/dashboard\/payouts/)
})

test('admin event approval warns when commission is missing', async () => {
  const detail = await read('src/routes/events/EventDetail.tsx')
  assert.match(detail, /configure commission/i)
  assert.match(detail, /\/dashboard\/payouts/)
})
