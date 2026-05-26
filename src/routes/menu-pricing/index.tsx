import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import { useAdminEvents } from '@glee/api'
import { Badge, Button, Input, Skeleton } from '@glee/ui'
import { DollarSign, Pencil, Search, Ticket, Utensils } from 'lucide-react'

function money(value: number) {
  return `KSh ${Math.max(0, value).toLocaleString()}`
}

export default function MenuPricingPage() {
  const user = useAdminUser()
  const navigate = useNavigate()
  const isVendorRole = user.role === 'vendor' || user.role === 'vendor_staff'
  const { data: events, isLoading } = useAdminEvents({ vendorScoped: isVendorRole })
  const [search, setSearch] = useState('')

  const filteredEvents = useMemo(() => {
    return (events ?? []).filter(event =>
      search.trim() === '' ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      (event.categoryName ?? '').toLowerCase().includes(search.toLowerCase()),
    )
  }, [events, search])

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
