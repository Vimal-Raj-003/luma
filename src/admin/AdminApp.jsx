/* LUMA Super Admin (/admin). The screens here are only a convenience: the server checks the Clerk session against SUPER_ADMIN_EMAIL on every
   /api/admin call, so this page shows nothing to anyone else even if its code is opened. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { useAccount } from '../auth'
import { DayChart, Donut, Empty, SalesBars, rupees } from './charts'
import './admin.css'

const NAV = [['', 'Dashboard'], ['orders', 'Orders'], ['payments', 'Payments'], ['customers', 'Customers'], ['products', 'Products'], ['offers', 'Offers']]
const ICON = {
  '': 'M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6V11h-6v9Zm0-16v4h6V4h-6Z',
  orders: 'M6 2h12l2 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6l2-4Zm0 4h12M9 10a3 3 0 0 0 6 0',
  payments: 'M3 6h18v12H3V6Zm0 4h18M7 15h3',
  customers: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21c.8-4 4-6 8-6s7.200 2 8 6',
  products: 'M5 8l7-4 7 4v8l-7 4-7-4V8Zm7 4 7-4M12 12v8M12 12 5 8',
  offers: 'M20 12l-8 8-9-9V3h8l9 9ZM7.500 7.500h.01',
}
const Ico = ({ k }) => <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[k]} /></svg>
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—')
const dateOnly = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—')
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
const STATUS_LABEL = { CONFIRMED: 'Confirmed', PREPARING: 'Preparing', READY: 'Ready', SHIPPED: 'Shipped / Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', CREATED: 'Awaiting payment' }
const Chip = ({ s }) => <span className={`ad-chip ${s.toLowerCase()}`}>{STATUS_LABEL[s] || cap(s)}</span>
const Mono = ({ v }) => (v ? <code className="mono">{v}</code> : <span className="muted">—</span>)

/* ---- data hook: GET with the Clerk token ---- */
function useAdminApi(getToken) {
  return useCallback(async (path, init = {}) => {
    const token = await getToken()
    const r = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) }, body: init.body ? JSON.stringify(init.body) : undefined })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw Object.assign(new Error(data.error || `Request failed (${r.status})`), { status: r.status })
    return data
  }, [getToken])
}
function useLoad(api, path) {
  const [st, setSt] = useState({ data: null, error: '', loading: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    setSt((s) => ({ ...s, loading: true, error: '' }))
    api(path).then((data) => live && setSt({ data, error: '', loading: false })).catch((e) => live && setSt({ data: null, error: e.message, loading: false }))
    return () => { live = false }
  }, [api, path, n])
  return [st, () => setN((x) => x + 1), (data) => setSt({ data, error: '', loading: false })]
}
const State = ({ st, children }) => (st.loading && !st.data ? <p className="ad-note">Loading…</p> : st.error ? <p className="ad-err" role="alert">{st.error}</p> : st.data ? children() : null)

/* ---- screens ---- */
function Dashboard({ api }) {
  const [days, setDays] = useState(7)
  const [st] = useLoad(api, `/api/admin/overview?days=${days}`)
  const c = st.data?.cards
  const cards = c && [
    ['Total Revenue', rupees(c.totalRevenue)], ["Today's Revenue", rupees(c.todayRevenue)], ['Total Orders', c.totalOrders], ['Paid Orders', c.paidOrders],
    ['Pending Payments', c.pendingPayments], ['Failed Payments', c.failedPayments], ['Total Customers', c.customers], ['Active Products', c.activeProducts],
  ]
  return (
    <>
      <header className="ad-head"><h1>Dashboard</h1>
        <div className="ad-seg" role="group" aria-label="Range">{[7, 30].map((d) => <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>Last {d} days</button>)}</div>
      </header>
      <State st={st}>{() => (<>
        <div className="ad-cards">{cards.map(([k, v]) => <div className="ad-card" key={k}><span>{k}</span><b>{v}</b></div>)}</div>
        <div className="ad-grid2">
          <section className="ad-panel"><h2>Revenue</h2><DayChart series={st.data.revenue} fmt={(v) => rupees(Math.round(v))} /></section>
          <section className="ad-panel"><h2>Orders per day</h2><DayChart series={st.data.orders} kind="bar" color="var(--plum)" fmt={(v) => (Number.isInteger(v) ? v : '')} /></section>
          <section className="ad-panel"><h2>Payment status</h2><Donut rows={st.data.payments} /></section>
          <section className="ad-panel"><h2>Sales by product <small>units · revenue (paid orders)</small></h2><SalesBars rows={st.data.sales} /></section>
        </div>
      </>)}</State>
    </>
  )
}

