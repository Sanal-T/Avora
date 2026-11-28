import { lazy, Suspense, useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { MainDashboard } from './pages/dashboard/MainDashboard'
import { InProgressPage } from './pages/dashboard/InProgressPage'
import { DepartmentDashboardPage } from './pages/departments/DepartmentDashboardPage'
import { EnquiryFormModal } from './pages/departments/enquiries/EnquiryFormModal'
import { DesignFormModal } from './pages/departments/designs/DesignFormModal'
import { WorkOrderFormModal } from './pages/departments/production/WorkOrderFormModal'
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

const EnquiriesListPage = lazy(() => import('./pages/departments/enquiries/EnquiriesListPage').then((m) => ({ default: m.EnquiriesListPage })))
const DesignsListPage = lazy(() => import('./pages/departments/designs/DesignsListPage').then((m) => ({ default: m.DesignsListPage })))
const QuotationsListPage = lazy(() => import('./pages/departments/quotations/QuotationsListPage').then((m) => ({ default: m.QuotationsListPage })))
const ProductionListPage = lazy(() => import('./pages/departments/production/ProductionListPage').then((m) => ({ default: m.ProductionListPage })))
const FeedbackListPage = lazy(() => import('./pages/departments/feedback/FeedbackListPage').then((m) => ({ default: m.FeedbackListPage })))
const FeedbackDetailPage = lazy(() => import('./pages/departments/feedback/FeedbackDetailPage').then((m) => ({ default: m.FeedbackDetailPage })))
const LabourListPage = lazy(() => import('./pages/departments/labour/LabourListPage').then((m) => ({ default: m.LabourListPage })))
const ProjectsListPage = lazy(() => import('./pages/departments/projects/ProjectsListPage').then((m) => ({ default: m.ProjectsListPage })))
const ProjectDetailPage = lazy(() => import('./pages/departments/projects/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })))
const AccountsListPage = lazy(() => import('./pages/departments/accounts/AccountsListPage').then((m) => ({ default: m.AccountsListPage })))
const AccountsDetailPage = lazy(() => import('./pages/departments/accounts/AccountsDetailPage').then((m) => ({ default: m.AccountsDetailPage })))
const CommunicationsListPage = lazy(() => import('./pages/departments/communications/CommunicationsListPage').then((m) => ({ default: m.CommunicationsListPage })))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SyncOperationsPage = lazy(() => import('./pages/sync/SyncOperationsPage').then((m) => ({ default: m.SyncOperationsPage })))
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))

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
      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading view…</div>}>
        <Routes>
          {/* Main Dashboard */}
          <Route
            path="/"
            element={
              <MainDashboard
                overview={overview}
                rangeId={rangeId}
                onRefresh={(force = true) => refresh(force)}
              />
            }
          />
          <Route path="/in-progress" element={<InProgressPage rangeId={rangeId} />} />

          {/* Legacy route compatibility */}
          <Route path="/departments/:id" element={<DepartmentRedirect />} />

          {/* Department Dashboards */}
          <Route
            path="/enquiries"
            element={
              <DepartmentDashboardPage
                key="enquiries"
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
                key="designs"
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
                key="quotations"
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
                key="production"
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
                key="feedback"
                departmentId="feedback"
                rangeId={rangeId}
                onOpenCreate={() => navigate('/feedback/list')}
              />
            }
          />
          <Route path="/feedback/list" element={<FeedbackListPage />} />
          <Route path="/feedback/:id" element={<FeedbackDetailPage />} />

          <Route
            path="/labour"
            element={
              <DepartmentDashboardPage
                key="labour"
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
          <Route path="/sync" element={<SyncOperationsPage />} />

          {/* System & Error Pages */}
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
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
    refresh(false)
  }, [refresh])

  useEffect(() => {
    const onLoginSuccess = () => {
      refresh(true)
    }
    window.addEventListener('avora:login-success', onLoginSuccess)
    return () => window.removeEventListener('avora:login-success', onLoginSuccess)
  }, [refresh])

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading…</div>}>
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
      </Suspense>

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
