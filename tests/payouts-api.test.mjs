import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadPayoutQueries(apiFetch) {
  const source = await readFile(new URL('../src/api/queries/payouts.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })

  const module = { exports: {} }
  const require = specifier => {
    if (specifier === '@tanstack/react-query') {
      return {
        useMutation: () => ({}),
        useQuery: () => ({}),
        useQueryClient: () => ({ invalidateQueries: () => {} }),
      }
    }
    if (specifier === '../client') return { apiFetch }
    throw new Error(`Unexpected import ${specifier}`)
  }
  const evaluate = new Function('exports', 'module', 'require', outputText)
  evaluate(module.exports, module, require)
  return module.exports
}

test('vendor payout API uses vendor endpoints and hides admin-only fields', async () => {
  const calls = []
  const api = await loadPayoutQueries(async (path, options = {}) => {
    calls.push({ path, options })
    if (path === '/api/v1/vendor/payout-profile') {
      return {
        success: true,
        data: {
          id: 'profile-1',
          vendorId: 'vendor-1',
          method: 'BANK_TRANSFER',
          accountName: 'Vendor Ltd',
          bankName: 'KCB',
          bankCode: '01',
          accountNumber: '123456',
          currency: 'KES',
          status: 'VERIFIED',
          rejectionReason: null,
          verifiedAt: '2026-06-16T08:00:00.000Z',
          updatedAt: '2026-06-16T08:00:00.000Z',
        },
      }
    }
    if (path === '/api/v1/vendor/events/event-1/earnings') {
      return {
        success: true,
        data: {
          eventId: 'event-1',
          currency: 'KES',
          grossTicketBaseSales: 10000,
          vendorNetPayable: 8500,
          paidOutAmount: 2000,
          pendingPayoutAmount: 1000,
          availableForPayout: 5500,
          adjustments: [{ id: 'adj-1', amount: -500, reason: 'Refund after payout', createdAt: '2026-06-16T08:00:00.000Z' }],
          gleeCommission: 1500,
          platformRevenue: 1500,
          adminNote: 'hidden',
          transactionReference: 'hidden',
          providerMetadata: { secret: true },
        },
      }
    }
    if (path === '/api/v1/vendor/events/event-1/payout-terms') {
      return {
        success: true,
        data: {
          eventId: 'event-1',
          commissionType: 'PERCENTAGE',
          commissionValue: '15',
          commissionCurrency: 'KES',
          commissionSnapshotAt: '2026-06-16T08:00:00.000Z',
          commissionLockedAt: null,
          payoutTimingType: 'BEFORE_EVENT',
          payoutTimingDays: 5,
        },
      }
    }
    if (path === '/api/v1/vendor/events/event-1/payout-requests') {
      return { success: true, data: { id: 'request-1', eventId: 'event-1', requestedAmount: '2500', status: 'ELIGIBLE', currency: 'KES' } }
    }
    if (path === '/api/v1/vendor/payout-requests') {
      return { success: true, data: [{ id: 'request-1', eventId: 'event-1', requestedAmount: '2500', status: 'ELIGIBLE', currency: 'KES' }] }
    }
    if (path === '/api/v1/vendor/payout-requests/request-1/cancel') {
      return { success: true, data: { id: 'request-1', eventId: 'event-1', requestedAmount: '2500', status: 'CANCELLED', currency: 'KES' } }
    }
    throw new Error(`Unhandled path ${path}`)
  })

  const profile = await api.getVendorPayoutProfile()
  const earnings = await api.getVendorEventEarnings('event-1')
  const terms = await api.getVendorEventPayoutTerms('event-1')
  const created = await api.createVendorPayoutRequest('event-1', { amount: 2500 })
  const requests = await api.listVendorPayoutRequests()
  const cancelled = await api.cancelVendorPayoutRequest('request-1', { reason: 'Wait for event close' })

  assert.equal(profile.status, 'VERIFIED')
  assert.equal(earnings.vendorNetPayable, 8500)
  assert.equal(earnings.availableForPayout, 5500)
  assert.equal(earnings.adjustments[0].amount, -500)
  assert.equal(terms.payoutTimingDays, 5)
  assert.equal(created.requestedAmount, 2500)
  assert.equal(requests[0].status, 'ELIGIBLE')
  assert.equal(cancelled.status, 'CANCELLED')

  assert.equal('gleeCommission' in earnings, false)
  assert.equal('platformRevenue' in earnings, false)
  assert.equal('adminNote' in earnings, false)
  assert.equal('transactionReference' in earnings, false)
  assert.equal('providerMetadata' in earnings, false)

  assert.deepEqual(calls.map(call => call.path), [
    '/api/v1/vendor/payout-profile',
    '/api/v1/vendor/events/event-1/earnings',
    '/api/v1/vendor/events/event-1/payout-terms',
    '/api/v1/vendor/events/event-1/payout-requests',
    '/api/v1/vendor/payout-requests',
    '/api/v1/vendor/payout-requests/request-1/cancel',
  ])
  assert.equal(calls[3].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[3].options.body), { amount: 2500 })
  assert.equal(calls[5].options.method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[5].options.body), { reason: 'Wait for event close' })
})

