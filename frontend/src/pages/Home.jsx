import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, getServices } from '../api.js'
import { useLang } from '../LanguageContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import RentalPlanner from '../components/RentalPlanner.jsx'
import Icon from '../components/Icons.jsx'

const PERK_ICONS = ['truck', 'shield', 'wrench', 'star']

export default function Home() {
  const { t, loc } = useLang()
  const [featured, setFeatured] = useState([])
  const [rentals, setRentals] = useState([])
  const [services, setServices] = useState([])

  useEffect(() => {
    getProducts().then((all) => {
      setFeatured(all.filter((p) => p.badge).slice(0, 4))
      setRentals(all.filter((p) => p.rental_price > 0))
    }).catch(() => {})
    getServices().then((s) => setServices(s.slice(0, 4))).catch(() => {})
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-content">
            <span className="hero-eyebrow">{t.hero.eyebrow}</span>
            <h1>
              {t.hero.title1}
              <br />
              <span className="text-gradient">{t.hero.title2}</span>
            </h1>
            <p className="hero-lede">{t.hero.lede}</p>
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-primary btn-lg">
                {t.hero.shopBtn} <Icon name="laptop" size={18} />
              </Link>
              <Link to="/services" className="btn btn-ghost btn-lg">
                {t.hero.repairBtn} <Icon name="wrench" size={18} />
              </Link>
            </div>
            <div className="hero-stats">
              <div><strong>1,200+</strong><span>{t.hero.customers}</span></div>
              <div><strong>5,000+</strong><span>{t.hero.repaired}</span></div>
              <div><strong>4.9★</strong><span>{t.hero.rating}</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card">
              <img src="/logo.jpg" alt="MajustelServices" className="hero-logo" />
              <div className="hero-card-title">MajustelServices</div>
              <div className="hero-card-sub">{t.hero.cardSub}</div>
            </div>
            <div className="hero-blob" />
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="section perks">
        <div className="container perks-grid">
          {t.perks.map((p, i) => (
            <div key={p.title} className="perk">
              <div className="perk-icon"><Icon name={PERK_ICONS[i]} size={24} /></div>
              <div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Rentals */}
      <RentalPlanner fleet={rentals} />

      {/* Featured products */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow">{t.home.featuredEyebrow}</span>
              <h2>{t.home.featuredTitle}</h2>
            </div>
            <Link to="/shop" className="btn btn-ghost">{t.home.viewAll}</Link>
          </div>
          <div className="product-grid">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Services teaser */}
      <section className="section section-dark">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow">{t.home.maintenanceEyebrow}</span>
              <h2>{t.home.maintenanceTitle}</h2>
            </div>
            <Link to="/services" className="btn btn-primary">{t.home.allServices}</Link>
          </div>
          <div className="service-grid">
            {services.map((s) => (
              <div key={s.id} className="service-card service-card-dark">
                <div className="service-icon"><Icon name={s.icon} size={26} /></div>
                <h3>{loc(s, 'name')}</h3>
                <p>{loc(s, 'description')}</p>
                <div className="service-meta">
                  <span>{s.price_from > 0 ? `${t.servicesPage.from} $${s.price_from}` : t.servicesPage.free}</span>
                  <span className="muted-inverse"><Icon name="clock" size={14} /> {loc(s, 'duration')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container cta">
          <div>
            <h2>{t.home.ctaTitle}</h2>
            <p>{t.home.ctaText}</p>
          </div>
          <Link to="/contact" className="btn btn-primary btn-lg">{t.home.ctaBtn}</Link>
        </div>
      </section>
    </>
  )
}
