import { useEffect, useMemo, useState } from 'react'
import githubIcon from '../../assets/github.png'
import googleIcon from '../../assets/google.webp'
import logo from '../../assets/logo.png'
import passkeyIcon from '../../assets/passkey.png'
import { apiBaseUrl, storeAuthToken } from '../../lib/api.js'

type AuthOption = {
  label: string
  icon: string
  provider: 'google' | 'github' | 'passkey'
}

const authOptions: AuthOption[] = [
  { label: 'Continue with Google', icon: googleIcon, provider: 'google' },
  { label: 'Continue with GitHub', icon: githubIcon, provider: 'github' },
  { label: 'Continue with Passkey', icon: passkeyIcon, provider: 'passkey' },
]

type OsstackUser = {
  id: string
  name: string
  email: string | null
  gmail: string | null
  profilePhoto: string | null
  provider: string
  passkey: boolean
  frequentquestions: boolean
}

const dashboardCacheKey = 'osstack.dashboard.cache'

function AuthPage() {
  const [user, setUser] = useState<OsstackUser | null>(null)
  const [status, setStatus] = useState('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [clickedProvider, setClickedProvider] = useState<AuthOption['provider'] | null>(null)

  const authState = useMemo(() => new URLSearchParams(window.location.search).get('auth'), [])

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hashParams.get('access_token')
      const providerToken = hashParams.get('provider_token')
      const osstackToken = hashParams.get('osstack_token')

      if (osstackToken) {
        storeAuthToken(osstackToken)
        window.history.replaceState(null, '', '/authentication')
        window.location.replace('/dashboard')
        return
      }

      if (accessToken) {
        setStatus('Finishing secure login...')

        try {
          const response = await fetch(`${apiBaseUrl}/auth/session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ accessToken, providerToken }),
          })

          if (!response.ok) {
            throw new Error('Backend rejected Supabase session.')
          }

          const data = (await response.json()) as { dashboard?: unknown; sessionToken?: string }

          storeAuthToken(data.sessionToken)

          if (data.dashboard) {
            setCachedDashboard(data.dashboard)
          }

          window.history.replaceState(null, '', '/authentication')
          window.location.assign('/dashboard')
          return
        } catch {
          window.history.replaceState(null, '', '/authentication')

          if (isMounted) {
            setStatus('Login finished, but backend session sync failed. Try again.')
            setIsCheckingAuth(false)
          }

          return
        }
      }

      if (authState === 'error') {
        setStatus('Login was cancelled. Try again.')
        setIsCheckingAuth(false)
        return
      }

      if (authState === 'success') {
        setStatus('Syncing your oSStack profile...')
      }

      try {
        const response = await fetch(`${apiBaseUrl}/auth/me`, {
          credentials: 'include',
        })

        if (!response.ok) {
          if (isMounted && authState === 'success') {
            setStatus('Login finished, but profile sync failed. Start again.')
          }
          if (isMounted) {
            setIsCheckingAuth(false)
          }
          return
        }

        const data = (await response.json()) as { authenticated: boolean; user?: OsstackUser }

        if (isMounted && data.authenticated && data.user) {
          setUser(data.user)
          setStatus('Opening your dashboard...')
          window.location.replace('/dashboard')
        } else {
          if (isMounted) {
            setIsCheckingAuth(false)
          }
        }
      } catch {
        if (isMounted) {
          setStatus('Backend auth server is not reachable.')
          setIsCheckingAuth(false)
        }
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [authState])

  const startLogin = (provider: AuthOption['provider']) => {
    if (provider === 'passkey') {
      setStatus('Passkey is not enabled yet. Backend will mark passkey as false.')
      return
    }

    setClickedProvider(provider)
    window.location.assign(`${apiBaseUrl}/auth/${provider}`)
  }

  return (
    <>
      {isCheckingAuth && (
        <div className="auth-loading-overlay" aria-live="polite">
          <img className="auth-loading-logo" src={logo} alt="oSStack Logo" />
          <div className="auth-loading-spinner" />
          <span className="auth-loading-text">Verifying session...</span>
        </div>
      )}

      <section className="auth-page" aria-labelledby="auth-title">
        <header className="auth-topbar" aria-label="Authentication navigation">
          <a className="auth-topbar__logo" href="/" aria-label="oSStack home">
            <img src={logo} alt="" aria-hidden="true" />
          </a>
        </header>

        <div className="auth-shell">
          <div className="auth-panel" role="form" aria-label="Log in to oSStack">
            <img className="auth-panel__logo" src={logo} alt="" aria-hidden="true" />
            <h2 id="auth-title">
              Log in to <span>oSStack</span>
            </h2>

            <div className="auth-options">
              {authOptions.map((option) => {
                const isLoading = clickedProvider === option.provider
                return (
                  <button
                    className={`auth-option${isLoading ? ' is-loading' : ''}`}
                    type="button"
                    key={option.label}
                    onClick={() => startLogin(option.provider)}
                    disabled={clickedProvider !== null}
                  >
                    <img className="auth-button__icon" src={option.icon} alt="" aria-hidden="true" />
                    <span className="auth-option__label">{option.label}</span>
                    {isLoading && <span className="auth-option__spinner" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            {status && <p className="auth-status">{status}</p>}

            {user && (
              <div className="auth-user" aria-label="Authenticated user">
                {user.profilePhoto && <img src={user.profilePhoto} alt="" draggable="false" />}
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.gmail ?? user.email}</span>
                  <small>
                    {user.provider} auth · passkey {String(user.passkey)}
                  </small>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export default AuthPage

function setCachedDashboard(data: unknown) {
  try {
    window.localStorage.setItem(dashboardCacheKey, JSON.stringify(data))
  } catch {}
}
