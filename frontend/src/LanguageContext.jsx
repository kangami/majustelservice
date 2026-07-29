import { createContext, useContext, useEffect, useState } from 'react'
import { translations } from './translations.js'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('majustel-lang')
    if (saved === 'en' || saved === 'fr') return saved
    return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
  })

  useEffect(() => {
    localStorage.setItem('majustel-lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  const t = translations[lang]

  // Localized fields from API objects: pick `<field>_fr` in French when present.
  const loc = (obj, field) => (lang === 'fr' && obj[`${field}_fr`]) || obj[field]

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, loc }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)
