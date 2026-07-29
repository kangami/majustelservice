import { useEffect, useState } from 'react'
import { getProducts } from '../api.js'
import { useLang } from '../LanguageContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Icon from '../components/Icons.jsx'

export default function Shop() {
  const { t } = useLang()
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const categories = [
    { key: 'all', label: t.shop.all },
    { key: 'laptops', label: t.shop.laptops },
    { key: 'accessories', label: t.shop.accessories },
  ]

  useEffect(() => {
    setLoading(true)
    setError(null)
    const timer = setTimeout(() => {
      getProducts(category, query)
        .then(setProducts)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, query ? 250 : 0)
    return () => clearTimeout(timer)
  }, [category, query])

  return (
    <section className="section page">
      <div className="container">
        <div className="page-head">
          <span className="section-eyebrow">{t.shop.eyebrow}</span>
          <h1>{t.shop.title}</h1>
          <p className="muted">{t.shop.sub}</p>
        </div>

        <div className="shop-toolbar">
          <div className="chip-row">
            {categories.map((c) => (
              <button
                key={c.key}
                className={`chip ${category === c.key ? 'chip-active' : ''}`}
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="search-box">
            <Icon name="search" size={18} />
            <input
              placeholder={t.shop.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="alert alert-error">{t.shop.loadError}: {error}. {t.shop.backendHint}</div>}
        {loading && !error && <div className="loading">{t.shop.loading}</div>}

        {!loading && !error && (
          products.length ? (
            <div className="product-grid">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="loading">{t.shop.noMatch} "{query}".</div>
          )
        )}
      </div>
    </section>
  )
}
