import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readPanelSource() {
  return readFile(new URL('../src/components/chat/BookingChatPanel.tsx', import.meta.url), 'utf8')
}

test('BookingChatPanel exposes the booking support chat API surface', async () => {
  const source = await readPanelSource()
  const { diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  })

  assert.deepEqual(diagnostics?.map(diagnostic => diagnostic.messageText) ?? [], [])
  assert.match(source, /export function BookingChatPanel/)
  assert.match(source, /interface BookingChatPanelProps/)

  for (const requiredToken of [
    'canOpenBookingChat',
    'useBookingChatThread',
    'useBookingChatMessages',
    'useSendBookingChatMessage',
    'useMarkBookingChatRead',
    'useResolveBookingChatThread',
    'useReopenBookingChatThread',
    'Chat opens after this booking is confirmed and paid.',
    'Mark Resolved',
    'Reopen',
  ]) {
    assert.match(source, new RegExp(requiredToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})
