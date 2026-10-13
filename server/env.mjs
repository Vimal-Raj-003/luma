/* Loads .env.local once when it exists (on a host the variables come from its own environment instead). */
let done = false
export function loadEnv() {
  if (done) return
  done = true
  try { process.loadEnvFile(new URL('../.env.local', import.meta.url)) } catch { /* none */ }
}
