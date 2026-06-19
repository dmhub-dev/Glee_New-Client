import type { AdminAnalyticsTrend } from './AdminAnalyticsCard'

const TREND_VALUES = [2.8, 4.6, 6.4, 8.7, 11.2, 13.9, 16.5, 19.8, 22.4]
const NEGATIVE_LABEL_PATTERN = /attention|cancel|inactive|missing|open|pending|rejected|risk|unpaid/i

function hashTrendKey(key: string) {
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 997
  }
  return hash
}

export function temporaryAnalyticsTrend(label: string, value?: unknown): AdminAnalyticsTrend {
  const key = `${label}:${String(value ?? '')}`
  const hash = hashTrendKey(key)
  const pct = TREND_VALUES[hash % TREND_VALUES.length]
  const direction = NEGATIVE_LABEL_PATTERN.test(label) || hash % 7 === 0 ? 'down' : 'up'

  return {
    direction,
    label: `${direction === 'up' ? '+' : '-'}${pct.toFixed(2)} %`,
  }
}
