import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, FolderGit2, GitBranch, Search } from 'lucide-react'
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

type DashboardProject = {
  id: string
  name: string
  slug: string
  repo: string | null
  branch: string
  status: string
  liveUrl: string | null
  storageBytes: number
  buildMinutes: number
  updatedAt: string
}

type DashboardData = {
  user: DashboardUser
  projects: DashboardProject[]
}

const dashboardCacheKey = 'osstack.dashboard.cache'

function getInitialSearchQuery(): string {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('search') ?? params.get('q') ?? ''
  } catch {
    return ''
  }
}

function ProjectsPage() {
  const [projects, setProjects] = useState<DashboardProject[]>(() => getCachedDashboard()?.projects ?? [])
  const [user, setUser] = useState<DashboardUser | null>(() => getCachedUser())
  const [query, setQuery] = useState(() => getInitialSearchQuery())
  const [loading, setLoading] = useState(() => (getCachedDashboard()?.projects ?? []).length === 0)

  useEffect(() => {
    const syncSearchQuery = () => {
      setQuery(getInitialSearchQuery())
    }

    window.addEventListener('popstate', syncSearchQuery)
    window.addEventListener('osstack:navigate', syncSearchQuery)

    return () => {
      window.removeEventListener('popstate', syncSearchQuery)
      window.removeEventListener('osstack:navigate', syncSearchQuery)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadProjects = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/dashboard`, { credentials: 'include' })

        if (!response.ok) throw new Error('Could not load projects.')

        const data = (await response.json()) as DashboardData

        if (isMounted) {
          setProjects(data.projects)
          setUser(data.user)
          setCachedDashboard(data)
          setLoading(false)
        }
      } catch {
        if (isMounted) setLoading(false)
      }
    }

    loadProjects()

    return () => { isMounted = false }
  }, [])

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) =>
      [p.name, p.slug, p.repo, p.branch, p.status].some((v) => v?.toLowerCase().includes(q)),
    )
  }, [projects, query])

  return (
    <div className="dashboard-page">
      <BottomBar activeTab="projects" onTabChange={navigateDashboardTab} user={user} />
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
            <h1>Your deployments</h1>
          </div>
          <label className="dashboard-detail-search">
            <Search size={19} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" />
          </label>
        </header>

        {/* Skeleton — only when first load with no cache */}
        {loading && (
          <div className="projects-table projects-table--skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="projects-skeleton-row" key={i}>
                <span className="sk sk--dot" />
                <span className="sk-group">
                  <span className="sk sk--name" style={{ width: `${100 + (i % 4) * 30}px` }} />
                  <span className="sk sk--sub" style={{ width: `${70 + (i % 3) * 20}px` }} />
                </span>
                <span className="sk sk--badge" />
                <span className="sk sk--badge" style={{ width: '60px' }} />
                <span className="sk sk--badge" style={{ width: '50px' }} />
                <span className="sk sk--icon" />
              </div>
            ))}
          </div>
        )}

        {!loading && !projects.length && (
          <div className="dashboard-detail-empty">
            <FolderGit2 size={30} />
            <strong>No projects yet</strong>
            <span>Deploy from GitHub and your projects will appear here.</span>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="projects-table">
            {filteredProjects.map((project) => (
              <article key={project.id} className="projects-row">
                <span className={`projects-row__status projects-row__status--${project.status.toLowerCase()}`} />
                <div>
                  <strong>{project.name}</strong>
                  <small>{project.repo ?? project.slug}</small>
                </div>
                <span>
                  <GitBranch size={14} /> {project.branch}
                </span>
                <em>{project.status}</em>
                <span>{formatBytes(project.storageBytes)}</span>
                {project.liveUrl ? (
                  <a href={project.liveUrl} target="_blank" rel="noreferrer" aria-label={`Open ${project.name}`}>
                    <ExternalLink size={17} />
                  </a>
                ) : (
                  <i />
                )}
              </article>
            ))}
          </div>
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

function getCachedDashboard(): DashboardData | null {
  try {
    const raw = window.localStorage.getItem(dashboardCacheKey)
    return raw ? (JSON.parse(raw) as DashboardData) : null
  } catch {
    return null
  }
}

function setCachedDashboard(data: Partial<DashboardData>) {
  try {
    const existing = getCachedDashboard() ?? {}
    window.localStorage.setItem(dashboardCacheKey, JSON.stringify({ ...existing, ...data }))
  } catch {}
}

function getCachedUser(): DashboardUser | null {
  return getCachedDashboard()?.user ?? null
}

function formatBytes(value: number) {
  if (!value) return '0 MB'
  if (value >= 1024 * 1024 * 1024) return `${Number((value / 1024 / 1024 / 1024).toFixed(2))} GB`
  return `${Number((value / 1024 / 1024).toFixed(2))} MB`
}

export default ProjectsPage
