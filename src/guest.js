/* The lightweight customer (name + mobile, no OTP) for this browser tab. The server hands back a signed token for the profile it created; it is kept in
   sessionStorage, so it lasts for the tab's session and is gone when the tab closes. It only lets this browser shop and pay: it is not a login. */
import { useSyncExternalStore } from 'react'

const KEY = 'luma-guest'
const read = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    if (v?.token && v.expires > Date.now()) return v
    sessionStorage.removeItem(KEY)
  } catch { /* storage blocked */ }
  return null
}
let state = typeof window === 'undefined' ? null : read()
const subs = new Set()
const set = (v) => { state = v; try { v ? sessionStorage.setItem(KEY, JSON.stringify(v)) : sessionStorage.removeItem(KEY) } catch { /* ignore */ } subs.forEach((f) => f()) }

export const getGuest = () => state
export const clearGuest = () => set(null)
export const useGuest = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state)

/* name + mobile -> a customer profile on the server -> this browser is that customer. Throws with a sentence the customer can read. */
export async function createGuest(name, mobile) {
  const r = await fetch('/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(state ? { Authorization: `Bearer ${state.token}` } : {}) }, // same tab: update this profile, never a second one
    body: JSON.stringify({ name, mobile }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.')
  set({ token: j.token, expires: j.expires, name: j.name })
}
