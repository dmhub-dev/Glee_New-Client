export interface DateTimeParts {
  date: string
  time: string
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const BACKEND_DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

export function splitBackendDateTime(value?: string | null): DateTimeParts {
  const raw = value?.trim()
  if (!raw) return { date: '', time: '' }

  const textMatch = raw.match(BACKEND_DATE_TIME_RE)
  if (textMatch) {
    return {
      date: textMatch[1],
      time: textMatch[2] ?? '',
    }
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' }

  return {
    date: `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`,
    time: `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`,
  }
}

export function parseDateOnly(value: string): Date {
  const match = value.match(DATE_ONLY_RE)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return new Date(NaN)
  return parsed
}

export function formatDateOnly(
  value: string,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-KE',
) {
  if (!value) return ''
  const date = parseDateOnly(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale, options)
}

export function formatTimeOnly(
  value: string,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true },
  locale = 'en-KE',
) {
  const [hour, minute] = value.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return ''
  const date = new Date(2000, 0, 1, hour, minute)
  return date.toLocaleTimeString(locale, options)
}

export function toDateTimeLocalInputValue(value?: string | null) {
  const { date, time } = splitBackendDateTime(value)
  return date && time ? `${date}T${time}` : ''
}

export function formatDateRange(
  startDate: string,
  endDate: string | undefined,
  singleDayOptions: Intl.DateTimeFormatOptions,
  rangeStartOptions: Intl.DateTimeFormatOptions,
  rangeEndOptions: Intl.DateTimeFormatOptions,
  locale = 'en-KE',
) {
  if (endDate && endDate !== startDate) {
    return `${formatDateOnly(startDate, rangeStartOptions, locale)} – ${formatDateOnly(endDate, rangeEndOptions, locale)}`
  }
  return formatDateOnly(startDate, singleDayOptions, locale)
}
