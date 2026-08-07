import { useEffect, useRef, useState } from 'react'
import { useLang } from '../LanguageContext.jsx'

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

// Canada-restricted address autocomplete backed by Google Places API (New).
// Falls back to a plain text input when no key is configured or requests fail.
export default function AddressInput({ value, onChange, placeholder, required }) {
  const { lang } = useLang()
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const sessionToken = useRef(null)
  const timer = useRef(null)
  const boxRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      clearTimeout(timer.current)
    }
  }, [])

  const fetchSuggestions = (text) => {
    if (!KEY || text.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    if (!sessionToken.current) sessionToken.current = crypto.randomUUID()
    fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
      body: JSON.stringify({
        input: text,
        includedRegionCodes: ['ca'],
        languageCode: lang,
        sessionToken: sessionToken.current,
      }),
    })
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((d) => {
        const list = (d.suggestions || [])
          .map((s) => s.placePrediction?.text?.text)
          .filter(Boolean)
          .slice(0, 5)
        setSuggestions(list)
        setOpen(list.length > 0)
      })
      .catch(() => {})
  }

  const handleChange = (e) => {
    const text = e.target.value
    onChange(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fetchSuggestions(text), 250)
  }

  const pick = (s) => {
    onChange(s)
    setSuggestions([])
    setOpen(false)
    sessionToken.current = null
  }

  return (
    <div className="address-input" ref={boxRef}>
      <input
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <ul className="address-suggestions">
          {suggestions.map((s) => (
            <li key={s}>
              <button type="button" onClick={() => pick(s)}>{s}</button>
            </li>
          ))}
          <li className="address-attribution">Powered by Google</li>
        </ul>
      )}
    </div>
  )
}
