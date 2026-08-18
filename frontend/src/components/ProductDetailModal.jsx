import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from '../CartContext.jsx'
import { useLang } from '../LanguageContext.jsx'
import { productImages } from '../imageUtils.js'
import RentalModal from './RentalModal.jsx'
import Icon from './Icons.jsx'

export default function ProductDetailModal({ product, onClose }) {
  const { addItem } = useCart()
  const { t, loc } = useLang()
  const [active, setActive] = useState(0)
  const [renting, setRenting] = useState(false)

  const imgs = productImages(product)
  const rentable = product.rental_price > 0
  const specs = (product.specs || '').split('·').map((s) => s.trim()).filter(Boolean)
  const description = loc(product, 'description')

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide card product-detail" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header modal-header">
          <h3>{product.name}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="product-detail-body">
          <div className="product-detail-gallery">
            <div className="product-detail-main">
              {product.badge && (
                <span className={`badge badge-${product.badge.toLowerCase().replace(' ', '-')}`}>
                  {t.badges[product.badge] || product.badge}
                </span>
              )}
              {imgs.length ? (
                <img src={imgs[active]} alt={product.name} />
              ) : (
                <Icon name={product.icon} size={80} strokeWidth={1.2} className="product-icon" />
              )}
            </div>
            {imgs.length > 1 && (
              <div className="product-detail-thumbs">
                {imgs.map((src, i) => (
                  <button
                    key={src.slice(0, 40) + i}
                    type="button"
                    className={`product-detail-thumb ${i === active ? 'is-active' : ''}`}
                    onClick={() => setActive(i)}
                    aria-label={`${product.name} ${i + 1}`}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-detail-info">
            <span className="product-brand">{product.brand}</span>
            <div className="price-block">
              <span className="price">${product.price.toFixed(2)}</span>
              {product.old_price && <span className="old-price">${product.old_price.toFixed(2)}</span>}
            </div>

            {specs.length > 0 && (
              <ul className="product-detail-specs">
                {specs.map((s) => <li key={s}>{s}</li>)}
              </ul>
            )}

            {description && <p className="product-detail-description">{description}</p>}

            <div className="product-detail-actions">
              <button className="btn btn-primary btn-block" onClick={() => { addItem(product); onClose() }}>
                <Icon name="cart" size={16} /> {t.shop.add}
              </button>
              {rentable && (
                <button className="btn btn-outline btn-block" onClick={() => setRenting(true)}>
                  <Icon name="clock" size={15} /> {t.rental.rent} · ${product.rental_price.toFixed(2)}{t.rental.perHour}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {renting && <RentalModal product={product} onClose={() => setRenting(false)} />}
    </div>,
    document.body,
  )
}