test('admin payout API uses admin endpoints and preserves audit fields', async () => {
  const calls = []
  const api = await loadPayoutQueries(async (path, options = {}) => {
    calls.push({ path, options })
    if (path === '/api/v1/admin/vendors/vendor-1/commission') return { success: true, data: { vendorId: 'vendor-1', type: 'PERCENTAGE', value: '15', currency: 'KES', payoutTimingType: 'BEFORE_EVENT', payoutTimingDays: 5 } }
    if (path === '/api/v1/admin/events/event-1/commission') return { success: true, data: { eventId: 'event-1', commissionType: 'FIXED_PER_TICKET', commissionValue: '100', commissionCurrency: 'KES', commissionLockedAt: null } }
    if (path === '/api/v1/admin/events/event-1/earnings') return { success: true, data: { eventId: 'event-1', grossTicketBaseSales: 10000, gleeCommission: 1500, platformRevenue: 1500, vendorNetPayable: 8500, payoutRequests: [], adjustments: [] } }
    if (path === '/api/v1/admin/vendors/vendor-1/payout-profile/verify') return { success: true, data: { vendorId: 'vendor-1', status: 'VERIFIED' } }
    if (path === '/api/v1/admin/payout-requests') return { success: true, data: [{ id: 'request-1', requestedAmount: '5000', approvedAmount: null, paidAmount: null, status: 'REQUESTED', transactionReference: null }] }
    if (path === '/api/v1/admin/payout-requests/request-1/approve') return { success: true, data: { id: 'request-1', requestedAmount: '5000', approvedAmount: '4500', status: 'APPROVED' } }
    if (path === '/api/v1/admin/payout-requests/request-1/reject') return { success: true, data: { id: 'request-1', status: 'REJECTED', rejectionReason: 'Docs missing' } }
    if (path === '/api/v1/admin/payout-requests/request-1/cancel') return { success: true, data: { id: 'request-1', status: 'CANCELLED' } }
    if (path === '/api/v1/admin/payout-requests/request-1/mark-paid') return { success: true, data: { id: 'request-1', status: 'PAID', paidAmount: '4500', transactionReference: 'TRX-1' } }
    if (path === '/api/v1/admin/payout-adjustments') return { success: true, data: { id: 'adj-1', eventId: 'event-1', amount: '-500', reason: 'Refund after payout' } }
    throw new Error(`Unhandled path ${path}`)
  })

  await api.upsertVendorCommission('vendor-1', { type: 'PERCENTAGE', value: 15, currency: 'KES', payoutTimingType: 'BEFORE_EVENT', payoutTimingDays: 5 })
  await api.updateEventCommission('event-1', { type: 'FIXED_PER_TICKET', value: 100, currency: 'KES', payoutTimingType: 'BEFORE_EVENT', payoutTimingDays: 5 })
  const earnings = await api.getAdminEventEarnings('event-1')
  await api.verifyVendorPayoutProfile('vendor-1', { status: 'VERIFIED' })
  await api.listAdminPayoutRequests()
  await api.approvePayoutRequest('request-1', { approvedAmount: 4500, adminNote: 'OK' })
  await api.rejectPayoutRequest('request-1', { reason: 'Docs missing' })
  await api.cancelAdminPayoutRequest('request-1', { reason: 'Duplicate' })
  await api.markPayoutRequestPaid('request-1', { paidAmount: 4500, paidAt: '2026-06-16T08:00:00.000Z', payoutMethod: 'BANK_TRANSFER', transactionReference: 'TRX-1' })
  await api.createPayoutAdjustment({ eventId: 'event-1', amount: -500, reason: 'Refund after payout', vendorVisible: true })

  assert.equal(earnings.gleeCommission, 1500)
  assert.equal(earnings.platformRevenue, 1500)
  assert.equal(calls[0].options.method, 'POST')
  assert.equal(calls[1].options.method, 'PATCH')
  assert.equal(calls[3].options.method, 'PATCH')
  assert.equal(calls[5].options.method, 'PATCH')
  assert.equal(calls[8].options.method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[8].options.body), {
    paidAmount: 4500,
    paidAt: '2026-06-16T08:00:00.000Z',
    payoutMethod: 'BANK_TRANSFER',
    transactionReference: 'TRX-1',
  })
  assert.equal(calls[9].options.method, 'POST')
})

test('payout queries are exported from api index', async () => {
  const source = await readFile(new URL('../src/api/index.ts', import.meta.url), 'utf8')
  assert.match(source, /export \* from ['"]\.\/queries\/payouts['"]/)
})
