import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ListFilter,
  FileSpreadsheet,
} from 'lucide-react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { DepartmentTrendChart } from '../../components/charts/DepartmentTrendChart'
import { DepartmentDistributionChart } from '../../components/charts/DepartmentDistributionChart'
import { DEPARTMENT_META, type DepartmentId } from '../../lib/departments'
import type { RangeKey } from '../../data/dashboard'
import {
  mockEnquiries,
  mockDesigns,
  mockQuotations,
  mockWorkOrders,
  mockFeedback,
  mockWorkers,
} from '../../data/mockData'

export function DepartmentDashboardPage({
  departmentId,
  rangeId,
  onOpenCreate,
}: {
  departmentId: DepartmentId
  rangeId: RangeKey
  onOpenCreate: () => void
}) {
  const navigate = useNavigate()
  const meta = DEPARTMENT_META[departmentId]
  const Icon = meta.icon

  // Department-specific analytics and distribution data
  const deptConfigs: Record<
    DepartmentId,
    {
      kpis: { label: string; value: string; note: string; alert?: boolean }[]
      trendData: { label: string; value: number }[]
      distributionData: { name: string; value: number; color: string }[]
      distributionTitle: string
      attentionItems: { title: string; subtitle: string; code: string; link: string }[]
      recentRecords: { id: string; code: string; title: string; status: string; date: string; link: string }[]
    }
  > = {
    enquiries: {
      kpis: [
        { label: 'Total Enquiries', value: '148', note: '+16% vs prior period' },
        { label: 'Qualified Leads', value: '82', note: '55.4% conversion' },
        { label: 'Avg. Response Time', value: '3.2 hrs', note: '-0.8h improvement' },
        { label: 'High Intent Budget', value: '₹42.8L', note: 'Commercial pipeline' },
      ],
      trendData: [
        { label: 'W1', value: 28 },
        { label: 'W2', value: 34 },
        { label: 'W3', value: 42 },
        { label: 'W4', value: 44 },
      ],
      distributionTitle: 'Lead Source Breakdown',
      distributionData: [
        { name: 'Website', value: 55, color: 'var(--dept-enquiries)' },
        { name: 'Referral', value: 38, color: '#38bdf8' },
        { name: 'Direct', value: 32, color: '#818cf8' },
        { name: 'Social', value: 23, color: '#c084fc' },
      ],
      attentionItems: [
        { title: 'Acme Spaces proposal due', subtitle: 'Awaiting requirement sign-off', code: 'ENQ-1048', link: '/enquiries/enq-1' },
        { title: 'Aster Interiors follow-up', subtitle: 'Qualified lead pending quotation', code: 'ENQ-1046', link: '/enquiries/enq-2' },
      ],
      recentRecords: mockEnquiries.map((e) => ({
        id: e.id,
        code: e.code,
        title: `${e.customerName} · ${e.company}`,
        status: e.status,
        date: e.createdAt,
        link: `/enquiries/${e.id}`,
      })),
    },
    designs: {
      kpis: [
        { label: 'Total CAD Models', value: '67', note: '8 due this week' },
        { label: 'In Drafting', value: '28', note: 'Active across 4 designers' },
        { label: 'Approval Rate', value: '91.4%', note: '+3.2% vs last month' },
        { label: 'Avg. Cycle Time', value: '4.6 days', note: 'From enquiry hand-off' },
      ],
      trendData: [
        { label: 'W1', value: 12 },
        { label: 'W2', value: 16 },
        { label: 'W3', value: 18 },
        { label: 'W4', value: 21 },
      ],
      distributionTitle: 'Drafting Workload by Designer',
      distributionData: [
        { name: 'Maya Krishnan', value: 12, color: 'var(--dept-designs)' },
        { name: 'Arjun Sen', value: 9, color: '#c084fc' },
        { name: 'Neha Varma', value: 7, color: '#e879f9' },
      ],
      attentionItems: [
        { title: 'Aster Pods CAD revisions', subtitle: 'Acoustic core clash review needed', code: 'D-619', link: '/designs/des-1' },
        { title: 'Northline Villa Wardrobes', subtitle: 'Overdue client sign-off (2 days)', code: 'D-616', link: '/designs/des-2' },
      ],
      recentRecords: mockDesigns.map((d) => ({
        id: d.id,
        code: d.code,
        title: `${d.title} (${d.designer})`,
        status: d.status,
        date: d.dueDate,
        link: `/designs/${d.id}`,
      })),
    },
    quotations: {
      kpis: [
        { label: 'Total Value Quoted', value: '₹12.4L', note: '+₹3.1L approved' },
        { label: 'Active Quotations', value: '29', note: '11 need follow-up' },
        { label: 'Win Rate', value: '50.8%', note: '+3.8% conversion' },
        { label: 'Avg. Margin', value: '26.4%', note: 'Material & labour markup' },
      ],
      trendData: [
        { label: 'W1', value: 2.1 },
        { label: 'W2', value: 3.2 },
        { label: 'W3', value: 3.4 },
        { label: 'W4', value: 3.7 },
      ],
      distributionTitle: 'Pipeline by Approval Status',
      distributionData: [
        { name: 'Approved', value: 18, color: '#16a34a' },
        { name: 'Pending Review', value: 29, color: 'var(--dept-quotations)' },
        { name: 'Converted WO', value: 12, color: '#3b82f6' },
      ],
      attentionItems: [
        { title: 'Aster Interiors Q-2052', subtitle: 'Accepted! Generate manufacturing order', code: 'Q-2052', link: '/quotations/q-1' },
        { title: 'Acme Spaces Q-2049', subtitle: 'Customer follow-up call scheduled today', code: 'Q-2049', link: '/quotations/q-2' },
      ],
      recentRecords: mockQuotations.map((q) => ({
        id: q.id,
        code: q.code,
        title: `${q.title} (₹${(q.grandTotal / 100000).toFixed(2)}L)`,
        status: q.status,
        date: q.dueDate,
        link: `/quotations/${q.id}`,
      })),
    },
    production: {
      kpis: [
        { label: 'Active Work Orders', value: '42', note: '19 in shop fabrication' },
        { label: 'Delayed Jobs', value: '6', note: 'Material / fabric hold', alert: true },
        { label: 'On-Time Completion', value: '85.7%', note: 'Target: >90%' },
        { label: 'Installations This Week', value: '8', note: 'Field teams dispatched' },
      ],
      trendData: [
        { label: 'W1', value: 8 },
        { label: 'W2', value: 10 },
        { label: 'W3', value: 11 },
        { label: 'W4', value: 13 },
      ],
      distributionTitle: 'Shop Floor Stage Breakdown',
      distributionData: [
        { name: 'Cutting & CNC', value: 12, color: '#f59e0b' },
        { name: 'Assembly', value: 14, color: 'var(--dept-production)' },
        { name: 'Finishing', value: 9, color: '#d97706' },
        { name: 'Installation', value: 7, color: '#b45309' },
      ],
      attentionItems: [
        { title: 'Skyline Cafe WO-0831 Delayed', subtitle: 'Upholstery backrest fabric pending delivery', code: 'WO-0831', link: '/production/wo-3' },
        { title: 'Aster Interiors WO-0842 On-Site', subtitle: 'Glass fitting team dispatched', code: 'WO-0842', link: '/production/wo-1' },
      ],
      recentRecords: mockWorkOrders.map((w) => ({
        id: w.id,
        code: w.code,
        title: `${w.title} (${w.client})`,
        status: w.status,
        date: w.deliveryDate,
        link: `/production/${w.id}`,
      })),
    },
    feedback: {
      kpis: [
        { label: 'Feedback Responses', value: '86', note: '73% response rate' },
        { label: 'CSAT Average Score', value: '4.6 / 5', note: '+0.2 satisfaction' },
        { label: 'Overdue Feedback', value: '7', note: 'Pending survey closeout' },
        { label: 'NPS Score', value: '+68', note: 'Strong customer loyalty' },
      ],
      trendData: [
        { label: 'W1', value: 18 },
        { label: 'W2', value: 20 },
        { label: 'W3', value: 22 },
        { label: 'W4', value: 26 },
      ],
      distributionTitle: 'Sentiment & Review Breakdown',
      distributionData: [
        { name: 'Positive', value: 68, color: '#16a34a' },
        { name: 'Neutral', value: 14, color: '#eab308' },
        { name: 'Negative', value: 4, color: '#ef4444' },
      ],
      attentionItems: [
        { title: 'Skyline Cafe Follow-up', subtitle: 'Customer flagged 4-day delivery delay', code: 'FB-318', link: '/feedback/fb-2' },
        { title: 'Aster Interiors Commissioning', subtitle: 'Send survey to facility director', code: 'FB-310', link: '/feedback/fb-4' },
      ],
      recentRecords: mockFeedback.map((f) => ({
        id: f.id,
        code: f.code,
        title: `${f.category}: ${f.comments.slice(0, 45)}…`,
        status: f.status,
        date: f.date,
        link: `/feedback/${f.id}`,
      })),
    },
    labour: {
      kpis: [
        { label: 'Total Workers', value: '54', note: 'Full operational roster' },
        { label: 'Currently Assigned', value: '27', note: 'Active across jobs' },
        { label: 'Available Standby', value: '21', note: 'Ready for deployment' },
        { label: 'Shift Utilization', value: '50.0%', note: '+3.2% productivity' },
      ],
      trendData: [
        { label: 'W1', value: 46 },
        { label: 'W2', value: 49 },
        { label: 'W3', value: 52 },
        { label: 'W4', value: 54 },
      ],
      distributionTitle: 'Trade Allocation Distribution',
      distributionData: [
        { name: 'Carpentry', value: 22, color: 'var(--dept-labour)' },
        { name: 'Finishing / Paint', value: 12, color: '#34d399' },
        { name: 'Installation', value: 10, color: '#059669' },
        { name: 'Electrical & QC', value: 10, color: '#10b981' },
      ],
      attentionItems: [
        { title: 'Aster Pods Installation Team', subtitle: '4 carpenters requested for Friday night fit-out', code: 'LR-140', link: '/labour' },
        { title: 'Warehouse Packing Support', subtitle: '2 loaders needed for morning dispatch', code: 'LR-138', link: '/labour' },
      ],
      recentRecords: mockWorkers.map((w) => ({
        id: w.id,
        code: w.code,
        title: `${w.name} (${w.trade})`,
        status: w.status,
        date: w.efficiencyRating,
        link: `/labour`,
      })),
    },
  }

  const config = deptConfigs[departmentId]

  return (
    <PageContainer>
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        <span>Back to Overview</span>
      </Link>

      {/* Header */}
      <PageHeader
        title={`${meta.label} Management`}
        description={`Operational control, dispatch queues, and metrics for ${meta.label.toLowerCase()}.`}
        icon={
          <span className={`grid size-10 place-items-center rounded-lg ${meta.chip}`}>
            <Icon className="size-5" />
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/${departmentId}/list`)}
            >
              <ListFilter className="size-3.5" />
              <span>View Full List</span>
            </Button>
            <Button variant="primary" size="sm" onClick={onOpenCreate}>
              <Plus className="size-3.5" />
              <span>New {meta.noun}</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards Row (4 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {config.kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p
              className={`mt-2 font-display text-3xl font-extrabold tracking-tight tabular-nums ${
                kpi.alert ? 'text-danger' : 'text-foreground'
              }`}
            >
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.note}</p>
          </Card>
        ))}
      </div>

      {/* Two-Column Analytics Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Weekly Activity Trend</h3>
            <p className="text-xs text-muted-foreground">Volume progression across weekly buckets</p>
          </div>
          <DepartmentTrendChart departmentId={departmentId} data={config.trendData} />
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">{config.distributionTitle}</h3>
            <p className="text-xs text-muted-foreground">Current category and status allocation</p>
          </div>
          <DepartmentDistributionChart data={config.distributionData} />
        </Card>
      </div>

      {/* Two-Column Bottom: Needs Attention & Recent Records Table */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs Attention Panel */}
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Needs Attention</h3>
              <p className="text-xs text-muted-foreground">Priority actions and blocker alerts</p>
            </div>
            <AlertTriangle className="size-4 text-warning" />
          </div>

          <div className="divide-y divide-border mt-1">
            {config.attentionItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => navigate(item.link)}
                className="py-3 group cursor-pointer hover:bg-muted/40 -mx-5 px-5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">{item.code}</span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                </div>
                <p className="mt-1 text-xs font-semibold text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Records Table */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Records</h3>
              <p className="text-xs text-muted-foreground">Most recently updated entries in queue</p>
            </div>
            <Link
              to={`/${departmentId}/list`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Explore all records</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 font-semibold">Identifier</th>
                  <th className="py-2.5 font-semibold">Details / Entity</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {config.recentRecords.slice(0, 5).map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/30">
                    <td className="py-2.5 font-mono font-bold text-foreground">{rec.code}</td>
                    <td className="py-2.5 text-muted-foreground truncate max-w-xs">{rec.title}</td>
                    <td className="py-2.5">
                      <StatusBadge department={departmentId} status={rec.status} />
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(rec.link)}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
