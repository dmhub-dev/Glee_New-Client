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
}

export default function TicketTierList({ tiers, selectedTierId, onSelect }: TicketTierListProps) {
  return (
    <div className="flex flex-col gap-3">
      {tiers.map(tier => {
        const isSoldOut = tier.quantityRemaining === 0
        const isSelected = selectedTierId === tier.id

        return (
          <button
            key={tier.id}
            type="button"
            disabled={isSoldOut}
            onClick={() => onSelect(tier.id)}
            className={cn(
              'w-full text-left rounded-lg border p-4 transition-all duration-150',
              isSoldOut && 'opacity-40 cursor-not-allowed',
              !isSoldOut && !isSelected && 'border-border bg-card hover:border-neon-pink/50 cursor-pointer',
              isSelected && 'border-neon-pink bg-neon-pink/10 shadow-neon',
            )}
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
          </button>
        )
      })}
    </div>
  )
}
