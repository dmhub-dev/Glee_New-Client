import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogTitle, cn } from '@glee/ui'

type MediaImageInput = Array<string | null | undefined>

interface MediaGalleryBaseProps {
  images?: MediaImageInput
  alt: string
  fallback?: string
}

export function normalizeMediaImages(images: MediaImageInput = [], fallback?: string) {
  const seen = new Set<string>()
  const normalized = images
    .map(image => image?.trim())
    .filter((image): image is string => Boolean(image))
    .filter(image => {
      if (seen.has(image)) return false
      seen.add(image)
      return true
    })

  if (normalized.length > 0) return normalized
  return fallback ? [fallback] : []
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function useAutoMediaIndex(imageCount: number, intervalMs: number, enabled: boolean) {
  const [activeIndex, setActiveIndex] = useState(0)
  const reducedMotion = prefersReducedMotion()

  useEffect(() => {
    setActiveIndex(index => Math.min(index, Math.max(0, imageCount - 1)))
  }, [imageCount])

  useEffect(() => {
    if (!enabled || reducedMotion || imageCount <= 1) return undefined
    const id = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % imageCount)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [enabled, imageCount, intervalMs, reducedMotion])

  return [activeIndex, setActiveIndex] as const
}

function nextIndex(current: number, imageCount: number) {
  return imageCount <= 1 ? current : (current + 1) % imageCount
}

function previousIndex(current: number, imageCount: number) {
  return imageCount <= 1 ? current : (current - 1 + imageCount) % imageCount
}

export function AutoMediaHero({
  images,
  alt,
  fallback,
  className,
  imageClassName,
  overlayClassName,
  children,
  intervalMs = 4500,
  autoPlay = true,
  showControls = true,
  showCounter = true,
  onImageClick,
}: MediaGalleryBaseProps & {
  className?: string
  imageClassName?: string
  overlayClassName?: string
  children?: ReactNode
  intervalMs?: number
  autoPlay?: boolean
  showControls?: boolean
  showCounter?: boolean
  onImageClick?: (index: number) => void
}) {
  const mediaImages = useMemo(() => normalizeMediaImages(images, fallback), [fallback, images])
  const [activeIndex, setActiveIndex] = useAutoMediaIndex(mediaImages.length, intervalMs, autoPlay)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const activeImage = mediaImages[activeIndex]

  function moveNext() {
    setActiveIndex(index => nextIndex(index, mediaImages.length))
  }

  function movePrevious() {
    setActiveIndex(index => previousIndex(index, mediaImages.length))
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    if (touchStartX === null) return
    const delta = event.changedTouches[0].clientX - touchStartX
    setTouchStartX(null)
    if (Math.abs(delta) < 36) return
    if (delta < 0) moveNext()
    else movePrevious()
  }

  return (
    <section
      data-testid="auto-media-hero"
      className={cn('relative overflow-hidden bg-admin-overlay', className)}
      onTouchStart={event => setTouchStartX(event.touches[0].clientX)}
      onTouchEnd={handleTouchEnd}
    >
      {activeImage ? (
        <button
          type="button"
          className="absolute inset-0 w-full cursor-pointer"
          onClick={() => onImageClick?.(activeIndex)}
          aria-label={`Preview ${alt}`}
        >
          <img
            src={activeImage}
            alt={alt}
            className={cn('h-full w-full object-cover transition-transform duration-700', imageClassName)}
            onError={event => {
              if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback
            }}
          />
        </button>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Images className="h-10 w-10 text-admin-20" />
          <p className="text-xs text-admin-30">No images yet</p>
        </div>
      )}

      {overlayClassName && <div className={cn('absolute inset-0 pointer-events-none', overlayClassName)} />}

      {mediaImages.length > 1 && showControls && (
        <div className="absolute inset-x-4 top-1/2 z-10 flex -translate-y-1/2 items-center justify-between">
          <button
            type="button"
            onClick={event => { event.stopPropagation(); movePrevious() }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/55"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={event => { event.stopPropagation(); moveNext() }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/55"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {mediaImages.length > 1 && showCounter && (
        <div className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
          {activeIndex + 1}/{mediaImages.length}
        </div>
      )}

      {children}
    </section>
  )
}

export function MediaPreviewDialog({
  images,
  alt,
  fallback,
  open,
  onOpenChange,
  startIndex = 0,
}: MediaGalleryBaseProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
  startIndex?: number
}) {
  const mediaImages = useMemo(() => normalizeMediaImages(images, fallback), [fallback, images])
  const [activeIndex, setActiveIndex] = useState(startIndex)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const activeImage = mediaImages[activeIndex]

  useEffect(() => {
    if (open) setActiveIndex(Math.min(startIndex, Math.max(0, mediaImages.length - 1)))
  }, [mediaImages.length, open, startIndex])

  function moveNext() {
    setActiveIndex(index => nextIndex(index, mediaImages.length))
  }

  function movePrevious() {
    setActiveIndex(index => previousIndex(index, mediaImages.length))
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return
    const delta = event.changedTouches[0].clientX - touchStartX
    setTouchStartX(null)
    if (Math.abs(delta) < 36) return
    if (delta < 0) moveNext()
    else movePrevious()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="media-preview-dialog"
        className="max-w-5xl border-white/15 bg-[#050017] p-0 text-white"
      >
        <DialogTitle className="sr-only">{alt} gallery preview</DialogTitle>
        <div
          className="relative h-[78vh] overflow-hidden rounded-2xl bg-black"
          onTouchStart={event => setTouchStartX(event.touches[0].clientX)}
          onTouchEnd={handleTouchEnd}
        >
          {activeImage && (
            <img
              src={activeImage}
              alt={`${alt} ${activeIndex + 1}`}
              className="h-full w-full object-contain"
              onError={event => {
                if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback
              }}
            />
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-full bg-black/45 text-white hover:bg-black/65 hover:text-white"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </Button>
          {mediaImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={movePrevious}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
                aria-label="Previous preview image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={moveNext}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
                aria-label="Next preview image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                {activeIndex + 1}/{mediaImages.length}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SwipeMediaGallery({
  images,
  alt,
  fallback,
  className,
  thumbnailClassName,
}: MediaGalleryBaseProps & {
  className?: string
  thumbnailClassName?: string
}) {
  const mediaImages = useMemo(() => normalizeMediaImages(images, fallback), [fallback, images])
  const [activeIndex, setActiveIndex] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  if (mediaImages.length <= 1) return null

  function moveNext() {
    setActiveIndex(index => nextIndex(index, mediaImages.length))
  }

  function movePrevious() {
    setActiveIndex(index => previousIndex(index, mediaImages.length))
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return
    const delta = event.changedTouches[0].clientX - touchStartX
    setTouchStartX(null)
    if (Math.abs(delta) < 36) return
    if (delta < 0) moveNext()
    else movePrevious()
  }

  return (
    <>
      <div
        data-testid="swipe-media-gallery"
        className={cn('space-y-3', className)}
        onTouchStart={event => setTouchStartX(event.touches[0].clientX)}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black/25 text-left"
        >
          <img
            src={mediaImages[activeIndex]}
            alt={`${alt} preview ${activeIndex + 1}`}
            className="h-full w-full object-cover"
            onError={event => {
              if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback
            }}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <span className="inline-flex rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              Preview gallery
            </span>
          </div>
        </button>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mediaImages.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setActiveIndex(index)}
              onDoubleClick={() => setPreviewOpen(true)}
              className={cn(
                'h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                activeIndex === index ? 'border-neon-pink' : 'border-transparent opacity-70 hover:opacity-100',
                thumbnailClassName,
              )}
              aria-label={`Show image ${index + 1}`}
            >
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover"
                onError={event => {
                  if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <MediaPreviewDialog
        images={mediaImages}
        alt={alt}
        fallback={fallback}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        startIndex={activeIndex}
      />
    </>
  )
}

export function RotatingMediaCover({
  images,
  alt,
  fallback,
  className,
  imageClassName,
  intervalMs = 4200,
}: MediaGalleryBaseProps & {
  className?: string
  imageClassName?: string
  intervalMs?: number
}) {
  const mediaImages = useMemo(() => normalizeMediaImages(images, fallback), [fallback, images])
  const [activeIndex] = useAutoMediaIndex(mediaImages.length, intervalMs, true)
  const activeImage = mediaImages[activeIndex]

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-admin-overlay', className)}>
      {activeImage ? (
        <img
          src={activeImage}
          alt={alt}
          className={cn('h-full w-full object-cover transition-transform duration-700 group-hover:scale-105', imageClassName)}
          onError={event => {
            if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Images className="h-8 w-8 text-admin-20" />
        </div>
      )}
      {mediaImages.length > 1 && (
        <div className="absolute bottom-2 right-2 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {activeIndex + 1}/{mediaImages.length}
        </div>
      )}
    </div>
  )
}
