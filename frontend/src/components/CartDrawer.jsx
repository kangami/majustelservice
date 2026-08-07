import { useState } from 'react'
import { useCart } from '../CartContext.jsx'
import { useLang } from '../LanguageContext.jsx'
import { placeOrder, createCheckoutSession } from '../api.js'
import { coverImage } from '../imageUtils.js'
import AddressInput from './AddressInput.jsx'
import Icon from './Icons.jsx'

export default function CartDrawer() {
  const { items, total, open, setOpen, updateQty, removeItem, clearCart } = useCart()
  const { t } = useLang()
  const [checkout, setCheckout] = useState(false)
  const [form, setForm] = useState({ customer_name: '', email: '', phone: '', address: '' })
  const [status, setStatus] = useState(null) // {type: 'success'|'error', text}
  const [submitting, setSubmitting] = useState(false)

  const close = () => {
    setOpen(false)
    setCheckout(false)
    setStatus(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const mode = e.nativeEvent?.submitter?.value || 'cod'
    setSubmitting(true)
    setStatus(null)
    const payload = { ...form, items: items.map((i) => ({ id: i.id, qty: i.qty })) }
    try {
      if (mode === 'card') {
        setStatus({ type: 'info', text: t.cart.redirecting })
        const res = await createCheckoutSession(payload)
        window.location.href = res.url
        return // cart is cleared on the success page after payment
      }
      const res = await placeOrder(payload)
      clearCart()
      setCheckout(false)
      setStatus({ type: 'success', text: `Order #${res.order_id} — $${res.total.toFixed(2)}. ${res.message}` })
      setForm({ customer_name: '', email: '', phone: '', address: '' })
    } catch (err) {
      setStatus({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className={`drawer-overlay ${open ? 'visible' : ''}`} onClick={close} />
      <aside className={`cart-drawer ${open ? 'open' : ''}`} aria-label="Shopping cart">
        <div className="drawer-header">
          <h3><Icon name="cart" size={20} /> {t.cart.title}</h3>
          <button className="icon-button" onClick={close} aria-label="Close cart">
            <Icon name="x" size={20} />
          </button>
        </div>

        {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}

        {items.length === 0 && !status ? (
          <div className="cart-empty">
            <Icon name="cart" size={48} strokeWidth={1.2} />
            <p>{t.cart.empty}</p>
            <p className="muted">{t.cart.emptyHint}</p>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((item) => (
                <li key={item.id} className="cart-item">
                  <div className="cart-item-icon">
                    {coverImage(item) ? (
                      <img src={coverImage(item)} alt="" className="cart-item-photo" />
                    ) : (
                      <Icon name={item.icon} size={26} strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">${item.price.toFixed(2)}</span>
                  </div>
                  <div className="qty-controls">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease">
                      <Icon name="minus" size={14} />
                    </button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase">
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                  <button className="icon-button remove" onClick={() => removeItem(item.id)} aria-label="Remove">
                    <Icon name="x" size={16} />
                  </button>
                </li>
              ))}
            </ul>

            {items.length > 0 && (
              <div className="cart-footer">
                <div className="cart-total">
                  <span>{t.cart.total}</span>
                  <strong>${total.toFixed(2)}</strong>
                </div>

                {!checkout ? (
                  <button className="btn btn-primary btn-block" onClick={() => setCheckout(true)}>
                    {t.cart.checkout}
                  </button>
                ) : (
                  <form className="checkout-form" onSubmit={handleSubmit}>
                    <input
                      required
                      placeholder={t.cart.fullName}
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    />
                    <input
                      required
                      type="email"
                      placeholder={t.cart.email}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    <input
                      placeholder={t.cart.phone}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                    <AddressInput
                      required
                      placeholder={t.cart.address}
                      value={form.address}
                      onChange={(v) => setForm((prev) => ({ ...prev, address: v }))}
                    />
                    <button
                      type="submit"
                      value="card"
                      className="btn btn-primary btn-block"
                      disabled={submitting}
                    >
                      {submitting ? t.cart.placing : `${t.cart.payCard} · $${total.toFixed(2)}`}
                    </button>
                    <button
                      type="submit"
                      value="cod"
                      className="btn btn-ghost btn-block"
                      disabled={submitting}
                    >
                      {t.cart.payDelivery}
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </>
  )
}
