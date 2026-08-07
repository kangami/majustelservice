import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useLang } from '../LanguageContext.jsx'
import {
  getProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  getServices, adminCreateService, adminUpdateService, adminDeleteService,
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
          <button className={`chip ${tab === 'orders' ? 'chip-active' : ''}`} onClick={() => setTab('orders')}>
            {t.admin.orders}
          </button>
        </div>

        {tab === 'products' && <ProductsAdmin />}
        {tab === 'services' && <ServicesAdmin />}
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
