import { useState } from 'react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Download, TrendingUp, DollarSign, Clock, Users, ArrowUpRight } from 'lucide-react'
import { BusinessTrendsChart } from '../../components/charts/BusinessTrendsChart'
import { toast } from '../../lib/toast'

export function ReportsPage() {
  const [reportPeriod, setReportPeriod] = useState('Q4 2026')

  const kpis = [
    { label: 'Total Revenue Quoted', value: '₹48.2L', change: '+18.4% vs Q3', tone: 'text-primary' },
    { label: 'Gross Margin Realized', value: '31.2%', change: '+2.1% efficiency', tone: 'text-success' },
    { label: 'Average Job Cycle Time', value: '18.4 days', change: '-3.2 days faster', tone: 'text-foreground' },
    { label: 'Labour Billable Ratio', value: '84.6%', change: '+5.0% utilization', tone: 'text-foreground' },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Executive Reports & Analytics"
        description="Consolidated financial velocity, margin yield, factory throughput, and commercial conversion."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success('Exporting PDF Report', 'Quarterly report generated.')}
            >
              <Download className="size-3.5" />
              <span>Export Executive Brief</span>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p className={`mt-2 font-display text-3xl font-extrabold tracking-tight tabular-nums ${kpi.tone}`}>
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.change}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Quarterly Operational Volume Run-rate</h3>
            <p className="text-xs text-muted-foreground">Department outputs aggregated by calendar month</p>
          </div>
        </div>
        <BusinessTrendsChart />
      </Card>
    </PageContainer>
  )
}
