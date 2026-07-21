import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  Check,
  ChevronDown,
  CreditCard,
  FolderGit2,
  FolderUp,
  GitBranch,
  Info,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import githubIcon from '../assets/github.png'
import logo from '../assets/logo.png'
import BottomBar, { type DashboardTab } from './bottombar/bottombar.js'
import { apiBaseUrl } from '../lib/api.js'
import './dashboard.css'

type DashboardUser = {
  id: string
  name: string
  email: string | null
  gmail: string | null
  profilePhoto: string | null
}

type DashboardUsageRow = {
  label: string
  value: string
  active?: boolean
  progress?: number
}

type DashboardProject = {
  id: string
  name: string
  slug: string
  repo: string | null
  branch: string
  status: string
  liveUrl: string | null
  updatedAt: string
}

type DashboardDeploymentLog = {
  id: string
  name: string
  status: string
  time: string
  detail: string
}

type DashboardData = {
  user: DashboardUser
  usageRows: DashboardUsageRow[]
  projects: DashboardProject[]
  deploymentLogs: DashboardDeploymentLog[]
}

type DeployMethod = 'github' | 'folder' | 'git'

type GitHubRepository = {
  id: number
  name: string
  fullName: string
  private: boolean
  htmlUrl: string
  defaultBranch: string
  updatedAt: string
}

const dashboardCacheKey = 'osstack.dashboard.cache'
const pendingDeployModalKey = 'osstack.deploy.modal'
const githubRepositoriesCacheKey = 'osstack.github.repositories.cache'
const githubRepositoryRefreshCooldownMs = 60 * 1000

