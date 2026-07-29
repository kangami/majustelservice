import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sendMessage } from '../api.js'
import { useLang } from '../LanguageContext.jsx'
import { CONTACT_INFO } from '../translations.js'
import Icon from '../components/Icons.jsx'

export default function Contact() {
  const { t } = useLang()
  const [params] = useSearchParams()
  const bookedService = params.get('service')
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: bookedService ? `${t.contact.bookingPrefix}: ${bookedService}` : '',
    message: '',
  })
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setStatus(null)
    try {
      const res = await sendMessage(form)
      setStatus({ type: 'success', text: res.message })
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      setStatus({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section page">
      <div className="container contact-grid">
        <div className="contact-info">
          <span className="section-eyebrow">{t.contact.eyebrow}</span>
          <h1>{t.contact.title}</h1>
          <p className="muted">{t.contact.sub}</p>
          <ul className="contact-list">
            <li>
              <div className="contact-icon"><Icon name="phone" size={20} /></div>
              <div>
                <strong>{t.contact.phone}</strong>
                <span><a href={CONTACT_INFO.phoneHref}>{CONTACT_INFO.phone}</a></span>
              </div>
            </li>
            <li>
              <div className="contact-icon"><Icon name="mail" size={20} /></div>
              <div>
                <strong>{t.contact.email}</strong>
                <span><a href={CONTACT_INFO.emailHref}>{CONTACT_INFO.email}</a></span>
              </div>
            </li>
            <li>
              <div className="contact-icon"><Icon name="pin" size={20} /></div>
              <div>
                <strong>{t.contact.workshop}</strong>
                <span>{CONTACT_INFO.address}</span>
              </div>
            </li>
            <li>
              <div className="contact-icon"><Icon name="clock" size={20} /></div>
              <div>
                <strong>{t.contact.hours}</strong>
                <span>{t.contact.hoursValue}</span>
              </div>
            </li>
          </ul>
        </div>

        <form className="contact-form card" onSubmit={handleSubmit}>
          {bookedService && (
            <div className="alert alert-info">
              {t.contact.bookingFor} <strong>{bookedService}</strong>
            </div>
          )}
          {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}
          <div className="form-row">
            <label>
              {t.contact.name}
              <input
                required
                placeholder={t.contact.namePlaceholder}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              {t.contact.email}
              <input
                required
                type="email"
                placeholder={t.contact.emailPlaceholder}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
          </div>
          <label>
            {t.contact.subject}
            <input
              required
              placeholder={t.contact.subjectPlaceholder}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </label>
          <label>
            {t.contact.message}
            <textarea
              required
              rows={6}
              placeholder={t.contact.messagePlaceholder}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </label>
          <button className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? t.contact.sending : t.contact.send}
          </button>
        </form>
      </div>
    </section>
  )
}
