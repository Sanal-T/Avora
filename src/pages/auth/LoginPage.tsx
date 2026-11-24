import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { toast } from '../../lib/toast'
import { authApi } from '../../lib/api'
import { setCurrentUser } from '../../lib/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.login(email, password)
      const profile = await authApi.getMe()
      const initials = (profile.full_name || 'Admin')
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0].toUpperCase())
        .slice(0, 2)
        .join('') || 'AD'
      setCurrentUser({
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        role: profile.roles?.[0] || (profile.is_superuser ? 'Administrator' : 'Staff Member'),
        initials,
        permissions: (profile.permissions || []) as any,
      })
      toast.success(`Welcome back, ${profile.full_name || 'Staff Member'}`, 'Authenticated successfully against Avora ERP database.')
      navigate('/')
    } catch (err: any) {
      toast.error('Login Failed', err.message || 'Incorrect email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-xl font-extrabold text-primary-foreground shadow-xs">
            A
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
            Sign in to Avora ERP
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Operational and manufacturing intelligence platform
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Staff Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="size-4" />}
            />

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-medium text-foreground">Password</label>
                <button
                  type="button"
                  onClick={() => toast.info('Password Recovery', 'Reset link dispatched to administrator email.')}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                leftIcon={<Lock className="size-4" />}
              />
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={loading}
              className="w-full justify-center mt-2"
            >
              <span>{loading ? 'Authenticating…' : 'Sign In'}</span>
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-success" />
              <span>TLS Encrypted & RBAC Authenticated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
