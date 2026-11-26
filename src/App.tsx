import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { MainDashboard } from './pages/dashboard/MainDashboard'
import { DepartmentDashboardPage } from './pages/departments/DepartmentDashboardPage'
import { EnquiriesListPage } from './pages/departments/enquiries/EnquiriesListPage'
import { EnquiryDetailPage } from './pages/departments/enquiries/EnquiryDetailPage'
import { EnquiryFormModal } from './pages/departments/enquiries/EnquiryFormModal'
import { DesignsListPage } from './pages/departments/designs/DesignsListPage'
import { DesignDetailPage } from './pages/departments/designs/DesignDetailPage'
import { DesignFormModal } from './pages/departments/designs/DesignFormModal'
import { QuotationsListPage } from './pages/departments/quotations/QuotationsListPage'
import { QuotationDetailPage } from './pages/departments/quotations/QuotationDetailPage'
import { QuotationBuilderPage } from './pages/departments/quotations/QuotationBuilderPage'
import { ProductionListPage } from './pages/departments/production/ProductionListPage'
import { WorkOrderDetailPage } from './pages/departments/production/WorkOrderDetailPage'
import { ProductionSchedulePage } from './pages/departments/production/ProductionSchedulePage'
import { ProductionCalendarPage } from './pages/departments/production/ProductionCalendarPage'
import { WorkOrderFormModal } from './pages/departments/production/WorkOrderFormModal'
import { FeedbackListPage } from './pages/departments/feedback/FeedbackListPage'
import { FeedbackDetailPage } from './pages/departments/feedback/FeedbackDetailPage'
import { LabourListPage } from './pages/departments/labour/LabourListPage'
import { ProjectsListPage } from './pages/departments/projects/ProjectsListPage'
import { ProjectDetailPage } from './pages/departments/projects/ProjectDetailPage'
import { AccountsListPage } from './pages/departments/accounts/AccountsListPage'
import { AccountsDetailPage } from './pages/departments/accounts/AccountsDetailPage'
import { CommunicationsListPage } from './pages/departments/communications/CommunicationsListPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { LoginPage } from './pages/auth/LoginPage'
import { NotFoundPage } from './pages/system/NotFoundPage'
import { ForbiddenPage } from './pages/system/ForbiddenPage'
import {
  departmentsByRange,
  type RangeKey,
} from './data/dashboard'
import {
  getCachedOverview,
  getDashboardOverview,
  type DashboardOverviewResponse,
} from './data/dashboardApi'
import { isDepartmentId, type DepartmentId } from './lib/departments'

function DepartmentRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/${id}`} replace />
}

function AppShellInner({
  rangeId,
  setRangeId,
  overview,
  refresh,
  setEnquiryModalOpen,
  setDesignModalOpen,
  setWorkOrderModalOpen,
}: {
  rangeId: RangeKey
  setRangeId: (r: RangeKey) => void
  overview: DashboardOverviewResponse & { loading?: boolean; error?: boolean }
  refresh: (force?: boolean) => void
  setEnquiryModalOpen: (open: boolean) => void
  setDesignModalOpen: (open: boolean) => void
  setWorkOrderModalOpen: (open: boolean) => void
}) {
  const navigate = useNavigate()

  return (
    <AppShell
      rangeId={rangeId}
      onRangeChange={setRangeId}
      onRefresh={() => refresh(true)}
      onOpenCreateModal={(type) => {
        if (type === 'enquiry') setEnquiryModalOpen(true)
        else if (type === 'design') setDesignModalOpen(true)
        else if (type === 'workOrder') setWorkOrderModalOpen(true)
      }}
    >
      <Routes>
        {/* Main Dashboard */}
        <Route
          path="/"
          element={
            <MainDashboard
              overview={overview}
              rangeId={rangeId}
              onRefresh={() => refresh(true)}
            />
          }
        />

        {/* Legacy route compatibility */}
        <Route path="/departments/:id" element={<DepartmentRedirect />} />

        {/* Department Dashboards */}
        <Route
          path="/enquiries"
          element={
            <DepartmentDashboardPage
              departmentId="enquiries"
              rangeId={rangeId}
              onOpenCreate={() => setEnquiryModalOpen(true)}
            />
          }
        />
        <Route path="/enquiries/list" element={<EnquiriesListPage />} />

        <Route
          path="/designs"
          element={
            <DepartmentDashboardPage
              departmentId="designs"
              rangeId={rangeId}
              onOpenCreate={() => setDesignModalOpen(true)}
            />
          }
        />
        <Route path="/designs/list" element={<DesignsListPage />} />

        <Route
          path="/quotations"
          element={
            <DepartmentDashboardPage
              departmentId="quotations"
              rangeId={rangeId}
              onOpenCreate={() => navigate('/quotations/builder')}
            />
          }
        />
        <Route path="/quotations/list" element={<QuotationsListPage />} />

        <Route
          path="/production"
          element={
            <DepartmentDashboardPage
              departmentId="production"
              rangeId={rangeId}
              onOpenCreate={() => setWorkOrderModalOpen(true)}
            />
          }
        />
        <Route path="/production/list" element={<ProductionListPage />} />

        <Route
          path="/feedback"
          element={
            <DepartmentDashboardPage
              departmentId="feedback"
              rangeId={rangeId}
              onOpenCreate={() => navigate('/feedback/list')}
            />
          }
        />
        <Route path="/feedback/list" element={<FeedbackListPage />} />

        <Route
          path="/labour"
          element={
            <DepartmentDashboardPage
              departmentId="labour"
              rangeId={rangeId}
              onOpenCreate={() => navigate('/labour/list')}
            />
          }
        />
        <Route path="/labour/list" element={<LabourListPage />} />

        {/* Projects, Accounts, Communications & Reports */}
        <Route path="/projects" element={<ProjectsListPage />} />
        <Route path="/projects/list" element={<ProjectsListPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />

        <Route path="/accounts" element={<AccountsListPage />} />
        <Route path="/accounts/list" element={<AccountsListPage />} />
        <Route path="/accounts/:id" element={<AccountsDetailPage />} />

        <Route path="/communications" element={<CommunicationsListPage />} />
        <Route path="/communications/list" element={<CommunicationsListPage />} />

        <Route path="/reports" element={<ReportsPage />} />

        {/* System & Error Pages */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  const [rangeId, setRangeId] = useState<RangeKey>('30d')
  const [overview, setOverview] = useState<DashboardOverviewResponse & { loading?: boolean; error?: boolean }>({
    source: 'database',
    departments: departmentsByRange['30d'],
    loading: true,
    error: false,
  })

  // Modals state for top-level trigger
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false)
  const [designModalOpen, setDesignModalOpen] = useState(false)
  const [workOrderModalOpen, setWorkOrderModalOpen] = useState(false)

  const refresh = useCallback((force = false) => {
    // If cached data is already available and not forcing a manual refresh, show it instantly
    const cached = getCachedOverview(rangeId)
    if (cached && !force) {
      setOverview({ ...cached, loading: false, error: false })
      return
    }

    setOverview((current) => ({ ...current, loading: true, error: false }))
    getDashboardOverview({ rangeId, forceRefresh: force })
      .then((data) => {
        setOverview({
          ...data,
          loading: false,
          error: false,
        })
      })
      .catch(() => {
        setOverview((current) => ({
          ...current,
          loading: false,
          error: true,
        }))
      })
  }, [rangeId])

  useEffect(() => {
    refresh(true)
  }, [refresh])

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth standalone screen */}
        <Route path="/login" element={<LoginPage />} />

        {/* Application Shell Routes */}
        <Route
          path="*"
          element={
            <AppShellInner
              rangeId={rangeId}
              setRangeId={setRangeId}
              overview={overview}
              refresh={refresh}
              setEnquiryModalOpen={setEnquiryModalOpen}
              setDesignModalOpen={setDesignModalOpen}
              setWorkOrderModalOpen={setWorkOrderModalOpen}
            />
          }
        />
      </Routes>

      {/* Global Modals */}
      <EnquiryFormModal
        open={enquiryModalOpen}
        onClose={() => setEnquiryModalOpen(false)}
        onCreateSuccess={() => refresh()}
      />
      <DesignFormModal
        open={designModalOpen}
        onClose={() => setDesignModalOpen(false)}
        onCreateSuccess={() => refresh()}
      />
      <WorkOrderFormModal
        open={workOrderModalOpen}
        onClose={() => setWorkOrderModalOpen(false)}
        onCreateSuccess={() => refresh()}
      />
    </BrowserRouter>
  )
}
