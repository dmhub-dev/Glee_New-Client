import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('event form offers table reservation setup after saving an event', async () => {
  const source = await readFile(new URL('../src/routes/events/$eventId.tsx', import.meta.url), 'utf8')

  assert.match(source, /setupReservationsAfterSave/)
  assert.match(source, /Table Reservations/)
  assert.match(source, /selectedLocation\?\.bookingEnabled/)
  assert.match(source, /navigate\(`\/dashboard\/events\/\$\{savedEvent\.id\}`,\s*\{\s*state:\s*\{\s*tab:\s*'reservations'\s*\}/s)
  assert.match(source, /Switch\s+checked=\{setupReservationsAfterSave\}/)
})
