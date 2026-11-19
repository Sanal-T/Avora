import { useState, useEffect } from 'react'
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
import { LoginPage } from './pages/auth/LoginPage'
import { NotFoundPage } from './pages/system/NotFoundPage'
import { ForbiddenPage } from './pages/system/ForbiddenPage'
import {
  departmentsByRange,
  type RangeKey,
} from './data/dashboard'
import {
  getDashboardOverview,
  type DashboardOverviewResponse,
} from './data/dashboardApi'
import { isDepartmentId, type DepartmentId } from './lib/departments'

function DepartmentRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/${id}`} replace />
}

export default function App() {
  const [rangeId, setRangeId] = useState<RangeKey>('30d')
  const [overview, setOverview] = useState<DashboardOverviewResponse & { loading?: boolean; error?: boolean }>({
    source: 'mock',
    departments: departmentsByRange['30d'],
    loading: true,
    error: false,
  })

  // Modals state for top-level trigger
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false)
  const [designModalOpen, setDesignModalOpen] = useState(false)
  const [workOrderModalOpen, setWorkOrderModalOpen] = useState(false)

  const refresh = () => {
    setOverview((current) => ({ ...current, loading: true, error: false }))
    getDashboardOverview({ rangeId })
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
  }

  useEffect(() => {
    refresh()
  }, [rangeId])

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth standalone screen */}
        <Route path="/login" element={<LoginPage />} />

        {/* Application Shell Routes */}
        <Route
          path="*"
          element={
            <AppShell rangeId={rangeId} onRangeChange={setRangeId}>
              <Routes>
                {/* Main Dashboard */}
                <Route
                  path="/"
                  element={
                    <MainDashboard
                      overview={overview}
                      rangeId={rangeId}
                      onRefresh={refresh}
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
                <Route path="/enquiries/:id" element={<EnquiryDetailPage />} />

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
                <Route path="/designs/:id" element={<DesignDetailPage />} />

                <Route
                  path="/quotations"
                  element={
                    <DepartmentDashboardPage
                      departmentId="quotations"
                      rangeId={rangeId}
                      onOpenCreate={() => window.location.href = '/quotations/builder'}
                    />
                  }
                />
                <Route path="/quotations/list" element={<QuotationsListPage />} />
                <Route path="/quotations/builder" element={<QuotationBuilderPage />} />
                <Route path="/quotations/:id" element={<QuotationDetailPage />} />

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
                <Route path="/production/calendar" element={<ProductionCalendarPage />} />
                <Route path="/production/schedule" element={<ProductionSchedulePage />} />
                <Route path="/production/:id" element={<WorkOrderDetailPage />} />

                <Route
                  path="/feedback"
                  element={
                    <DepartmentDashboardPage
                      departmentId="feedback"
                      rangeId={rangeId}
                      onOpenCreate={() => window.location.href = '/feedback/list'}
                    />
                  }
                />
                <Route path="/feedback/list" element={<FeedbackListPage />} />
                <Route path="/feedback/:id" element={<FeedbackDetailPage />} />

                <Route
                  path="/labour"
                  element={
                    <DepartmentDashboardPage
                      departmentId="labour"
                      rangeId={rangeId}
                      onOpenCreate={() => window.location.href = '/labour/list'}
                    />
                  }
                />
                <Route path="/labour/list" element={<LabourListPage />} />

                {/* System & Error Pages */}
                <Route path="/403" element={<ForbiddenPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AppShell>
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
