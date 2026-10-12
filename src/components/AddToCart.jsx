import { useEffect, useRef, useState } from 'react'
import { addToCart } from '../store'

/* "Add to Cart" for one flavour: adds 1 to the existing cart (name, flavour and price come from the flavour's id) and stays on the page. */
export default function AddToCart({ id, name, className = 'btn btn-ghost btn-sm' }) {
  const [done, setDone] = useState(false)
  const t = useRef(0)
  useEffect(() => () => clearTimeout(t.current), [])
  const add = (e) => {
    e.stopPropagation()
    addToCart(id, 1)
    setDone(true)
    clearTimeout(t.current)
    t.current = setTimeout(() => setDone(false), 1500)
  }
  return (
    <button type="button" className={`${className} atc${done ? ' ok' : ''}`} onClick={add} aria-label={done ? `${name} added to cart` : `Add ${name} to cart`}>
      {done ? 'Added ✓' : 'Add to Cart'}
    </button>
  )
}
