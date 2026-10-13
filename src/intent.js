/* What the visitor was doing when we asked them to sign in or create an account ({ type: 'buy', id, qty }, { type: 'pay' } or { type: 'offer' }).
   It lives in sessionStorage, so it survives Clerk / Google reloading the page, and is replayed once they are signed in (the 'luma:resume' event). */
const INTENT = 'luma-intent'
export const rememberIntent = (i) => { try { sessionStorage.setItem(INTENT, JSON.stringify(i)) } catch { /* ignore */ } }
export const forgetIntent = () => { try { sessionStorage.removeItem(INTENT) } catch { /* ignore */ } }
export const takeIntent = () => { try { const v = JSON.parse(sessionStorage.getItem(INTENT) || 'null'); sessionStorage.removeItem(INTENT); return v } catch { return null } }

/* Offer the saved intent to the part of the page that handles it ('luma:resume'), and keep offering it until that part has mounted. */
export const replayIntent = (intent) => {
  if (!intent) return
  const detail = { ...intent, handled: false }
  let tries = 0
  const fire = () => { window.dispatchEvent(new CustomEvent('luma:resume', { detail })); if (!detail.handled && ++tries < 20) setTimeout(fire, 500) }
  setTimeout(fire, 400)
}
