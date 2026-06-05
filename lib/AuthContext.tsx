'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
interface SimpleUser { displayName?: string | null; email?: string | null; photoURL?: string | null }
interface AuthContextType { user: SimpleUser | null; loading: boolean; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextType>({ user: null, loading: false, signOut: async () => {} })
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<SimpleUser | null>(null)
  return <AuthContext.Provider value={{ user, loading: false, signOut: async () => {} }}>{children}</AuthContext.Provider>
}
export function useAuth() { return useContext(AuthContext) }
