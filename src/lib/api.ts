const defaultApiBaseUrl = 'http://localhost:8080'

export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? defaultApiBaseUrl).replace(/\/+$/, '')

const authTokenKey = 'osstack.auth.token'
let fetchInstalled = false

export function getAuthToken() {
  try {
    return window.localStorage.getItem(authTokenKey)
  } catch {
    return null
  }
}

export function storeAuthToken(token: string | null | undefined) {
  if (!token || token === 'undefined' || token === 'null') {
    return
  }

  try {
    window.localStorage.setItem(authTokenKey, token)
  } catch {}
}

export function clearAuthToken() {
  try {
    window.localStorage.removeItem(authTokenKey)
  } catch {}
}

export function installAuthenticatedFetch() {
  if (fetchInstalled || typeof window === 'undefined') {
    return
  }

  fetchInstalled = true
  const nativeFetch = window.fetch.bind(window)

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const token = getAuthToken()
    const requestUrl = getRequestUrl(input)

    if (!token || !requestUrl?.startsWith(apiBaseUrl)) {
      return nativeFetch(input, init)
    }

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    headers.set('Authorization', `Bearer ${token}`)

    return nativeFetch(input, {
      ...init,
      credentials: init?.credentials ?? 'include',
      headers,
    }).then((response) => {
      if (response.status === 401) {
        clearAuthToken()
      }

      return response
    })
  }
}

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  if (input instanceof Request) {
    return input.url
  }

  return null
}
