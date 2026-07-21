import { useState, type MouseEvent } from 'react'
import logo from '../assets/logo.png'

const navItems = [
  { label: 'Resources', href: '/#resources' },
  { label: 'Blog', href: '/blog' },
]

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const handleRouteClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsOpen(false)

    if (!href.startsWith('/') || href.includes('#')) {
      return
    }

    event.preventDefault()

    if (window.location.pathname !== href) {
      window.history.pushState({}, '', href)
      window.dispatchEvent(new Event('osstack:navigate'))
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  return (
    <header className="site-header">
      <nav className={`navbar ${isOpen ? 'navbar--open' : ''}`} aria-label="Main">
        <a className="navbar__brand" href="/" aria-label="oSStack home" onClick={(event) => handleRouteClick(event, '/')}>
          <img className="navbar__mark" src={logo} alt="" aria-hidden="true" />
          <span className="navbar__wordmark">oSStack</span>
        </a>

        <div className="navbar__links" id="navbar-menu">
          {navItems.map((item) => (
            <a
              className="navbar__link"
              href={item.href}
              key={item.label}
              onClick={(event) => handleRouteClick(event, item.href)}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="navbar__actions">
          <a
            className="navbar__button navbar__button--solid"
            href="/authentication"
            onClick={(event) => handleRouteClick(event, '/authentication')}
          >
            Authentication
          </a>
        </div>

        <button
          className="navbar__toggle"
          type="button"
          aria-controls="navbar-menu"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span></span>
          <span></span>
        </button>

        <div className="navbar__mobile-menu" aria-hidden={!isOpen}>
          <div className="navbar__mobile-links">
            {navItems.map((item) => (
              <a
                href={item.href}
                key={item.label}
                onClick={(event) => handleRouteClick(event, item.href)}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="navbar__mobile-actions">
            <a
              className="navbar__button navbar__button--solid"
              href="/authentication"
              onClick={(event) => handleRouteClick(event, '/authentication')}
            >
              Authentication
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Navbar
