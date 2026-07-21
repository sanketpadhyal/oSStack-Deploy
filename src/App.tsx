import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import Navbar from './components/navbar.js'
import BuildPage from './dashboard/buildpage/buildpage.js'
import CurrentBuilding from './dashboard/buildpage/currentbuilding.js'
import DashboardHome from './dashboard/dashboardhome.js'
import ExtensionsPage from './dashboard/extensionspage.js'
import ProjectsPage from './dashboard/projectspage.js'
import AuthPage from './pages/authentication/authpage.js'
import BlogPage from './pages/blog.js'
import LandingPage from './pages/landingpage.js'
import { enablePhotoSafe } from './utiles/photosafe.js'
import './App.css'

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => enablePhotoSafe(), [])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      return undefined
    }

    const lenis = new Lenis({
      duration: 1.05,
      easing: (time) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.1,
    })

    lenisRef.current = lenis

    let frameId = 0

    const raf = (time: number) => {
      lenis.raf(time)
      frameId = requestAnimationFrame(raf)
    }

    frameId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frameId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  useEffect(() => {
    const handleNavigation = () => setPathname(window.location.pathname)

    window.addEventListener('popstate', handleNavigation)
    window.addEventListener('osstack:navigate', handleNavigation)

    return () => {
      window.removeEventListener('popstate', handleNavigation)
      window.removeEventListener('osstack:navigate', handleNavigation)
    }
  }, [])

  useLayoutEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true })
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  const isAuthPage = pathname === '/authentication'
  const isDashboardPage = pathname === '/dashboard'
  const isProjectsPage = pathname === '/dashboard/projects'
  const isExtensionsPage = pathname === '/dashboard/extensions'
  const isBuildPage = pathname === '/dashboard/builds'
  const buildMatch = pathname.match(/^\/dashboard\/builds\/([^/]+)$/)
  const page =
    pathname === '/blog' ? (
      <BlogPage />
    ) : isAuthPage ? (
      <AuthPage />
    ) : isDashboardPage ? (
      <DashboardHome />
    ) : isProjectsPage ? (
      <ProjectsPage />
    ) : isBuildPage ? (
      <BuildPage />
    ) : isExtensionsPage ? (
      <ExtensionsPage />
    ) : buildMatch ? (
      <CurrentBuilding deploymentId={buildMatch[1]} />
    ) : (
      <LandingPage />
    )

  return (
    <main className="app-shell">
      {!isAuthPage && !isDashboardPage && !isProjectsPage && !isBuildPage && !isExtensionsPage && !buildMatch && <Navbar />}
      {page}
    </main>
  )
}

export default App
