import { useState } from 'react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { DataTable, type ColumnDef } from '../../components/shared/DataTable'
import { Badge } from '../../components/ui/Badge'
import { ChevronRight, ChevronDown, History, ShieldAlert } from 'lucide-react'
import { mockAuditLogs, type MockAuditLog } from '../../data/mockData'

export function AuditLogPage() {
  const [data] = useState<MockAuditLog[]>(mockAuditLogs)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const columns: ColumnDef<MockAuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.timestamp}</span>,
    },
    {
      key: 'userName',
      header: 'Staff User',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-semibold text-xs text-foreground">{row.userName}</p>
          <p className="text-[11px] text-muted-foreground">{row.userEmail}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Event Action',
      sortable: true,
      cell: (row) => (
        <Badge tone={row.action.includes('UPDATE') ? 'warning' : row.action.includes('COMPLETE') ? 'success' : 'info'}>
          {row.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Target Entity',
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {row.entity} · {row.entityId}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Audit Summary',
      cell: (row) => (
        <p className="truncate max-w-sm text-xs text-muted-foreground" title={row.details}>
          {row.details}
        </p>
      ),
    },
    {
      key: 'ipAddress',
      header: 'Origin IP',
      cell: (row) => <span className="font-mono text-[11px] text-muted-foreground">{row.ipAddress}</span>,
    },
    {
      key: 'expand',
      header: '',
      align: 'right',
      cell: (row) => (
        <button
          type="button"
          onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label="Expand audit details"
        >
          {expandedId === row.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Security & System Audit Log"
        description="Immutable chronological trail of user modifications, state transitions, security events and API actions."
      />

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchPlaceholder="Search audit events by user, entity or action…"
        exportFilename="avora_system_audit_log.csv"
      />
    </PageContainer>
  )
}
