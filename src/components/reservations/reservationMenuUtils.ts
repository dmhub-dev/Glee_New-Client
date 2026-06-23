export interface ReservationMenuSelectableItem {
  id: string
  name: string
  category: string
  price: number
  description?: string | null
}

export interface ReservationMenuSelectedRow {
  item: ReservationMenuSelectableItem
  quantity: number
  lineTotal: number
}

export interface ReservationPreOrderSnapshotItem {
  id?: string | null
  source?: string | null
  name: string
  category?: string | null
  price: number
  quantity: number
  lineTotal: number
}

function finiteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function nonNegativeFiniteNumber(value: unknown, fallback = 0) {
  return Math.max(0, finiteNumber(value, fallback))
}

export function selectedReservationMenuRows(
  items: ReservationMenuSelectableItem[] | undefined | null,
  quantities: Record<string, number>,
): ReservationMenuSelectedRow[] {
  return (items ?? [])
    .map(item => {
      const quantity = Math.max(0, Math.trunc(Number(quantities[item.id] ?? 0)))
      return {
        item,
        quantity,
        lineTotal: item.price * quantity,
      }
    })
    .filter(row => row.quantity > 0)
}

export function reservationMenuPayload(rows: ReservationMenuSelectedRow[]) {
  return rows.map(row => ({ id: row.item.id, quantity: row.quantity }))
}

export function reservationMenuTotal(rows: ReservationMenuSelectedRow[]) {
  return rows.reduce((sum, row) => sum + row.lineTotal, 0)
}

export function reservationDueNow(input: {
  depositAmount: number | string | undefined
  selectedMenuRows: ReservationMenuSelectedRow[]
}) {
  return nonNegativeFiniteNumber(input.depositAmount)
}

export function normalizedReservationPreOrderMenu(value: unknown): ReservationPreOrderSnapshotItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const name = String(row.name ?? '').trim()
      const parsedQuantity = Number(row.quantity ?? 0)
      if (!Number.isFinite(parsedQuantity)) return null
      const quantity = Math.max(0, Math.trunc(parsedQuantity))
      const price = nonNegativeFiniteNumber(row.price)
      const lineTotal = nonNegativeFiniteNumber(row.lineTotal ?? price * quantity)
      if (!name || quantity < 1) return null
      const normalized: ReservationPreOrderSnapshotItem = {
        name,
        price,
        quantity,
        lineTotal,
      }
      if (typeof row.id === 'string') normalized.id = row.id
      if (typeof row.source === 'string') normalized.source = row.source
      if (typeof row.category === 'string') normalized.category = row.category
      return normalized
    })
    .filter((item): item is ReservationPreOrderSnapshotItem => Boolean(item))
}
