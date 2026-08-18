import { useState } from 'react'
import { useCart } from '../CartContext.jsx'
import { useLang } from '../LanguageContext.jsx'
import { productImages } from '../imageUtils.js'
import RentalModal from './RentalModal.jsx'
import ProductDetailModal from './ProductDetailModal.jsx'
import Icon from './Icons.jsx'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const { t } = useLang()
  const [hover, setHover] = useState(false)
  const [renting, setRenting] = useState(false)
  const [viewing, setViewing] = useState(false)

  const imgs = productImages(product)
  const src = hover && imgs[1] ? imgs[1] : imgs[0]
  const rentable = product.rental_price > 0

  return (
    <article
      className="product-card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => setViewing(true)}
    >
      <div className="product-visual">
        {product.badge && (
          <span className={`badge badge-${product.badge.toLowerCase().replace(' ', '-')}`}>
            {t.badges[product.badge] || product.badge}
          </span>
        )}
        {src ? (
          <img src={src} alt={product.name} className="product-photo" loading="lazy" />
        ) : (
          <Icon name={product.icon} size={64} strokeWidth={1.3} className="product-icon" />
        )}
        {imgs.length > 1 && (
          <span className="photo-count">{imgs.length}</span>
        )}
      </div>
      <div className="product-body">
        <span className="product-brand">{product.brand}</span>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-specs">{product.specs}</p>
        <div className="product-footer">
          <div className="price-block">
            <span className="price">${product.price.toFixed(2)}</span>
            {product.old_price && <span className="old-price">${product.old_price.toFixed(2)}</span>}
          </div>
          <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); addItem(product) }}>
            <Icon name="cart" size={16} /> {t.shop.add}
          </button>
        </div>
        {rentable && (
          <button
            className="btn btn-outline btn-sm btn-block rent-button"
            onClick={(e) => { e.stopPropagation(); setRenting(true) }}
          >
            <Icon name="clock" size={15} /> {t.rental.rent} · ${product.rental_price.toFixed(2)}{t.rental.perHour}
          </button>
        )}
      </div>
      {renting && <RentalModal product={product} onClose={() => setRenting(false)} />}
      {viewing && <ProductDetailModal product={product} onClose={() => setViewing(false)} />}
    </article>
  )
}
