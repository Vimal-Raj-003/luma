import { useSyncExternalStore } from 'react'

/* Tiny cart + wishlist store (in memory, mirrored to localStorage). There is no checkout backend yet. */
const KEY = 'luma-cart-v1'
const load = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || 'null')
    if (v && typeof v.items === 'object' && Array.isArray(v.wish)) return v
  } catch { /* private mode / blocked storage */ }
  return { items: {}, wish: [] }
}
let state = typeof window === 'undefined' ? { items: {}, wish: [] } : load()
const subs = new Set()
const set = (next) => {
  state = next
  try { window.localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  subs.forEach((f) => f())
}
const subscribe = (f) => (subs.add(f), () => subs.delete(f))

export const useStore = () => useSyncExternalStore(subscribe, () => state)
export const cartCount = (s) => Object.values(s.items).reduce((a, n) => a + n, 0)
export const addToCart = (id, qty = 1) => set({ ...state, items: { ...state.items, [id]: (state.items[id] || 0) + qty } })
export const setQty = (id, qty) => {
  const items = { ...state.items }
  if (qty <= 0) delete items[id]
  else items[id] = qty
  set({ ...state, items })
}
export const toggleWish = (id) => set({ ...state, wish: state.wish.includes(id) ? state.wish.filter((x) => x !== id) : [...state.wish, id] })
