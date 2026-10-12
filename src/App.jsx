import { Suspense, lazy, useEffect, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Nav from './components/Nav'
import Hero from './components/Hero'
import MotionNotice from './components/MotionNotice'
import Chatbot from './components/Chatbot'
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

  // Everything below the hero is a separate chunk. It mounts once the cinematic opening has played (the hero announces 'luma:hero-ready' — mounting a
  // page this size during the opening is what made it stutter), or at once if the visitor scrolls / taps / follows an anchor, or after a hard cap.
  useEffect(() => {
    if (below) return
    const open = () => setBelow(true)
    if (window.__heroReady) open()
    else window.addEventListener('luma:hero-ready', open, { once: true })
    const first = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown']
    first.forEach((e) => window.addEventListener(e, open, { once: true, passive: true }))
    const cap = setTimeout(open, 5000)
    return () => { window.removeEventListener('luma:hero-ready', open); first.forEach((e) => window.removeEventListener(e, open)); clearTimeout(cap) }
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
      <Chatbot />
    </>
  )
}
