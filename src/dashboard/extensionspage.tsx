import { useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, FolderGit2, PlugZap, RefreshCw } from 'lucide-react'
import logo from '../assets/logo.png'
import BottomBar, { type DashboardTab } from './bottombar/bottombar.js'
import { apiBaseUrl } from '../lib/api.js'
import './dashboard.css'

type DashboardUser = {
  name: string
  email: string | null
  gmail?: string | null
  profilePhoto: string | null
}

type GitHubRepository = {
  id: number
  fullName: string
  private: boolean
  htmlUrl: string
  defaultBranch: string
  updatedAt: string
}

const dashboardCacheKey = 'osstack.dashboard.cache'

function ExtensionsPage() {
  const [user, setUser] = useState<DashboardUser | null>(() => getCachedUser())
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState('Checking extensions...')

  useEffect(() => {
    let isMounted = true

    const loadExtensions = async () => {
      try {
        const [githubResponse, dashboardResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/github/repositories`, { credentials: 'include' }),
          fetch(`${apiBaseUrl}/api/dashboard`, { credentials: 'include' }),
        ])

        if (dashboardResponse.ok) {
          const dashboard = (await dashboardResponse.json()) as { user?: DashboardUser }
          if (isMounted && dashboard.user) {
            setUser(dashboard.user)
          }
        }

        if (githubResponse.status === 429) {
          if (isMounted) {
            setStatus('GitHub is connected. Refresh is rate limited for a moment.')
            setIsConnected(true)
          }
          return
        }

        if (!githubResponse.ok) {
          throw new Error('Could not check GitHub.')
        }

        const data = (await githubResponse.json()) as { connected: boolean; repositories: GitHubRepository[] }

        if (isMounted) {
          setIsConnected(data.connected)
          setRepositories(data.repositories)
          setStatus('')
        }
      } catch (error) {
        if (isMounted) {
          setStatus(error instanceof Error ? error.message : 'Could not check extensions.')
        }
      }
    }

    loadExtensions()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="dashboard-page">
      <BottomBar activeTab="extensions" onTabChange={navigateDashboardTab} user={user} />
      <section className="dashboard-detail-page">
        <header className="dashboard-detail-hero">
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
            <h1>Connected services</h1>
          </div>
          <PlugZap size={30} strokeWidth={2.1} />
        </header>

        <div className="extensions-grid">
          <article className="extension-card">
            <div className="extension-card__icon">
              <FolderGit2 size={28} />
            </div>
            <div>
              <strong>GitHub</strong>
              <small>{isConnected ? `${repositories.length} public repositories available` : 'Not connected for this session'}</small>
            </div>
            <span className={`extension-card__status${isConnected ? ' is-connected' : ''}`}>
              {isConnected ? <CheckCircle2 size={17} /> : <RefreshCw size={17} />}
              {isConnected ? 'Connected' : 'Authorize'}
            </span>
          </article>

          <article className="extension-card extension-card--quiet">
            <div className="extension-card__icon">
              <PlugZap size={27} />
            </div>
            <div>
              <strong>Storage</strong>
              <small>Supabase project storage is used for deployed static files.</small>
            </div>
            <span className="extension-card__status is-connected">
              <CheckCircle2 size={17} />
              Active
            </span>
          </article>
        </div>

        {status && <p className="builds-state">{status}</p>}

        {repositories.length > 0 && (
          <section className="extension-repos" aria-label="GitHub repositories">
            <h2>GitHub repositories</h2>
            <div>
              {repositories.slice(0, 12).map((repository) => (
                <a key={repository.id} href={repository.htmlUrl} target="_blank" rel="noreferrer">
                  <span>{repository.fullName}</span>
                  <small>{repository.defaultBranch}</small>
                  <ExternalLink size={15} />
                </a>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  )
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

function getCachedUser() {
  try {
    const cachedValue = window.localStorage.getItem(dashboardCacheKey)
    const dashboard = cachedValue ? (JSON.parse(cachedValue) as { user?: DashboardUser }) : null

    return dashboard?.user ?? null
  } catch {
    return null
  }
}

export default ExtensionsPage
