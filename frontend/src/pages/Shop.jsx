import { useEffect, useMemo, useState } from 'react'
import { getProducts } from '../api.js'
import { useLang } from '../LanguageContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import Icon from '../components/Icons.jsx'

const RAM_RE = /(\d+)\s*GB\s*RAM/i
const CPU_RE = /(Intel Core i\d+|Intel Core Ultra \d+|AMD Ryzen \d+|Apple M\d+)/i

function extractRam(specs) {
  const m = RAM_RE.exec(specs || '')
  return m ? `${m[1]}GB` : null
}

function extractProcessor(specs) {
  const m = CPU_RE.exec(specs || '')
  return m ? m[1] : null
}

function toggleValue(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export default function Shop() {
  const { t } = useLang()
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedBrands, setSelectedBrands] = useState([])
  const [selectedRam, setSelectedRam] = useState([])
  const [selectedProcessors, setSelectedProcessors] = useState([])
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

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

  const brandOptions = useMemo(
    () => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(),
    [products]
  )
  const ramOptions = useMemo(
    () => [...new Set(products.map((p) => extractRam(p.specs)).filter(Boolean))]
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10)),
    [products]
  )
  const processorOptions = useMemo(
    () => [...new Set(products.map((p) => extractProcessor(p.specs)).filter(Boolean))].sort(),
    [products]
  )
  const priceBounds = useMemo(() => {
    if (!products.length) return [0, 0]
    const prices = products.map((p) => p.price)
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
  }, [products])

  // Drop selections that no longer apply to the current category/search results
  // instead of wiping every filter, so switching tabs doesn't feel jarring.
  useEffect(() => {
    setSelectedBrands((prev) => prev.filter((v) => brandOptions.includes(v)))
  }, [brandOptions])
  useEffect(() => {
    setSelectedRam((prev) => prev.filter((v) => ramOptions.includes(v)))
  }, [ramOptions])
  useEffect(() => {
    setSelectedProcessors((prev) => prev.filter((v) => processorOptions.includes(v)))
  }, [processorOptions])

  const filteredProducts = useMemo(() => products.filter((p) => {
    if (selectedBrands.length && !selectedBrands.includes(p.brand)) return false
    if (selectedRam.length && !selectedRam.includes(extractRam(p.specs))) return false
    if (selectedProcessors.length && !selectedProcessors.includes(extractProcessor(p.specs))) return false
    if (priceMin !== '' && p.price < Number(priceMin)) return false
    if (priceMax !== '' && p.price > Number(priceMax)) return false
    return true
  }), [products, selectedBrands, selectedRam, selectedProcessors, priceMin, priceMax])

  const hasActiveFilters = selectedBrands.length > 0 || selectedRam.length > 0
    || selectedProcessors.length > 0 || priceMin !== '' || priceMax !== ''

  const clearFilters = () => {
    setSelectedBrands([])
    setSelectedRam([])
    setSelectedProcessors([])
    setPriceMin('')
    setPriceMax('')
  }

  return (
    <section className="section page">
      <div className="container">
        <div className="page-head">
          <span className="section-eyebrow">{t.shop.eyebrow}</span>
          <h1>{t.shop.title}</h1>
          <p className="muted">{t.shop.sub}</p>
        </div>

        <div className="shop-layout">
          <aside className="shop-filters">
            <div className="filter-panel-head">
              <h3>{t.shop.filters}</h3>
              {hasActiveFilters && (
                <button className="filter-clear" onClick={clearFilters}>{t.shop.clearFilters}</button>
              )}
            </div>

            <div className="filter-group">
              <span className="filter-label">{t.shop.price}</span>
              <div className="price-range">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={`$${priceBounds[0]}`}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
                <span className="price-range-sep">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={`$${priceBounds[1]}`}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>

            {brandOptions.length > 0 && (
              <div className="filter-group">
                <span className="filter-label">{t.shop.brand}</span>
                <div className="filter-options">
                  {brandOptions.map((b) => (
                    <label key={b} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(b)}
                        onChange={() => setSelectedBrands(toggleValue(selectedBrands, b))}
                      />
                      {b}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {ramOptions.length > 0 && (
              <div className="filter-group">
                <span className="filter-label">{t.shop.ram}</span>
                <div className="filter-options">
                  {ramOptions.map((r) => (
                    <label key={r} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedRam.includes(r)}
                        onChange={() => setSelectedRam(toggleValue(selectedRam, r))}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {processorOptions.length > 0 && (
              <div className="filter-group">
                <span className="filter-label">{t.shop.processor}</span>
                <div className="filter-options">
                  {processorOptions.map((p) => (
                    <label key={p} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedProcessors.includes(p)}
                        onChange={() => setSelectedProcessors(toggleValue(selectedProcessors, p))}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div className="shop-main">
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
              filteredProducts.length ? (
                <div className="product-grid">
                  {filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              ) : products.length ? (
                <div className="loading">{t.shop.noFilterMatch}</div>
              ) : (
                <div className="loading">{t.shop.noMatch} "{query}".</div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
