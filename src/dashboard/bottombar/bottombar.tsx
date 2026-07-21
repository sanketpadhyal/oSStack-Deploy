import { useEffect, useRef, useState } from 'react'
import { FolderGit2, Hammer, House, PlugZap } from 'lucide-react'
import logo from '../../assets/logo.png'
import { apiBaseUrl, clearAuthToken } from '../../lib/api.js'

export type DashboardTab = 'home' | 'projects' | 'builds' | 'extensions'

type BottomBarProps = {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  user?: {
    name: string
    email: string | null
    gmail?: string | null
    profilePhoto: string | null
  } | null
}

const dashboardItems = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'projects', label: 'Projects', Icon: FolderGit2 },
  { id: 'builds', label: 'Builds', Icon: Hammer },
  { id: 'extensions', label: 'Extensions', Icon: PlugZap },
] satisfies Array<{ id: DashboardTab; label: string; Icon: typeof House }>

const dashboardCacheKey = 'osstack.dashboard.cache'

function BottomBar({ activeTab, onTabChange, user }: BottomBarProps) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const displayName = user?.name ?? 'oSStack user'
  const displayEmail = user?.gmail ?? user?.email ?? 'No email connected'
  const profilePhoto = user?.profilePhoto ?? null
  const [avatarSrc, setAvatarSrc] = useState(profilePhoto)
  const accountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setAvatarSrc(profilePhoto)
  }, [profilePhoto])

  useEffect(() => {
    if (!isAccountMenuOpen) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('touchstart', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isAccountMenuOpen])

  const handleSignOut = async () => {
    try {
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      clearAuthToken()
      window.localStorage.removeItem(dashboardCacheKey)
      window.location.replace('/authentication')
    }
  }

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onTabChange('home')
  }

  return (
    <aside className="dashboard-rail" aria-label="Dashboard navigation">
      <a className="dashboard-rail__brand" href="/dashboard" aria-label="oSStack dashboard" onClick={handleBrandClick}>
        <img src={logo} alt="" />
      </a>

      <nav className="dashboard-rail__items" aria-label="Dashboard sections">
        {dashboardItems.map(({ id, label, Icon }) => (
          <button
            className={`dashboard-rail__item${activeTab === id ? ' dashboard-rail__item--active' : ''}`}
            data-label={label}
            type="button"
            key={id}
            onClick={() => onTabChange(id)}
          >
            <Icon size={22} strokeWidth={2.35} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="dashboard-account" ref={accountRef}>
        <button
          className="dashboard-rail__account"
          data-label={displayName}
          type="button"
          aria-label={displayName}
          aria-expanded={isAccountMenuOpen}
          aria-haspopup="menu"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt={displayName} onError={() => setAvatarSrc(null)} />
          ) : (
            <span className="dashboard-account-fallback">{displayName.charAt(0).toUpperCase()}</span>
          )}
        </button>

        {isAccountMenuOpen && (
          <div className="dashboard-account-menu" role="menu">
            <strong>{displayName}</strong>
            <small>{displayEmail}</small>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsAccountMenuOpen(false)
                onTabChange('extensions')
              }}
            >
              Connected services
            </button>
            <button className="dashboard-account-menu__danger" type="button" role="menuitem" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export default BottomBar
