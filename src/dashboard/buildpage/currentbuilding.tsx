import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CircleCheck,
  CircleDot,
  Copy,
  ExternalLink,
  GitBranch,
  LoaderCircle,
  Search,
  ServerCrash,
  WrapText,
  XCircle,
} from 'lucide-react'
import { io } from 'socket.io-client'
import logo from '../../assets/logo.png'
import BottomBar, { type DashboardTab } from '../bottombar/bottombar.js'
import { apiBaseUrl, getAuthToken } from '../../lib/api.js'
import '../dashboard.css'

type DashboardUser = {
  name: string
  email: string | null
  gmail?: string | null
  profilePhoto: string | null
}

type DeploymentEvent = {
  id: string
  stage: DeploymentStage
  message: string
  timestamp: string
  log?: string | null
  liveUrl?: string | null
}

type DeploymentStage = 'QUEUED' | 'CLONING' | 'INSTALLING' | 'BUILDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED'

type DeploymentDetail = {
  id: string
  projectName: string
  status: DeploymentStage
  detail: string
  project: {
    name: string
    slug: string
    repo: string | null
    branch: string
    liveUrl: string | null
    storageBytes: number
    buildMinutes: number
  } | null
  events: DeploymentEvent[]
}

type CurrentBuildingProps = {
  deploymentId: string
}

const dashboardCacheKey = 'osstack.dashboard.cache'
const logCachePrefix = 'osstack.buildlog.'

function getCachedUser(): DashboardUser | null {
  try {
    const raw = window.localStorage.getItem(dashboardCacheKey)
    return raw ? (JSON.parse(raw) as { user?: DashboardUser }).user ?? null : null
  } catch {
    return null
  }
}

function getCachedDeployment(deploymentId: string): DeploymentDetail | null {
  try {
    const raw = window.localStorage.getItem(`${logCachePrefix}${deploymentId}`)
    return raw ? (JSON.parse(raw) as DeploymentDetail) : null
  } catch {
    return null
  }
}

function setCachedDeployment(deploymentId: string, data: DeploymentDetail) {
  try {
    window.localStorage.setItem(`${logCachePrefix}${deploymentId}`, JSON.stringify(data))
  } catch {}
}

const stages: DeploymentStage[] = ['QUEUED', 'CLONING', 'INSTALLING', 'BUILDING', 'UPLOADING', 'COMPLETED']

const stageConfig: Record<DeploymentStage, { label: string; emoji: string; short: string }> = {
  QUEUED:     { label: 'Deployment queued',      emoji: '🚀', short: 'Queued' },
  CLONING:    { label: 'Cloning repository',     emoji: '📦', short: 'Clone' },
  INSTALLING: { label: 'Installing dependencies',emoji: '🧩', short: 'Install' },
  BUILDING:   { label: 'Building application',   emoji: '🔨', short: 'Build' },
  UPLOADING:  { label: 'Uploading files',         emoji: '☁️', short: 'Upload' },
  COMPLETED:  { label: 'Deployment live',         emoji: '✅', short: 'Live' },
  FAILED:     { label: 'Deployment failed',       emoji: '❌', short: 'Failed' },
}

type DisplayLog = {
  id: string
  lineNo: number
  timestamp: string
  stage: DeploymentStage
  text: string
  raw: string
  tone: 'info' | 'success' | 'warning' | 'error'
}

