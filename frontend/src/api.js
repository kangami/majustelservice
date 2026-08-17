const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const getProducts = (category = 'all', q = '') =>
  request(`/products?category=${encodeURIComponent(category)}&q=${encodeURIComponent(q)}`)

export const getServices = () => request('/services')

export const getLots = () => request('/lots')

export const placeOrder = (payload) =>
  request('/orders', { method: 'POST', body: JSON.stringify(payload) })

export const createCheckoutSession = (payload) =>
  request('/checkout/session', { method: 'POST', body: JSON.stringify(payload) })

export const verifyCheckout = (sessionId) =>
  request(`/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)

export const createRentalCheckout = (payload) =>
  request('/rentals/checkout', { method: 'POST', body: JSON.stringify(payload) })

export const sendMessage = (payload) =>
  request('/contact', { method: 'POST', body: JSON.stringify(payload) })

export const getShippingQuote = (address) =>
  request('/shipping/quote', { method: 'POST', body: JSON.stringify({ address }) })

// --- Auth ---
export const login = (username, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })

export const logout = () => request('/auth/logout', { method: 'POST' })

export const getMe = () => request('/auth/me')

// --- Admin ---
export const adminCreateProduct = (payload) =>
  request('/admin/products', { method: 'POST', body: JSON.stringify(payload) })

export const adminUpdateProduct = (id, payload) =>
  request(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const adminDeleteProduct = (id) =>
  request(`/admin/products/${id}`, { method: 'DELETE' })

export const adminReorderProducts = (order) =>
  request('/admin/products/reorder', { method: 'PUT', body: JSON.stringify({ order }) })

export const adminCreateService = (payload) =>
  request('/admin/services', { method: 'POST', body: JSON.stringify(payload) })

export const adminUpdateService = (id, payload) =>
  request(`/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const adminDeleteService = (id) =>
  request(`/admin/services/${id}`, { method: 'DELETE' })

export const adminCreateLot = (payload) =>
  request('/admin/lots', { method: 'POST', body: JSON.stringify(payload) })

export const adminUpdateLot = (id, payload) =>
  request(`/admin/lots/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const adminDeleteLot = (id) =>
  request(`/admin/lots/${id}`, { method: 'DELETE' })

export const adminGetOrders = () => request('/admin/orders')

export const adminUpdateOrder = (id, status) =>
  request(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })

export const adminGetShipping = () => request('/admin/shipping')

export const adminUpdateShipping = (payload) =>
  request('/admin/shipping', { method: 'PUT', body: JSON.stringify(payload) })
