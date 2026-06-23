import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import {
  useAdminEvents,
  useCreateLocationMenuItem,
  useLocationMenuItems,
  useLocations,
  useUpdateLocationMenuItem,
  useUploadLocationMenuDocument,
  type Location,
  type LocationMenuItem,
} from '@glee/api'
import { Badge, Button, Input, Skeleton, Textarea, useToast } from '@glee/ui'
import {
  Building2,
  DollarSign,
  ExternalLink,
  FileText,
  Martini,
  Pencil,
  Plus,
  Save,
  Search,
  Ticket,
  Upload,
  Utensils,
} from 'lucide-react'
import { cn } from '@glee/ui'

type MenuPricingTab = 'events' | 'clubs' | 'restaurants'
type VenueMenuKind = Exclude<MenuPricingTab, 'events'>

const MENU_TABS: Array<{ label: string; value: MenuPricingTab; description: string }> = [
  { label: 'Events', value: 'events', description: 'Ticket tiers and add-ons attached to events.' },
  { label: 'Clubs', value: 'clubs', description: 'Bottle service, drinks, packages, and uploaded documents.' },
  { label: 'Restaurants', value: 'restaurants', description: 'Food, drinks, dining packages, and uploaded documents.' },
]

function money(value: number | string | undefined) {
  const amount = Number(value ?? 0)
  return `KSh ${Math.max(0, Number.isFinite(amount) ? amount : 0).toLocaleString()}`
}

function normalizeVenueKind(location?: Location | null): VenueMenuKind | 'other' {
  if (location?.venueType === 'CLUB' || location?.venueType === 'LOUNGE') return 'clubs'
  if (location?.venueType === 'RESTAURANT' || location?.venueType === 'HOTEL_RESTAURANT') return 'restaurants'
  return 'other'
}

function venueKindLabel(kind: VenueMenuKind) {
  return kind === 'clubs' ? 'Club' : 'Restaurant'
}

function menuDocumentKind(location?: Location | null) {
  const type = location?.menuDocumentType?.toLowerCase() ?? ''
  const name = location?.menuDocumentName?.toLowerCase() ?? ''
  const url = location?.menuDocumentUrl?.toLowerCase() ?? ''
  if (type.includes('pdf') || name.endsWith('.pdf') || url.includes('.pdf')) return 'pdf'
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif)(\?|$)/.test(name) || /\.(png|jpe?g|webp|gif)(\?|$)/.test(url)) return 'image'
  return 'file'
}

