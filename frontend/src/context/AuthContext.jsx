import { createContext, useContext, useState, useCallback } from 'react'
import { getStoredUser, logout as svcLogout } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())

  const login = useCallback((userData) => {
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    svcLogout()
    setUser(null)
  }, [])

  const updateStorageInfo = useCallback((usedBytes) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, storageUsedBytes: usedBytes }
      localStorage.setItem('mb_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, updateStorageInfo }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
