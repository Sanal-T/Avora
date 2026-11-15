import { Link } from 'react-router-dom'
import { ArrowLeft, FileQuestion } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <FileQuestion className="size-7" />
      </div>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground">
        404 – Page Not Found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The record, module or destination you requested does not exist or has been relocated.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" size="md">
            <ArrowLeft className="size-4 mr-1.5" />
            <span>Return to Workspace Overview</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
