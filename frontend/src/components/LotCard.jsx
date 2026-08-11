import { useState } from 'react'
import { useLang } from '../LanguageContext.jsx'
import { money } from '../format.js'
import LotManifest from './LotManifest.jsx'
import Icon from './Icons.jsx'

export default function LotCard({ lot }) {
  const { t, lang, loc } = useLang()
  const copy = t.lots
  const [open, setOpen] = useState(false)

  const discount = lot.retail_value
    ? Math.round(((lot.retail_value - lot.price) / lot.retail_value) * 100)
    : 0

  return (
    <article className={`lot-card lot-${lot.status}`}>
      {lot.status !== 'available' && (
        <div className="lot-card-head">
          <span className="lot-status">{copy.statuses[lot.status] || lot.status}</span>
        </div>
      )}

      <h3>{loc(lot, 'name')}</h3>
      <p className="lot-desc">{loc(lot, 'description')}</p>

      <ul className="lot-machines">
        {lot.items.map((item) => (
          <li key={item.id} className="lot-machine">
            <span className="lot-machine-photo">
              {item.image
                ? <img src={item.image} alt={item.name} loading="lazy" />
                : <Icon name={item.icon || 'laptop'} size={26} strokeWidth={1.4} />}
            </span>
            <span className="lot-machine-qty">{item.qty}×</span>
            <span className="lot-machine-text">
              <strong>{item.name}</strong>
              <em className={`lot-grade lot-grade-${item.grade}`}>
                {copy.grades[item.grade] || item.grade}
              </em>
            </span>
          </li>
        ))}
      </ul>

      <div className="lot-figures">
        <div className="lot-figure">
          <span>{lot.unit_count} {copy.units}</span>
          <strong>{money(lot.unit_price, lang)}</strong>
          <em>{copy.perUnit}</em>
        </div>
        <div className="lot-figure lot-figure-total">
          <span>{copy.lotPrice}</span>
          <strong>{money(lot.price, lang)}</strong>
          {lot.retail_value > lot.price && (
            <em><s>{money(lot.retail_value, lang)}</s> {copy.retail}</em>
          )}
        </div>
      </div>

      {lot.savings > 0 && (
        <div className="lot-savings">
          {copy.save} <strong>{money(lot.savings, lang)}</strong>
          <span className="lot-discount">-{discount}%</span>
        </div>
      )}

      <button className="btn btn-outline btn-block" onClick={() => setOpen(true)}>
        <Icon name="database" size={15} /> {copy.viewManifest}
      </button>

      {open && <LotManifest lot={lot} onClose={() => setOpen(false)} />}
    </article>
  )
}
