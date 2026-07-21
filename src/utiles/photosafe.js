const STYLE_ID = 'osstack-photo-safe-style'
const PROTECTED_SELECTOR = 'img, picture, [data-photo-safe], .photo-safe'

function getProtectedTarget(target) {
  if (!(target instanceof Element)) {
    return null
  }

  return target.closest(PROTECTED_SELECTOR)
}

function lockImage(image) {
  image.setAttribute('draggable', 'false')
  image.setAttribute('data-photo-safe', 'true')
  image.addEventListener('dragstart', prevent, { passive: false })
}

function prevent(event) {
  event.preventDefault()
}

function protectExistingImages(root = document) {
  root.querySelectorAll('img').forEach(lockImage)
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    body.photo-safe-enabled img,
    body.photo-safe-enabled picture,
    body.photo-safe-enabled [data-photo-safe],
    body.photo-safe-enabled .photo-safe {
      -webkit-touch-callout: none;
      -webkit-user-drag: none;
      user-drag: none;
      user-select: none;
    }
  `

  document.head.appendChild(style)
}

export function enablePhotoSafe() {
  if (typeof window === 'undefined') {
    return () => {}
  }

  document.body.classList.add('photo-safe-enabled')
  injectStyle()
  protectExistingImages()

  const blockProtectedEvent = (event) => {
    if (getProtectedTarget(event.target)) {
      event.preventDefault()
    }
  }

  const listeners = [
    ['contextmenu', blockProtectedEvent],
    ['dragstart', blockProtectedEvent],
    ['selectstart', blockProtectedEvent],
    ['copy', blockProtectedEvent],
    ['cut', blockProtectedEvent],
  ]

  listeners.forEach(([eventName, handler]) => {
    document.addEventListener(eventName, handler, { capture: true, passive: false })
  })

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement) {
          lockImage(node)
          return
        }

        if (node instanceof Element) {
          protectExistingImages(node)
        }
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  return () => {
    observer.disconnect()
    document.body.classList.remove('photo-safe-enabled')
    listeners.forEach(([eventName, handler]) => {
      document.removeEventListener(eventName, handler, { capture: true })
    })
  }
}
