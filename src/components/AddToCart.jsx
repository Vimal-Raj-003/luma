import { useEffect, useRef, useState } from 'react'
import { addToCart } from '../store'
import { FLAVOURS } from '../data/site'

/* "Add to Cart" for one flavour: adds 1 to the existing cart (name, flavour and price come from the flavour's id) and stays on the page. */
export default function AddToCart({ id, name, className = 'btn btn-ghost btn-sm' }) {
  const [done, setDone] = useState(false)
  const t = useRef(0)
  useEffect(() => () => clearTimeout(t.current), [])
  const off = FLAVOURS.find((f) => f.id === id)?.active === false // switched off by the Super Admin: nothing new can be bought
  const add = (e) => {
    if (off) return
    e.stopPropagation()
    addToCart(id, 1)
    setDone(true)
    clearTimeout(t.current)
    t.current = setTimeout(() => setDone(false), 1500)
  }
  return (
    <button type="button" className={`${className} atc${done ? ' ok' : ''}`} onClick={add} disabled={off} aria-label={off ? `${name} is unavailable` : done ? `${name} added to cart` : `Add ${name} to cart`}>
      {off ? 'Unavailable' : done ? 'Added ✓' : 'Add to Cart'}
    </button>
  )
}
