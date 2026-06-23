import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function readSource(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

function assertTranspiles(source, path) {
  const { diagnostics } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
    reportDiagnostics: true,
  })

  assert.deepEqual(diagnostics?.map(diagnostic => diagnostic.messageText) ?? [], [])
}

test('shared media gallery exposes normalized rotating and swipeable surfaces', async () => {
  const source = await readSource('src/components/media/MediaGallery.tsx')

  assertTranspiles(source, 'MediaGallery.tsx')
  for (const token of [
    'export function normalizeMediaImages',
    'export function AutoMediaHero',
    'export function SwipeMediaGallery',
    'export function MediaPreviewDialog',
    'export function RotatingMediaCover',
    'data-testid="auto-media-hero"',
    'data-testid="swipe-media-gallery"',
    'data-testid="media-preview-dialog"',
    'setInterval',
    'onTouchStart',
    'onTouchEnd',
    'prefers-reduced-motion',
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('event API preserves backend photos as a first-class image gallery', async () => {
  const eventTypeSource = await readSource('src/types/event.ts')
  const eventApiSource = await readSource('src/api/queries/events.ts')

  assertTranspiles(eventTypeSource, 'event.ts')
  assertTranspiles(eventApiSource, 'events.ts')
  assert.match(eventTypeSource, /images\?:\s*string\[\]/)
  assert.match(eventApiSource, /const\s+photos\s*=\s*normalizeEventImages/)
  assert.match(eventApiSource, /images:\s*photos/)
  assert.match(eventApiSource, /flyerSquareUrl:\s*photos\[0\]/)
  assert.match(eventApiSource, /flyerPortraitUrl:\s*photos\[1\]\s*\?\?\s*photos\[0\]/)
})

test('event and location detail pages render slideshow heroes without duplicate preview galleries', async () => {
  const files = [
    'src/public/routes/events/$eventId.tsx',
    'src/customer/events/$eventId.tsx',
    'src/routes/events/EventDetail.tsx',
    'src/customer/reservations/$locationId.tsx',
    'src/routes/locations/$locationId.tsx',
  ]

  for (const file of files) {
    const source = await readSource(file)
    assertTranspiles(source, file)
    assert.match(source, /AutoMediaHero/)
    assert.doesNotMatch(source, /SwipeMediaGallery/)
    assert.match(source, /normalizeMediaImages/)
  }
})

test('event and venue cards rotate covers when multiple images exist', async () => {
  const files = [
    'src/components/events/AdminEventCard.tsx',
    'src/public/components/events/EventCard.tsx',
    'src/customer/events/index.tsx',
    'src/components/reservations/VenueShowcase.tsx',
    'src/routes/settings/LocationsTab.tsx',
  ]

  for (const file of files) {
    const source = await readSource(file)
    assertTranspiles(source, file)
    assert.match(source, /RotatingMediaCover/)
    assert.match(source, /normalizeMediaImages/)
  }
})
