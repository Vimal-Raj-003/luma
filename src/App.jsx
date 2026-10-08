import { useEffect, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Nav from './components/Nav'
import Stage from './components/Stage'
import FlavourSelector from './components/FlavourSelector'
import Marquee from './components/Marquee'
import Flavours from './components/Flavours'
import WhyLuma from './components/WhyLuma'
import Signature from './components/Signature'
import Builder from './components/Builder'
import Testimonials from './components/Testimonials'
import Visit from './components/Visit'
import Footer from './components/Footer'
import MotionNotice from './components/MotionNotice'
import { useMicro, useReveal } from './hooks/motion'
import { preloadAssets } from './assets'

export default function App() {
  const [ready, setReady] = useState(false)
  const [formed, setFormed] = useState(false)
  useReveal()
  useMicro()

  // pin/scrub positions depend on final layout (web fonts)
  // start the opening once fonts are in (max ~0.9s), over a background-only screen
  useEffect(() => {
    const go = () => setTimeout(() => setReady(true), 80)
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve()
    Promise.all([Promise.race([fonts, new Promise((r) => setTimeout(r, 450))]), preloadAssets()]).then(go)
  }, [])

  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    const t = setTimeout(() => ScrollTrigger.refresh(), 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <Nav ready={formed} />
      <main>
        <Stage ready={ready} onFormed={() => setFormed(true)} />
        <FlavourSelector />
        <Marquee />
        <Flavours />
        <WhyLuma />
        <Signature />
        <Builder />
        <Testimonials />
        <Visit />
      </main>
      <Footer />
      <MotionNotice />
    </>
  )
}
