import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useLang } from '../LanguageContext.jsx'
import {
  getProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  getServices, adminCreateService, adminUpdateService, adminDeleteService,
  getLots, adminCreateLot, adminUpdateLot, adminDeleteLot,
  adminGetOrders, adminUpdateOrder,
} from '../api.js'
import { productImages, coverImage, fileToDataUrl } from '../imageUtils.js'
import Icon from '../components/Icons.jsx'

const EMPTY_PRODUCT = {
  name: '', brand: '', category: 'laptops', price: '', old_price: '',
  rental_price: '', stock: 10, badge: '', icon: 'laptop', specs: '',
  description: '', description_fr: '',
}
const MAX_IMAGES = 5

const ICONS = ['laptop', 'mouse', 'keyboard', 'dock', 'bag', 'ssd', 'ram', 'fan', 'charger', 'monitor', 'webcam']
const SERVICE_ICONS = ['wrench', 'search', 'shield', 'screen', 'chip', 'database', 'os', 'fan', 'briefcase', 'laptop']
const STATUSES = ['new', 'awaiting_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled']

const EMPTY_SERVICE = {
  name: '', description: '', price_from: 0, duration: '', icon: 'wrench',
  name_fr: '', description_fr: '', duration_fr: '',
}

const LOT_GRADES = ['new', 'grade_a', 'refurbished']
const LOT_STATUSES = ['available', 'reserved', 'sold']

const EMPTY_LOT = {
  name: '', name_fr: '', description: '', description_fr: '', price: '',
  grade: 'refurbished', badge: '', status: 'available', lead_time: '', lead_time_fr: '',
}

export default function Admin() {
  const { user, loading, logout } = useAuth()
  const { t } = useLang()
  const [tab, setTab] = useState('products')

  if (loading) return <div className="loading">{t.admin.loading}</div>
  if (!user) return <Navigate to="/login" replace />

  return (
    <section className="section page">
      <div className="container">
        <div className="admin-head">
          <div>
            <span className="section-eyebrow">{t.admin.eyebrow}</span>
            <h1>{t.admin.title}</h1>
          </div>
          <div className="admin-head-actions">
            <span className="muted">{t.admin.signedInAs} <strong>{user.username}</strong></span>
            <button className="btn btn-ghost" onClick={logout}>{t.admin.logout}</button>
          </div>
        </div>

        <div className="chip-row admin-tabs">
          <button className={`chip ${tab === 'products' ? 'chip-active' : ''}`} onClick={() => setTab('products')}>
            {t.admin.products}
          </button>
          <button className={`chip ${tab === 'services' ? 'chip-active' : ''}`} onClick={() => setTab('services')}>
            {t.admin.servicesTab}
          </button>
          <button className={`chip ${tab === 'lots' ? 'chip-active' : ''}`} onClick={() => setTab('lots')}>
            {t.admin.lotsTab}
          </button>
          <button className={`chip ${tab === 'orders' ? 'chip-active' : ''}`} onClick={() => setTab('orders')}>
            {t.admin.orders}
          </button>
        </div>

        {tab === 'products' && <ProductsAdmin />}
        {tab === 'services' && <ServicesAdmin />}
        {tab === 'lots' && <LotsAdmin />}
        {tab === 'orders' && <OrdersAdmin />}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function ProductsAdmin() {
  const { t } = useLang()
  const [products, setProducts] = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | product object
  const [status, setStatus] = useState(null)

  const load = () => getProducts().then(setProducts).catch((e) => setStatus({ type: 'error', text: e.message }))
  useEffect(() => { load() }, [])

  const handleDelete = async (p) => {
    if (!window.confirm(t.admin.deleteConfirm.replace('{name}', p.name))) return
    try {
      await adminDeleteProduct(p.id)
      setStatus({ type: 'success', text: `${t.admin.deleted}: ${p.name}` })
      load()
    } catch (e) {
      setStatus({ type: 'error', text: e.message })
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <Icon name="plus" size={16} /> {t.admin.addProduct}
        </button>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t.admin.product}</th>
              <th>{t.admin.category}</th>
              <th>{t.admin.price}</th>
              <th>{t.admin.stock}</th>
              <th>{t.admin.badge}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="table-product">
                    {coverImage(p)
                      ? <img src={coverImage(p)} alt="" className="table-thumb" />
                      : <span className="table-thumb table-thumb-icon"><Icon name={p.icon} size={20} /></span>}
                    <div>
                      <strong>{p.name}</strong>
                      <span className="muted table-sub">{p.brand}</span>
                    </div>
                  </div>
                </td>
                <td><span className="tag">{p.category === 'laptops' ? t.shop.laptops : t.shop.accessories}</span></td>
                <td>
                  ${p.price.toFixed(2)}
                  {p.old_price && <span className="muted table-sub">{t.admin.was} ${p.old_price.toFixed(2)}</span>}
                  {p.rental_price > 0 && <span className="muted table-sub">{t.admin.rentalTag}: ${p.rental_price.toFixed(2)}/h</span>}
                </td>
                <td>{p.stock}</td>
                <td>{p.badge ? (t.badges[p.badge] || p.badge) : '—'}</td>
                <td>
                  <div className="table-actions">
                    <button className="icon-button" title={t.admin.editProduct} onClick={() => setEditing(p)}>
                      <Icon name="wrench" size={16} />
                    </button>
                    <button className="icon-button remove" title={t.admin.deleted} onClick={() => handleDelete(p)}>
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); setStatus({ type: 'success', text: msg }); load() }}
        />
      )}
    </>
  )
}

