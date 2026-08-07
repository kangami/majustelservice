import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLang } from '../LanguageContext.jsx'
import { createRentalCheckout } from '../api.js'
import Icon from './Icons.jsx'

export default function RentalModal({ product, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState({
    qty: 1,
    start: '',
    end: '',
    location: '',
    customer_name: '',
    email: '',
    phone: '',
  })
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const estimate = useMemo(() => {
    if (!form.start || !form.end) return null
    const start = new Date(form.start)
    const end = new Date(form.end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null
    const hours = Math.max(1, Math.ceil((end - start) / 3600000))
    const qty = Math.max(1, parseInt(form.qty, 10) || 1)
    return { hours, qty, total: hours * qty * product.rental_price }
  }, [form.start, form.end, form.qty, product.rental_price])

  const datesInvalid = form.start && form.end && !estimate

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!estimate) {
      setStatus({ type: 'error', text: t.rental.invalidDates })
      return
    }
    setSubmitting(true)
    setStatus({ type: 'info', text: t.rental.redirecting })
    try {
      const res = await createRentalCheckout({
        product_id: product.id,
        qty: estimate.qty,
        start: form.start,
        end: form.end,
        location: form.location,
        customer_name: form.customer_name,
        email: form.email,
        phone: form.phone,
      })
      window.location.href = res.url
    } catch (err) {
      setStatus({ type: 'error', text: err.message })
      setSubmitting(false)
    }
  }

  // Portal to <body>: the product card's hover transform would otherwise
  // trap this fixed-position overlay inside the card.
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header modal-header">
          <h3><Icon name="clock" size={20} /> {t.rental.title}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="rental-product">
          <strong>{product.name}</strong>
          <span className="rental-rate">${product.rental_price.toFixed(2)}{t.rental.perHour}</span>
        </div>

        {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              {t.rental.quantity}
              <input required type="number" min="1" max={product.stock} value={form.qty} onChange={set('qty')} />
            </label>
            <label>
              {t.cart.fullName}
              <input required value={form.customer_name} onChange={set('customer_name')} />
            </label>
          </div>
          <div className="form-row">
            <label>
              {t.rental.start}
              <input required type="datetime-local" value={form.start} onChange={set('start')} />
            </label>
            <label>
              {t.rental.end}
              <input required type="datetime-local" min={form.start || undefined} value={form.end} onChange={set('end')} />
            </label>
          </div>
          {datesInvalid && <div className="alert alert-error">{t.rental.invalidDates}</div>}
          <label>
            {t.rental.location}
            <input required placeholder={t.rental.locationPlaceholder} value={form.location} onChange={set('location')} />
          </label>
          <div className="form-row">
            <label>
              {t.cart.email}
              <input required type="email" value={form.email} onChange={set('email')} />
            </label>
            <label>
              {t.cart.phone}
              <input value={form.phone} onChange={set('phone')} />
            </label>
          </div>

          {estimate && (
            <div className="rental-estimate">
              <span>
                {t.rental.estimate} · {estimate.hours}{t.rental.hours} × {estimate.qty} × ${product.rental_price.toFixed(2)}
              </span>
              <strong>${estimate.total.toFixed(2)}</strong>
            </div>
          )}

          <button className="btn btn-primary btn-block btn-lg" disabled={submitting || !estimate}>
            {submitting ? t.rental.redirecting : t.rental.startBtn}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
