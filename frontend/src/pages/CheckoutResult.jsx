import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { verifyCheckout } from '../api.js'
import { useCart } from '../CartContext.jsx'
import { useLang } from '../LanguageContext.jsx'
import Icon from '../components/Icons.jsx'

export default function CheckoutResult() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const { clearCart } = useCart()
  const { t } = useLang()
  const cancelled = pathname.endsWith('/cancel')
  const sessionId = params.get('session_id')
  const [state, setState] = useState(cancelled ? 'cancelled' : 'verifying')
  const [orderId, setOrderId] = useState(null)
  const verified = useRef(false)

  useEffect(() => {
    if (cancelled || !sessionId || verified.current) return
    verified.current = true
    verifyCheckout(sessionId)
      .then((res) => {
        if (res.paid) {
          setOrderId(res.order_id)
          clearCart()
          setState('success')
        } else {
          setState('failed')
        }
      })
      .catch(() => setState('failed'))
  }, [cancelled, sessionId])

  const view = {
    verifying: { icon: 'clock', cls: '', title: t.checkout.verifying, text: '' },
    success: {
      icon: 'check', cls: 'result-success', title: t.checkout.successTitle,
      text: `${orderId ? `${t.checkout.orderNumber} #${orderId}. ` : ''}${t.checkout.successText}`,
    },
    cancelled: { icon: 'x', cls: 'result-cancel', title: t.checkout.cancelTitle, text: t.checkout.cancelText },
    failed: { icon: 'x', cls: 'result-cancel', title: t.checkout.failTitle, text: t.checkout.failText },
  }[state]

  return (
    <section className="section page login-page">
      <div className="login-card card checkout-result">
        <div className={`result-icon ${view.cls}`}>
          <Icon name={view.icon} size={32} />
        </div>
        <h1>{view.title}</h1>
        {view.text && <p className="muted">{view.text}</p>}
        {state !== 'verifying' && (
          <Link to="/shop" className="btn btn-primary btn-lg">{t.checkout.backShop}</Link>
        )}
      </div>
    </section>
  )
}
