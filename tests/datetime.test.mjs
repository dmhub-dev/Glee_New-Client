import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadDateTimeUtils() {
  const source = await readFile(new URL('../src/utils/datetime.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })

  const module = { exports: {} }
  const evaluate = new Function('exports', 'module', outputText)
  evaluate(module.exports, module)
  return module.exports
}

test('splitBackendDateTime preserves backend date and time text without timezone shifting', async () => {
  const { splitBackendDateTime } = await loadDateTimeUtils()

  assert.deepEqual(splitBackendDateTime('2026-01-01T00:30:00.000Z'), {
    date: '2026-01-01',
    time: '00:30',
  })
})

test('formatDateOnly formats date-only values as local calendar dates', async () => {
  const { formatDateOnly } = await loadDateTimeUtils()

  assert.equal(
    formatDateOnly('2026-01-01', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }, 'en-US'),
    'Thu, Jan 1, 2026',
  )
})

test('formatTimeOnly formats HH:mm values without requiring a full Date', async () => {
  const { formatTimeOnly } = await loadDateTimeUtils()

  assert.equal(formatTimeOnly('18:30', { hour: '2-digit', minute: '2-digit', hour12: true }, 'en-US'), '06:30 PM')
})

test('toDateTimeLocalInputValue converts backend text to datetime-local value', async () => {
  const { toDateTimeLocalInputValue } = await loadDateTimeUtils()

  assert.equal(toDateTimeLocalInputValue('2026-04-15T21:45:00.000Z'), '2026-04-15T21:45')
})
