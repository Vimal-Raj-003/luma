import { Logo } from './Nav'
import { SITE } from '../data/site'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="f-top">
          <div className="f-brand">
            <Logo light />
            <p className="f-tag">“Layers of Happiness.”</p>
          </div>
          <nav className="f-links" aria-label="Footer">
            <a href="#flavours">Menu</a>
            <a href="#signature">About</a>
            <a href="#visit">Contact</a>
            <a href={SITE.contact.instagramHref}>Instagram</a>
            <a href={SITE.contact.orderHref}>Order Online</a>
          </nav>
        </div>
        <div className="f-word" aria-hidden="true">LUMA</div>
        <div className="f-bot">
          <span>© {new Date().getFullYear()} LUMA. All rights reserved.</span>
          <span>Made layer by layer.</span>
        </div>
      </div>
    </footer>
  )
}
