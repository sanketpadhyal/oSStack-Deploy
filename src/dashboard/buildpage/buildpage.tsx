import { useEffect, useState } from 'react'
import { ArrowRight, CircleCheck, Clock3, ExternalLink, Hammer } from 'lucide-react'
import logo from '../../assets/logo.png'
import BottomBar, { type DashboardTab } from '../bottombar/bottombar.js'
import { apiBaseUrl } from '../../lib/api.js'
import '../dashboard.css'

type DashboardUser = {
  name: string
  email: string | null
  gmail?: string | null
  profilePhoto: string | null
}

type DeploymentSummary = {
  id: string
  projectName: string
  status: string
  detail: string
  slug: string | null
  repo: string | null
  branch: string | null
  liveUrl: string | null
  time: string
}

const dashboardCacheKey = 'osstack.dashboard.cache'
const buildsCacheKey = 'osstack.builds.cache'

function BuildPage() {
  const [deployments, setDeployments] = useState<DeploymentSummary[]>(() => getCachedBuilds())
  const [user, setUser] = useState<DashboardUser | null>(() => getCachedUser())
  const [loading, setLoading] = useState(() => getCachedBuilds().length === 0)

  useEffect(() => {
    let isMounted = true

    const loadBuilds = async () => {
      try {
        const [deploymentsResponse, dashboardResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/deployments`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/dashboard`, { credentials: 'include' }),
        ])

        if (!deploymentsResponse.ok) {
          throw new Error('Could not load builds.')
        }

        const deploymentsData = (await deploymentsResponse.json()) as { deployments: DeploymentSummary[] }

        if (isMounted) {
          setDeployments(deploymentsData.deployments)
          setCachedBuilds(deploymentsData.deployments)
          setLoading(false)
        }

        if (dashboardResponse.ok) {
          const dashboardData = (await dashboardResponse.json()) as { user: DashboardUser }
          if (isMounted) setUser(dashboardData.user)
        }
      } catch {
        if (isMounted) setLoading(false)
      }
    }

    loadBuilds()
    const intervalId = window.setInterval(loadBuilds, 5000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <div className="dashboard-page">
      <BottomBar activeTab="builds" onTabChange={navigateDashboardTab} user={user} />
      <section className="builds-page">
        <header className="builds-page__header">
          <div className="dashboard-detail-hero__left">
            <a
              className="mobile-brand-logo"
              href="/dashboard"
              aria-label="oSStack dashboard"
              onClick={(e) => {
                e.preventDefault()
                navigateDashboardTab('home')
              }}
            >
              <img src={logo} alt="oSStack" />
            </a>
            <h1>Deployment activity</h1>
          </div>
          <Hammer size={28} strokeWidth={2.1} />
        </header>

        {/* Skeleton state — only when no cache + first load */}
        {loading && (
          <div className="builds-list builds-list--skeleton">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="builds-skeleton-row" key={i}>
                <span className="sk sk--circle" />
                <span className="sk-group">
                  <span className="sk sk--name" style={{ width: `${120 + (i % 3) * 40}px` }} />
                  <span className="sk sk--sub" style={{ width: `${80 + (i % 2) * 30}px` }} />
                </span>
                <span className="sk sk--badge" />
                <span className="sk sk--icon" />
              </div>
            ))}
          </div>
        )}

        {!loading && !deployments.length && (
          <div className="builds-empty">
            <Clock3 size={26} strokeWidth={2.1} />
            <strong>No deployments yet</strong>
            <span>Start one from Add New, then the live build will appear here.</span>
          </div>
        )}

        {!loading && deployments.length > 0 && (
          <div className="builds-list">
            {deployments.map((deployment) => (
              <button type="button" key={deployment.id} onClick={() => navigateToBuild(deployment.id)}>
                <span className={`builds-status builds-status--${deployment.status.toLowerCase()}`}>
                  {deployment.status === 'COMPLETED' ? <CircleCheck size={16} /> : <Clock3 size={16} />}
                </span>
                <span>
                  <strong>{deployment.projectName}</strong>
                  <small>{deployment.repo ?? deployment.detail}</small>
                </span>
                <em>{deployment.status}</em>
                {deployment.liveUrl ? <ExternalLink size={17} strokeWidth={2.1} /> : <ArrowRight size={17} strokeWidth={2.1} />}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function navigateToBuild(deploymentId: string) {
  window.history.pushState({}, '', `/dashboard/builds/${deploymentId}`)
  window.dispatchEvent(new Event('osstack:navigate'))
}

function navigateDashboardTab(tab: DashboardTab) {
  const routes: Record<DashboardTab, string> = {
    home: '/dashboard',
    projects: '/dashboard/projects',
    builds: '/dashboard/builds',
    extensions: '/dashboard/extensions',
  }
  window.history.pushState({}, '', routes[tab])
  window.dispatchEvent(new Event('osstack:navigate'))
}

function getCachedBuilds(): DeploymentSummary[] {
  try {
    const raw = window.localStorage.getItem(buildsCacheKey)
    return raw ? (JSON.parse(raw) as DeploymentSummary[]) : []
  } catch {
    return []
  }
}

function setCachedBuilds(data: DeploymentSummary[]) {
  try {
    window.localStorage.setItem(buildsCacheKey, JSON.stringify(data))
  } catch {}
}

function getCachedUser(): DashboardUser | null {
  try {
    const raw = window.localStorage.getItem(dashboardCacheKey)
    return raw ? (JSON.parse(raw) as { user?: DashboardUser }).user ?? null : null
  } catch {
    return null
  }
}

export default BuildPage
