import { useCart } from '../CartContext.jsx'
import { useLang } from '../LanguageContext.jsx'
import Icon from './Icons.jsx'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const { t } = useLang()

  return (
    <article className="product-card">
      <div className="product-visual">
        {product.badge && (
          <span className={`badge badge-${product.badge.toLowerCase().replace(' ', '-')}`}>
            {t.badges[product.badge] || product.badge}
          </span>
        )}
        {product.image ? (
          <img src={product.image} alt={product.name} className="product-photo" loading="lazy" />
        ) : (
          <Icon name={product.icon} size={64} strokeWidth={1.3} className="product-icon" />
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
          <button className="btn btn-primary btn-sm" onClick={() => addItem(product)}>
            <Icon name="cart" size={16} /> {t.shop.add}
          </button>
        </div>
      </div>
    </article>
  )
}
