import { useEffect, useRef, useState } from 'react'

export default function useHideOnScroll({ threshold = 10, initialVisible = true } = {}) {
  const [visible, setVisible] = useState(initialVisible)
  const lastY = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    function getScrollTop(target) {
      if (!target) return 0
      if (target === window || target === document || target === document.documentElement) {
        return window.scrollY || document.documentElement.scrollTop || 0
      }
      if (target instanceof HTMLElement) {
        return target.scrollTop || 0
      }
      return 0
    }

    function isMainScrollContainer(target) {
      if (!target) return false
      if (target === window || target === document || target === document.documentElement || target === document.body) {
        return true
      }
      if (target instanceof HTMLElement && target.tagName === 'MAIN') {
        return true
      }
      return false
    }

    function onScroll(e) {
      const target = e.target
      if (!isMainScrollContainer(target)) return

      const y = getScrollTop(target)

      // Ignore negative bounces on mobile Safari/Chrome
      if (y < 0) return

      // Always show header at the top of the page
      if (y <= 60) {
        setVisible(true)
        lastY.current = y
        return
      }

      if (Math.abs(y - lastY.current) < threshold) return

      if (y > lastY.current && y > 60) {
        setVisible(false)
      } else {
        setVisible(true)
      }
      lastY.current = y
    }

    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('scroll', onScroll)
    }
  }, [threshold])

  return visible
}

