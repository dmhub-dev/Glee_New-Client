import { Skeleton } from '@glee/ui'
import { Banknote, Download, Ticket, Trophy } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import MetricCard from './components/MetricCard'
import EarningsChart from './components/EarningsChart'
import MenuBreakdownChart from './components/MenuBreakdownChart'
import RevenueBreakdownChart from './components/RevenueBreakdownChart'
import StatCard from './components/StatCard'
import TicketsTrendChart from './components/TicketsTrendChart'
import TransactionTable from './components/TransactionTable'
import { useFinancialMetrics } from './hooks/useFinancialMetrics'
import { usePdfExport } from './hooks/usePdfExport'
import { useTransactions } from './hooks/useTransactions'

export default function FinancialsPage() {
  const {
    overviewLoading,
    recentSalesLoading,
    earningsSeriesLoading,
    totals,
    ticketEarnings,
    menuItemsEarnings,
    ticketsSold,
    averageTicketPrice,
    highestSellingEvent,
    trends,
    earningsTrendDir,
    earningsRange,
    setEarningsRange,
    dailyEarnings,
    menuRevenueDonut,
    ticketsSoldRange,
    setTicketsSoldRange,
    dailyTicketsSoldTrend,
    transactions,
  } = useFinancialMetrics()

  const {
    search,
    setSearch,
    range,
    setRange,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    filtersOpen,
    setFiltersOpen,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    setPage,
    totalTransactions,
    totalPages,
    currentPage,
    pageStartIndex,
    pageEndIndex,
    sortedTransactions,
    pagedTransactions,
  } = useTransactions(transactions)

  const { exportingPdf, handleExportPdf } = usePdfExport()

  const transactionsForDisplay = exportingPdf ? sortedTransactions : pagedTransactions

  return (
    <AdminLayout title="Financials" subtitle="Track earnings and expenses">
      <style>{`
        @media print {
          html[data-exporting-pdf="true"] aside,
          html[data-exporting-pdf="true"] header {
            display: none !important;
          }

          html[data-exporting-pdf="true"] main {
            padding: 0 !important;
          }

          html[data-exporting-pdf="true"] .no-print {
            display: none !important;
          }

          html[data-exporting-pdf="true"] thead {
            display: table-header-group !important;
          }

          html[data-exporting-pdf="true"] tr,
          html[data-exporting-pdf="true"] td,
          html[data-exporting-pdf="true"] th {
            break-inside: avoid;
          }
        }
      `}</style>
      <div className="space-y-5">
        <div className="flex justify-end no-print">
          <button
            type="button"
            onClick={handleExportPdf}
            className="h-9 px-4 rounded-full bg-neon-pink hover:bg-[#cc2272] text-white text-sm font-semibold transition-colors inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
              {!overviewLoading && !recentSalesLoading ? (
                <>
                  <StatCard label="Total Earnings" value={totals.earnings} trend={earningsTrendDir} trendPct={trends.earningsTrend} />
                  <StatCard label="Total Ticket Earnings" value={ticketEarnings} trend={earningsTrendDir} trendPct={trends.earningsTrend} />
                  <StatCard label="Total Menu Items Earnings" value={menuItemsEarnings} trend={earningsTrendDir} trendPct={trends.earningsTrend} />
                </>
              ) : (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
              )}
            </div>

            <TransactionTable
              exportingPdf={exportingPdf}
              search={search}
              setSearch={setSearch}
              range={range}
              setRange={setRange}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              filtersOpen={filtersOpen}
              setFiltersOpen={setFiltersOpen}
              sortKey={sortKey}
              setSortKey={setSortKey}
              sortDir={sortDir}
              setSortDir={setSortDir}
              transactionsForDisplay={transactionsForDisplay}
              totalTransactions={totalTransactions}
              pageStartIndex={pageStartIndex}
              pageEndIndex={pageEndIndex}
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevPage={() => setPage(p => Math.max(1, p - 1))}
              onNextPage={() => setPage(p => Math.min(totalPages, p + 1))}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard label="Tickets Sold" value={ticketsSold.toLocaleString()} icon={Ticket} />
              <MetricCard
                label="Average Ticket Price"
                value={`Ksh ${averageTicketPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                icon={Banknote}
              />
              <MetricCard
                label="Highest Selling Event"
                value={highestSellingEvent?.title ?? '—'}
                subtitle={highestSellingEvent ? `${highestSellingEvent.sold.toLocaleString()} tickets` : undefined}
                icon={Trophy}
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <EarningsChart
              dailyEarnings={dailyEarnings}
              earningsRange={earningsRange}
              setEarningsRange={setEarningsRange}
              loading={earningsSeriesLoading}
            />
            <RevenueBreakdownChart ticketEarnings={ticketEarnings} menuItemsEarnings={menuItemsEarnings} />
            <MenuBreakdownChart menuRevenueDonut={menuRevenueDonut} />
            <TicketsTrendChart
              dailyTicketsSoldTrend={dailyTicketsSoldTrend}
              ticketsSoldRange={ticketsSoldRange}
              setTicketsSoldRange={setTicketsSoldRange}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
