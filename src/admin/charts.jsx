/* Small dependency-free SVG charts for the Super Admin dashboard. They draw at the real pixel width of their box, so text stays readable on phones. */
import { useEffect, useRef, useState } from 'react'

export const rupees = (paise) => '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })
const short = (d) => { const [, m, day] = d.split('-'); return `${+day} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]}` }

function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.floor(el.clientWidth)))
    ro.observe(el)
    setW(Math.floor(el.clientWidth))
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

export const Empty = ({ children = 'No data yet' }) => <div className="ad-empty">{children}</div>

const niceMax = (v) => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p }

/* line (area) or bar chart over days. series: [{ day, value }]; fmt formats a value for the axis / tooltip */
export function DayChart({ series, kind = 'line', fmt = (v) => v, color = 'var(--rose)' }) {
  const [ref, w] = useWidth()
  const [hover, setHover] = useState(null)
  const total = series.reduce((a, s) => a + s.value, 0)
  const H = 230, L = 46, R = 10, T = 12, B = 28
  const iw = Math.max(10, w - L - R), ih = H - T - B
  const max = niceMax(Math.max(...series.map((s) => s.value), 0))
  const n = series.length
  const x = (i) => L + (kind === 'bar' ? (i + 0.5) * (iw / n) : n === 1 ? iw / 2 : (i * iw) / (n - 1))
  const y = (v) => T + ih - (v / max) * ih
  const step = Math.ceil(n / Math.max(2, Math.floor(iw / 62)))
  const line = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(s.value).toFixed(1)}`).join(' ')
  return (
    <div ref={ref} className="ad-chart">
      {total === 0 ? <Empty>No data for this period yet</Empty> : w > 0 && (
        <svg width={w} height={H} role="img" onMouseLeave={() => setHover(null)}>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={L} x2={w - R} y1={y(max * t)} y2={y(max * t)} className="ad-grid" />
              <text x={L - 8} y={y(max * t) + 4} textAnchor="end" className="ad-axis">{fmt(max * t)}</text>
            </g>
          ))}
          {kind === 'line' && (<>
            <path d={`${line} L${x(n - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill={color} opacity="0.12" />
            <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          </>)}
          {series.map((s, i) => {
            const bw = Math.max(3, Math.min(34, (iw / n) * 0.62))
            return (
              <g key={s.day} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
                <rect x={x(i) - iw / n / 2} y={T} width={iw / n} height={ih} fill="transparent" />
                {kind === 'bar'
                  ? <rect x={x(i) - bw / 2} y={y(s.value)} width={bw} height={Math.max(0, y(0) - y(s.value))} rx="3" fill={color} opacity={hover === i ? 1 : 0.85} />
                  : <circle cx={x(i)} cy={y(s.value)} r={hover === i ? 4.5 : n <= 10 ? 3 : 0} fill={color} />}
                {i % step === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" className="ad-axis">{short(s.day)}</text>}
              </g>
            )
          })}
          {hover != null && (() => {
            const s = series[hover], tx = Math.min(Math.max(x(hover), 70), w - 70)
            return <g className="ad-tip"><rect x={tx - 62} y={2} width="124" height="34" rx="8" /><text x={tx} y={16} textAnchor="middle">{short(s.day)}</text><text x={tx} y={30} textAnchor="middle" className="b">{fmt(s.value)}</text></g>
          })()}
        </svg>
      )}
    </div>
  )
}

/* horizontal bars: rows [{ name, units, revenue }] */
export function SalesBars({ rows }) {
  const max = Math.max(...rows.map((r) => r.units), 0)
  if (!max) return <Empty>No paid sales yet</Empty>
  return (
    <ul className="ad-bars">
      {rows.map((r) => (
        <li key={r.name}>
          <span className="n">{r.name}</span>
          <span className="t"><i style={{ width: `${(r.units / max) * 100}%` }} /></span>
          <span className="v">{r.units} <small>· {rupees(r.revenue)}</small></span>
        </li>
      ))}
    </ul>
  )
}

/* donut: rows [{ label, value }] in the order Successful / Pending / Failed */
const DONUT = ['var(--ok)', 'var(--warn)', 'var(--bad)']
export function Donut({ rows }) {
  const total = rows.reduce((a, r) => a + r.value, 0)
  if (!total) return <Empty>No payments yet</Empty>
  const R = 54, C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="ad-donut">
      <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="Payment status">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line)" strokeWidth="18" />
        {rows.map((r, i) => {
          const len = (r.value / total) * C, off = -acc
          acc += len
          return r.value ? <circle key={r.label} cx="70" cy="70" r={R} fill="none" stroke={DONUT[i]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={off} transform="rotate(-90 70 70)" /> : null
        })}
        <text x="70" y="68" textAnchor="middle" className="dn">{total}</text>
        <text x="70" y="86" textAnchor="middle" className="ds">payments</text>
      </svg>
      <ul>{rows.map((r, i) => <li key={r.label}><i style={{ background: DONUT[i] }} />{r.label}<b>{r.value}</b></li>)}</ul>
    </div>
  )
}
