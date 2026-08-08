import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../api.js'
import { useLang } from '../LanguageContext.jsx'
import RentalPlanner from '../components/RentalPlanner.jsx'
import Icon from '../components/Icons.jsx'

export default function Rentals() {
  const { t } = useLang()
  const copy = t.rentalsPage
  const [fleet, setFleet] = useState([])

  useEffect(() => {
    getProducts()
      .then((all) => setFleet(all.filter((p) => p.rental_price > 0)))
      .catch(() => {})
  }, [])

  return (
    <>
      <section className="section page">
        <div className="container">
          <div className="page-head page-head-wide">
            <span className="section-eyebrow">{copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p className="muted">{copy.lede}</p>
          </div>

          <div className="section-head">
            <div>
              <span className="section-eyebrow">{copy.whyEyebrow}</span>
              <h2>{copy.whyTitle}</h2>
            </div>
          </div>

          <div className="perks-grid">
            {copy.why.map((w) => (
              <div key={w.title} className="perk">
                <div className="perk-icon"><Icon name={w.icon} size={24} /></div>
                <div>
                  <h3>{w.title}</h3>
                  <p>{w.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RentalPlanner fleet={fleet} />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow">{copy.whoEyebrow}</span>
              <h2>{copy.whoTitle}</h2>
            </div>
          </div>
          <div className="service-grid">
            {copy.who.map((w) => (
              <div key={w.title} className="service-card">
                <div className="service-icon"><Icon name={w.icon} size={26} /></div>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow">{copy.howEyebrow}</span>
              <h2>{copy.howTitle}</h2>
            </div>
          </div>
          <div className="steps-grid">
            {copy.steps.map((s, i) => (
              <div key={s.title} className="step">
                <span className="step-number">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cta">
          <div>
            <h2>{copy.ctaTitle}</h2>
            <p>{copy.ctaText}</p>
          </div>
          <Link to="/contact" className="btn btn-primary btn-lg">{copy.ctaBtn}</Link>
        </div>
      </section>
    </>
  )
}
