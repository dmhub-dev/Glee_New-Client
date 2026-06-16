import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import { useAdminEvents, useCreateLocationMenuItem, useLocationMenuItems, useLocations, useUpdateLocationMenuItem } from '@glee/api'
import { Badge, Button, Input, Skeleton, Textarea, useToast } from '@glee/ui'
import { DollarSign, Pencil, Plus, Save, Search, Ticket, Utensils } from 'lucide-react'

function money(value: number) {
  const amount = Number.isFinite(value) ? value : 0
  return `KSh ${Math.max(0, amount).toLocaleString()}`
}

export default function MenuPricingPage() {
  const user = useAdminUser()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const { data: events, isLoading } = useAdminEvents({ vendorScoped: isVendorRole })
  const { data: locations, isLoading: locationsLoading } = useLocations({ vendorScoped: isVendorRole })
  const [search, setSearch] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const selectedLocation = useMemo(
    () => (locations ?? []).find(location => location.id === selectedLocationId) ?? (locations ?? [])[0],
    [locations, selectedLocationId],
  )
  const locationMenu = useLocationMenuItems(selectedLocation?.id ?? '')
  const createLocationMenuItem = useCreateLocationMenuItem()
  const updateLocationMenuItem = useUpdateLocationMenuItem()
  const isCreatingLocationMenuItemRef = useRef(false)
  const [menuForm, setMenuForm] = useState({ name: '', category: 'other', price: '', description: '' })

  const filteredEvents = useMemo(() => {
    return (events ?? []).filter(event =>
      search.trim() === '' ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      (event.categoryName ?? '').toLowerCase().includes(search.toLowerCase()),
    )
  }, [events, search])

  async function handleCreateLocationMenuItem() {
    if (createLocationMenuItem.isPending || isCreatingLocationMenuItemRef.current) return
    if (!selectedLocation) return
    const price = Number(menuForm.price)
    if (!menuForm.name.trim() || !Number.isFinite(price) || price <= 0) {
      toast({ title: 'Menu item required', description: 'Add a name and price greater than zero.', variant: 'destructive' })
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
      toast({ title: 'Menu item added', description: `${menuForm.name.trim()} is available for table bookings.` })
    } catch (error) {
      toast({ title: 'Could not save menu item', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
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
      toast({ title: 'Could not update menu item', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <AdminLayout
      title="Menu & Pricing"
      subtitle={user.role === 'vendor_staff' ? 'Review and maintain ticket categories and event menu items' : 'Manage ticket pricing and optional event menu items'}
    >
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-admin-30" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search events..."
            className="bg-admin-input border-admin pl-8"
          />
        </div>

        <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-heading text-base font-black text-foreground">Venue Menu Items</h2>
              <p className="mt-1 text-sm text-admin-40">Food and drink choices saved as pre-order notes on table bookings.</p>
            </div>
            <select
              aria-label="Venue menu location"
              value={selectedLocation?.id ?? ''}
              onChange={event => setSelectedLocationId(event.target.value)}
              className="h-10 rounded-lg border border-admin bg-admin-input px-3 text-sm text-foreground"
            >
              {(locations ?? []).map(location => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_160px]">
            <Input aria-label="Venue menu item name" value={menuForm.name} onChange={event => setMenuForm(current => ({ ...current, name: event.target.value }))} placeholder="Item name" className="bg-admin-input border-admin" />
            <Input aria-label="Venue menu item category" value={menuForm.category} onChange={event => setMenuForm(current => ({ ...current, category: event.target.value }))} placeholder="Category" className="bg-admin-input border-admin" />
            <Input aria-label="Venue menu item price" value={menuForm.price} onChange={event => setMenuForm(current => ({ ...current, price: event.target.value }))} type="number" min={0} placeholder="Price" className="bg-admin-input border-admin" />
          </div>
          <Textarea aria-label="Venue menu item description" value={menuForm.description} onChange={event => setMenuForm(current => ({ ...current, description: event.target.value }))} placeholder="Description" className="mt-3 min-h-20 border-admin bg-admin-input" />
          <Button onClick={handleCreateLocationMenuItem} disabled={!selectedLocation || createLocationMenuItem.isPending} className="mt-3 gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
            <Plus className="h-4 w-4" />
            Add Venue Menu Item
          </Button>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {locationsLoading || locationMenu.isLoading ? (
              <Skeleton className="h-24 rounded-lg" />
            ) : (locationMenu.data ?? []).length === 0 ? (
              <p className="rounded-lg border border-admin bg-admin-overlay p-3 text-sm text-admin-40">No venue menu items yet.</p>
            ) : (locationMenu.data ?? []).map(item => (
              <div key={item.id} className="rounded-lg border border-admin bg-admin-overlay p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-admin-80">{item.name}</p>
                    <p className="mt-1 text-xs text-admin-40">{item.category}</p>
                  </div>
                  <p className="font-mono text-sm font-semibold text-neon-pink">{money(Number(item.price))}</p>
                </div>
                {item.description && <p className="mt-2 line-clamp-2 text-xs text-admin-40">{item.description}</p>}
                <Button size="sm" variant="ghost" aria-label={`${item.isActive ? 'Deactivate' : 'Activate'} ${item.name}`} disabled={updateLocationMenuItem.isPending} onClick={() => handleToggleLocationMenuItem(item.id, item.isActive)} className="mt-3 gap-1.5 text-xs text-admin-60 hover:bg-admin-input">
                  <Save className="h-3.5 w-3.5" />
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {isLoading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-lg" />)}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-admin bg-admin-surface p-10 text-center">
            <Utensils className="mx-auto h-8 w-8 text-admin-30" />
            <p className="mt-3 text-sm font-medium text-admin-70">No events found</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredEvents.map(event => (
              <section key={event.id} className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-heading text-sm font-bold text-foreground">{event.title}</h2>
                    <p className="mt-1 text-xs text-admin-40">{event.location ?? 'No location'} · {event.categoryName ?? 'Uncategorized'}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/dashboard/events/${event.id}/edit`)}
                    className="gap-1.5 text-xs text-neon-pink hover:bg-neon-pink/10"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-admin-40">
                      <Ticket className="h-3.5 w-3.5 text-neon-pink" />
                      Ticket Pricing
                    </div>
                    <div className="space-y-2">
                      {event.ticketTiers.length === 0 ? (
                        <p className="rounded-lg border border-admin bg-admin-overlay p-3 text-sm text-admin-40">No ticket categories configured.</p>
                      ) : event.ticketTiers.map(tier => {
                        const sold = Math.max(0, tier.quantity - tier.quantityRemaining)
                        return (
                          <div key={tier.id} className="rounded-lg border border-admin bg-admin-overlay p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-admin-80">{tier.name}</p>
                              <p className="font-mono text-sm font-semibold text-neon-pink">{money(tier.price)}</p>
                            </div>
                            <p className="mt-1 text-xs text-admin-40">{sold.toLocaleString()} sold · {tier.quantityRemaining.toLocaleString()} remaining</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-admin-40">
                      <Utensils className="h-3.5 w-3.5 text-neon-pink" />
                      Menu Items
                    </div>
                    <div className="space-y-2">
                      {(event.menuItems ?? []).length === 0 ? (
                        <p className="rounded-lg border border-admin bg-admin-overlay p-3 text-sm text-admin-40">No menu items attached.</p>
                      ) : (event.menuItems ?? []).map(item => (
                        <div key={item.id ?? item.name} className="rounded-lg border border-admin bg-admin-overlay p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-admin-80">{item.name}</p>
                            <p className="font-mono text-sm font-semibold text-neon-pink">{money(item.price)}</p>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <Badge className="border-admin bg-admin-input text-admin-50">{item.category}</Badge>
                            <DollarSign className="h-3.5 w-3.5 text-admin-30" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
