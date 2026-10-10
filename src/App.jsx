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
  const [ready, setReady] = useState(false)
  const [below, setBelow] = useState(() => typeof window !== 'undefined' && window.location.hash.length > 1)
  useMicro() // nav + hero buttons (the rest is scoped inside <Below/>)

  // nav reveal once fonts are in (max ~0.5s); sprite assets for the flavour sections are decoded in the background
  useEffect(() => {
    const go = () => setTimeout(() => setReady(true), 80)
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve()
    Promise.race([fonts, new Promise((r) => setTimeout(r, 450))]).then(go)
    preloadAssets()
  }, [])

  // mount the rest of the page once the hero is under way (idle), or immediately if the visitor interacts / follows an anchor
  useEffect(() => {
    if (below) return
    const open = () => setBelow(true)
    const idle = window.requestIdleCallback ? window.requestIdleCallback(open, { timeout: 2500 }) : setTimeout(open, 1500)
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
      <Nav ready={ready} />
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