function CurrentBuilding({ deploymentId }: CurrentBuildingProps) {
  const [deployment, setDeployment] = useState<DeploymentDetail | null>(() => getCachedDeployment(deploymentId))
  const [user, setUser] = useState<DashboardUser | null>(() => getCachedUser())
  const [status, setStatus] = useState(deployment ? '' : 'Loading deployment…')
  const [filter, setFilter] = useState('')
  const [copied, setCopied] = useState(false)
  const [wrap, setWrap] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const logStreamRef = useRef<HTMLDivElement | null>(null)
  const filterRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/deployments/${deploymentId}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Could not load deployment.')
        const data = (await res.json()) as { deployment: DeploymentDetail }
        if (isMounted) {
          setDeployment((prev) => {
            const merged = prev
              ? { ...data.deployment, events: mergeEvents(prev.events, data.deployment.events) }
              : data.deployment
            setCachedDeployment(deploymentId, merged)
            return merged
          })
          setStatus('')
        }
      } catch (err) {
        if (isMounted) setStatus(err instanceof Error ? err.message : 'Could not load deployment.')
      }
    }

    load()
    const id = window.setInterval(load, 1500)
    return () => { isMounted = false; window.clearInterval(id) }
  }, [deploymentId])

  useEffect(() => {
    const socket = io(apiBaseUrl, {
      auth: { token: getAuthToken() },
      withCredentials: true,
      transports: ['websocket'],
    })

    socket.emit('deployment:join', { deploymentId })

    const patch = (events: DeploymentEvent[], stage?: DeploymentStage) =>
      setDeployment((prev) => {
        if (!prev) return prev
        const next: DeploymentDetail = {
          ...prev,
          ...(stage ? { status: stage } : {}),
          events: mergeEvents(prev.events, events),
        }
        setCachedDeployment(deploymentId, next)
        return next
      })

    socket.on('deployment:events', (events: DeploymentEvent[]) => patch(events))
    socket.on('deployment:event', (event: DeploymentEvent) => {
      setDeployment((prev) => {
        if (!prev) return prev
        const next: DeploymentDetail = {
          ...prev,
          status: event.stage,
          detail: event.message,
          project:
            event.liveUrl && prev.project
              ? { ...prev.project, liveUrl: event.liveUrl }
              : prev.project,
          events: mergeEvents(prev.events, [event]),
        }
        setCachedDeployment(deploymentId, next)
        return next
      })
    })

    return () => { socket.disconnect() }
  }, [deploymentId])

  useEffect(() => {
    let isMounted = true
    fetch(`${apiBaseUrl}/api/dashboard`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user?: DashboardUser } | null) => {
        if (isMounted && d?.user) setUser(d.user)
      })
      .catch(() => {})
    return () => { isMounted = false }
  }, [])

  const activeStage = deployment?.status ?? 'QUEUED'
  const completedStageIndex = useMemo(() => {
    if (activeStage === 'FAILED' && deployment?.events && deployment.events.length > 1) {
      const prevStage = deployment.events[deployment.events.length - 2]?.stage
      return Math.max(0, stages.findIndex((s) => s === prevStage))
    }
    return Math.max(0, stages.findIndex((s) => s === activeStage))
  }, [activeStage, deployment?.events])

  const liveUrl = useMemo(() => {
    if (deployment?.project?.liveUrl) return deployment.project.liveUrl
    if (!deployment?.events?.length) return null
    for (let i = deployment.events.length - 1; i >= 0; i--) {
      if (deployment.events[i].liveUrl) return deployment.events[i].liveUrl
    }
    return null
  }, [deployment?.events, deployment?.project?.liveUrl])

  const allDisplayLogs = useMemo(() => getDisplayLogs(deployment?.events ?? []), [deployment?.events])

  const filteredLogs = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return allDisplayLogs
    return allDisplayLogs.filter((l) => l.raw.toLowerCase().includes(q))
  }, [allDisplayLogs, filter])

  const hiddenLogCount = Math.max(0, (deployment?.events.length ?? 0) - allDisplayLogs.length)
  const elapsed = useElapsed(deployment)

  useEffect(() => {
    const el = logStreamRef.current
    if (!el || !autoScroll) return
    el.scrollTop = el.scrollHeight
  }, [filteredLogs.length, autoScroll])

  const onLogScroll = () => {
    const el = logStreamRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    setAutoScroll(atBottom)
  }

  const copyLogs = () => {
    const text = allDisplayLogs.map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.raw}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const progressPct = useMemo(() => {
    if (activeStage === 'FAILED') return completedStageIndex / (stages.length - 1) * 100
    if (activeStage === 'COMPLETED') return 100
    return (completedStageIndex / (stages.length - 1)) * 100
  }, [activeStage, completedStageIndex])

  return (
    <div className="dashboard-page">
      <BottomBar activeTab="builds" onTabChange={navigateDashboardTab} user={user} />
      <section className="cbp">
        <header className="cbp-header">
          <div className="cbp-header__left">
            <div className="cbp-header__top">
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
              <button type="button" className="cbp-back" onClick={() => navigate('/dashboard/builds')}>
                <ArrowLeft size={15} /> All activity
              </button>
            </div>
            <div className="cbp-header__divider" />
            <div className="cbp-header__title">
              {deployment?.project?.repo && (
                <span className="cbp-header__repo">
                  <GitBranch size={13} strokeWidth={2.4} />
                  {deployment.project.repo}
                </span>
              )}
              <h1>{deployment?.projectName ?? 'Deployment'}</h1>
            </div>
          </div>

          <div className="cbp-header__actions">
            {elapsed && (
              <span className="cbp-badge cbp-badge--time">{elapsed}</span>
            )}
            <span className={`cbp-badge cbp-badge--status cbp-badge--${activeStage.toLowerCase()}`}>
              {activeStage === 'COMPLETED' ? '● Live' : activeStage === 'FAILED' ? '✕ Failed' : '◌ Building'}
            </span>
            {liveUrl && (
              <a className="cbp-visit-btn" href={liveUrl} target="_blank" rel="noreferrer">
                Visit
                <ExternalLink size={14} strokeWidth={2.3} />
              </a>
            )}
          </div>
        </header>

        {status && <p className="cbp-loading">{status}</p>}

        {deployment && (
          <div className="cbp-body">
            {/* ── Left: timeline + meta ── */}
            <aside className="cbp-sidebar">
              {/* Progress arc */}
              <div className="cbp-progress-ring">
                <svg viewBox="0 0 80 80" width="80" height="80">
                  <circle
                    className="cbp-ring-track"
                    cx="40" cy="40" r="34"
                    fill="none"
                    strokeWidth="5"
                  />
                  <circle
                    className={`cbp-ring-fill${activeStage === 'FAILED' ? ' cbp-ring-fill--failed' : activeStage === 'COMPLETED' ? ' cbp-ring-fill--done' : ''}`}
                    cx="40" cy="40" r="34"
                    fill="none"
                    strokeWidth="5"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                </svg>
                <span className="cbp-ring-label">
                  {activeStage === 'COMPLETED' ? '✓' : activeStage === 'FAILED' ? '✕' : `${Math.round(progressPct)}%`}
                </span>
              </div>

              {/* Stage steps */}
              <div className="cbp-timeline">
                {stages.map((stage, index) => {
                  const isDone = activeStage === 'COMPLETED' || index < completedStageIndex
                  const isActive = activeStage !== 'FAILED' && index === completedStageIndex
                  const isFailed = activeStage === 'FAILED' && index === completedStageIndex

                  return (
                    <div
                      className={[
                        'cbp-step',
                        isDone ? 'cbp-step--done' : '',
                        isActive ? 'cbp-step--active' : '',
                        isFailed ? 'cbp-step--failed' : '',
                      ].filter(Boolean).join(' ')}
                      key={stage}
                    >
                      <div className="cbp-step__connector" />
                      <div className="cbp-step__icon">
                        {isDone ? (
                          <CircleCheck size={16} strokeWidth={2.3} />
                        ) : isActive || isFailed ? (
                          isFailed
                            ? <XCircle size={16} strokeWidth={2.3} />
                            : <LoaderCircle size={16} strokeWidth={2.3} className="cbp-spin" />
                        ) : (
                          <CircleDot size={16} strokeWidth={2.3} />
                        )}
                      </div>
                      <div className="cbp-step__body">
                        <span className="cbp-step__label">{stageConfig[stage].label}</span>
                        {isActive && deployment.detail && (
                          <span className="cbp-step__detail">{deployment.detail}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {activeStage === 'FAILED' && (
                  <div className="cbp-step cbp-step--failed cbp-step--terminal">
                    <div className="cbp-step__connector" />
                    <div className="cbp-step__icon">
                      <ServerCrash size={16} strokeWidth={2.3} />
                    </div>
                    <div className="cbp-step__body">
                      <span className="cbp-step__label">Deployment failed</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Meta pills */}
              <div className="cbp-meta">
                {deployment.project?.branch && (
                  <span className="cbp-meta__pill">
                    <GitBranch size={12} strokeWidth={2.4} />
                    {deployment.project.branch}
                  </span>
                )}
                <span className="cbp-meta__pill">{formatBytes(deployment.project?.storageBytes ?? 0)}</span>
                <span className="cbp-meta__pill">{allDisplayLogs.length} log lines</span>
                {hiddenLogCount > 0 && (
                  <span className="cbp-meta__pill cbp-meta__pill--muted">{hiddenLogCount} hidden (noisy)</span>
                )}
              </div>
            </aside>

            {/* ── Right: log panel ── */}
            <div className="cbp-log-panel">
              <header className="cbp-log-header">
                <div className="cbp-log-header__left">
                  <span className="cbp-log-title">Build Output</span>
                  <span className="cbp-log-sub">
                    {hiddenLogCount ? `${hiddenLogCount} noisy lines hidden · ` : ''}
                    Full history cached
                  </span>
                </div>
                <div className="cbp-log-header__actions">
                  {/* Search */}
                  <label className="cbp-log-search" htmlFor="log-filter-input">
                    <Search size={13} strokeWidth={2.4} />
                    <input
                      id="log-filter-input"
                      ref={filterRef}
                      type="text"
                      placeholder="Filter logs…"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                    {filter && (
                      <button className="cbp-log-search__clear" type="button" onClick={() => setFilter('')}>
                        <XCircle size={13} />
                      </button>
                    )}
                  </label>
                  {/* Wrap toggle */}
                  <button
                    className={`cbp-log-icon-btn${wrap ? ' is-active' : ''}`}
                    type="button"
                    title="Toggle line wrap"
                    onClick={() => setWrap((w) => !w)}
                  >
                    <WrapText size={15} strokeWidth={2.2} />
                  </button>
                  {/* Copy */}
                  <button
                    className={`cbp-log-icon-btn${copied ? ' is-active' : ''}`}
                    type="button"
                    title="Copy all logs"
                    onClick={copyLogs}
                  >
                    <Copy size={15} strokeWidth={2.2} />
                    {copied && <span className="cbp-copy-toast">Copied!</span>}
                  </button>
                </div>
              </header>

              {/* Auto-scroll indicator */}
              {!autoScroll && activeStage !== 'COMPLETED' && activeStage !== 'FAILED' && (
                <button
                  className="cbp-scroll-hint"
                  type="button"
                  onClick={() => {
                    setAutoScroll(true)
                    const el = logStreamRef.current
                    if (el) el.scrollTop = el.scrollHeight
                  }}
                >
                  ↓ Jump to latest
                </button>
              )}

              {/* Log stream */}
              <div
                className={`cbp-log-stream${wrap ? ' cbp-log-stream--wrap' : ''}`}
                ref={logStreamRef}
                onScroll={onLogScroll}
              >
                {filteredLogs.length === 0 && filter && (
                  <div className="cbp-log-empty">No logs matching &ldquo;{filter}&rdquo;</div>
                )}
                {filteredLogs.length === 0 && !filter && (
                  <div className="cbp-log-empty--waiting">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div className="cbp-log-row cbp-log-row--skeleton sk-row" key={i}>
                        <span className="sk sk--sub" style={{ margin: '0 10px 0 16px', width: '22px' }} />
                        <span className="sk sk--sub" style={{ margin: '0 10px', width: '60px' }} />
                        <span className="sk sk--sub" style={{ margin: '0 8px', width: '38px' }} />
                        <span className="sk sk--name" style={{ margin: '0 18px 0 4px', width: `${60 + (i % 5) * 40}px` }} />
                      </div>
                    ))}
                  </div>
                )}
                {filteredLogs.map((log) => (
                  <div className={`cbp-log-row cbp-log-row--${log.tone}`} key={log.id}>
                    <span className="cbp-log-lineno">{log.lineNo}</span>
                    <time className="cbp-log-time">{new Date(log.timestamp).toLocaleTimeString()}</time>
                    <span className="cbp-log-stage-badge cbp-log-stage-badge--${log.stage.toLowerCase()}">
                      {stageConfig[log.stage].short}
                    </span>
                    <span className="cbp-log-text">{log.text}</span>
                  </div>
                ))}
                {/* live cursor */}
                {(activeStage !== 'COMPLETED' && activeStage !== 'FAILED') && (
                  <div className="cbp-log-cursor">
                    <span />
                  </div>
                )}
              </div>

              {/* Footer status bar */}
              <div className="cbp-log-footer">
                <span className="cbp-log-footer__stat">{filteredLogs.length} lines{filter ? ' (filtered)' : ''}</span>
                <span className="cbp-log-footer__stat">{deployment.id.slice(0, 8)}…</span>
                {activeStage === 'COMPLETED' && liveUrl && (
                  <a className="cbp-log-footer__link" href={liveUrl} target="_blank" rel="noreferrer">
                    Open live site <ExternalLink size={12} strokeWidth={2.3} />
                  </a>
                )}
                {activeStage === 'FAILED' && (
                  <span className="cbp-log-footer__stat cbp-log-footer__stat--error">Build failed</span>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function useElapsed(deployment: DeploymentDetail | null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!deployment || deployment.status === 'COMPLETED' || deployment.status === 'FAILED') return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [deployment?.status])

  if (!deployment) return null
  const start = new Date(deployment.events[0]?.timestamp ?? Date.now()).getTime()
  const secs = Math.max(0, Math.floor((now - start) / 1000))
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new Event('osstack:navigate'))
}

function navigateDashboardTab(tab: DashboardTab) {
  const routes: Record<DashboardTab, string> = {
    home: '/dashboard',
    projects: '/dashboard/projects',
    builds: '/dashboard/builds',
    extensions: '/dashboard/extensions',
  }
  navigate(routes[tab])
}

function getDisplayLogs(events: DeploymentEvent[]): DisplayLog[] {
  const logs: DisplayLog[] = []
  const seenKeys = new Set<string>()
  let lineNo = 1

  for (const event of events) {
    const dl = toDisplayLog(event, lineNo)
    if (!dl) continue
    const key = `${dl.tone}:${dl.raw}`
    if (seenKeys.has(key) && dl.tone !== 'error') continue
    seenKeys.add(key)
    logs.push(dl)
    lineNo++
  }

  return logs
}

function toDisplayLog(event: DeploymentEvent, lineNo: number): DisplayLog | null {
  const raw = (event.log || event.message).replace(/\s+/g, ' ').trim()
  if (!raw || isNoisyBuildLog(raw)) return null

  const lower = raw.toLowerCase()
  const base = { id: event.id, lineNo, timestamp: event.timestamp, stage: event.stage, raw }

  if (event.stage === 'FAILED' || lower.includes('error') || lower.includes('failed')) {
    return { ...base, text: raw, tone: 'error' }
  }
  if (event.stage === 'COMPLETED' || lower.includes('compiled successfully') || lower.includes('deployment completed')) {
    return { ...base, text: cleanBuildLog(raw), tone: 'success' }
  }
  if (lower.includes('warning') || lower.includes('compiled with warnings')) {
    return { ...base, text: cleanBuildLog(raw), tone: 'warning' }
  }
  return { ...base, text: cleanBuildLog(raw), tone: 'info' }
}

function isNoisyBuildLog(value: string) {
  const lower = value.toLowerCase()
  return [
    'npm warn deprecated',
    'packages are looking for funding',
    'run `npm fund`',
    'npm audit',
    'vulnerabilities',
    'to address all issues',
    'deprecationwarning: fs.f_ok',
    'find out more about deployment here',
    'the build folder is ready to be deployed',
    'you may serve it with a static server',
  ].some((p) => lower.includes(p))
}

function cleanBuildLog(value: string) {
  return value
    .replace(/^>\s*/, '')
    .replace(/\s+https:\/\/cra\.link\/deployment\s*/i, '')
    .trim()
}

function formatBytes(value: number) {
  if (!value) return '0 MB'
  if (value >= 1024 * 1024 * 1024) return `${Number((value / 1024 / 1024 / 1024).toFixed(2))} GB`
  return `${Number((value / 1024 / 1024).toFixed(2))} MB`
}

function mergeEvents(existing: DeploymentEvent[], next: DeploymentEvent[]): DeploymentEvent[] {
  const map = new Map(existing.map((e) => [e.id, e]))
  for (const e of next) map.set(e.id, e)
  return [...map.values()].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
}

export default CurrentBuilding
