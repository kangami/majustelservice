import { createContext, useContext, useEffect, useState } from 'react'
import { getMe, login as apiLogin, logout as apiLogout } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const u = await apiLogin(username, password)
    setUser(u)
    return u
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