const FILTERS = ['all', 'paid', 'pending', 'failed', 'cancelled']
const FLOW = ['CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED']
function Orders({ api }) {
  const [filter, setFilter] = useState('all')
  const [st, reload] = useLoad(api, `/api/admin/orders?filter=${filter}`)
  const [msg, setMsg] = useState('')
  const change = async (o, orderStatus) => {
    setMsg('')
    if (orderStatus === 'CANCELLED' && !window.confirm(`Cancel order ${o.id}? A cancelled order cannot be changed again.`)) return
    try { await api(`/api/admin/orders/${o.id}`, { method: 'PATCH', body: { orderStatus } }); reload() } catch (e) { setMsg(e.message) }
  }
  return (
    <>
      <header className="ad-head"><h1>Orders</h1>
        <div className="ad-seg" role="group" aria-label="Filter">{FILTERS.map((f) => <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{cap(f)}</button>)}</div>
      </header>
      {msg && <p className="ad-err" role="alert">{msg}</p>}
      <State st={st}>{() => (<>
        {!st.data.orders.length ? <Empty>No orders here yet</Empty> : (
          <div className="ad-table"><table>
            <thead><tr><th>Order ID</th><th>Customer</th><th>Email</th><th>Products</th><th>Qty</th><th>Subtotal</th><th>Shipping</th><th>Total</th><th>Payment</th><th>Order status</th><th>Razorpay Order ID</th><th>Razorpay Payment ID</th><th>Created</th></tr></thead>
            <tbody>{st.data.orders.map((o) => (
              <tr key={o.id}>
                <td><Mono v={o.id} /></td><td>{o.customer || '—'}</td><td>{o.email}</td>
                <td>{o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</td><td>{o.quantity}</td>
                <td>{rupees(o.subtotal)}</td><td>{rupees(o.shipping)}</td><td><b>{rupees(o.total)}</b></td>
                <td><Chip s={o.paymentStatus} /></td>
                <td>
                  {o.orderStatus === 'CANCELLED' ? <Chip s="CANCELLED" /> : (
                    <select value={FLOW.includes(o.orderStatus) ? o.orderStatus : ''} onChange={(e) => change(o, e.target.value)} aria-label={`Status of order ${o.id}`}>
                      {!FLOW.includes(o.orderStatus) && <option value="" disabled>Awaiting payment</option>}
                      {FLOW.map((s) => <option key={s} value={s} disabled={s !== 'CANCELLED' && o.paymentStatus !== 'PAID'}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  )}
                </td>
                <td><Mono v={o.razorpayOrderId} /></td><td><Mono v={o.razorpayPaymentId} /></td><td>{when(o.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        <p className="ad-note">An order can only be confirmed or fulfilled after Razorpay has verified its payment. Payment status cannot be set by hand.</p>
      </>)}</State>
    </>
  )
}

function Payments({ api }) {
  const [st] = useLoad(api, '/api/admin/payments')
  return (
    <>
      <header className="ad-head"><h1>Payments</h1></header>
      <State st={st}>{() => (<>
        {!st.data.payments.length ? <Empty>No payments yet</Empty> : (
          <div className="ad-table"><table>
            <thead><tr><th>Payment ID</th><th>Order ID</th><th>Customer</th><th>Amount</th><th>Razorpay Payment ID</th><th>Razorpay Order ID</th><th>Status</th><th>Time</th></tr></thead>
            <tbody>{st.data.payments.map((p) => (
              <tr key={p.id}><td><Mono v={p.id} /></td><td><Mono v={p.orderId} /></td><td>{p.customer || p.email}<br /><span className="muted">{p.customer ? p.email : ''}</span></td><td><b>{rupees(p.amount)}</b></td>
                <td><Mono v={p.razorpayPaymentId} /></td><td><Mono v={p.razorpayOrderId} /></td><td><Chip s={p.status} /></td><td>{when(p.updatedAt)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </>)}</State>
    </>
  )
}

function Customers({ api }) {
  const [st] = useLoad(api, '/api/admin/customers')
  return (
    <>
      <header className="ad-head"><h1>Customers</h1></header>
      <State st={st}>{() => (<>
        {!st.data.customers.length ? <Empty>No customers yet</Empty> : (
          <div className="ad-table"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Orders</th><th>Total spend</th><th>Latest order</th></tr></thead>
            <tbody>{st.data.customers.map((u) => <tr key={u.id}><td>{u.name || '—'}</td><td>{u.email}</td><td>{dateOnly(u.joined)}</td><td>{u.orders}</td><td><b>{rupees(u.spend)}</b></td><td>{dateOnly(u.latestOrder)}</td></tr>)}</tbody>
          </table></div>
        )}
      </>)}</State>
    </>
  )
}

/* shrink + convert a chosen picture to WebP in the browser (keeps transparency), so what is stored in the database stays small */
async function prepareImage(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Please choose a PNG, JPEG or WebP image.')
  if (file.size > 12 * 1024 * 1024) throw new Error('That image is too large (max 12 MB).')
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('That file could not be read as an image.') })
  const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height))
  const cv = document.createElement('canvas')
  cv.width = Math.round(bmp.width * scale); cv.height = Math.round(bmp.height * scale)
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height)
  for (const q of [0.88, 0.75, 0.6, 0.45]) {
    const url = cv.toDataURL('image/webp', q)
    if (url.startsWith('data:image/webp') && (url.length - 23) * 0.75 < 680 * 1024) return url
  }
  throw new Error('That image is still too large after compression. Please use a smaller one.')
}

const BLANK = { id: null, name: '', flavour: '', description: '', price: 199, sortOrder: 100, active: true, archived: false, imageUrl: '', orderCount: 0 }

/* One row = one product, for viewing, editing and (when p.id is null) adding. Each action is a single call to the products API. */
function ProductRow({ p, api, onSaved, onCancel }) {
  const adding = !p.id
  const [f, setF] = useState({ name: p.name, flavour: p.flavour, description: p.description, price: String(adding ? p.price : p.price / 100), sortOrder: String(p.sortOrder) })
  const [image, setImage] = useState(null) // a replacement picture, as a WebP data URL, until saved
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const dirty = adding || !!image || f.name !== p.name || f.flavour !== p.flavour || f.description !== p.description || Number(f.price) !== p.price / 100 || Number(f.sortOrder) !== p.sortOrder

  const run = async (path, init, ok) => {
    if (busy) return // no double submits
    setBusy(true); setMsg('')
    try { const r = await api(path, init); onSaved(r); setMsg(ok); if (adding) onCancel() } catch (e) { setMsg(e.message) }
    setBusy(false)
  }
  const pick = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setMsg('')
    try { setImage(await prepareImage(file)) } catch (x) { setMsg(x.message) }
  }
  const save = () => {
    const name = f.name.trim(), price = Number(f.price), sortOrder = Number(f.sortOrder)
    if (name.length < 2) return setMsg('Please enter a product name.')
    if (!Number.isInteger(price) || price < 1) return setMsg('Price must be a whole number of rupees, more than 0.')
    if (!Number.isInteger(sortOrder) || sortOrder < 0) return setMsg('Sort order must be a whole number, 0 or more.')
    if (adding && !image) return setMsg('Please add a product image.')
    const body = { name, flavour: f.flavour.trim() || name, description: f.description, price, sortOrder, ...(image ? { image } : {}) }
    if (adding) run('/api/admin/products', { method: 'POST', body: { ...body, active: p.active } }, 'Added')
    else run(`/api/admin/products/${p.id}`, { method: 'PATCH', body }, 'Saved')
  }
  const archives = p.orderCount > 0 || p.offerPrice != null
  const remove = () => {
    const text = archives
      ? `Archive "${p.name}"? It ${p.orderCount ? 'has order history' : 'carries the ₹1 offer'}, so it will be hidden from the website and kept in the database.`
      : `Delete "${p.name}" permanently? It has never been ordered.`
    if (window.confirm(text)) run(`/api/admin/products/${p.id}`, { method: 'DELETE' }, '')
  }
  const shown = image || p.imageUrl

  return (
    <li className={`ad-prod${p.active && !p.archived ? '' : ' off'}${adding ? ' new' : ''}`}>
      <div className="pic">
        {shown ? <img src={shown} alt="" /> : <div className="ph">No image</div>}
        {!p.archived && <label className="ad-btn ghost sm">{adding || !p.imageUrl ? 'Add image' : 'Change image'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} hidden /></label>}
        {image && <span className="muted">New image ready. Press {adding ? 'Add product' : 'Save'}.</span>}
      </div>
      <div className="f">
        <label className="w2">Name<input value={f.name} onChange={set('name')} maxLength={80} disabled={p.archived} /></label>
        <label>Flavour<input value={f.flavour} onChange={set('flavour')} maxLength={40} placeholder="e.g. Mango" disabled={p.archived} /></label>
        <label>Price (₹)<input type="number" min="1" max="100000" step="1" inputMode="numeric" value={f.price} onChange={set('price')} disabled={p.archived} /></label>
        <label>Sort order<input type="number" min="0" max="9999" step="1" inputMode="numeric" value={f.sortOrder} onChange={set('sortOrder')} disabled={p.archived} /></label>
        <label className="w3">Description<textarea rows={2} value={f.description} onChange={set('description')} maxLength={400} disabled={p.archived} /></label>
        {!adding && <p className="muted w3">{p.orderCount ? `${p.orderCount} order line${p.orderCount === 1 ? '' : 's'} in history` : 'Never ordered'}{p.offerPrice != null ? ' · carries the ₹1 offer (managed under Offers)' : ''}</p>}
      </div>
      <div className="a">
        {p.archived ? (
          <button className="ad-btn ghost" disabled={busy} onClick={() => run(`/api/admin/products/${p.id}`, { method: 'PATCH', body: { archived: false } }, 'Restored (unavailable until switched on)')}>Restore</button>
        ) : (<>
          {!adding && <label className="ad-switch"><input type="checkbox" checked={p.active} disabled={busy} onChange={(e) => run(`/api/admin/products/${p.id}`, { method: 'PATCH', body: { active: e.target.checked } }, 'Saved')} /><i /><span>{p.active ? 'Available' : 'Unavailable'}</span></label>}
          <button className="ad-btn" disabled={busy || !dirty} onClick={save}>{adding ? 'Add product' : 'Save'}</button>
          {adding ? <button className="ad-btn ghost" onClick={onCancel}>Cancel</button> : <button className="ad-btn ghost danger" disabled={busy} onClick={remove}>{archives ? 'Archive' : 'Delete'}</button>}
        </>)}
        {msg && <span className={/^(Saved|Added|Restored)/.test(msg) ? 'ad-ok' : 'ad-err-inline'} role="status">{msg}</span>}
      </div>
    </li>
  )
}
function Products({ api }) {
  const [st, , put] = useLoad(api, '/api/admin/products')
  const [adding, setAdding] = useState(false)
  const rowKey = (p) => `${p.id}:${p.name}:${p.flavour}:${p.description}:${p.price}:${p.sortOrder}:${p.active}:${p.archived}:${p.imageUrl}`
  return (
    <>
      <header className="ad-head"><h1>Products</h1>{!adding && <button className="ad-btn" onClick={() => setAdding(true)}>+ Add Product</button>}</header>
      <State st={st}>{() => {
        const live = st.data.products.filter((p) => !p.archived), archived = st.data.products.filter((p) => p.archived)
        return (<>
          <ul className="ad-prods">
            {adding && <ProductRow key="new" p={BLANK} api={api} onSaved={put} onCancel={() => setAdding(false)} />}
            {live.map((p) => <ProductRow key={rowKey(p)} p={p} api={api} onSaved={put} />)}
          </ul>
          {archived.length > 0 && <><h2 className="ad-sub">Archived</h2><ul className="ad-prods">{archived.map((p) => <ProductRow key={rowKey(p)} p={p} api={api} onSaved={put} />)}</ul></>}
          <p className="ad-note">Changes reach the customer website straight away, in sort order (lowest first). A product that has been ordered is archived, never deleted, so order history stays intact. The ₹1 offer price is managed under Offers.</p>
        </>)
      }}</State>
    </>
  )
}

function Offers({ api }) {
  const [st, , put] = useLoad(api, '/api/admin/offer')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const set = async (enabled) => { setBusy(true); setMsg(''); try { put(await api('/api/admin/offer', { method: 'PATCH', body: { enabled } })) } catch (e) { setMsg(e.message) } setBusy(false) }
  const o = st.data
  return (
    <>
      <header className="ad-head"><h1>Offers</h1></header>
      <State st={st}>{() => (<>
        <section className="ad-panel ad-offer">
          <div><h2>LUMA ₹1 Special Offer</h2>
            <p className={`ad-state ${o.enabled ? 'on' : 'off'}`}>{o.enabled ? 'Enabled: visible to every visitor' : 'Disabled: hidden from the customer website'}</p>
            {o.enabled && !o.productActive && <p className="ad-err">The Strawberry product is unavailable, so the offer is hidden until it is made available again.</p>}
          </div>
          <button className={`ad-btn ${o.enabled ? 'ghost' : ''}`} disabled={busy} onClick={() => set(!o.enabled)}>{o.enabled ? 'Disable offer' : 'Enable offer'}</button>
        </section>
        {msg && <p className="ad-err" role="alert">{msg}</p>}
        <section className="ad-panel"><h2>Offer rules <small>fixed</small></h2>
          <dl className="ad-rules"><dt>Price</dt><dd>₹1</dd><dt>Shipping</dt><dd>₹0</dd><dt>Quantity</dt><dd>1 per order</dd><dt>Handling fee</dt><dd>₹0</dd><dt>Razorpay amount</dt><dd>100 paise</dd></dl>
        </section>
      </>)}</State>
    </>
  )
}

/* ---- shell ---- */
const SCREENS = { '': Dashboard, orders: Orders, payments: Payments, customers: Customers, products: Products, offers: Offers }
const sectionOf = () => (window.location.pathname.replace(/^\/admin\/?/, '').split('/')[0] || '')

function Shell({ api }) {
  const clerk = useClerk()
  const [sec, setSec] = useState(sectionOf)
  const [open, setOpen] = useState(false)
  useEffect(() => { const on = () => setSec(sectionOf()); window.addEventListener('popstate', on); return () => window.removeEventListener('popstate', on) }, [])
  const go = (k) => (e) => { e.preventDefault(); history.pushState(null, '', '/admin' + (k ? '/' + k : '')); setSec(k); setOpen(false); window.scrollTo(0, 0) }
  const Screen = SCREENS[sec] || Dashboard
  return (
    <div className="adm">
      <div className="ad-bar"><button className="ad-burger" onClick={() => setOpen(true)} aria-label="Open menu"><span /><span /><span /></button><b>LUMA <small>Super Admin</small></b></div>
      {open && <div className="ad-scrim" onClick={() => setOpen(false)} />}
      <aside className={`ad-side${open ? ' open' : ''}`}>
        <div className="ad-brand">LUMA<small>Super Admin</small></div>
        <nav aria-label="Admin">{NAV.map(([k, label]) => <a key={k} href={'/admin' + (k ? '/' + k : '')} className={sec === k ? 'on' : ''} onClick={go(k)}><Ico k={k} />{label}</a>)}</nav>
        <div className="ad-foot"><a href="/">← Back to LUMA</a><button onClick={() => clerk.signOut({ redirectUrl: '/' })}>Logout</button></div>
      </aside>
      <main className="ad-main"><Screen key={sec} api={api} /></main>
    </div>
  )
}

function Gate({ children, title, text, action }) {
  return (
    <div className="adm ad-gate"><div className="ad-gatebox">
      <div className="ad-brand">LUMA<small>Super Admin</small></div>
      <h1>{title}</h1><p>{text}</p>
      <div className="ad-gateact">{action}<a className="ad-btn ghost" href="/">Back to LUMA</a></div>{children}
    </div></div>
  )
}

export default function AdminApp() {
  const acct = useAccount()
  const api = useAdminApi(acct.getToken)
  const [state, setState] = useState('checking') // checking | ok | denied | error
  const tried = useRef(false)
  useEffect(() => {
    if (!acct.loaded || !acct.signedIn || tried.current) return
    tried.current = true
    api('/api/admin/me').then(() => setState('ok')).catch((e) => setState(e.status === 403 || e.status === 401 ? 'denied' : 'error'))
  }, [acct.loaded, acct.signedIn, api])
  useEffect(() => { // anyone else is sent back to the customer site
    if (state !== 'denied') return
    const t = setTimeout(() => window.location.replace('/'), 2500)
    return () => clearTimeout(t)
  }, [state])

  if (!acct.loaded) return <Gate title="Super Admin" text="Loading…" />
  if (!acct.signedIn) return <Gate title="Super Admin" text="Sign in with the authorized account to continue." action={<button className="ad-btn" onClick={acct.signIn}>Sign in</button>} />
  if (state === 'checking') return <Gate title="Super Admin" text="Checking access…" />
  if (state === 'denied') return <Gate title="Unauthorized" text="This account does not have access to the admin area. Taking you back to the LUMA website…" />
  if (state === 'error') return <Gate title="Something went wrong" text="The admin service could not be reached. Please try again." action={<button className="ad-btn" onClick={() => window.location.reload()}>Retry</button>} />
  return <Shell api={api} />
}