function ProductModal({ product, onClose, onSaved }) {
  const { t } = useLang()
  const [form, setForm] = useState(product ? {
    ...EMPTY_PRODUCT,
    ...Object.fromEntries(Object.entries(product).map(([k, v]) => [k, v ?? ''])),
    images: productImages(product),
  } : { ...EMPTY_PRODUCT, images: [] })
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    const room = MAX_IMAGES - form.images.length
    if (room <= 0) return
    try {
      const dataUrls = await Promise.all(files.slice(0, room).map((f) => fileToDataUrl(f)))
      setForm((prev) => ({ ...prev, images: [...prev.images, ...dataUrls].slice(0, MAX_IMAGES) }))
    } catch (err) {
      setError(err.message)
    }
  }

  const addUrl = () => {
    const url = urlInput.trim()
    if (!url || form.images.length >= MAX_IMAGES) return
    setForm((prev) => ({ ...prev, images: [...prev.images, url].slice(0, MAX_IMAGES) }))
    setUrlInput('')
  }

  const removeImage = (i) =>
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))

  const makeCover = (i) =>
    setForm((prev) => {
      const images = [...prev.images]
      const [img] = images.splice(i, 1)
      return { ...prev, images: [img, ...images] }
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      ...form,
      old_price: form.old_price === '' ? null : form.old_price,
      rental_price: form.rental_price === '' ? null : form.rental_price,
    }
    delete payload.id
    delete payload.image // backend derives the cover from images[0]
    try {
      if (product) {
        await adminUpdateProduct(product.id, payload)
        onSaved(`${t.admin.updated}: ${form.name}`)
      } else {
        await adminCreateProduct(payload)
        onSaved(`${t.admin.created}: ${form.name}`)
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header modal-header">
          <h3>{product ? t.admin.editProduct : t.admin.addProduct}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>{t.admin.name}<input required value={form.name} onChange={set('name')} /></label>
            <label>{t.admin.brand}<input required value={form.brand} onChange={set('brand')} /></label>
          </div>
          <div className="form-row">
            <label>
              {t.admin.category}
              <select value={form.category} onChange={set('category')}>
                <option value="laptops">{t.admin.laptopsOpt}</option>
                <option value="accessories">{t.admin.accessoriesOpt}</option>
              </select>
            </label>
            <label>
              {t.admin.icon}
              <select value={form.icon} onChange={set('icon')}>
                {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>{t.admin.priceLabel}<input required type="number" step="0.01" min="0" value={form.price} onChange={set('price')} /></label>
            <label>{t.admin.oldPrice}<input type="number" step="0.01" min="0" value={form.old_price} onChange={set('old_price')} /></label>
          </div>
          <div className="form-row">
            <label>{t.admin.stock}<input type="number" min="0" value={form.stock} onChange={set('stock')} /></label>
            <label>{t.admin.badge}<input placeholder="Sale, New, Popular…" value={form.badge} onChange={set('badge')} /></label>
          </div>
          <label>{t.admin.rentalPrice}<input type="number" step="0.01" min="0" value={form.rental_price} onChange={set('rental_price')} /></label>
          <div className="image-manager">
            <span className="field-label">{t.admin.images}</span>
            <div className="image-grid">
              {form.images.map((src, i) => (
                <div key={`${i}-${src.slice(0, 40)}`} className={`image-slot ${i === 0 ? 'is-cover' : ''}`}>
                  <img src={src} alt="" />
                  {i === 0 ? (
                    <span className="cover-tag">{t.admin.cover}</span>
                  ) : (
                    <button
                      type="button"
                      className="slot-action make-cover"
                      title={t.admin.makeCover}
                      onClick={() => makeCover(i)}
                    >
                      <Icon name="star" size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="slot-action slot-remove"
                    title={t.admin.removeImage}
                    onClick={() => removeImage(i)}
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}
              {form.images.length < MAX_IMAGES && (
                <label className="add-image-tile" title={t.admin.addImages}>
                  <Icon name="plus" size={22} />
                  <span>{t.admin.addImages}</span>
                  <input type="file" accept="image/*" multiple hidden onChange={handleFiles} />
                </label>
              )}
            </div>
            {form.images.length >= MAX_IMAGES && <span className="muted image-hint">{t.admin.maxImages}</span>}
            {form.images.length < MAX_IMAGES && (
              <div className="url-row">
                <input
                  placeholder={t.admin.imageUrlPlaceholder}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={addUrl}>{t.admin.addUrl}</button>
              </div>
            )}
          </div>
          <label>{t.admin.specs}<input placeholder="CPU · RAM · Storage · Display" value={form.specs} onChange={set('specs')} /></label>
          <label>{t.admin.description}<textarea rows={2} value={form.description} onChange={set('description')} /></label>
          <label>{t.admin.descriptionFr}<textarea rows={2} value={form.description_fr} onChange={set('description_fr')} /></label>
          <button className="btn btn-primary btn-block" disabled={saving}>
            {saving ? t.admin.saving : product ? t.admin.save : t.admin.create}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function ServicesAdmin() {
  const { t, loc } = useLang()
  const [services, setServices] = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | service object
  const [status, setStatus] = useState(null)

  const load = () => getServices().then(setServices).catch((e) => setStatus({ type: 'error', text: e.message }))
  useEffect(() => { load() }, [])

  const handleDelete = async (s) => {
    if (!window.confirm(t.admin.deleteConfirm.replace('{name}', s.name))) return
    try {
      await adminDeleteService(s.id)
      setStatus({ type: 'success', text: `${t.admin.deleted}: ${s.name}` })
      load()
    } catch (e) {
      setStatus({ type: 'error', text: e.message })
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <Icon name="plus" size={16} /> {t.admin.addService}
        </button>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t.admin.service}</th>
              <th>{t.admin.price}</th>
              <th>{t.admin.duration}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="table-product">
                    <span className="table-thumb table-thumb-icon"><Icon name={s.icon} size={20} /></span>
                    <div>
                      <strong>{loc(s, 'name')}</strong>
                      <span className="muted table-sub">{loc(s, 'description').slice(0, 70)}…</span>
                    </div>
                  </div>
                </td>
                <td>{s.price_from > 0 ? `$${s.price_from}` : t.servicesPage.free}</td>
                <td>{loc(s, 'duration')}</td>
                <td>
                  <div className="table-actions">
                    <button className="icon-button" title={t.admin.editService} onClick={() => setEditing(s)}>
                      <Icon name="wrench" size={16} />
                    </button>
                    <button className="icon-button remove" title={t.admin.deleted} onClick={() => handleDelete(s)}>
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ServiceModal
          service={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); setStatus({ type: 'success', text: msg }); load() }}
        />
      )}
    </>
  )
}

function ServiceModal({ service, onClose, onSaved }) {
  const { t } = useLang()
  const [form, setForm] = useState(service ? {
    ...EMPTY_SERVICE,
    ...Object.fromEntries(Object.entries(service).map(([k, v]) => [k, v ?? ''])),
  } : EMPTY_SERVICE)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { ...form }
    delete payload.id
    try {
      if (service) {
        await adminUpdateService(service.id, payload)
        onSaved(`${t.admin.updated}: ${form.name}`)
      } else {
        await adminCreateService(payload)
        onSaved(`${t.admin.created}: ${form.name}`)
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header modal-header">
          <h3>{service ? t.admin.editService : t.admin.addService}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>{t.admin.serviceNameEn}<input required value={form.name} onChange={set('name')} /></label>
            <label>{t.admin.serviceNameFr}<input value={form.name_fr} onChange={set('name_fr')} /></label>
          </div>
          <div className="form-row">
            <label>{t.admin.priceFrom}<input required type="number" step="0.01" min="0" value={form.price_from} onChange={set('price_from')} /></label>
            <label>
              {t.admin.icon}
              <select value={form.icon} onChange={set('icon')}>
                {SERVICE_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>{t.admin.durationEn}<input required placeholder="Same day / 24–48 h…" value={form.duration} onChange={set('duration')} /></label>
            <label>{t.admin.durationFr}<input placeholder="Le jour même / 24–48 h…" value={form.duration_fr} onChange={set('duration_fr')} /></label>
          </div>
          <label>{t.admin.description}<textarea required rows={3} value={form.description} onChange={set('description')} /></label>
          <label>{t.admin.descriptionFr}<textarea rows={3} value={form.description_fr} onChange={set('description_fr')} /></label>
          <button className="btn btn-primary btn-block" disabled={saving}>
            {saving ? t.admin.saving : service ? t.admin.save : t.admin.createService}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function LotsAdmin() {
  const { t, loc } = useLang()
  const [lots, setLots] = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | lot object
  const [status, setStatus] = useState(null)

  const load = () => getLots().then(setLots).catch((e) => setStatus({ type: 'error', text: e.message }))
  useEffect(() => { load() }, [])

  const handleDelete = async (lot) => {
    if (!window.confirm(t.admin.deleteConfirm.replace('{name}', lot.name))) return
    try {
      await adminDeleteLot(lot.id)
      setStatus({ type: 'success', text: `${t.admin.deleted}: ${lot.name}` })
      load()
    } catch (e) {
      setStatus({ type: 'error', text: e.message })
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <Icon name="plus" size={16} /> {t.admin.addLot}
        </button>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t.admin.lot}</th>
              <th>{t.admin.sumUnits}</th>
              <th>{t.admin.price}</th>
              <th>{t.admin.lotStatus}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id}>
                <td>
                  <div className="table-product">
                    <span className="table-thumb table-thumb-icon"><Icon name="ram" size={20} /></span>
                    <div>
                      <strong>{loc(lot, 'name')}</strong>
                      <span className="muted table-sub">
                        {lot.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')}
                      </span>
                    </div>
                  </div>
                </td>
                <td>{lot.unit_count}</td>
                <td>
                  ${lot.price.toFixed(2)}
                  {lot.unit_price != null && (
                    <span className="muted table-sub">${lot.unit_price.toFixed(2)} / {t.admin.units}</span>
                  )}
                </td>
                <td>
                  <span className="tag">{t.lots.statuses[lot.status] || lot.status}</span>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-button" title={t.admin.editLot} onClick={() => setEditing(lot)}>
                      <Icon name="wrench" size={16} />
                    </button>
                    <button className="icon-button remove" title={t.admin.deleted} onClick={() => handleDelete(lot)}>
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <LotModal
          lot={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); setStatus({ type: 'success', text: msg }); load() }}
        />
      )}
    </>
  )
}

let lotRowKey = 0

function LotModal({ lot, onClose, onSaved }) {
  const { t } = useLang()
  const [form, setForm] = useState(lot ? {
    ...EMPTY_LOT,
    ...Object.fromEntries(Object.entries(lot)
      .filter(([k]) => k in EMPTY_LOT)
      .map(([k, v]) => [k, v ?? ''])),
  } : EMPTY_LOT)
  const [items, setItems] = useState(() => (lot?.items || []).map((i) => ({
    key: `existing-${i.id}`,
    product_id: i.product_id,
    name: i.name,
    specs: i.specs || '',
    icon: i.icon || 'laptop',
    qty: i.qty,
    unit_value: i.unit_value ?? '',
  })))
  const [catalog, setCatalog] = useState([])
  const [pick, setPick] = useState({ product_id: '', qty: 1 })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { getProducts().then(setCatalog).catch(() => {}) }, [])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const setItem = (key, field, value) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)))

  // Adding a catalogue product twice bumps its quantity instead of duplicating the row.
  const addFromCatalog = () => {
    const product = catalog.find((p) => String(p.id) === String(pick.product_id))
    if (!product) return
    const qty = Math.max(1, parseInt(pick.qty, 10) || 1)
    const existing = items.find((i) => String(i.product_id) === String(product.id))
    if (existing) {
      setItem(existing.key, 'qty', Number(existing.qty) + qty)
    } else {
      lotRowKey += 1
      setItems([...items, {
        key: `row-${lotRowKey}`,
        product_id: product.id,
        name: product.name,
        specs: product.specs || '',
        icon: product.icon || 'laptop',
        qty,
        unit_value: product.price,
      }])
    }
    setPick({ product_id: '', qty: 1 })
  }

  const addCustom = () => {
    lotRowKey += 1
    setItems([...items, {
      key: `row-${lotRowKey}`,
      product_id: null,
      name: '',
      specs: '',
      icon: 'laptop',
      qty: 1,
      unit_value: '',
    }])
  }

  const unitCount = items.reduce((sum, i) => sum + (parseInt(i.qty, 10) || 0), 0)
  const retail = items.reduce((sum, i) => sum + (parseInt(i.qty, 10) || 0) * (parseFloat(i.unit_value) || 0), 0)
  const price = parseFloat(form.price) || 0
  const unitPrice = unitCount ? price / unitCount : 0
  const discount = retail ? Math.round(((retail - price) / retail) * 100) : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      ...form,
      price,
      badge: form.badge || null,
      items: items.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        specs: i.specs,
        icon: i.icon,
        qty: parseInt(i.qty, 10) || 1,
        unit_value: i.unit_value === '' ? null : i.unit_value,
      })),
    }
    try {
      if (lot) {
        await adminUpdateLot(lot.id, payload)
        onSaved(`${t.admin.updated}: ${form.name}`)
      } else {
        await adminCreateLot(payload)
        onSaved(`${t.admin.created}: ${form.name}`)
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide card" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header modal-header">
          <h3>{lot ? t.admin.editLot : t.admin.addLot}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>{t.admin.lotNameEn}<input required value={form.name} onChange={set('name')} /></label>
            <label>{t.admin.lotNameFr}<input value={form.name_fr} onChange={set('name_fr')} /></label>
          </div>
          <div className="form-row">
            <label>
              {t.admin.lotPriceLabel}
              <input required type="number" step="0.01" min="0" value={form.price} onChange={set('price')} />
            </label>
            <label>
              {t.admin.grade}
              <select value={form.grade} onChange={set('grade')}>
                {LOT_GRADES.map((g) => <option key={g} value={g}>{t.lots.grades[g]}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              {t.admin.lotStatus}
              <select value={form.status} onChange={set('status')}>
                {LOT_STATUSES.map((s) => <option key={s} value={s}>{t.lots.statuses[s]}</option>)}
              </select>
            </label>
            <label>
              {t.admin.badge}
              <input value={form.badge} onChange={set('badge')} placeholder="Popular / New…" />
            </label>
          </div>
          <div className="form-row">
            <label>{t.admin.leadTimeEn}<input value={form.lead_time} onChange={set('lead_time')} placeholder="Ships within 3 business days" /></label>
            <label>{t.admin.leadTimeFr}<input value={form.lead_time_fr} onChange={set('lead_time_fr')} placeholder="Expédié sous 3 jours ouvrables" /></label>
          </div>
          <label>{t.admin.description}<textarea rows={2} value={form.description} onChange={set('description')} /></label>
          <label>{t.admin.descriptionFr}<textarea rows={2} value={form.description_fr} onChange={set('description_fr')} /></label>

          {/* Manifest builder */}
          <div className="lot-builder">
            <h4>{t.admin.manifest}</h4>

            <div className="lot-picker">
              <select
                value={pick.product_id}
                onChange={(e) => setPick({ ...pick, product_id: e.target.value })}
              >
                <option value="">{t.admin.pickProduct}</option>
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · ${p.price.toFixed(2)}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={pick.qty}
                onChange={(e) => setPick({ ...pick, qty: e.target.value })}
                aria-label={t.admin.qty}
              />
              <button type="button" className="btn btn-primary btn-sm" disabled={!pick.product_id} onClick={addFromCatalog}>
                <Icon name="plus" size={15} /> {t.admin.addLine}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addCustom}>
                {t.admin.customLine}
              </button>
            </div>

            {!items.length && <p className="muted lot-builder-empty">{t.admin.noItems}</p>}

            {items.map((item) => (
              <div key={item.key} className="lot-row">
                <div className="lot-row-main">
                  {item.product_id ? (
                    <>
                      <span className="lot-row-name">
                        <Icon name={item.icon} size={16} /> {item.name}
                      </span>
                      <span className="muted lot-row-specs">{item.specs}</span>
                    </>
                  ) : (
                    <>
                      <input
                        required
                        placeholder={t.admin.itemName}
                        value={item.name}
                        onChange={(e) => setItem(item.key, 'name', e.target.value)}
                      />
                      <input
                        placeholder={t.admin.itemSpecs}
                        value={item.specs}
                        onChange={(e) => setItem(item.key, 'specs', e.target.value)}
                      />
                    </>
                  )}
                </div>
                <input
                  className="lot-row-qty"
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={(e) => setItem(item.key, 'qty', e.target.value)}
                  aria-label={t.admin.qty}
                />
                <input
                  className="lot-row-value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t.admin.unitValue}
                  value={item.unit_value}
                  onChange={(e) => setItem(item.key, 'unit_value', e.target.value)}
                  aria-label={t.admin.unitValue}
                />
                <button
                  type="button"
                  className="icon-button remove"
                  title={t.admin.removeLine}
                  onClick={() => setItems(items.filter((i) => i.key !== item.key))}
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}

            {items.length > 0 && (
              <div className="lot-summary">
                <div><span>{t.admin.sumUnits}</span><strong>{unitCount}</strong></div>
                <div><span>{t.admin.sumRetail}</span><strong>${retail.toFixed(2)}</strong></div>
                <div><span>{t.admin.sumUnitPrice}</span><strong>${unitPrice.toFixed(2)}</strong></div>
                <div><span>{t.admin.sumMargin}</span><strong>{discount}%</strong></div>
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-block" disabled={saving}>
            {saving ? t.admin.saving : lot ? t.admin.save : t.admin.createLot}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function OrdersAdmin() {
  const { t } = useLang()
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState(null)

  const load = () => adminGetOrders().then(setOrders).catch((e) => setStatus({ type: 'error', text: e.message }))
  useEffect(() => { load() }, [])

  const changeStatus = async (order, newStatus) => {
    try {
      await adminUpdateOrder(order.id, newStatus)
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)))
    } catch (e) {
      setStatus({ type: 'error', text: e.message })
    }
  }

  return (
    <>
      {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}

      {orders.length === 0 ? (
        <div className="loading">{t.admin.noOrders}</div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t.admin.customer}</th>
                <th>{t.admin.items}</th>
                <th>{t.admin.totalCol}</th>
                <th>{t.admin.payment}</th>
                <th>{t.admin.date}</th>
                <th>{t.admin.status}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  <td>
                    <strong>{o.customer_name}</strong>
                    <span className="muted table-sub">{o.email}{o.phone ? ` · ${o.phone}` : ''}</span>
                    <span className="muted table-sub">{o.address}</span>
                  </td>
                  <td className="table-items">{o.items}</td>
                  <td><strong>${o.total.toFixed(2)}</strong></td>
                  <td>
                    <span className="tag">{t.payments[o.payment_method] || o.payment_method || '—'}</span>
                    {o.order_type === 'rental' && <span className="tag tag-rental">{t.admin.rentalTag}</span>}
                  </td>
                  <td className="muted">{o.created_at.replace('T', ' ')}</td>
                  <td>
                    <select
                      className={`status-select status-${o.status}`}
                      value={o.status}
                      onChange={(e) => changeStatus(o, e.target.value)}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
