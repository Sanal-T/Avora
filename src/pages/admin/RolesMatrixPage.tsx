import { useState } from 'react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Save, Check, Shield } from 'lucide-react'
import { toast } from '../../lib/toast'

type Role = 'Administrator' | 'Sales Manager' | 'Designer' | 'Production Supervisor' | 'Labour Coordinator'

type PermissionKey =
  | 'view_dashboard'
  | 'manage_enquiries'
  | 'create_quotation'
  | 'approve_quotation'
  | 'manage_designs'
  | 'manage_work_orders'
  | 'allocate_workers'
  | 'view_reports'
  | 'system_admin'

const permissions: { key: PermissionKey; label: string; group: string }[] = [
  { key: 'view_dashboard', label: 'View Operational Dashboards', group: 'General' },
  { key: 'manage_enquiries', label: 'Create & Qualify Enquiries', group: 'Commercial' },
  { key: 'create_quotation', label: 'Draft Line Item Quotations', group: 'Commercial' },
  { key: 'approve_quotation', label: 'Approve & Discount Quotations', group: 'Commercial' },
  { key: 'manage_designs', label: 'Upload & Finalize CAD Designs', group: 'Engineering' },
  { key: 'manage_work_orders', label: 'Dispatch & Modify Work Orders', group: 'Manufacturing' },
  { key: 'allocate_workers', label: 'Assign & Release Factory Labour', group: 'Workforce' },
  { key: 'view_reports', label: 'Access Executive Financial Reports', group: 'Intelligence' },
  { key: 'system_admin', label: 'Modify Roles, Users & System Settings', group: 'System' },
]

export function RolesMatrixPage() {
  const [matrix, setMatrix] = useState<Record<Role, Record<PermissionKey, boolean>>>({
    Administrator: {
      view_dashboard: true,
      manage_enquiries: true,
      create_quotation: true,
      approve_quotation: true,
      manage_designs: true,
      manage_work_orders: true,
      allocate_workers: true,
      view_reports: true,
      system_admin: true,
    },
    'Sales Manager': {
      view_dashboard: true,
      manage_enquiries: true,
      create_quotation: true,
      approve_quotation: true,
      manage_designs: false,
      manage_work_orders: false,
      allocate_workers: false,
      view_reports: true,
      system_admin: false,
    },
    Designer: {
      view_dashboard: true,
      manage_enquiries: false,
      create_quotation: false,
      approve_quotation: false,
      manage_designs: true,
      manage_work_orders: false,
      allocate_workers: false,
      view_reports: false,
      system_admin: false,
    },
    'Production Supervisor': {
      view_dashboard: true,
      manage_enquiries: false,
      create_quotation: false,
      approve_quotation: false,
      manage_designs: false,
      manage_work_orders: true,
      allocate_workers: true,
      view_reports: false,
      system_admin: false,
    },
    'Labour Coordinator': {
      view_dashboard: true,
      manage_enquiries: false,
      create_quotation: false,
      approve_quotation: false,
      manage_designs: false,
      manage_work_orders: false,
      allocate_workers: true,
      view_reports: false,
      system_admin: false,
    },
  })

  const roles: Role[] = ['Administrator', 'Sales Manager', 'Designer', 'Production Supervisor', 'Labour Coordinator']

  const toggle = (role: Role, key: PermissionKey) => {
    if (role === 'Administrator' && key === 'system_admin') {
      toast.warning('Cannot remove system admin permission from Administrator')
      return
    }
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role][key],
      },
    }))
  }

  return (
    <PageContainer>
      <PageHeader
        title="Role & Permission Matrix"
        description="Fine-grained granular RBAC access controls per module, action, and supervisory tier."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => toast.success('RBAC Matrix Saved', 'Access control rules successfully synchronized.')}
          >
            <Save className="size-3.5" />
            <span>Save Changes</span>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                <th className="p-3 font-semibold w-72">Permission Capability</th>
                <th className="p-3 font-semibold text-muted-foreground w-28">Group</th>
                {roles.map((r) => (
                  <th key={r} className="p-3 font-semibold text-center text-foreground">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {permissions.map((p) => (
                <tr key={p.key} className="hover:bg-muted/30">
                  <td className="p-3 font-medium text-foreground">{p.label}</td>
                  <td className="p-3 text-muted-foreground text-[11px]">{p.group}</td>
                  {roles.map((r) => {
                    const granted = matrix[r][p.key]
                    return (
                      <td key={r} className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(r, p.key)}
                          className={`inline-grid size-6 place-items-center rounded-md border transition-colors cursor-pointer ${
                            granted
                              ? 'border-primary bg-primary text-primary-foreground font-bold shadow-xs'
                              : 'border-border bg-muted text-transparent hover:border-muted-foreground'
                          }`}
                          aria-label={`Toggle ${p.label} for ${r}`}
                        >
                          <Check className="size-3.5 stroke-[3]" />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  )
}
