import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { finePointer, prefersReduced, splitWords } from './motion'

gsap.registerPlugin(ScrollTrigger)

/*
  Scroll choreography for everything below the hero (GSAP + ScrollTrigger, transform / opacity / clip-path only).
    reveal   headings (words rise), product cards (rise → image settles → name/price → button last), why-items, reviews, map, footer
    parallax decorative blobs (slow), product images (medium), small particles (faster) — scrubbed, never mouse-driven
    bridge   sections open with a rounded mask + lift while the previous one scrolls away
  Everything animates *from* its hidden state, so with reduced motion (or if this never runs) nothing is left invisible.
  Phones keep every reveal but use shorter distances, fewer particles and no cursor effects.
*/
const SECTIONS = '.section'
const BRIDGED = '#flavours, #why, #build, #reviews, #faq, #visit'

export function useScrollFx(scope) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return
    root.querySelectorAll('[data-split]').forEach(splitWords)
    if (prefersReduced()) return

    const mobile = window.innerWidth < 900
    const fine = finePointer()
    const d = mobile ? 0.6 : 1 // distance factor
    const made = []
    const add = (parent, cls, html) => {
      const el = document.createElement('span')
      el.className = cls
      el.setAttribute('aria-hidden', 'true')
      if (html) el.innerHTML = html
      parent.insertBefore(el, parent.firstChild)
      made.push(el)
      return el
    }
    const at = (trigger, extra = {}) => ({ trigger, start: 'top 88%', toggleActions: 'play none none reverse', ...extra })
    const scrub = (trigger, extra = {}) => ({ trigger, start: 'top bottom', end: 'bottom top', scrub: 0.6, ...extra })

    const ctx = gsap.context(() => {
      /* ---------- headings ---------- */
      gsap.utils.toArray('.sec-head').forEach((h) => {
        const tl = gsap.timeline({ scrollTrigger: at(h, { start: 'top 90%' }) })
        const eb = h.querySelector('.eyebrow'), words = h.querySelectorAll('.wi'), lede = h.querySelector('.lede')
        if (eb) tl.from(eb, { y: 18, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0)
        if (words.length) tl.from(words, { yPercent: 118, rotate: 5, transformOrigin: '0 100%', duration: 1.1, stagger: 0.07, ease: 'expo.out' }, 0.08)
        if (lede) tl.from(lede, { y: 22, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.45)
      })

      /* ---------- marquee: opens like a ribbon, leans with scroll speed ---------- */
      const mq = root.querySelector('.marquee')
      if (mq) {
        gsap.from(mq, { clipPath: 'inset(0 50% 0 50%)', duration: 1.2, ease: 'expo.out', scrollTrigger: at(mq, { start: 'top 96%' }) })
        const rows = mq.querySelectorAll('.mq-row')
        ScrollTrigger.create({
          trigger: mq, start: 'top bottom', end: 'bottom top',
          onUpdate: (self) => gsap.to(rows, { skewX: gsap.utils.clamp(-7, 7, -self.getVelocity() / 260), duration: 0.5, ease: 'power3.out', overwrite: 'auto' }),
          onLeave: () => gsap.to(rows, { skewX: 0, duration: 0.6 }),
          onLeaveBack: () => gsap.to(rows, { skewX: 0, duration: 0.6 }),
        })
      }

      /* ---------- product cards ---------- */
      gsap.utils.toArray('.cards > li').forEach((li, i) => {
        const col = mobile ? 0 : i % 3
        const s = col * 0.12
        const tl = gsap.timeline({ scrollTrigger: at(li, { start: 'top 92%' }) })
        tl.from(li, { y: 90 * d, opacity: 0, scale: 0.94, rotate: i % 2 ? -1.2 : 1.2, transformOrigin: '50% 100%', duration: 1.2, ease: 'expo.out', clearProps: 'transform' }, s)
          .from(li.querySelector('.glass-box'), { scale: 0.82, y: 28 * d, duration: 1.3, ease: 'expo.out' }, s + 0.15)
          .from(li.querySelector('.card-glow'), { opacity: 0, duration: 1.1 }, s + 0.2)
          .from(li.querySelectorAll('.card-body h3, .card-body p'), { y: 16, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, s + 0.55)
          .from(li.querySelector('.price'), { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out' }, s + 0.75)
          .from(li.querySelector('.btn'), { y: 16, opacity: 0, scale: 0.88, duration: 0.7, ease: 'back.out(1.8)' }, s + 0.95)
        // the image drifts at a different speed from the card as it scrolls by
        gsap.fromTo(li.querySelector('.card-media'), { y: 16 * d }, { y: -16 * d, ease: 'none', scrollTrigger: scrub(li) })
      })

      /* ---------- why LUMA ---------- */
      gsap.utils.toArray('.why-item').forEach((it, i) => {
        const tl = gsap.timeline({ scrollTrigger: at(it, { start: 'top 92%' }) })
        const s = (mobile ? i % 2 : i) * 0.1
        tl.from(it, { y: 60 * d, opacity: 0, duration: 1, ease: 'expo.out', clearProps: 'transform' }, s)
          .from(it.querySelector('.why-ico'), { scale: 0.3, rotate: -35, opacity: 0, duration: 0.9, ease: 'back.out(1.7)' }, s + 0.2)
          .from(it.querySelectorAll('h3, p'), { y: 14, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, s + 0.45)
      })

      /* ---------- builder ---------- */
      const bp = root.querySelector('.b-sum')
      if (bp) {
        gsap.from([bp, root.querySelector('.b-add-d')].filter(Boolean), { y: 30 * d, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', scrollTrigger: at(bp, { start: 'top 95%' }) })
        gsap.fromTo('.b-disc', { yPercent: 18 }, { yPercent: -18, ease: 'none', scrollTrigger: scrub('#build') })
      }

      /* ---------- reviews ---------- */
      const rn = root.querySelector('.rev-nav')
      if (rn) gsap.from(rn, { y: 20, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: at(rn, { start: 'top 95%' }) })
      const rt = root.querySelector('.rev-track')
      if (rt) {
        gsap.from(rt.querySelectorAll('.review'), { x: 90 * d, y: 30 * d, opacity: 0, scale: 0.95, duration: 1.1, stagger: 0.12, ease: 'expo.out', clearProps: 'transform', scrollTrigger: at(rt, { start: 'top 90%' }) })
        gsap.from(rt.querySelectorAll('.q'), { scale: 0, rotate: -30, duration: 0.8, stagger: 0.12, delay: 0.3, ease: 'back.out(2)', scrollTrigger: at(rt, { start: 'top 90%' }) })
      }

      /* ---------- faq ---------- */
      const fl = root.querySelector('.faq-list')
      if (fl) gsap.from(fl.children, { y: 36 * d, opacity: 0, duration: 0.9, stagger: 0.09, ease: 'expo.out', clearProps: 'transform', scrollTrigger: at(fl, { start: 'top 90%' }) })

      /* ---------- visit ---------- */
      const vg = root.querySelector('.visit-grid')
      if (vg) {
        const parts = vg.querySelectorAll('.addr, .hours > div, .hero-cta .btn')
        gsap.from(parts, { y: 24, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out', scrollTrigger: at(vg, { start: 'top 80%' }) })
        const map = vg.querySelector('.map')
        if (map) {
          gsap.from(map, { clipPath: 'inset(12% 12% 12% 12% round 48px)', opacity: 0, scale: 0.92, duration: 1.3, ease: 'expo.out', scrollTrigger: at(map, { start: 'top 88%' }) })
          gsap.fromTo(map.querySelector('svg'), { scale: 1.22 }, { scale: 1, ease: 'none', scrollTrigger: scrub(map) })
        }
      }

      /* ---------- footer ---------- */
      const ft = root.querySelector('.footer')
      if (ft) {
        gsap.from(ft.querySelectorAll('.f-brand, .f-links'), { y: 26, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', scrollTrigger: at(ft, { start: 'top 85%' }) })
        gsap.fromTo(ft.querySelector('.f-word'), { yPercent: 45, opacity: 0.2 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: ft, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } })
      }

      /* ---------- section bridges: a rounded mask opens while the section lifts into place ---------- */
      gsap.utils.toArray(BRIDGED).forEach((sec) => {
        if (!root.contains(sec)) return
        const inset = mobile ? 'inset(28px 10px 0px 10px round 28px 28px 0px 0px)' : 'inset(56px 3% 0px 3% round 56px 56px 0px 0px)'
        gsap.fromTo(sec, { clipPath: inset }, { clipPath: 'inset(0px 0% 0px 0% round 0px 0px 0px 0px)', ease: 'none', scrollTrigger: { trigger: sec, start: 'top 100%', end: 'top 45%', scrub: 0.6 }, clearProps: 'clipPath' })
        const wrap = sec.querySelector(':scope > .wrap')
        if (wrap) gsap.fromTo(wrap, { y: 46 * d, scale: 0.975 }, { y: 0, scale: 1, ease: 'none', transformOrigin: '50% 0%', scrollTrigger: { trigger: sec, start: 'top 100%', end: 'top 40%', scrub: 0.6 }, clearProps: 'transform' })
      })

      /* ---------- background: soft light shapes (slow) and particles (faster) on every section ---------- */
      gsap.utils.toArray(SECTIONS).forEach((sec, i) => {
        const a = add(sec, 'fx-deco a'), b = add(sec, 'fx-deco b')
        gsap.fromTo(a, { yPercent: 18 }, { yPercent: -22, ease: 'none', scrollTrigger: scrub(sec) })
        gsap.fromTo(b, { yPercent: -14, xPercent: -6 }, { yPercent: 20, xPercent: 8, ease: 'none', scrollTrigger: scrub(sec) })
        gsap.to([a, b], { scale: 1.12, duration: 9 + i, ease: 'sine.inOut', repeat: -1, yoyo: true })
        const n = mobile ? 3 : 6
        for (let k = 0; k < n; k++) {
          const dot = add(sec, `fx-dot c${k % 3}`)
          gsap.set(dot, { left: `${6 + ((k * 37 + i * 19) % 88)}%`, top: `${8 + ((k * 53 + i * 31) % 80)}%`, scale: 0.6 + ((k * 7) % 5) / 5 })
          gsap.fromTo(dot, { y: 80 + k * 16 }, { y: -(120 + k * 22), ease: 'none', scrollTrigger: scrub(sec, { scrub: 0.4 }) })
        }
      })
    }, root)

    // layout above the pins may have changed while images decode
    const t = setTimeout(() => ScrollTrigger.refresh(), 400)
    void fine
    return () => {
      clearTimeout(t)
      ctx.revert()
      made.forEach((el) => el.remove())
    }
  }, [])
}
