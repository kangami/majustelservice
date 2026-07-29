import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getServices } from '../api.js'
import { useLang } from '../LanguageContext.jsx'
import Icon from '../components/Icons.jsx'

export default function Services() {
  const { t, loc } = useLang()
  const [services, setServices] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    getServices().then(setServices).catch((e) => setError(e.message))
  }, [])

  return (
    <>
      <section className="section page">
        <div className="container">
          <div className="page-head">
            <span className="section-eyebrow">{t.servicesPage.eyebrow}</span>
            <h1>{t.servicesPage.title}</h1>
            <p className="muted">{t.servicesPage.sub}</p>
          </div>

          {error && <div className="alert alert-error">{t.servicesPage.loadError}: {error}. {t.shop.backendHint}</div>}

          <div className="service-grid">
            {services.map((s) => (
              <div key={s.id} className="service-card">
                <div className="service-icon"><Icon name={s.icon} size={26} /></div>
                <h3>{loc(s, 'name')}</h3>
                <p>{loc(s, 'description')}</p>
                <div className="service-meta">
                  <span className="service-price">
                    {s.price_from > 0 ? `${t.servicesPage.from} $${s.price_from}` : t.servicesPage.free}
                  </span>
                  <span className="muted"><Icon name="clock" size={14} /> {loc(s, 'duration')}</span>
                </div>
                <Link to={`/contact?service=${encodeURIComponent(loc(s, 'name'))}`} className="btn btn-outline btn-block">
                  {t.servicesPage.book}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow">{t.servicesPage.howEyebrow}</span>
              <h2>{t.servicesPage.howTitle}</h2>
            </div>
          </div>
          <div className="steps-grid">
            {t.servicesPage.steps.map((s, i) => (
              <div key={s.title} className="step">
                <span className="step-number">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
