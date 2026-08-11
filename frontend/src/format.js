export function money(amount, lang, decimals = 0) {
  return `$${Number(amount || 0).toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}
