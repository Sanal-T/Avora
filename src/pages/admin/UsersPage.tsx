import { useState } from 'react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { Button } from '../../components/ui/Button'
import { Plus, Shield, User, KeyRound } from 'lucide-react'
import { DataTable, type ColumnDef } from '../../components/shared/DataTable'
import { Badge } from '../../components/ui/Badge'
import { toast } from '../../lib/toast'

type SystemUser = {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: 'active' | 'suspended'
  lastLogin: string
}

export function UsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([
    { id: 'u1', name: 'Shiva Kumar', email: 'shiva@avora.internal', role: 'Super Administrator', department: 'Executive', status: 'active', lastLogin: 'Today, 09:41' },
    { id: 'u2', name: 'Vikram Patel', email: 'vikram@avora.internal', role: 'Sales Lead', department: 'Commercial', status: 'active', lastLogin: 'Today, 08:30' },
    { id: 'u3', name: 'Maya Krishnan', email: 'maya@avora.internal', role: 'Design Lead', department: 'Engineering', status: 'active', lastLogin: 'Yesterday, 17:15' },
    { id: 'u4', name: 'Ramesh Gowda', email: 'ramesh@avora.internal', role: 'Production Supervisor', department: 'Manufacturing', status: 'active', lastLogin: 'Today, 07:15' },
    { id: 'u5', name: 'Priya Sundaram', email: 'priya@avora.internal', role: 'Operations Officer', department: 'Commercial', status: 'active', lastLogin: 'Nov 16, 14:20' },
  ])

  const columns: ColumnDef<SystemUser>[] = [
    {
      key: 'name',
      header: 'Staff Member',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-full bg-muted font-bold text-xs text-foreground">
            {row.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <p className="font-semibold text-foreground text-xs">{row.name}</p>
            <p className="text-[11px] text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      sortable: true,
      cell: (row) => (
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          {row.role}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      cell: (row) => <span className="text-xs text-muted-foreground">{row.department}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => (
        <Badge tone={row.status === 'active' ? 'success' : 'danger'}>
          {row.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Active',
      sortable: true,
      cell: (row) => <span className="text-xs text-muted-foreground font-mono">{row.lastLogin}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info('User Settings', `Managing credentials for ${row.name}`)}
        >
          Edit
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Users & Access Management"
        description="Configure staff accounts, role assignments, department scoping, and security."
        actions={
          <Button variant="primary" size="sm" onClick={() => toast.info('Invite User', 'Opening staff invitation modal')}>
            <Plus className="size-3.5" />
            <span>Invite Staff User</span>
          </Button>
        }
      />

      <DataTable
        data={users}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchPlaceholder="Search staff by name or email…"
      />
    </PageContainer>
  )
}
