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

  // sprite assets for the flavour sections are decoded in the background — after the hero opening, never during it
  useEffect(() => {
    const go = () => preloadAssets()
    if (window.__heroReady) return void go()
    window.addEventListener('luma:hero-ready', go, { once: true })
    return () => window.removeEventListener('luma:hero-ready', go)
  }, [])

  // The rest of the page is a big chunk (scroll triggers, images). It mounts only AFTER the hero opening has finished — the Hero announces
  // 'luma:hero-ready' — so the opening never competes with it for the main thread (that is what made the intro stall). A visitor who scrolls /
  // taps / follows an anchor mounts it at once; a long safety timer covers a hero that never reports.
  useEffect(() => {
    if (below) return
    const open = () => setBelow(true)
    const ready = () => (window.requestIdleCallback ? window.requestIdleCallback(open, { timeout: 600 }) : setTimeout(open, 200))
    if (window.__heroReady) ready()
    else window.addEventListener('luma:hero-ready', ready, { once: true })
    const safety = setTimeout(open, 9000)
    const first = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown']
    first.forEach((e) => window.addEventListener(e, open, { once: true, passive: true }))
    return () => {
      window.removeEventListener('luma:hero-ready', ready)
      first.forEach((e) => window.removeEventListener(e, open))
      clearTimeout(safety)
    }
  }, [below])

  useEffect(() => {
    // (after the hero opening: a font swap re-lays-out the hero, and that must not happen in the middle of the animation)
    const refresh = () => document.fonts?.ready.then(() => ScrollTrigger.refresh())
    if (window.__heroReady) refresh()
    else window.addEventListener('luma:hero-ready', refresh, { once: true })
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
