import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useLang } from '../LanguageContext.jsx'
import { money } from '../format.js'
import Icon from './Icons.jsx'

export function ManifestCard({ lot, onClose }) {
  const { t, lang, loc } = useLang()
  const copy = t.lots
  const name = loc(lot, 'name')
  const leadTime = loc(lot, 'lead_time')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide card" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header modal-header">
          <h3><Icon name="database" size={20} /> {copy.manifestTitle}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="manifest-head">
          <div>
            <strong>{name}</strong>
            <span className="muted">{loc(lot, 'description')}</span>
          </div>
          <span className={`lot-grade lot-grade-${lot.grade}`}>
            {copy.grades[lot.grade] || lot.grade}
          </span>
        </div>

        <div className="table-wrap">
          <table className="admin-table manifest-table">
            <thead>
              <tr>
                <th>{copy.colModel}</th>
                <th>{copy.colSpecs}</th>
                <th className="num">{copy.colQty}</th>
                <th className="num">{copy.colUnit}</th>
                <th className="num">{copy.colSubtotal}</th>
              </tr>
            </thead>
            <tbody>
              {lot.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-product">
                      <span className="table-thumb table-thumb-icon">
                        <Icon name={item.icon || 'laptop'} size={18} />
                      </span>
                      <strong>{item.name}</strong>
                    </div>
                  </td>
                  <td className="manifest-specs">{item.specs}</td>
                  <td className="num"><strong>{item.qty}</strong></td>
                  <td className="num">{item.unit_value ? money(item.unit_value, lang, 2) : '·'}</td>
                  <td className="num">{item.subtotal ? money(item.subtotal, lang) : '·'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>{copy.totalUnits}</td>
                <td className="num"><strong>{lot.unit_count}</strong></td>
                <td className="num">{copy.retail}</td>
                <td className="num">{money(lot.retail_value, lang)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="manifest-total">
          <div>
            <span>{copy.lotPrice}</span>
            <strong>{money(lot.price, lang)}</strong>
            <em>{money(lot.unit_price, lang)} {copy.perUnit} · {lot.unit_count} {copy.units}</em>
          </div>
          {lot.savings > 0 && (
            <div className="manifest-save">
              {copy.save}<strong>{money(lot.savings, lang)}</strong>
            </div>
          )}
        </div>

        {leadTime && (
          <p className="manifest-lead">
            <Icon name="truck" size={15} /> {copy.leadTime} {leadTime}
          </p>
        )}

        <Link
          to={`/contact?lot=${encodeURIComponent(name)}`}
          className="btn btn-primary btn-block btn-lg"
          onClick={onClose}
        >
          {copy.requestLot}
        </Link>
      </div>
    </div>
  )
}

// Portal to <body>: the lot card's hover transform would otherwise trap this
// fixed-position overlay inside the card.
export default function LotManifest(props) {
  return createPortal(<ManifestCard {...props} />, document.body)
}
