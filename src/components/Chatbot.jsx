import { useEffect, useRef, useState } from 'react'

/* A small floating assistant with predefined questions and answers (frontend only: no API, no backend). */
const QA = [
  { q: 'What flavours do you have?', a: 'We currently offer Strawberry, Rose, Mango, Pistachio, Chocolate, and Dry Fruit Falooda.' },
  { q: 'What is the price range?', a: 'You can check the latest price for each flavour in the Flavours section.' },
  { q: 'Which flavour is most popular?', a: 'Strawberry, Rose, and Pistachio are popular choices.' },
  { q: 'Where is LUMA located?', a: 'Please check the Visit section for our location and opening hours.' },
  { q: 'How can I order?', a: 'Choose your favourite flavour and tap “Order Now”.' },
  { q: 'Do you have vegetarian options?', a: 'Yes, our Falooda range is vegetarian.' },
]

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState([]) // [{ q, a }]
  const bodyRef = useRef(null)
  const btnRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const key = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])

  useEffect(() => { // keep the newest answer in view
    const b = bodyRef.current
    if (b) b.scrollTop = b.scrollHeight
  }, [log, open])

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
          <p className="cb-msg bot">Hi! Pick a question below.</p>
          {log.map((m, i) => (
            <div key={i}>
              <p className="cb-msg me">{m.q}</p>
              <p className="cb-msg bot">{m.a}</p>
            </div>
          ))}
        </div>
        <ul className="cb-qs" aria-label="Quick questions">
          {QA.map((x) => (
            <li key={x.q}><button onClick={() => setLog((l) => [...l, x])}>{x.q}</button></li>
          ))}
        </ul>
      </section>
      <button className="cb-fab" ref={btnRef} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close chat' : 'Open LUMA Assistant'}>
        <svg className="cb-i-chat" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6a.6.6 0 0 1-1-.46V16H6.5A2.5 2.5 0 0 1 4 13.5Z" fill="currentColor" /></svg>
        <svg className="cb-i-x" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}
