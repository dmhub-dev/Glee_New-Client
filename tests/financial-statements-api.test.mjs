import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('financial statement API exposes role-scoped event and location endpoints', async () => {
  const source = await read('src/api/queries/financial-statements.ts')
  const index = await read('src/api/index.ts')

  assert.match(source, /FinancialStatementTargetType/)
  assert.match(source, /FinancialStatementPeriodPreset/)
  assert.match(source, /getFinancialStatement/)
  assert.match(source, /regenerateFinancialStatement/)
  assert.match(source, /downloadFinancialStatementPdf/)
  assert.match(source, /periodDate/)
  assert.match(source, /statementQuery/)
  assert.match(source, /\/api\/v1\/admin\/events\/\$\{targetId\}\/financial-statement/)
  assert.match(source, /\/api\/v1\/vendor\/events\/\$\{targetId\}\/financial-statement/)
  assert.match(source, /\/api\/v1\/admin\/locations\/\$\{targetId\}\/financial-statement/)
  assert.match(source, /\/api\/v1\/vendor\/locations\/\$\{targetId\}\/financial-statement/)
  assert.match(index, /export \* from ['"]\.\/queries\/financial-statements['"]/)
})

test('financial statement PDF downloads use the backend filename when provided', async () => {
  const source = await read('src/api/queries/financial-statements.ts')

  assert.match(source, /headers\.get\(['"]content-disposition['"]\)/)
  assert.match(source, /filename\\\*/i)
  assert.doesNotMatch(
    source,
    /link\.download\s*=\s*`\$\{targetType\.toLowerCase\(\)\}-\$\{targetId\}-financial-statement\.pdf`/,
  )
})
