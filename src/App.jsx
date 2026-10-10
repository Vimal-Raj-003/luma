import { Suspense, lazy, useEffect, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Nav from './components/Nav'
import Hero from './components/Hero'
import MotionNotice from './components/MotionNotice'
import { useMicro } from './hooks/motion'
import { preloadAssets } from './assets'

// everything below the hero is its own chunk
const Below = lazy(() => import('./components/Below'))

export default function App() {
  const [below, setBelow] = useState(() => typeof window !== 'undefined' && window.location.hash.length > 1)
  useMicro() // nav + hero buttons (the rest is scoped inside <Below/>)

  // sprite assets for the flavour sections are decoded in the background
  useEffect(() => { preloadAssets() }, [])

  // mount the rest of the page once the hero opening has played (idle, ~4.5 s: the opening must not compete with it for the main thread), or immediately if the visitor interacts / follows an anchor
  useEffect(() => {
    if (below) return
    const open = () => setBelow(true)
    const idle = window.requestIdleCallback ? window.requestIdleCallback(open, { timeout: 4500 }) : setTimeout(open, 4500)
    const first = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown']
    first.forEach((e) => window.addEventListener(e, open, { once: true, passive: true }))
    return () => {
      first.forEach((e) => window.removeEventListener(e, open))
      window.cancelIdleCallback ? window.cancelIdleCallback(idle) : clearTimeout(idle)
    }
  }, [below])

  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, [])

  return (
    <>
      <Nav />
      <main>
        <Hero />
        {below && (
          <Suspense fallback={null}>
            <Below />
          </Suspense>
        )}
      </main>
      <MotionNotice />
    </>
  )
}
