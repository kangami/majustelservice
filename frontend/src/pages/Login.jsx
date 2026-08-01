import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useLang } from '../LanguageContext.jsx'
import Icon from '../components/Icons.jsx'

export default function Login() {
  const { login } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(form.username, form.password)
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section page login-page">
      <div className="login-card card">
        <img src="/logo.jpg" alt="MajustelServices" className="login-logo" />
        <h1>{t.login.title}</h1>
        <p className="muted">{t.login.sub}</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="contact-form">
          <label>
            {t.login.username}
            <input
              required
              autoFocus
              placeholder="admin"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>
          <label>
            {t.login.password}
            <input
              required
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <button className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? t.login.signingIn : t.login.signIn}
            <Icon name="shield" size={18} />
          </button>
        </form>
      </div>
    </section>
  )
}
