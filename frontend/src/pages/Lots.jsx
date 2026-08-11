import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLots } from '../api.js'
import { useLang } from '../LanguageContext.jsx'
import LotCard from '../components/LotCard.jsx'
import Icon from '../components/Icons.jsx'

export default function Lots() {
  const { t } = useLang()
  const copy = t.lots
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getLots()
      .then(setLots)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
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

          <div className="perks-grid">
            {copy.perks.map((p) => (
              <div key={p.title} className="perk">
                <div className="perk-icon"><Icon name={p.icon} size={24} /></div>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-eyebrow">{copy.eyebrow}</span>
              <h2>{copy.availableTitle}</h2>
            </div>
          </div>

          {error && <div className="alert alert-error">{copy.loadError}: {error}. {t.shop.backendHint}</div>}
          {loading && !error && <div className="loading">{t.admin.loading}</div>}
          {!loading && !error && !lots.length && <div className="loading">{copy.empty}</div>}

          <div className="lot-grid-wrap">
            {lots.map((lot) => <LotCard key={lot.id} lot={lot} />)}
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