function DashboardHome() {
  const [activeTab] = useState<DashboardTab>('home')
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [deployMethod, setDeployMethod] = useState<DeployMethod | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(() => getCachedDashboard())
  const [loading, setLoading] = useState(() => !getCachedDashboard())
  const addMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isAddMenuOpen) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('touchstart', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isAddMenuOpen])

  useEffect(() => {
    let isMounted = true

    const pendingDeployModal = getPendingDeployModal()
    if (pendingDeployModal) {
      setDeployMethod(pendingDeployModal)
      window.localStorage.removeItem(pendingDeployModalKey)
    }

    async function loadDashboard() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/dashboard`, {
          credentials: 'include',
        })

        if (response.status === 401) {
          window.location.assign('/authentication')
          return
        }

        if (!response.ok) {
          throw new Error('Dashboard backend returned an error.')
        }

        const data = (await response.json()) as DashboardData

        if (isMounted) {
          setDashboard(data)
          setCachedDashboard(data)
          setLoading(false)
        }
      } catch {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()
    const refreshId = window.setInterval(loadDashboard, 10000)

    return () => {
      isMounted = false
      window.clearInterval(refreshId)
    }
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    if (deployMethod) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [deployMethod])

  const usageRows = dashboard?.usageRows ?? []
  const deploymentLogs = dashboard?.deploymentLogs ?? []
  const projects = dashboard?.projects ?? []
  const primaryProject = projects[0]
  const openDeployModal = (method: DeployMethod) => {
    setDeployMethod(method)
    setIsAddMenuOpen(false)
  }

  const handleDashboardTabChange = (tab: DashboardTab) => {
    const routes: Record<DashboardTab, string> = {
      home: '/dashboard',
      projects: '/dashboard/projects',
      builds: '/dashboard/builds',
      extensions: '/dashboard/extensions',
    }

    window.history.pushState({}, '', routes[tab])
    window.dispatchEvent(new Event('osstack:navigate'))
  }

  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    const url = q ? `/dashboard/projects?search=${encodeURIComponent(q)}` : '/dashboard/projects'
    window.history.pushState({}, '', url)
    window.dispatchEvent(new Event('osstack:navigate'))
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      const url = `/dashboard/projects?search=${encodeURIComponent(value.trim())}`
      window.history.pushState({}, '', url)
      window.dispatchEvent(new Event('osstack:navigate'))
    }
  }

  return (
    <section className="dashboard-page" aria-label="Projects dashboard">
      <BottomBar activeTab={activeTab} onTabChange={handleDashboardTabChange} user={dashboard?.user} />

      <main className="vercel-dashboard">
        <header className="vercel-toolbar">
          <a
            className="mobile-brand-logo"
            href="/dashboard"
            aria-label="oSStack dashboard"
            onClick={(e) => {
              e.preventDefault()
              handleDashboardTabChange('home')
            }}
          >
            <img src={logo} alt="oSStack" />
          </a>
          <form className="vercel-search" onSubmit={handleSearchSubmit}>
            <Search size={22} strokeWidth={2.2} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search Projects"
              aria-label="Search Projects"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="vercel-search-clear"
                onClick={() => {
                  setSearchQuery('')
                  window.history.pushState({}, '', '/dashboard/projects')
                  window.dispatchEvent(new Event('osstack:navigate'))
                }}
                aria-label="Clear search"
                style={{ border: 0, background: 'transparent', color: '#888', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            )}
          </form>

          <div className="vercel-actions" aria-label="Project actions">
            <div className="vercel-add-menu" ref={addMenuRef}>
              <button
                className="vercel-add-button"
                type="button"
                aria-expanded={isAddMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsAddMenuOpen((isOpen) => !isOpen)}
              >
                <span>Add New</span>
                <ChevronDown size={20} strokeWidth={2.4} />
              </button>

              {isAddMenuOpen && (
                <div className="vercel-add-popover" role="menu">
                  <button type="button" role="menuitem" onClick={() => openDeployModal('github')}>
                    <img src={githubIcon} alt="" aria-hidden="true" />
                    <span>Deploy by GitHub</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => openDeployModal('folder')}>
                    <FolderUp size={18} strokeWidth={2.2} />
                    <span>Deploy by folder</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => openDeployModal('git')}>
                    <GitBranch size={18} strokeWidth={2.2} />
                    <span>Deploy by Git</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="vercel-content">
          <div className="vercel-left-column">
            <section className="vercel-section" aria-labelledby="usage-title">
              <h2 id="usage-title">Usage</h2>
              <article className="vercel-card vercel-usage-card">
                <div className="vercel-card-heading">
                  <strong>Last 30 days</strong>
                  <button type="button" onClick={() => setIsUpgradeModalOpen(true)}>Upgrade</button>
                </div>

                <div className="vercel-usage-list">
                  {loading && Array.from({ length: 4 }).map((_, i) => (
                    <div className="vercel-usage-row sk-row" key={i}>
                      <span className="sk sk--circle" />
                      <span className="sk sk--name" style={{ width: `${90 + i * 20}px` }} />
                      <span className="sk sk--badge" style={{ width: '52px' }} />
                    </div>
                  ))}
                  {!loading && usageRows.map((row) => (
                    <div className={`vercel-usage-row${row.active ? ' is-active' : ''}`} key={row.label}>
                      <span
                        className="vercel-meter"
                        style={{ '--meter-progress': `${row.progress ?? 0}deg` } as CSSProperties}
                        aria-hidden="true"
                      >
                        <i />
                      </span>
                      <span className="vercel-usage-name">
                        {row.label}
                        <Info size={14} strokeWidth={2.4} aria-hidden="true" />
                      </span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                  {!loading && !usageRows.length && <p className="vercel-card-message">No usage data yet.</p>}
                </div>
              </article>
            </section>

            <section className="vercel-section" aria-labelledby="deployments-title">
              <h2 id="deployments-title">Previous Deployments</h2>
              <article className="vercel-card vercel-deployment-log-card">
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <div className="vercel-deployment-log sk-row" key={i}>
                    <span className="sk sk--dot" />
                    <div style={{ flex: 1 }}>
                      <span className="sk sk--name" style={{ width: `${100 + i * 25}px` }} />
                      <span className="sk sk--sub" style={{ width: `${70 + i * 15}px`, marginTop: '6px' }} />
                    </div>
                    <span className="sk sk--badge" />
                    <span className="sk sk--badge" style={{ width: '48px' }} />
                  </div>
                ))}
                {!loading && deploymentLogs.length ? (
                  deploymentLogs.map((log) => (
                    <div className="vercel-deployment-log" key={log.id}>
                    <span className={`vercel-deployment-dot vercel-deployment-dot--${log.status.toLowerCase()}`} />
                    <div>
                      <strong>{log.name}</strong>
                      <small>{log.detail}</small>
                    </div>
                    <em>{log.status}</em>
                    <time>{log.time}</time>
                  </div>
                  ))
                ) : null}
                {!loading && !deploymentLogs.length && <p className="vercel-card-message">No deployments yet.</p>}
              </article>
            </section>

          </div>

          <section className="vercel-section vercel-projects" aria-labelledby="projects-title">
            <h2 id="projects-title">Projects</h2>
            {loading && (
              <article className="vercel-card vercel-project-card">
                <div className="vercel-project-top">
                  <div className="vercel-project-mark" aria-hidden="true">
                    <span className="sk" style={{ width: '42px', height: '42px', borderRadius: '12px' }} />
                  </div>
                  <div className="vercel-project-title" style={{ gap: '8px' }}>
                    <span className="sk sk--name" style={{ width: '130px' }} />
                    <span className="sk sk--sub" style={{ width: '90px' }} />
                  </div>
                </div>
                <span className="sk sk--name" style={{ width: '180px', marginTop: '18px' }} />
                <span className="sk sk--sub" style={{ width: '140px', marginTop: '10px' }} />
              </article>
            )}
            {!loading && primaryProject ? (
              <article className="vercel-card vercel-project-card">
                <div className="vercel-project-top">
                  <div className="vercel-project-mark" aria-hidden="true">
                    <span />
                  </div>
                  <div className="vercel-project-title">
                    <strong>{primaryProject.name}</strong>
                    <small>{primaryProject.slug}</small>
                  </div>
                </div>

                {primaryProject.repo && (
                  <div className="vercel-repo-pill">
                    <img src={githubIcon} alt="" aria-hidden="true" />
                    <span>{primaryProject.repo}</span>
                  </div>
                )}

                <p>{primaryProject.liveUrl ? 'Production deployment is live.' : 'Project is waiting for first deployment.'}</p>

                <footer>
                  <time dateTime={primaryProject.updatedAt}>{formatProjectDate(primaryProject.updatedAt)}</time>
                  <span>on</span>
                  <GitBranch size={22} strokeWidth={2.2} />
                  <strong>{primaryProject.branch}</strong>
                </footer>
              </article>
            ) : (
              <article className="vercel-card vercel-project-card vercel-project-empty">
                <div className="vercel-project-empty__icon">
                  <FolderGit2 size={28} strokeWidth={1.8} />
                </div>
                <strong>No projects yet</strong>
                <p>Create your first deployment from Add New.</p>
              </article>
            )}
          </section>
        </section>
      </main>

      {deployMethod && <DeployModal method={deployMethod} onClose={() => setDeployMethod(null)} />}
      {isUpgradeModalOpen && <UpgradeModal onClose={() => setIsUpgradeModalOpen(false)} />}
    </section>
  )
}

export default DashboardHome

function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="deploy-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title">
      <button className="deploy-modal__backdrop" type="button" aria-label="Close dialog" onClick={onClose} />
      <section className="deploy-modal__panel upgrade-modal__panel">
        <header className="upgrade-modal__header">
          <div className="upgrade-modal__icon-badge">
            <CreditCard size={24} strokeWidth={2.1} />
          </div>
          <button type="button" className="upgrade-modal__close" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2.4} />
          </button>
        </header>

        <div className="upgrade-modal__content">
          <div className="upgrade-modal__title-group">
            <h2 id="upgrade-modal-title">oSStack Pro & Enterprise</h2>
            <p className="upgrade-modal__subtitle">
              Live payment processing is disabled. oSStack is a fully open-source platform for build & deployment automation!
            </p>
          </div>

          <div className="upgrade-modal__notice-box">
            <div className="upgrade-modal__notice-icon">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>
            <div className="upgrade-modal__notice-text">
              <strong>MVP Demonstration Notice</strong>
              <p>
                This project is an open-source MVP platform. All static & SSR hosting, build pipelines, and project deployments are provided 100% free with no live payment system required.
              </p>
            </div>
          </div>

          <div className="upgrade-modal__features">
            <div className="upgrade-feature-item">
              <span className="upgrade-feature-num">1</span>
              <span>Unlimited static & SSR deployments</span>
            </div>
            <div className="upgrade-feature-item">
              <span className="upgrade-feature-num">2</span>
              <span>Automated GitHub repository CI/CD builds</span>
            </div>
            <div className="upgrade-feature-item">
              <span className="upgrade-feature-num">3</span>
              <span>Subpath virtual routing & Supabase shims</span>
            </div>
          </div>

          <div className="upgrade-modal__actions">
            <button className="upgrade-btn-primary" type="button" onClick={onClose}>
              Got it, thanks!
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function DeployModal({ method, onClose }: { method: DeployMethod; onClose: () => void }) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [githubStatus, setGithubStatus] = useState<'idle' | 'loading' | 'connected' | 'not-connected' | 'error' | 'rate-limited'>('idle')
  const [lastRepositoryRefreshAt, setLastRepositoryRefreshAt] = useState<number | null>(null)
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<number | null>(null)
  const [deployStep, setDeployStep] = useState<'repositories' | 'configure'>('repositories')
  const [projectName, setProjectName] = useState('')
  const [gitRepositoryUrl, setGitRepositoryUrl] = useState('')
  const [gitBranch, setGitBranch] = useState('main')
  const [environmentText, setEnvironmentText] = useState('')
  const [deployError, setDeployError] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  const [folderFiles, setFolderFiles] = useState<{ path: string; content: string }[]>([])
  const [folderSummary, setFolderSummary] = useState<{ name: string; count: number; size: string } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isReadingFolder, setIsReadingFolder] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const modalTitle =
    method === 'github' && deployStep === 'configure'
      ? 'Configure project'
      : method === 'github'
        ? 'Deploy from GitHub'
        : method === 'folder'
          ? 'Deploy production folder'
          : 'Deploy from Git repository'

  useEffect(() => {
    if (method !== 'github') {
      return
    }

    const cachedRepositories = getCachedGitHubRepositories()

    if (cachedRepositories) {
      setRepositories(cachedRepositories.repositories)
      setLastRepositoryRefreshAt(cachedRepositories.cachedAt)
      setGithubStatus('connected')
      return
    }

    setGithubStatus('idle')
  }, [method])

  useEffect(() => {
    if (method !== 'github' || !lastRepositoryRefreshAt) {
      return undefined
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(intervalId)
  }, [lastRepositoryRefreshAt, method])

  useEffect(() => {
    if (!selectedRepositoryId) {
      return
    }

    if (!repositories.some((repo) => repo.id === selectedRepositoryId)) {
      setSelectedRepositoryId(null)
    }
  }, [repositories, selectedRepositoryId])

  useEffect(() => {
    const selectedRepository = repositories.find((repo) => repo.id === selectedRepositoryId)

    if (selectedRepository && !projectName) {
      setProjectName(selectedRepository.name)
    }
  }, [projectName, repositories, selectedRepositoryId])

  useEffect(() => {
    if (method !== 'git' || projectName || !gitRepositoryUrl) {
      return
    }

    const inferredName = getProjectNameFromGitUrl(gitRepositoryUrl)

    if (inferredName) {
      setProjectName(inferredName)
    }
  }, [gitRepositoryUrl, method, projectName])

  useEffect(() => {
    const slug = slugifyClient(projectName)

    if (!slug || (method === 'github' && deployStep === 'repositories')) {
      setSlugStatus('idle')
      return undefined
    }

    setSlugStatus('checking')

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/projects/check-slug/${slug}`, { credentials: 'include' })
        const data = (await response.json()) as { available?: boolean }

        setSlugStatus(response.ok && data.available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [deployStep, method, projectName])

  const refreshRepositories = async () => {
    if (lastRepositoryRefreshAt && Date.now() - lastRepositoryRefreshAt < githubRepositoryRefreshCooldownMs) {
      setGithubStatus('rate-limited')
      return
    }

    setGithubStatus('loading')

    try {
      const response = await fetch(`${apiBaseUrl}/api/github/repositories`, {
        credentials: 'include',
      })

      if (response.status === 429) {
        setGithubStatus('rate-limited')
        return
      }

      if (!response.ok) {
        throw new Error('Unable to load GitHub repositories.')
      }

      const data = (await response.json()) as { connected: boolean; repositories: GitHubRepository[] }

      if (!data.connected) {
        setRepositories([])
        setSelectedRepositoryId(null)
        setGithubStatus('not-connected')
        return
      }

      const cachedAt = Date.now()

      setRepositories(data.repositories)
      setLastRepositoryRefreshAt(cachedAt)
      setCachedGitHubRepositories({ repositories: data.repositories, cachedAt })
      setGithubStatus('connected')
    } catch {
      setGithubStatus('error')
    }
  }

  const authorizeGitHub = () => {
    setPendingDeployModal('github')
    window.location.assign(`${apiBaseUrl}/auth/github`)
  }

  const processFileList = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (!fileArray.length) return

    setIsReadingFolder(true)
    setDeployError('')

    try {
      const parsedFiles: { path: string; content: string }[] = []
      let inferredFolderName = ''
      let totalBytes = 0

      for (const file of fileArray) {
        const relPath = (file.webkitRelativePath || file.name).replace(/\\/g, '/')

        if (
          relPath.includes('/node_modules/') ||
          relPath.startsWith('node_modules/') ||
          relPath.includes('/.git/') ||
          relPath.startsWith('.git/') ||
          relPath.includes('/.next/') ||
          relPath.startsWith('.next/') ||
          relPath.endsWith('.DS_Store')
        ) {
          continue
        }

        if (!inferredFolderName && relPath.includes('/')) {
          inferredFolderName = relPath.split('/')[0]
        }

        totalBytes += file.size
        const base64 = await fileToBase64(file)
        parsedFiles.push({ path: relPath, content: base64 })
      }

      if (!parsedFiles.length) {
        throw new Error('No valid files found in folder.')
      }

      setFolderFiles(parsedFiles)
      setFolderSummary({
        name: inferredFolderName || 'uploaded-folder',
        count: parsedFiles.length,
        size: formatBytes(totalBytes),
      })

      if (!projectName && inferredFolderName) {
        setProjectName(inferredFolderName)
      }
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Error reading folder files.')
    } finally {
      setIsReadingFolder(false)
    }
  }

  const processDroppedItems = async (items: DataTransferItemList) => {
    const files: File[] = []

    const traverseEntry = async (entry: any, pathPrefix = '') => {
      if (entry.isFile) {
        await new Promise<void>((resolve) => {
          entry.file((file: File) => {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: pathPrefix + file.name,
              writable: false,
            })
            files.push(file)
            resolve()
          })
        })
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader()
        const entries = await new Promise<any[]>((resolve) => {
          dirReader.readEntries((results: any[]) => resolve(results))
        })
        for (const child of entries) {
          await traverseEntry(child, `${pathPrefix}${entry.name}/`)
        }
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : (item as any).getAsEntry?.()
        if (entry) {
          await traverseEntry(entry)
        } else {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }
    }

    await processFileList(files)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.items && e.dataTransfer.items.length) {
      await processDroppedItems(e.dataTransfer.items)
    } else if (e.dataTransfer.files && e.dataTransfer.files.length) {
      await processFileList(e.dataTransfer.files)
    }
  }

  const canRefreshRepositories =
    !lastRepositoryRefreshAt || Date.now() - lastRepositoryRefreshAt >= githubRepositoryRefreshCooldownMs
  const refreshCooldownSeconds = lastRepositoryRefreshAt
    ? Math.max(0, Math.ceil((githubRepositoryRefreshCooldownMs - (now - lastRepositoryRefreshAt)) / 1000))
    : 0
  const selectedRepository = repositories.find((repo) => repo.id === selectedRepositoryId) ?? null
  const projectNameIsReady = Boolean(projectName.trim()) && slugStatus !== 'checking' && slugStatus !== 'taken'
  const canContinue =
    method === 'github'
      ? deployStep === 'repositories'
        ? Boolean(selectedRepository)
        : projectNameIsReady && !isDeploying
      : method === 'git'
        ? projectNameIsReady && Boolean(gitRepositoryUrl.trim()) && Boolean(gitBranch.trim()) && !isDeploying
        : method === 'folder'
          ? projectNameIsReady && Boolean(folderFiles.length) && !isDeploying && !isReadingFolder
          : true

  const continueDeploySetup = async () => {
    if (method === 'github' && !selectedRepository) {
      return
    }

    if (method === 'github' && deployStep === 'repositories' && selectedRepository) {
      window.localStorage.setItem('osstack.deploy.github.selectedRepository', JSON.stringify(selectedRepository))
      setDeployStep('configure')
      setDeployError('')
      return
    }

    if (method === 'github' && deployStep === 'configure' && selectedRepository) {
      setIsDeploying(true)
      setDeployError('')

      try {
        const response = await fetch(`${apiBaseUrl}/api/deployments`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repositoryFullName: selectedRepository.fullName,
            projectName: projectName.trim(),
            slug: slugifyClient(projectName),
            branch: selectedRepository.defaultBranch || 'main',
            environment: parseEnvironmentText(environmentText),
          }),
        })
        const data = (await response.json()) as { ok?: boolean; error?: string; buildUrl?: string }

        if (!response.ok || !data.ok || !data.buildUrl) {
          throw new Error(data.error ?? 'Could not start deployment.')
        }

        window.localStorage.removeItem('osstack.deploy.github.selectedRepository')
        onClose()
        window.history.pushState({}, '', data.buildUrl)
        window.dispatchEvent(new Event('osstack:navigate'))
      } catch (error) {
        setDeployError(error instanceof Error ? error.message : 'Could not start deployment.')
      } finally {
        setIsDeploying(false)
      }

      return
    }

    if (method === 'git') {
      setIsDeploying(true)
      setDeployError('')

      try {
        const response = await fetch(`${apiBaseUrl}/api/deployments`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repositoryUrl: gitRepositoryUrl.trim(),
            projectName: projectName.trim(),
            slug: slugifyClient(projectName),
            branch: gitBranch.trim() || 'main',
            environment: parseEnvironmentText(environmentText),
          }),
        })
        const data = (await response.json()) as { ok?: boolean; error?: string; buildUrl?: string }

        if (!response.ok || !data.ok || !data.buildUrl) {
          throw new Error(data.error ?? 'Could not start deployment.')
        }

        onClose()
        window.history.pushState({}, '', data.buildUrl)
        window.dispatchEvent(new Event('osstack:navigate'))
      } catch (error) {
        setDeployError(error instanceof Error ? error.message : 'Could not start deployment.')
      } finally {
        setIsDeploying(false)
      }

      return
    }

    if (method === 'folder') {
      if (!folderFiles.length) {
        setDeployError('Please select or drop a folder first.')
        return
      }

      setIsDeploying(true)
      setDeployError('')

      try {
        const response = await fetch(`${apiBaseUrl}/api/deployments/folder`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectName: projectName.trim(),
            slug: slugifyClient(projectName),
            environment: parseEnvironmentText(environmentText),
            files: folderFiles,
          }),
        })
        const data = (await response.json()) as { ok?: boolean; error?: string; buildUrl?: string }

        if (!response.ok || !data.ok || !data.buildUrl) {
          throw new Error(data.error ?? 'Could not start folder deployment.')
        }

        onClose()
        window.history.pushState({}, '', data.buildUrl)
        window.dispatchEvent(new Event('osstack:navigate'))
      } catch (error) {
        setDeployError(error instanceof Error ? error.message : 'Could not start folder deployment.')
      } finally {
        setIsDeploying(false)
      }

      return
    }

    onClose()
  }

  return (
    <div className="deploy-modal" role="dialog" aria-modal="true" aria-labelledby="deploy-modal-title">
      <button className="deploy-modal__backdrop" type="button" aria-label="Close deploy dialog" onClick={onClose} />
      <section
        className="deploy-modal__panel"
        data-lenis-prevent
        data-lenis-prevent-wheel
        onWheelCapture={(event) => event.stopPropagation()}
      >
        <header className="deploy-modal__header">
          <div>
            <h2 id="deploy-modal-title">{modalTitle}</h2>
            {method === 'github' && (
              <p>
                {deployStep === 'configure' && selectedRepository
                  ? selectedRepository.fullName
                  : repositories.length
                    ? `${repositories.length} cached repositories`
                    : 'Repositories load from cache until you refresh.'}
              </p>
            )}
          </div>
          <div className="deploy-modal__header-actions">
            {method === 'github' && (
              <button type="button" disabled={githubStatus === 'loading' || !canRefreshRepositories} onClick={refreshRepositories}>
                <RefreshCw size={16} strokeWidth={2.2} />
                <span>{githubStatus === 'loading' ? 'Refreshing' : refreshCooldownSeconds ? `${refreshCooldownSeconds}s` : 'Refresh'}</span>
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close">
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>
        </header>

        {method === 'github' && deployStep === 'repositories' && (
          <div className="deploy-modal__body">
            {githubStatus !== 'connected' && (
              <div className="deploy-modal__github-connect">
                <img src={githubIcon} alt="" aria-hidden="true" />
                <div>
                  <strong>GitHub repositories</strong>
                  <p>Authorize GitHub to show your public repositories here.</p>
                </div>
                <button type="button" onClick={authorizeGitHub}>
                  Authorize GitHub
                </button>
              </div>
            )}

            <div className="deploy-repo-list" aria-label="Repository preview" data-lenis-prevent data-lenis-prevent-wheel>
              {githubStatus === 'loading' && <p className="deploy-modal__message">Loading repositories...</p>}
              {githubStatus === 'idle' && <p className="deploy-modal__message">No cached repositories yet. Use Refresh after authorizing GitHub.</p>}
              {githubStatus === 'not-connected' && <p className="deploy-modal__message">No GitHub token connected for this session.</p>}
              {githubStatus === 'rate-limited' && <p className="deploy-modal__message">Refresh is rate limited. Try again in a minute.</p>}
              {githubStatus === 'error' && <p className="deploy-modal__message">Could not load repositories. Please authorize GitHub again.</p>}
              {githubStatus === 'connected' && !repositories.length && (
                <p className="deploy-modal__message">No public repositories found.</p>
              )}
              {repositories.map((repo) => {
                const isSelected = selectedRepositoryId === repo.id

                return (
                  <button
                    type="button"
                    key={repo.id}
                    className={isSelected ? 'is-selected' : undefined}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedRepositoryId(repo.id)}
                  >
                    <img src={githubIcon} alt="" aria-hidden="true" />
                    <span>{repo.fullName}</span>
                    <em>{repo.private ? 'Private' : 'Public'}</em>
                    {isSelected && <Check size={16} strokeWidth={2.4} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {method === 'github' && deployStep === 'configure' && selectedRepository && (
          <div className="deploy-modal__body">
            <div className="deploy-selected-repo">
              <img src={githubIcon} alt="" aria-hidden="true" />
              <div>
                <strong>{selectedRepository.fullName}</strong>
                <span>{selectedRepository.defaultBranch || 'main'} branch</span>
              </div>
            </div>

            <div className="deploy-modal__fields">
              <label>
                Project name
                <input
                  type="text"
                  value={projectName}
                  onChange={(event) => {
                    setProjectName(event.target.value)
                    setDeployError('')
                  }}
                  placeholder="my-project"
                />
              </label>
              <label>
                Environment variables
                <textarea
                  value={environmentText}
                  onChange={(event) => {
                    setEnvironmentText(event.target.value)
                    setDeployError('')
                  }}
                  placeholder={'NEXT_PUBLIC_SANITY_PROJECT_ID=...\nNEXT_PUBLIC_SANITY_DATASET=production'}
                />
              </label>
            </div>

            <p className="deploy-modal__hint">Build settings are detected automatically. Add env only when the app needs it.</p>
            <p className="deploy-modal__slug">
              Route: /apps/{slugifyClient(projectName) || 'project-name'}
              {slugStatus === 'checking' && ' · checking'}
              {slugStatus === 'taken' && ' · name already exists'}
            </p>
            {deployError && <p className="deploy-modal__error">{deployError}</p>}
          </div>
        )}

        {method === 'folder' && (
          <div className="deploy-modal__body">
            {!folderSummary ? (
              <div
                className={`deploy-dropzone${isDragging ? ' is-dragging' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDragging(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsDragging(false)
                }}
                onDrop={handleDrop}
                onClick={() => folderInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <FolderUp size={34} strokeWidth={1.9} />
                <strong>{isReadingFolder ? 'Reading folder contents...' : 'Drop your project folder here'}</strong>
                <span>or click to browse from your computer</span>
                <input
                  ref={folderInputRef}
                  type="file"
                  {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                  multiple
                  onChange={(e) => e.target.files && processFileList(e.target.files)}
                />
              </div>
            ) : (
              <div className="deploy-folder-card">
                <div className="deploy-folder-card__icon">
                  <FolderGit2 size={24} />
                </div>
                <div className="deploy-folder-card__info">
                  <strong>{folderSummary.name}</strong>
                  <span>{folderSummary.count} files ready ({folderSummary.size})</span>
                </div>
                <button
                  type="button"
                  className="deploy-folder-card__clear"
                  onClick={() => {
                    setFolderFiles([])
                    setFolderSummary(null)
                  }}
                >
                  Change folder
                </button>
              </div>
            )}

            <div className="deploy-modal__fields">
              <label>
                Project name
                <input
                  type="text"
                  value={projectName}
                  onChange={(event) => {
                    setProjectName(event.target.value)
                    setDeployError('')
                  }}
                  placeholder="my-project"
                />
              </label>
              <label>
                Environment variables
                <textarea
                  value={environmentText}
                  onChange={(event) => {
                    setEnvironmentText(event.target.value)
                    setDeployError('')
                  }}
                  placeholder={'NEXT_PUBLIC_SANITY_PROJECT_ID=...\nNEXT_PUBLIC_SANITY_DATASET=production'}
                />
              </label>
            </div>
            <p className="deploy-modal__hint">Smart detection will deploy static sites directly or build React/Vite/Next apps automatically.</p>
            <p className="deploy-modal__slug">
              Route: /apps/{slugifyClient(projectName) || 'project-name'}
              {slugStatus === 'checking' && ' · checking'}
              {slugStatus === 'taken' && ' · name already exists'}
            </p>
            {deployError && <p className="deploy-modal__error">{deployError}</p>}
          </div>
        )}

        {method === 'git' && (
          <div className="deploy-modal__body">
            <div className="deploy-modal__fields">
              <label>
                Project name
                <input
                  type="text"
                  value={projectName}
                  onChange={(event) => {
                    setProjectName(event.target.value)
                    setDeployError('')
                  }}
                  placeholder="my-project"
                />
              </label>
              <label>
                Git repository URL
                <input
                  type="url"
                  value={gitRepositoryUrl}
                  onChange={(event) => {
                    setGitRepositoryUrl(event.target.value)
                    setDeployError('')
                  }}
                  placeholder="https://github.com/user/project.git"
                />
              </label>
              <label>
                Branch
                <input
                  type="text"
                  value={gitBranch}
                  onChange={(event) => {
                    setGitBranch(event.target.value)
                    setDeployError('')
                  }}
                  placeholder="main"
                />
              </label>
              <label>
                Environment variables
                <textarea
                  value={environmentText}
                  onChange={(event) => {
                    setEnvironmentText(event.target.value)
                    setDeployError('')
                  }}
                  placeholder={'NEXT_PUBLIC_SANITY_PROJECT_ID=...\nNEXT_PUBLIC_SANITY_DATASET=production'}
                />
              </label>
            </div>
            <p className="deploy-modal__hint">oSStack will clone, detect the app folder, install, build, and find output automatically.</p>
            <p className="deploy-modal__slug">
              Route: /apps/{slugifyClient(projectName) || 'project-name'}
              {slugStatus === 'checking' && ' · checking'}
              {slugStatus === 'taken' && ' · name already exists'}
            </p>
            {deployError && <p className="deploy-modal__error">{deployError}</p>}
          </div>
        )}

        <footer className="deploy-modal__footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={!canContinue} onClick={continueDeploySetup}>
            {(method === 'github' && deployStep === 'configure') || method === 'git' || method === 'folder'
              ? isDeploying
                ? 'Deploying'
                : 'Deploy'
              : 'Continue'}
          </button>
        </footer>
      </section>
    </div>
  )
}

function getCachedDashboard() {
  try {
    const cachedValue = window.localStorage.getItem(dashboardCacheKey)

    return cachedValue ? (JSON.parse(cachedValue) as DashboardData) : null
  } catch {
    return null
  }
}

function getPendingDeployModal() {
  const pendingValue = window.localStorage.getItem(pendingDeployModalKey)

  return pendingValue === 'github' || pendingValue === 'folder' || pendingValue === 'git' ? pendingValue : null
}

function setPendingDeployModal(method: DeployMethod) {
  window.localStorage.setItem(pendingDeployModalKey, method)
}

function getCachedGitHubRepositories() {
  try {
    const cachedValue = window.localStorage.getItem(githubRepositoriesCacheKey)

    if (!cachedValue) {
      return null
    }

    const cachedRepositories = JSON.parse(cachedValue) as { repositories: GitHubRepository[]; cachedAt: number }

    return Array.isArray(cachedRepositories.repositories) && typeof cachedRepositories.cachedAt === 'number' ? cachedRepositories : null
  } catch {
    return null
  }
}

function setCachedGitHubRepositories(data: { repositories: GitHubRepository[]; cachedAt: number }) {
  window.localStorage.setItem(githubRepositoriesCacheKey, JSON.stringify(data))
}

function setCachedDashboard(data: DashboardData) {
  try {
    window.localStorage.setItem(dashboardCacheKey, JSON.stringify(data))
  } catch {}
}

function slugifyClient(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getProjectNameFromGitUrl(value: string) {
  try {
    const url = new URL(value)
    const lastPathPart = url.pathname
      .split('/')
      .filter(Boolean)
      .at(-1)
      ?.replace(/\.git$/i, '')

    return lastPathPart ?? ''
  } catch {
    return ''
  }
}

function parseEnvironmentText(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce<Record<string, string>>((environment, line) => {
      const separatorIndex = line.indexOf('=')

      if (separatorIndex <= 0) {
        return environment
      }

      const key = line.slice(0, separatorIndex).trim()
      const envValue = line.slice(separatorIndex + 1).trim()

      if (/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
        environment[key] = envValue
      }

      return environment
    }, {})
}

function formatProjectDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
