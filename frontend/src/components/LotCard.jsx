import { useState } from 'react'
import { useLang } from '../LanguageContext.jsx'
import { money } from '../format.js'
import LotManifest from './LotManifest.jsx'
import Icon from './Icons.jsx'

// One glyph per machine, capped so a 30 unit lot still fits on the card.
const MAX_GLYPHS = 28

export default function LotCard({ lot }) {
  const { t, lang, loc } = useLang()
  const copy = t.lots
  const [open, setOpen] = useState(false)

  // Each model gets its own tone, so the grid reads as the composition of the lot.
  const glyphs = []
  lot.items.forEach((item, index) => {
    for (let i = 0; i < item.qty && glyphs.length < MAX_GLYPHS; i += 1) {
      glyphs.push({ key: `${item.id}-${i}`, tone: index % 4, icon: item.icon || 'laptop' })
    }
  })
  const overflow = lot.unit_count - glyphs.length

  const discount = lot.retail_value
    ? Math.round(((lot.retail_value - lot.price) / lot.retail_value) * 100)
    : 0

  return (
    <article className={`lot-card lot-${lot.status}`}>
      <div className="lot-card-head">
        <span className={`lot-grade lot-grade-${lot.grade}`}>{copy.grades[lot.grade] || lot.grade}</span>
        {lot.status !== 'available' && (
          <span className="lot-status">{copy.statuses[lot.status] || lot.status}</span>
        )}
      </div>

      <h3>{loc(lot, 'name')}</h3>
      <p className="lot-desc">{loc(lot, 'description')}</p>

      <div className="lot-grid" aria-hidden="true">
        {glyphs.map((g) => (
          <span key={g.key} className={`lot-unit lot-tone-${g.tone}`}>
            <Icon name={g.icon} size={13} strokeWidth={2} />
          </span>
        ))}
        {overflow > 0 && <span className="lot-unit lot-unit-more">+{overflow}</span>}
      </div>

      <ul className="lot-legend">
        {lot.items.map((item, index) => (
          <li key={item.id}>
            <i className={`lot-dot lot-tone-${index % 4}`} />
            <strong>{item.qty}×</strong> {item.name}
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