export default function MenuPricingPage() {
  const user = useAdminUser()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const { data: events, isLoading: eventsLoading } = useAdminEvents({ vendorScoped: isVendorRole })
  const { data: locations, isLoading: locationsLoading } = useLocations({ vendorScoped: isVendorRole })
  const uploadMenuDocument = useUploadLocationMenuDocument({ vendorScoped: isVendorRole })
  const createLocationMenuItem = useCreateLocationMenuItem()
  const updateLocationMenuItem = useUpdateLocationMenuItem()
  const isCreatingLocationMenuItemRef = useRef(false)

  const [activeTab, setActiveTab] = useState<MenuPricingTab>('events')
  const [search, setSearch] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [menuForm, setMenuForm] = useState({ name: '', category: 'other', price: '', description: '' })

  const clubLocations = useMemo(() => (locations ?? []).filter(location => normalizeVenueKind(location) === 'clubs'), [locations])
  const restaurantLocations = useMemo(() => (locations ?? []).filter(location => normalizeVenueKind(location) === 'restaurants'), [locations])
  const activeVenueLocations = useMemo(
    () => activeTab === 'clubs' ? clubLocations : activeTab === 'restaurants' ? restaurantLocations : [],
    [activeTab, clubLocations, restaurantLocations],
  )
  const selectedLocation = useMemo(
    () => activeVenueLocations.find(location => location.id === selectedLocationId) ?? activeVenueLocations[0],
    [activeVenueLocations, selectedLocationId],
  )
  const locationMenu = useLocationMenuItems(selectedLocation?.id ?? '')

  useEffect(() => {
    if (activeTab === 'events') return
    if (!activeVenueLocations.length) {
      if (selectedLocationId) setSelectedLocationId('')
      return
    }
    if (!selectedLocationId || !activeVenueLocations.some(location => location.id === selectedLocationId)) {
      setSelectedLocationId(activeVenueLocations[0].id)
    }
  }, [activeTab, activeVenueLocations, selectedLocationId])

  const eventStats = useMemo(() => {
    const list = events ?? []
    return {
      eventCount: list.length,
      menuItemCount: list.reduce((sum, event) => sum + (event.menuItems?.length ?? 0), 0),
      ticketTierCount: list.reduce((sum, event) => sum + event.ticketTiers.length, 0),
    }
  }, [events])

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (events ?? []).filter(event =>
      !query ||
      event.title.toLowerCase().includes(query) ||
      (event.categoryName ?? '').toLowerCase().includes(query) ||
      (event.location ?? '').toLowerCase().includes(query),
    )
  }, [events, search])

  const filteredLocationMenuItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (locationMenu.data ?? []).filter(item =>
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      (item.description ?? '').toLowerCase().includes(query),
    )
  }, [locationMenu.data, search])

  async function handleCreateLocationMenuItem() {
    if (createLocationMenuItem.isPending || isCreatingLocationMenuItemRef.current) return
    if (!selectedLocation) return
    const price = Number(menuForm.price)
    if (!menuForm.name.trim() || !Number.isFinite(price) || price <= 0) {
      toast({ title: 'Item details required', description: 'Add a name and price greater than zero.', variant: 'destructive' })
      return
    }
    isCreatingLocationMenuItemRef.current = true
    try {
      await createLocationMenuItem.mutateAsync({
        locationId: selectedLocation.id,
        payload: {
          name: menuForm.name.trim(),
          category: menuForm.category.trim() || 'other',
          price,
          description: menuForm.description.trim() || undefined,
          isActive: true,
        },
      })
      setMenuForm({ name: '', category: 'other', price: '', description: '' })
      toast({ title: 'Item added', description: `${menuForm.name.trim()} is available for table bookings.` })
    } catch (error) {
      toast({ title: 'Could not save item', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    } finally {
      isCreatingLocationMenuItemRef.current = false
    }
  }

  async function handleToggleLocationMenuItem(itemId: string, isActive: boolean) {
    if (!selectedLocation || updateLocationMenuItem.isPending) return
    try {
      await updateLocationMenuItem.mutateAsync({
        locationId: selectedLocation.id,
        menuItemId: itemId,
        payload: { isActive: !isActive },
      })
    } catch (error) {
      toast({ title: 'Could not update item', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function handleMenuDocumentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedLocation) return
    try {
      await uploadMenuDocument.mutateAsync({ id: selectedLocation.id, file })
      toast({ title: 'Document uploaded', description: `${selectedLocation.name} now has a previewable file.` })
    } catch (error) {
      toast({ title: 'Could not upload document', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <AdminLayout
      title="Menu & Pricing"
      subtitle={user.role === 'vendor_staff' ? 'Review event pricing, catalogues, and uploaded documents' : 'Manage event add-ons, venue catalogues, and uploaded documents'}
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">Menu operations</p>
              <h2 className="mt-2 font-heading text-2xl font-black text-foreground">Pricing and catalogues</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-admin-50">
                Separate event add-ons from club and restaurant catalogues, then preview uploaded PDFs or images before they go public.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[480px]">
              <Metric label="Events" value={eventStats.eventCount.toLocaleString()} />
              <Metric label="Add-ons" value={eventStats.menuItemCount.toLocaleString()} />
              <Metric label="Documents" value={[...clubLocations, ...restaurantLocations].filter(location => location.menuDocumentUrl).length.toLocaleString()} />
            </div>
          </div>
        </section>

        <MenuPricingTabs activeTab={activeTab} onSelect={tab => { setActiveTab(tab); setSearch('') }} />

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={activeTab === 'events' ? 'Search events, category, or location...' : 'Search name, category, or description...'}
            className="border-admin bg-admin-input pl-8"
          />
        </div>

        {activeTab === 'events' ? (
          <EventMenuItemsTab
            events={filteredEvents}
            isLoading={eventsLoading}
            onEditEvent={eventId => navigate(`/dashboard/events/${eventId}/edit`)}
          />
        ) : (
          <VenueMenuItemsTab
            kind={activeTab}
            locations={activeVenueLocations}
            selectedLocation={selectedLocation}
            selectedLocationId={selectedLocation?.id ?? ''}
            onSelectLocation={setSelectedLocationId}
            isLoadingLocations={locationsLoading}
            menuItems={filteredLocationMenuItems}
            isLoadingMenuItems={locationMenu.isLoading}
            menuForm={menuForm}
            onMenuFormChange={setMenuForm}
            onCreateMenuItem={handleCreateLocationMenuItem}
            createPending={createLocationMenuItem.isPending}
            updateLocationMenuItem={updateLocationMenuItem}
            onToggleMenuItem={handleToggleLocationMenuItem}
            uploadPending={uploadMenuDocument.isPending}
            onMenuDocumentChange={handleMenuDocumentChange}
          />
        )}
      </div>
    </AdminLayout>
  )
}

function MenuPricingTabs({ activeTab, onSelect }: { activeTab: MenuPricingTab; onSelect: (tab: MenuPricingTab) => void }) {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex w-max min-w-full justify-start">
        <div className="flex shrink-0 rounded-full border border-admin bg-admin-surface p-1 shadow-admin">
          {MENU_TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onSelect(tab.value)}
              className={cn(
                'whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition',
                activeTab === tab.value ? 'bg-neon-pink text-white' : 'text-admin-50 hover:text-neon-pink',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function EventMenuItemsTab({
  events,
  isLoading,
  onEditEvent,
}: {
  events: NonNullable<ReturnType<typeof useAdminEvents>['data']>
  isLoading: boolean
  onEditEvent: (eventId: string) => void
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-2xl" />)}
      </div>
    )
  }

  if (events.length === 0) {
    return <EmptyState icon={Utensils} title="No events found" description="Event add-ons will appear here once events match your search." />
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {events.map(event => {
        const menuItems = event.menuItems ?? []
        const ticketCount = event.ticketTiers.length
        return (
          <section key={event.id} className="overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin">
            <div className="flex flex-col gap-4 border-b border-admin p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-neon-pink/25 bg-neon-pink/10 text-neon-pink">{event.categoryName ?? 'Uncategorized'}</Badge>
                  <Badge className="border-admin bg-admin-overlay text-admin-50">{ticketCount} ticket tier{ticketCount === 1 ? '' : 's'}</Badge>
                </div>
                <h2 className="mt-3 truncate font-heading text-lg font-black text-foreground">{event.title}</h2>
                <p className="mt-1 text-xs text-admin-40">{event.location ?? 'No location assigned'}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditEvent(event.id)}
                className="w-fit gap-1.5 text-xs text-neon-pink hover:bg-neon-pink/10"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Event
              </Button>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <section>
                <SectionHeading icon={Ticket} label="Ticket pricing" />
                <div className="mt-3 space-y-2">
                  {event.ticketTiers.length === 0 ? (
                    <InlineEmpty message="No ticket categories configured." />
                  ) : event.ticketTiers.map(tier => {
                    const sold = Math.max(0, tier.quantity - tier.quantityRemaining)
                    return (
                      <div key={tier.id} className="rounded-xl border border-admin bg-admin-overlay p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-admin-80">{tier.name}</p>
                          <p className="font-mono text-sm font-semibold text-neon-pink">{money(tier.price)}</p>
                        </div>
                        <p className="mt-1 text-xs text-admin-40">{sold.toLocaleString()} sold / {tier.quantityRemaining.toLocaleString()} remaining</p>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section>
                <SectionHeading icon={Utensils} label="Add-ons" />
                <div className="mt-3 space-y-2">
                  {menuItems.length === 0 ? (
                    <InlineEmpty message="No add-ons attached." />
                  ) : menuItems.map(item => (
                    <div key={item.id ?? item.name} className="rounded-xl border border-admin bg-admin-overlay p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-admin-80">{item.name}</p>
                        <p className="font-mono text-sm font-semibold text-neon-pink">{money(item.price)}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <Badge className="border-admin bg-admin-input text-admin-50">{item.category}</Badge>
                        <DollarSign className="h-3.5 w-3.5 text-admin-30" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )
      })}
    </div>
  )
}

function VenueMenuItemsTab({
  kind,
  locations,
  selectedLocation,
  selectedLocationId,
  onSelectLocation,
  isLoadingLocations,
  menuItems,
  isLoadingMenuItems,
  menuForm,
  onMenuFormChange,
  onCreateMenuItem,
  createPending,
  updateLocationMenuItem,
  onToggleMenuItem,
  uploadPending,
  onMenuDocumentChange,
}: {
  kind: VenueMenuKind
  locations: Location[]
  selectedLocation?: Location
  selectedLocationId: string
  onSelectLocation: (locationId: string) => void
  isLoadingLocations: boolean
  menuItems: LocationMenuItem[]
  isLoadingMenuItems: boolean
  menuForm: { name: string; category: string; price: string; description: string }
  onMenuFormChange: (form: { name: string; category: string; price: string; description: string }) => void
  onCreateMenuItem: () => void
  createPending: boolean
  updateLocationMenuItem: { isPending: boolean }
  onToggleMenuItem: (itemId: string, isActive: boolean) => void
  uploadPending: boolean
  onMenuDocumentChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  const Icon = kind === 'clubs' ? Martini : Building2
  const activeCount = menuItems.filter(item => item.isActive).length

  if (isLoadingLocations) {
    return (
      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Skeleton className="h-[520px] rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <EmptyState
        icon={Icon}
        title={`No ${venueKindLabel(kind).toLowerCase()} locations found`}
        description={`Approved ${venueKindLabel(kind).toLowerCase()} locations will appear here once they are created.`}
      />
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">{venueKindLabel(kind)} catalogue</p>
              <h2 className="mt-2 flex items-center gap-2 font-heading text-lg font-black text-foreground">
                <Icon className="h-5 w-5 text-neon-pink" />
                Catalogue
              </h2>
            </div>
            <Badge className="border-admin bg-admin-overlay text-admin-50">{locations.length} location{locations.length === 1 ? '' : 's'}</Badge>
          </div>

          <label className="mt-5 block space-y-1">
            <span className="text-xs text-admin-40">Location</span>
            <select
              aria-label={`${venueKindLabel(kind)} menu location`}
              value={selectedLocationId}
              onChange={event => onSelectLocation(event.target.value)}
              className="h-10 w-full rounded-lg border border-admin bg-admin-input px-3 text-sm text-foreground"
            >
              {locations.map(location => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </label>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="Items" value={menuItems.length.toLocaleString()} />
            <Metric label="Active" value={activeCount.toLocaleString()} />
          </div>
        </section>

        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div>
            <h3 className="font-heading text-base font-black text-foreground">Add item</h3>
            <p className="mt-1 text-sm text-admin-40">Selected entries appear during table booking as pre-order notes.</p>
          </div>
          <div className="mt-4 grid gap-3">
            <Input aria-label="Catalogue item name" value={menuForm.name} onChange={event => onMenuFormChange({ ...menuForm, name: event.target.value })} placeholder="Item name" className="border-admin bg-admin-input" />
            <div className="grid grid-cols-2 gap-3">
              <Input aria-label="Catalogue item category" value={menuForm.category} onChange={event => onMenuFormChange({ ...menuForm, category: event.target.value })} placeholder="Category" className="border-admin bg-admin-input" />
              <Input aria-label="Catalogue item price" value={menuForm.price} onChange={event => onMenuFormChange({ ...menuForm, price: event.target.value })} type="number" min={0} placeholder="Price" className="border-admin bg-admin-input" />
            </div>
            <Textarea aria-label="Catalogue item description" value={menuForm.description} onChange={event => onMenuFormChange({ ...menuForm, description: event.target.value })} placeholder="Description" className="min-h-24 border-admin bg-admin-input" />
            <Button onClick={onCreateMenuItem} disabled={!selectedLocation || createPending} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </div>
        </section>
      </aside>

      <main className="space-y-5">
        <MenuDocumentPreview
          location={selectedLocation}
          uploadPending={uploadPending}
          onMenuDocumentChange={onMenuDocumentChange}
        />

        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-black text-foreground">Venue Menu Items</h2>
              <p className="mt-1 text-sm text-admin-40">{menuItems.length.toLocaleString()} item{menuItems.length === 1 ? '' : 's'} in this view.</p>
            </div>
            <Badge className="w-fit border-neon-pink/25 bg-neon-pink/10 text-neon-pink">{venueKindLabel(kind)}</Badge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {isLoadingMenuItems ? (
              Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)
            ) : menuItems.length === 0 ? (
              <div className="md:col-span-2 2xl:col-span-3">
                <InlineEmpty message="No items match this view." />
              </div>
            ) : menuItems.map(item => (
              <LocationMenuItemCard
                key={item.id}
                item={item}
                updateLocationMenuItem={updateLocationMenuItem}
                onToggle={() => onToggleMenuItem(item.id, item.isActive)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function MenuDocumentPreview({
  location,
  uploadPending,
  onMenuDocumentChange,
}: {
  location?: Location
  uploadPending: boolean
  onMenuDocumentChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  const kind = menuDocumentKind(location)
  const hasDocument = Boolean(location?.menuDocumentUrl)

  return (
    <section className="overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin">
      <div className="flex flex-col gap-4 border-b border-admin p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">Uploaded document</p>
          <h2 className="mt-2 font-heading text-lg font-black text-foreground">{location?.menuDocumentName ?? 'Document preview'}</h2>
          <p className="mt-1 text-sm text-admin-40">Preview the public PDF or image attached to this location.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {location?.menuDocumentUrl && (
            <a href={location.menuDocumentUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-admin bg-admin-overlay px-4 text-sm font-semibold text-admin-70 transition hover:text-neon-pink">
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          )}
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-neon-pink px-4 text-sm font-semibold text-white transition hover:bg-neon-pink/90">
            <Upload className="h-4 w-4" />
            {uploadPending ? 'Uploading...' : hasDocument ? 'Replace' : 'Upload'}
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" disabled={uploadPending || !location} onChange={onMenuDocumentChange} />
          </label>
        </div>
      </div>

      <div className="bg-admin-overlay p-5">
        {!hasDocument ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-admin bg-admin-surface text-center">
            <FileText className="h-10 w-10 text-admin-30" />
            <p className="mt-3 text-sm font-semibold text-admin-70">No document uploaded</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-admin-40">Upload a PDF or image so staff can preview what guests see before publishing the location.</p>
          </div>
        ) : kind === 'image' ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-admin bg-admin-surface p-3">
            <img
              src={location?.menuDocumentUrl ?? ''}
              alt={location?.menuDocumentName ?? 'Uploaded document'}
              className="max-h-[560px] w-full rounded-lg object-contain"
            />
          </div>
        ) : kind === 'pdf' ? (
          <div className="h-[560px] overflow-hidden rounded-xl border border-admin bg-white">
            <iframe src={location?.menuDocumentUrl ?? ''} title={location?.menuDocumentName ?? 'Uploaded PDF'} className="h-full w-full" />
          </div>
        ) : (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-admin bg-admin-surface text-center">
            <FileText className="h-10 w-10 text-admin-30" />
            <p className="mt-3 text-sm font-semibold text-admin-70">{location?.menuDocumentName ?? 'File uploaded'}</p>
            <p className="mt-1 text-xs text-admin-40">This file type cannot be previewed inline. Open it in a new tab.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function LocationMenuItemCard({
  item,
  updateLocationMenuItem,
  onToggle,
}: {
  item: LocationMenuItem
  updateLocationMenuItem: { isPending: boolean }
  onToggle: () => void
}) {
  return (
    <article className="rounded-xl border border-admin bg-admin-overlay p-4 transition hover:border-neon-pink/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-admin-80">{item.name}</p>
          <p className="mt-1 text-xs text-admin-40">{item.category}</p>
        </div>
        <p className="shrink-0 font-mono text-sm font-semibold text-neon-pink">{money(item.price)}</p>
      </div>
      {item.description && <p className="mt-3 line-clamp-2 text-xs leading-5 text-admin-40">{item.description}</p>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <Badge className={item.isActive ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-admin bg-admin-input text-admin-50'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
        <Button size="sm" variant="ghost" aria-label={`${item.isActive ? 'Deactivate' : 'Activate'} ${item.name}`} disabled={updateLocationMenuItem.isPending} onClick={onToggle} className="gap-1.5 text-xs text-admin-60 hover:bg-admin-input">
          <Save className="h-3.5 w-3.5" />
          {item.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </article>
  )
}

function SectionHeading({ icon: Icon, label }: { icon: typeof Ticket; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-admin-40">
      <Icon className="h-3.5 w-3.5 text-neon-pink" />
      {label}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay px-4 py-3">
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 truncate font-heading text-xl font-black text-foreground">{value}</p>
    </div>
  )
}

function InlineEmpty({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-admin bg-admin-overlay p-4 text-sm text-admin-40">{message}</p>
  )
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Utensils; title: string; description: string }) {
  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-10 text-center shadow-admin">
      <Icon className="mx-auto h-8 w-8 text-admin-30" />
      <p className="mt-3 text-sm font-semibold text-admin-70">{title}</p>
      <p className="mt-1 text-xs text-admin-40">{description}</p>
    </section>
  )
}
