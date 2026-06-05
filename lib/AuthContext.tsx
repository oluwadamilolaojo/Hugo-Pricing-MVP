'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let unsubscribe: () => void
    import('./firebase').then(({ getFirebaseAuth }) => {
      const auth = getFirebaseAuth()
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          if (firebaseUser.email?.endsWith('@hugotech.co')) {
            setUser(firebaseUser)
          } else {
            firebaseSignOut(auth)
            setUser(null)
          }
        } else {
          setUser(null)
        }
        setLoading(false)
      })
    })
    return () => { if (unsubscribe) unsubscribe() }
  }, [])

  const signOut = async () => {
    const { getFirebaseAuth } = await import('./firebase')
    await firebaseSignOut(getFirebaseAuth())
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
