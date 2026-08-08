import { Link } from 'react-router-dom'
import { useLang } from '../LanguageContext.jsx'
import { CONTACT_INFO } from '../translations.js'
import Icon from './Icons.jsx'

export default function Footer() {
  const { t } = useLang()

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="brand footer-brand">
            <img src="/logo.jpg" alt="MajustelServices logo" className="brand-logo" />
            <span className="brand-name footer-brand-name">
              Majustel<span className="brand-accent">Services</span>
            </span>
          </div>
          <p className="footer-text">{t.footer.tagline}</p>
        </div>

        <div>
          <h4 className="footer-title">{t.footer.explore}</h4>
          <ul className="footer-list">
            <li><Link to="/shop">{t.footer.laptops}</Link></li>
            <li><Link to="/shop">{t.footer.accessories}</Link></li>
            <li><a href="/#rentals">{t.footer.rentals}</a></li>
            <li><Link to="/services">{t.footer.maintenance}</Link></li>
            <li><Link to="/contact">{t.footer.contactUs}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer-title">{t.footer.servicesCol}</h4>
          <ul className="footer-list">
            <li><Link to="/services">{t.footer.diagnostics}</Link></li>
            <li><Link to="/services">{t.footer.virusRemoval}</Link></li>
            <li><Link to="/services">{t.footer.screenReplacement}</Link></li>
            <li><Link to="/services">{t.footer.upgrades}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer-title">{t.footer.getInTouch}</h4>
          <ul className="footer-list footer-contact">
            <li><Icon name="phone" size={16} /> <a href={CONTACT_INFO.phoneHref}>{CONTACT_INFO.phone}</a></li>
            <li><Icon name="mail" size={16} /> <a href={CONTACT_INFO.emailHref}>{CONTACT_INFO.email}</a></li>
            <li><Icon name="pin" size={16} /> {CONTACT_INFO.address}</li>
            <li><Icon name="clock" size={16} /> {t.contact.hoursValue}</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          © {new Date().getFullYear()} MajustelServices. {t.footer.rights}
        </div>
      </div>
    </footer>
  )
}
