/* GET /api/health: which server-side settings the running function can see. It reports only "set" / "empty" / "missing" per variable name and the KIND of the two
   payment / sign-in keys (their public prefix: sk_test, sk_live, rzp_test, rzp_live). It never returns a value. */
import { db } from './db.mjs'

const REQUIRED = ['DATABASE_URL', 'CLERK_SECRET_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'SUPER_ADMIN_EMAIL']
const OPTIONAL = ['DIRECT_URL', 'GUEST_TOKEN_SECRET'] // DIRECT_URL is only for migrations; GUEST_TOKEN_SECRET falls back to the Clerk secret
const EXPECTED = new Set([...REQUIRED, ...OPTIONAL])
const state = (k) => { const v = process.env[k]; return v === undefined ? 'missing' : v.trim() === '' ? 'empty' : 'set' }
const kind = (k, prefixes) => { const v = (process.env[k] || '').trim(); return prefixes.find((p) => v.startsWith(p)) || (v ? 'unrecognised' : null) }

export async function health() {
  const env = Object.fromEntries([...REQUIRED, ...OPTIONAL].map((k) => [k, state(k)]))
  let database = 'ok'
  try { await db.$queryRaw`select 1` } catch { database = 'unreachable' }
  const missing = REQUIRED.filter((k) => env[k] !== 'set')
  // variables that LOOK like ours but are not spelled exactly right (a typo, a trailing space, a lowercase name): names only, JSON shows any stray space
  const lookalikes = Object.keys(process.env).filter((k) => !EXPECTED.has(k) && /CLERK|RAZOR|SUPER_?ADMIN|GUEST|DATABASE|DIRECT_?URL|SECRET/i.test(k))
  return {
    ok: !missing.length && database === 'ok',
    missing, // names only
    lookalikes,
    runtime: process.env.VERCEL_ENV || (process.env.VERCEL ? 'vercel' : 'local'),
    database,
    env,
    keys: { clerkSecret: kind('CLERK_SECRET_KEY', ['sk_test', 'sk_live']), razorpay: kind('RAZORPAY_KEY_ID', ['rzp_test', 'rzp_live']) },
  }
}
