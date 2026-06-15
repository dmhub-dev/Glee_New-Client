import type { TicketTier } from '@glee/types'
import { cn } from '@glee/ui'

function QuantityBadge({ remaining }: { remaining: number }) {
  if (remaining === 0) return <span className="text-xs font-mono text-red-400">Sold Out</span>
  if (remaining <= 3) return <span className="text-xs font-mono text-red-400">{remaining} left</span>
  if (remaining <= 10) return <span className="text-xs font-mono text-amber-400">{remaining} left</span>
  return <span className="text-xs font-mono text-green-400">{remaining} left</span>
}

interface TicketTierListProps {
  tiers: TicketTier[]
  selectedTierId: string | null
  onSelect: (tierId: string) => void
  quantity: number
  onQuantityChange: (qty: number) => void
}

export default function TicketTierList({
  tiers,
  selectedTierId,
  onSelect,
  quantity,
  onQuantityChange,
}: TicketTierListProps) {
  return (
    <div className="flex flex-col gap-3">
      {tiers.map(tier => {
        const isSoldOut = tier.quantityRemaining === 0
        const isSelected = selectedTierId === tier.id
        const maxQty = Math.min(tier.quantityRemaining, 10)

        return (
          <div
            key={tier.id}
            role="button"
            tabIndex={isSoldOut ? -1 : 0}
            aria-disabled={isSoldOut}
            className={cn(
              'w-full rounded-lg border p-4 transition-all duration-150',
              isSoldOut && 'opacity-40',
              !isSoldOut && !isSelected && 'border-border bg-card hover:border-neon-pink/50 cursor-pointer',
              isSelected && 'border-neon-pink bg-neon-pink/10 shadow-neon',
            )}
            onClick={() => !isSoldOut && onSelect(tier.id)}
            onKeyDown={event => {
              if (isSoldOut || (event.key !== 'Enter' && event.key !== ' ')) return
              event.preventDefault()
              onSelect(tier.id)
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-foreground">{tier.name}</span>
              <div className="flex items-center gap-3">
                <QuantityBadge remaining={tier.quantityRemaining} />
                <span className="font-mono font-semibold text-neon-pink">
                  KSh {tier.price.toLocaleString()}
                </span>
              </div>
            </div>
            {tier.description && (
              <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
            )}
            {isSelected && (
              <div className="mt-3 pt-3 border-t border-neon-pink/20 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onQuantityChange(Math.max(1, quantity - 1)) }}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground hover:border-neon-pink hover:text-neon-pink transition-colors text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="font-mono font-bold text-foreground w-6 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onQuantityChange(Math.min(maxQty, quantity + 1)) }}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground hover:border-neon-pink hover:text-neon-pink transition-colors text-lg leading-none"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
