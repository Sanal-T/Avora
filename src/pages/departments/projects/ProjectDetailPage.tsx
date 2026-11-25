import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import { PageContainer, PageHeader } from '../../../components/shared/PageHeader'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { projectApi, type Project, type ProjectTimelineEvent } from '../../../lib/api'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [timeline, setTimeline] = useState<ProjectTimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([projectApi.get(id), projectApi.getTimeline(id)])
      .then(([p, tl]) => {
        setProject(p)
        setTimeline(tl)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <PageContainer><div className="p-8 text-sm text-muted-foreground">Loading project...</div></PageContainer>
  if (!project) return <PageContainer><div className="p-8 text-sm text-muted-foreground">Project not found.</div></PageContainer>

  return (
    <PageContainer>
      <PageHeader
        title={`${project.project_number} — ${project.name}`}
        description={`Customer: ${project.customer_name || 'N/A'} • Value: ₹${Number(project.project_value || 0).toLocaleString()}`}
        actions={
          <Link to="/projects/list">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Projects
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-sm">Project Details</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={project.status} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><span>{project.priority}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Enquiry</span><span>{project.enquiry_number || '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quotation</span><span>{project.quotation_number || '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Approval Date</span><span>{project.approval_date || '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Site</span><span>{project.site_location || '-'}</span></div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Unified Project Timeline
          </h3>
          {timeline.length === 0 ? (
            <div className="text-sm text-muted-foreground">No timeline events recorded yet.</div>
          ) : (
            <div className="space-y-4">
              {timeline.map((ev, idx) => (
                <div key={idx} className="border-l-2 border-primary/30 pl-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{ev.title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(ev.timestamp).toLocaleString()}</span>
                  </div>
                  {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
                  {ev.actor && <p className="text-xs text-muted-foreground mt-0.5">By: {ev.actor}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}
