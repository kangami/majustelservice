import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useCart } from '../CartContext.jsx'
import { useAuth } from '../AuthContext.jsx'
import { useLang } from '../LanguageContext.jsx'
import Icon from './Icons.jsx'

export default function Navbar() {
  const { count, setOpen } = useCart()
  const { user } = useAuth()
  const { lang, setLang, t } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { to: '/', label: t.nav.home, end: true },
    { to: '/shop', label: t.nav.shop },
    { to: '/rentals', label: t.nav.rentals },
    { to: '/services', label: t.nav.services },
    { to: '/contact', label: t.nav.contact },
  ]

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <img src="/logo.jpg" alt="MajustelServices logo" className="brand-logo" />
          <span className="brand-name">
            Majustel<span className="brand-accent">Services</span>
          </span>
        </Link>

        <nav className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          {user && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link nav-link-admin ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {t.nav.admin}
            </NavLink>
          )}
        </nav>

        <div className="nav-actions">
          <button
            className="lang-toggle"
            onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
            aria-label={lang === 'en' ? 'Passer en français' : 'Switch to English'}
            title={lang === 'en' ? 'Passer en français' : 'Switch to English'}
          >
            {lang === 'en' ? 'FR' : 'EN'}
          </button>
          {user && (
            <Link
              to="/admin"
              className="account-button"
              aria-label={t.nav.admin}
              title={`${t.admin.signedInAs} ${user.username}`}
            >
              <Icon name="shield" size={20} />
            </Link>
          )}
          <button className="cart-button" onClick={() => setOpen(true)} aria-label="Cart">
            <Icon name="cart" size={22} />
            {count > 0 && <span className="cart-badge">{count}</span>}
          </button>
          <button
            className="menu-button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={22} />
          </button>
        </div>
      </div>
    </header>
  )
}
