import { useEffect, useRef } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Marquee from './Marquee'
import Flavours from './Flavours'
import Signature from './Signature'
import OneGlass from './OneGlass'
import FreshlyMade from './FreshlyMade'
import CtaScene from './CtaScene'
import Footer from './Footer'
import { useMicro } from '../hooks/motion'
import { useScrollFx } from '../hooks/scrollfx'

/* Everything below the hero. It is a separate chunk, mounted after the hero has started, so the first paint
   only carries the hero. Its reveal / magnetic / tilt hooks are scoped to this subtree. */
export default function Below() {
  const scope = useRef(null)
  useScrollFx(scope)
  useMicro(scope)

  // pin / scrub positions depend on the final layout of what just mounted
  useEffect(() => {
    document.getElementById('boot')?.remove()
    const go = () => { ScrollTrigger.sort(); ScrollTrigger.refresh() }
    const t1 = setTimeout(go, 250)
    const t2 = setTimeout(go, 1600)
    document.fonts?.ready.then(go)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div ref={scope} style={{ display: 'contents' }}>
      <Marquee />
      <Flavours />
      <OneGlass />
      <FreshlyMade />
      <Signature />
      <CtaScene />
      <Footer />
    </div>
  )
}
