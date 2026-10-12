import { useEffect, useRef, useState } from 'react'

/* A small floating assistant. Frontend only: predefined answers, typed messages are matched to them by keyword (no API, no backend). */
const QA = [
  { q: 'What flavours do you have?', a: 'We currently offer Strawberry, Rose, Mango, Pistachio, Chocolate, and Dry Fruit Falooda.' },
  { q: 'What is the price range?', a: 'You can check the latest price for each flavour in the Flavours section.' },
  { q: 'Which flavour is most popular?', a: 'Strawberry, Rose, and Pistachio are popular choices.' },
  { q: 'Where is LUMA located?', a: 'Please check the Visit section for our location and opening hours.' },
  { q: 'How can I order?', a: 'Choose your favourite flavour and tap “Order Now”.' },
  { q: 'Do you have vegetarian options?', a: 'Yes, our Falooda range is vegetarian.' },
]
const [FLAVOURS, PRICE, POPULAR, WHERE, ORDER, VEG] = QA.map((x) => x.a)

// typed messages → the closest predefined answer
const RULES = [
  [/\b(veg|vegetarian|vegan|egg|eggless|jain)\b/, VEG],
  [/\b(price|prices|cost|costs|how much|rate|rates|rupee|rupees|expensive|cheap|rs)\b|₹/, PRICE],
  [/\b(popular|best|bestseller|favou?rite|recommend|recommendation|famous|top)\b/, POPULAR],
  [/\b(where|location|located|address|map|direction|directions|open|opening|hours|timing|timings|close|visit|find|near)\b/, WHERE],
  [/\b(order|buy|purchase|delivery|deliver|book|cart|checkout|pay|payment)\b/, ORDER],
  [/\b(flavou?rs?|menu|varieties|types|kinds|offer|have|available|strawberry|rose|mango|pistachio|chocolate|dry fruit)\b/, FLAVOURS],
]
const reply = (text) => {
  const t = text.toLowerCase()
  if (/^\s*(hi|hello|hey|hii|hola|good (morning|afternoon|evening))\b/.test(t)) return 'Hello! How can we help you today?'
  if (/\b(thanks|thank you|thx)\b/.test(t)) return 'You’re welcome! Let us know if there is anything else.'
  for (const [re, a] of RULES) if (re.test(t)) return a
  return 'Sorry, I’m not sure about that yet. Try one of the quick questions below, or check the Flavours and Visit sections.'
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([]) // [{ from: 'me' | 'bot', text, qa? }]
  const [text, setText] = useState('')
  const bodyRef = useRef(null)
  const lastMe = useRef(null) // the newest user bubble
  const btnRef = useRef(null)
  const inputRef = useRef(null)
  const timers = useRef([])
  const asked = new Set(msgs.filter((m) => m.qa).map((m) => m.text))
  const left = QA.filter((x) => !asked.has(x.q))
  const lastMeIndex = msgs.map((m) => m.from).lastIndexOf('me')

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (!open) return
    const key = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])

  useEffect(() => { // bring the newest question (and the answer under it) into view, smoothly; nothing is reset
    const b = bodyRef.current, q = lastMe.current
    if (!b || !q) return
    b.scrollTo({ top: Math.max(0, q.offsetTop - 8), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [msgs.length])

  const say = (q, a, qa) => {
    setMsgs((l) => [...l, { from: 'me', text: q, qa }])
    timers.current.push(setTimeout(() => setMsgs((l) => [...l, { from: 'bot', text: a }]), 380))
  }
  const send = (e) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setText('')
    say(t, reply(t), false)
    inputRef.current?.focus()
  }
  const close = () => { setOpen(false); btnRef.current?.focus() }

  return (
    <div className={`cb${open ? ' open' : ''}`}>
      <section className="cb-panel" role="dialog" aria-label="LUMA Assistant" aria-hidden={!open} inert={!open}>
        <header className="cb-head">
          <div>
            <h2>LUMA Assistant</h2>
            <p>How can we help?</p>
          </div>
          <button className="cb-x" onClick={close} aria-label="Close chat">
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="cb-body" ref={bodyRef} aria-live="polite">
          <p className="cb-msg bot">Hi 👋 How can we help you today?</p>
          <p className="cb-msg bot cb-sub">You can choose a quick question below or type your own message.</p>
          {msgs.map((m, i) => (
            <p key={i} className={`cb-msg ${m.from === 'me' ? 'me' : 'bot'}`} ref={i === lastMeIndex ? lastMe : null}>{m.text}</p>
          ))}
          {left.length > 0 && (
            <ul className="cb-qs" aria-label="Quick questions">
              {left.map((x) => (
                <li key={x.q}><button onClick={() => say(x.q, x.a, true)}>{x.q}</button></li>
              ))}
            </ul>
          )}
        </div>
        <form className="cb-form" onSubmit={send}>
          <input ref={inputRef} className="cb-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message…" maxLength={200} aria-label="Type your message" autoComplete="off" enterKeyHint="send" />
          <button className="cb-send" type="submit" aria-label="Send message" disabled={!text.trim()}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.3 10l12 2-12 2 .1 6.4Z" fill="currentColor" /></svg>
          </button>
        </form>
      </section>
      <button className="cb-fab" ref={btnRef} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close chat' : 'Open LUMA Assistant'}>
        <svg className="cb-i-chat" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6a.6.6 0 0 1-1-.46V16H6.5A2.5 2.5 0 0 1 4 13.5Z" fill="currentColor" /></svg>
        <svg className="cb-i-x" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}
