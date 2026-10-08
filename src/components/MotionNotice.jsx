import { useState } from 'react'
import { motionForced, osReduced } from '../hooks/motion'

/* Shown only when the system asks for reduced motion: the site respects that, and says so, with a one-click way to
   play the full animated experience. */
export default function MotionNotice() {
  const [hidden, setHidden] = useState(false)
  if (!osReduced() || motionForced() || hidden) return null
  const play = () => {
    try {
      window.localStorage.setItem('luma-motion', 'full')
    } catch {
      /* private mode: fall back to the query string */
    }
    window.location.search = '?motion=full'
  }
  return (
    <div className="motion-note" role="status">
      <span>Animations are reduced by your system settings.</span>
      <button type="button" onClick={play}>Play full animation</button>
    </div>
  )
}
