import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { PageContainer, PageHeader } from '../../components/shared/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { reportsApi } from '../../lib/api'
import { getCachedData, setCachedData } from '../../lib/cache'

export function ReportsPage() {
  const [summary, setSummary] = useState<any>(() => getCachedData('reports:summary'))
  const [loading, setLoading] = useState(() => !getCachedData('reports:summary'))

  useEffect(() => {
    reportsApi
      .getSummary()
      .then((res) => {
        setCachedData('reports:summary', res)
        setSummary(res)
      })
      .finally(() => setLoading(false))
  }, [])

  const downloadCsv = (endpoint: string) => {
    window.open(`/api/reports/${endpoint}/export`, '_blank')
  }

  return (
    <PageContainer>
      <PageHeader
        title="Reports & Analytics"
        description="Live database analytics and CSV exports across all business stages."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {['enquiries', 'quotations', 'projects', 'production', 'accounts'].map((mod) => (
          <Card key={mod} className="p-4 flex flex-col justify-between gap-3">
            <div className="font-medium text-sm capitalize">{mod} Report</div>
            <Button variant="outline" size="sm" onClick={() => downloadCsv(mod)}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading live summary...</Card>
      ) : summary ? (
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Live Summary Snapshot</h3>
          <pre className="text-xs bg-muted/40 p-3 rounded overflow-x-auto">{JSON.stringify(summary, null, 2)}</pre>
        </Card>
      ) : null}
    </PageContainer>
  )
}
